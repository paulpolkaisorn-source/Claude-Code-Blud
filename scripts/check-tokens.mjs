#!/usr/bin/env node
/*
 * Checks src/styles/tokens.css against design/direction.md. Owner: art director.
 *
 * Reads the tables and rules in direction.md: heading 3 (palette and theme mapping), heading 4
 * (type scale and font stacks), heading 5 (spacing and breakpoints), heading 6 (easing), heading 7
 * (timing) and heading 13 (focus). Each value is compared with the custom property that carries it.
 * A differing value, a missing token, or a table that yields an unexpected number of rows is
 * reported, and the script exits 1. Node built-ins only, no dependencies.
 *
 * Usage: node scripts/check-tokens.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIRECTION_FILE = resolve(ROOT, 'design/direction.md');
const TOKENS_FILE = resolve(ROOT, 'src/styles/tokens.css');
const HEADER = 'Generated from design/direction.md. Do not edit by hand; change the direction and regenerate.';

// Raw palette tokens, each with the palette-table name it carries (direction.md heading 3).
const RAW_TOKENS = [
  ['--paper', 'paper'],
  ['--paper-deep', 'paper-deep'],
  ['--ink', 'ink'],
  ['--ink-raised', 'ink-raised'],
  ['--seal-red', 'seal'],
  ['--seal-text-paper', 'seal-text-paper'],
  ['--seal-ink', 'seal-ink'],
  ['--code-string-raw', 'code-string'],
];

// Layers: architecture.md section 7 (canvas, main, cursor), direction-act1 (preloader), skip link above all.
const LAYERS = {
  '--z-canvas': '0',
  '--z-main': '1',
  '--z-preloader': '2',
  '--z-cursor': '50',
  '--z-skip': '100',
};

// Row counts the tables must yield. Any other count means the table or the parser has changed.
const EXPECTED_ROWS = { colours: 11, type: 9, spacing: 9, easing: 8, timing: 9, breakpoints: 3 };

const HEX = /^#[0-9A-F]{6}$/i;
const NAMED_HEX = /^([a-z0-9-]+) (#[0-9A-F]{6})$/i;
const EPSILON = 1e-9;

const problems = [];
const passed = new Map();
const pass = (group) => passed.set(group, (passed.get(group) ?? 0) + 1);
const fail = (message) => problems.push(message);

// Lines of one "## N. Title" section of direction.md, with the heading line excluded.
function sectionLines(lines, title) {
  const start = lines.findIndex((line) => line.startsWith(`## ${title}`));
  if (start < 0) throw new Error(`direction.md has no "## ${title}" section`);
  const next = lines.findIndex((line, i) => i > start && line.startsWith('## '));
  return lines.slice(start + 1, next < 0 ? lines.length : next);
}

// Trimmed cells of a markdown table row, or null for any other line.
function rowCells(line) {
  const text = line.trim();
  if (!text.startsWith('|')) return null;
  const inner = text.endsWith('|') ? text.slice(1, -1) : text.slice(1);
  return inner.split('|').map((cell) => cell.trim());
}

// The first value of a grid cell: "7px (fixed below 1024 px)" gives "7px", and a clamp() is kept whole.
function leadingValue(cell) {
  return /^(clamp\([^)]*\)|\S+)/.exec(cell ?? '')?.[0] ?? null;
}

// Font names from a comma-separated stack, with the quotes removed.
function fontList(text) {
  return text.split(',').map((name) => name.trim().replace(/^"(.*)"$/, '$1'));
}

// Collapses whitespace so that spacing differences alone do not count as a mismatch.
const normal = (text) => text.replace(/\s+/g, ' ').trim();

// The four numbers of a cubic-bezier(), or null when the text is not one.
function bezierNumbers(text) {
  const match = /^cubic-bezier\(([^)]*)\)$/.exec((text ?? '').trim());
  return match ? match[1].split(',').map((n) => Number(n.trim())) : null;
}

function readDirection() {
  const lines = readFileSync(DIRECTION_FILE, 'utf8').split('\n');
  const doc = {
    palette: new Map(),
    colours: [],
    type: [],
    fonts: [],
    spacing: [],
    breakpoints: [],
    wrap: null,
    easing: [],
    timing: [],
    focus: null,
  };

  for (const line of sectionLines(lines, '3. Palette')) {
    const c = rowCells(line);
    if (!c) continue;
    if (HEX.test(c[1] ?? '')) doc.palette.set(c[0], c[1].toUpperCase());
    const paper = NAMED_HEX.exec(c[1] ?? '');
    const ink = NAMED_HEX.exec(c[2] ?? '');
    if (c[0].startsWith('--') && paper && ink) {
      doc.colours.push({
        token: c[0],
        paperName: paper[1],
        paperHex: paper[2].toUpperCase(),
        inkName: ink[1],
        inkHex: ink[2].toUpperCase(),
      });
    }
  }

  const typography = sectionLines(lines, '4. Typography');
  for (const line of typography) {
    const c = rowCells(line);
    if (c && (c[2] ?? '').startsWith('clamp(')) {
      doc.type.push({
        style: c[0].replace(/\s*\(.*\)$/, ''),
        size: c[2],
        lineHeight: c[3],
        letterSpacing: c[4],
        weight: c[5],
      });
    }
  }
  const stacks = /The stacks are (.+?)\. /.exec(typography.join(' '));
  if (stacks) doc.fonts = stacks[1].split(', and ').map(fontList);

  const grid = sectionLines(lines, '5. Grid and spacing');
  for (const line of grid) {
    const spacing = /^- (--sp-[1-9]) (\d+px):/.exec(line);
    if (spacing) doc.spacing.push({ token: spacing[1], value: spacing[2] });
    const c = rowCells(line);
    if (c && /^\d+ px/.test(c[0])) {
      doc.breakpoints.push({
        start: Number(/^\d+/.exec(c[0])[0]),
        columns: c[1],
        margin: leadingValue(c[2]),
        gutter: leadingValue(c[3]),
      });
    }
  }
  const wrap = /max-inline-size (\d+)px/.exec(grid.join(' '));
  if (wrap) doc.wrap = `${wrap[1]}px`;

  for (const line of sectionLines(lines, '6. Easing library')) {
    const c = rowCells(line);
    if (c && /^[a-z]+$/.test(c[0]) && bezierNumbers(c[1])) doc.easing.push({ name: c[0], value: c[1] });
  }

  for (const line of sectionLines(lines, '7. Timing scale and stagger')) {
    const c = rowCells(line);
    const named = c ? /^T\.([a-z0-9]+)$/.exec(c[0]) : null;
    if (named && /^\d+(\.\d+)?$/.test(c[1] ?? '')) doc.timing.push({ name: named[1], seconds: Number(c[1]) });
  }

  const focus = /outline: (\d+)px solid var\(--focus\); outline-offset: (\d+)px/.exec(
    sectionLines(lines, '13. Focus and interaction states').join(' '),
  );
  if (focus) doc.focus = { width: `${focus[1]}px`, offset: `${focus[2]}px` };

  return doc;
}

// Rules of tokens.css: top-level rules and @media blocks, each with its declarations. Comments are dropped.
function readCss(source) {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = [];
  const walk = (chunk, media) => {
    let pos = 0;
    while (pos < chunk.length) {
      const open = chunk.indexOf('{', pos);
      if (open < 0) {
        if (chunk.slice(pos).trim() !== '') {
          throw new Error(`tokens.css: text outside a rule: "${chunk.slice(pos).trim()}"`);
        }
        return;
      }
      const selector = chunk.slice(pos, open).trim();
      let depth = 1;
      let end = open + 1;
      while (end < chunk.length && depth > 0) {
        if (chunk[end] === '{') depth += 1;
        else if (chunk[end] === '}') depth -= 1;
        end += 1;
      }
      if (depth !== 0) throw new Error(`tokens.css: unclosed block "${selector}"`);
      const body = chunk.slice(open + 1, end - 1);
      if (selector.startsWith('@media')) {
        walk(body, selector);
      } else {
        if (body.includes('{')) throw new Error(`tokens.css: nested rule inside "${selector}"`);
        rules.push({ selector, media, decls: parseDecls(body, selector) });
      }
      pos = end;
    }
  };
  walk(text, null);
  return rules;
}

function parseDecls(body, selector) {
  return body
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((decl) => {
      const colon = decl.indexOf(':');
      if (colon < 0) throw new Error(`tokens.css: malformed declaration "${decl}" in ${selector}`);
      return [decl.slice(0, colon).trim(), decl.slice(colon + 1).trim()];
    });
}

// Declarations of one block as a Map. A name declared twice in the same block is a failure.
function declarations(decls, where) {
  const map = new Map();
  for (const [name, value] of decls) {
    if (map.has(name)) fail(`tokens.css: ${name} is declared twice in ${where}`);
    map.set(name, value);
  }
  return map;
}

// Resolves var() references against a scope. Returns undefined when a reference is missing or cyclic.
function resolveIn(scope, value, depth = 0) {
  if (depth > 8) return undefined;
  let missing = false;
  const out = value.replace(/var\((--[\w-]+)\)/g, (_, name) => {
    const inner = scope.has(name) ? resolveIn(scope, scope.get(name), depth + 1) : undefined;
    if (inner === undefined) missing = true;
    return inner ?? '';
  });
  return missing ? undefined : out.trim();
}

const valueOf = (scope, name) => (scope.has(name) ? resolveIn(scope, scope.get(name)) : undefined);

function expectText(scope, token, expected, where, group) {
  if (!scope.has(token)) {
    fail(`${where}: missing ${token}`);
    return;
  }
  const actual = valueOf(scope, token);
  if (actual === undefined) fail(`${where}: ${token} refers to a missing token`);
  else if (normal(actual) !== normal(expected)) fail(`${where}: ${token} is "${actual}", direction.md says "${expected}"`);
  else pass(group);
}

function expectColour(scope, token, hex, where, group) {
  if (!scope.has(token)) {
    fail(`${where}: missing ${token}`);
    return;
  }
  const actual = valueOf(scope, token);
  if (actual === undefined) fail(`${where}: ${token} refers to a missing token`);
  else if (actual.toUpperCase() !== hex.toUpperCase()) fail(`${where}: ${token} is ${actual}, direction.md says ${hex}`);
  else pass(group);
}

function expectSeconds(scope, token, seconds, where) {
  if (!scope.has(token)) {
    fail(`${where}: missing ${token}`);
    return;
  }
  const actual = valueOf(scope, token) ?? '';
  const match = /^(\d+(?:\.\d+)?)s$/.exec(actual);
  if (!match) fail(`${where}: ${token} is "${actual}", expected a time in seconds`);
  else if (!(Math.abs(Number(match[1]) - seconds) <= EPSILON)) {
    fail(`${where}: ${token} is ${actual}, direction.md heading 7 says ${seconds}s`);
  } else pass('timing');
}

function expectBezier(scope, token, expectedText, where) {
  if (!scope.has(token)) {
    fail(`${where}: missing ${token}`);
    return;
  }
  const expected = bezierNumbers(expectedText);
  const actualText = valueOf(scope, token) ?? '';
  const actual = bezierNumbers(actualText);
  const same =
    actual !== null &&
    actual.length === 4 &&
    expected.every((n, i) => Math.abs(n - actual[i]) <= EPSILON);
  if (!same) fail(`${where}: ${token} is ${actualText}, direction.md heading 6 says ${expectedText}`);
  else pass('easing');
}

function expectStack(scope, token, expected, where) {
  if (!scope.has(token)) {
    fail(`${where}: missing ${token}`);
    return;
  }
  const actual = valueOf(scope, token);
  if (actual === undefined) {
    fail(`${where}: ${token} refers to a missing token`);
    return;
  }
  const names = fontList(actual);
  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    fail(`${where}: ${token} is ${names.join(', ')}, direction.md heading 4 says ${expected.join(', ')}`);
  } else pass('fonts');
}

function checkTokens(doc) {
  const where = 'tokens.css';
  const source = readFileSync(TOKENS_FILE, 'utf8');
  if (!source.includes(HEADER)) {
    fail('tokens.css: the "Generated from design/direction.md" header comment is missing or changed');
  }

  const rules = readCss(source);
  const rootRules = rules.filter((rule) => rule.media === null && rule.selector === ':root');
  const inkRules = rules.filter((rule) => rule.media === null && rule.selector === '[data-theme="ink"]');
  if (rootRules.length !== 1) fail(`tokens.css: expected one top-level :root block, found ${rootRules.length}`);
  if (inkRules.length !== 1) fail(`tokens.css: expected one [data-theme="ink"] block, found ${inkRules.length}`);
  const root = declarations(rootRules[0]?.decls ?? [], ':root');
  const ink = declarations(inkRules[0]?.decls ?? [], '[data-theme="ink"]');
  const inkScope = new Map([...root, ...ink]);

  const media = rules
    .filter((rule) => rule.media !== null && rule.selector === ':root')
    .map((rule) => {
      const minWidth = /min-width:\s*(\d+)px/.exec(rule.media);
      if (!minWidth) fail(`tokens.css: ${rule.media} has no min-width`);
      return { minWidth: Number(minWidth?.[1] ?? NaN), decls: rule.decls };
    });

  // Raw palette.
  for (const [token, name] of RAW_TOKENS) {
    const hex = doc.palette.get(name);
    if (hex === undefined) fail(`direction.md heading 3: palette entry "${name}" is missing`);
    else expectColour(root, token, hex, `${where} :root`, 'raw');
  }

  // Semantic colours, both themes.
  if (doc.colours.length !== EXPECTED_ROWS.colours) {
    fail(`direction.md heading 3: expected ${EXPECTED_ROWS.colours} semantic colour rows, found ${doc.colours.length}`);
  }
  for (const row of doc.colours) {
    if (doc.palette.get(row.paperName) !== row.paperHex) {
      fail(`direction.md heading 3: ${row.token} paper value ${row.paperName} ${row.paperHex} disagrees with the palette table`);
    }
    if (doc.palette.get(row.inkName) !== row.inkHex) {
      fail(`direction.md heading 3: ${row.token} ink value ${row.inkName} ${row.inkHex} disagrees with the palette table`);
    }
    expectColour(root, row.token, row.paperHex, `${where} :root`, 'semantic');
    if (!ink.has(row.token)) fail(`${where} [data-theme="ink"]: missing ${row.token}`);
    else expectColour(inkScope, row.token, row.inkHex, `${where} [data-theme="ink"]`, 'semantic');
  }

  // Type scale.
  if (doc.type.length !== EXPECTED_ROWS.type) {
    fail(`direction.md heading 4: expected ${EXPECTED_ROWS.type} type style rows, found ${doc.type.length}`);
  }
  for (const row of doc.type) {
    expectText(root, `--fs-${row.style}`, row.size, `${where} :root`, 'type');
    expectText(root, `--lh-${row.style}`, row.lineHeight, `${where} :root`, 'type');
    expectText(root, `--ls-${row.style}`, row.letterSpacing, `${where} :root`, 'type');
    expectText(root, `--fw-${row.style}`, row.weight, `${where} :root`, 'type');
  }

  // Font stacks.
  if (doc.fonts.length !== 2) {
    fail('direction.md heading 4: the font stacks sentence was not found');
  } else {
    expectStack(root, '--font-serif', doc.fonts[0], `${where} :root`);
    expectStack(root, '--font-mono', doc.fonts[1], `${where} :root`);
  }

  // Spacing.
  if (doc.spacing.length !== EXPECTED_ROWS.spacing) {
    fail(`direction.md heading 5: expected ${EXPECTED_ROWS.spacing} spacing rows, found ${doc.spacing.length}`);
  }
  for (const row of doc.spacing) expectText(root, row.token, row.value, `${where} :root`, 'spacing');

  // Grid: the margin and gutter that apply at each breakpoint, resolved through the media queries.
  if (doc.breakpoints.length !== EXPECTED_ROWS.breakpoints) {
    fail(`direction.md heading 5: expected ${EXPECTED_ROWS.breakpoints} breakpoint rows, found ${doc.breakpoints.length}`);
  }
  const effective = (name, width) => {
    let value = root.get(name);
    const applicable = media.filter((rule) => rule.minWidth <= width).sort((a, b) => a.minWidth - b.minWidth);
    for (const rule of applicable) {
      for (const [n, v] of rule.decls) if (n === name) value = v;
    }
    return value;
  };
  for (const bp of doc.breakpoints) {
    const margin = effective('--margin', bp.start);
    const gutter = effective('--gutter', bp.start);
    if (margin === undefined || normal(margin) !== bp.margin) {
      fail(`${where}: --margin at ${bp.start}px is ${margin}, direction.md heading 5 says ${bp.margin}`);
    } else pass('grid');
    if (gutter === undefined || normal(gutter) !== bp.gutter) {
      fail(`${where}: --gutter at ${bp.start}px is ${gutter}, direction.md heading 5 says ${bp.gutter}`);
    } else pass('grid');
  }
  for (const bp of doc.breakpoints.filter((b) => b.start >= 768)) {
    if (bp.columns !== '17') fail(`direction.md heading 5: the ${bp.start}px row has ${bp.columns} columns, expected 17`);
  }
  expectText(root, '--cols', '17', `${where} :root`, 'grid');
  if (doc.wrap === null) fail('direction.md heading 5: max-inline-size was not found');
  else expectText(root, '--wrap-max', doc.wrap, `${where} :root`, 'grid');

  // Easing.
  if (doc.easing.length !== EXPECTED_ROWS.easing) {
    fail(`direction.md heading 6: expected ${EXPECTED_ROWS.easing} curves, found ${doc.easing.length}`);
  }
  for (const row of doc.easing) expectBezier(root, `--ease-${row.name}`, row.value, `${where} :root`);

  // Timing.
  if (doc.timing.length !== EXPECTED_ROWS.timing) {
    fail(`direction.md heading 7: expected ${EXPECTED_ROWS.timing} timing tokens, found ${doc.timing.length}`);
  }
  for (const row of doc.timing) expectSeconds(root, `--t-${row.name}`, row.seconds, `${where} :root`);

  // Layers.
  for (const [token, value] of Object.entries(LAYERS)) expectText(root, token, value, `${where} :root`, 'layers');

  // Focus ring.
  if (doc.focus === null) {
    fail('direction.md heading 13: the focus outline values were not found');
  } else {
    expectText(root, '--focus-width', doc.focus.width, `${where} :root`, 'focus');
    expectText(root, '--focus-offset', doc.focus.offset, `${where} :root`, 'focus');
  }

  return { root: root.size, ink: ink.size, media: media.length };
}

function main() {
  let counts;
  try {
    counts = checkTokens(readDirection());
  } catch (error) {
    console.error(`check-tokens: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  if (problems.length > 0) {
    console.error(`tokens.css does not match design/direction.md: ${problems.length} problem(s)`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exitCode = 1;
    return;
  }
  const total = [...passed.values()].reduce((sum, n) => sum + n, 0);
  const groups = [...passed].map(([group, n]) => `${group} ${n}`).join(', ');
  process.stdout.write(`tokens.css matches design/direction.md: ${total} values checked (${groups}).\n`);
  process.stdout.write(
    `declarations parsed: :root ${counts.root}, [data-theme="ink"] ${counts.ink}, @media blocks ${counts.media}.\n`,
  );
}

main();
