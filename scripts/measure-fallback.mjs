// Measures the metric overrides for the fallback faces in src/styles/fonts.css.
//
// For each real face (Bodoni Moda Variable, Geist Mono Variable) the script reads the vertical
// metrics from the WOFF2 tables (head, hhea, OS/2) and the axes from fvar. It then asks Chromium
// for the widths and baselines that layout produces, both for the real face and for each fallback
// candidate:
//   1. size-adjust is solved so the primary probe string has the same width as the real face.
//      The solve uses the browser's own layout, so letter-spacing is included.
//   2. ascent-override and descent-override are the real face's metrics as a fraction of its
//      unitsPerEm, divided by size-adjust. Chromium applies the overrides to the size-adjusted
//      font size (checked here: at size-adjust 50% an ascent-override of 100% gives 50 px at 100 px),
//      so dividing by size-adjust makes the fallback's ascent and descent equal the real ones.
//   3. line-gap-override is the real face's line gap, treated the same way (0% for both real faces).
// Every value is then verified in the browser: width and baseline deltas against the real face,
// before (size-adjust 100%, no overrides) and after.
//
// A candidate that is not installed on this machine cannot be measured. It takes the values of the
// proxy named in CANDIDATES, and the output says which kind of proxy it is. Run the script on macOS
// and Windows to measure those candidates directly.
//
// Usage:
//   node scripts/measure-fallback.mjs          report, then the @font-face block for fonts.css
//   node scripts/measure-fallback.mjs --json   the same results as JSON
// PW_CHROMIUM overrides the browser binary. Otherwise the Playwright default applies.

/* eslint-disable no-console -- this is a command-line report; console is its output */
/* global document, FontFace -- measureInPage runs inside the browser through page.evaluate */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliDecompressSync } from 'node:zlib';
import { chromium } from '@playwright/test';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const JSON_ONLY = process.argv.includes('--json');

// ---------------------------------------------------------------------------------------------
// Real faces and probes. The probes mirror the production type styles in design/direction.md
// section 4: display-xxl (hero h1, 141.8 px at 1440 px, letter-spacing -0.02em) and label
// (Geist Mono 13 px, weight 500, letter-spacing 0.12em). The 100 px probes are the brief's
// cross-check. The body sample is informational: Bodoni optical sizing makes body text (16 px,
// opsz 16) wider than the 141.8 px hero, and one size-adjust cannot match both.
// ---------------------------------------------------------------------------------------------

const BODY_SAMPLE = 'Body sample for width: the quick brown fox jumps over a dog.';
if (BODY_SAMPLE.length !== 60) throw new Error(`body sample must be 60 characters, is ${BODY_SAMPLE.length}`);

const FAMILIES = {
  bodoni: {
    family: 'Bodoni Moda Variable',
    file: 'public/fonts/bodoni-moda-latin-opsz-normal.woff2',
    weight: '400 900',
    primary: 'h1-haiku',
    probes: [
      { id: 'h1-haiku', text: 'Haiku 5.5', size: 141.8, weight: 400, ls: '-0.02em', kern: 'normal', lig: 'normal', ff: '"kern" 1, "liga" 1' },
      { id: 'h1-claude', text: 'Claude', size: 141.8, weight: 400, ls: '-0.02em', kern: 'normal', lig: 'normal', ff: '"kern" 1, "liga" 1' },
      { id: 'brief-100', text: 'Claude Haiku 5.5', size: 100, weight: 400, ls: '0em', kern: 'normal', lig: 'normal', ff: '"kern" 1, "liga" 1' },
      { id: 'body-16', text: BODY_SAMPLE, size: 16, weight: 400, ls: '0em', kern: 'normal', lig: 'normal', ff: '"kern" 1, "liga" 1' },
    ],
    verticals: [
      { id: 'h1-lh092', size: 141.8, weight: 400, lh: '0.92' },
      { id: 'h1-lhnormal', size: 141.8, weight: 400, lh: 'normal' },
      { id: 'v100', size: 100, weight: 400, lh: 'normal' },
    ],
  },
  geist: {
    family: 'Geist Mono Variable',
    file: 'public/fonts/geist-mono-latin-wght-normal.woff2',
    weight: '100 900',
    primary: 'label-13',
    probes: [
      { id: 'label-13', text: 'ABCDEFGHIJ0123456789', size: 13, weight: 500, ls: '0.12em', kern: 'none', lig: 'none', ff: 'normal' },
      { id: 'brief-100', text: 'ABCDEFGHIJ0123456789', size: 100, weight: 400, ls: '0em', kern: 'none', lig: 'none', ff: 'normal' },
    ],
    verticals: [
      { id: 'label-lh13', size: 13, weight: 500, lh: '1.3' },
      { id: 'v100', size: 100, weight: 400, lh: 'normal' },
    ],
  },
};

// kind: 'measured' (installed here, measured directly), or the proxy kinds for a candidate that is
// not installed here. 'metric-compatible' means the proxy family is designed to share the same
// advance widths and vertical metrics (Liberation Serif is metric-compatible with Times New Roman).
// 'derived' means the design is derived from the proxy (Menlo derives from DejaVu Sans Mono).
// 'approximate' means no closer proxy is available on this machine.
const CANDIDATES = [
  { face: 'Bodoni Fallback Georgia', font: 'bodoni', local: ['Georgia'], proxy: 'Bodoni Fallback Liberation', kind: 'approximate' },
  { face: 'Bodoni Fallback Times', font: 'bodoni', local: ['Times New Roman', 'TimesNewRomanPSMT'], proxy: 'Bodoni Fallback Liberation', kind: 'metric-compatible' },
  { face: 'Bodoni Fallback Liberation', font: 'bodoni', local: ['Liberation Serif'] },
  { face: 'Bodoni Fallback DejaVu', font: 'bodoni', local: ['DejaVu Serif'] },
  { face: 'Geist Mono Fallback Menlo', font: 'geist', local: ['Menlo', 'Menlo Regular', 'Menlo-Regular'], proxy: 'Geist Mono Fallback DejaVu', kind: 'derived' },
  { face: 'Geist Mono Fallback Consolas', font: 'geist', local: ['Consolas'], proxy: 'Geist Mono Fallback DejaVu', kind: 'approximate' },
  { face: 'Geist Mono Fallback Liberation', font: 'geist', local: ['Liberation Mono'] },
  { face: 'Geist Mono Fallback DejaVu', font: 'geist', local: ['DejaVu Sans Mono'] },
];

// ---------------------------------------------------------------------------------------------
// WOFF2 table reader. Only tables stored without a transform are used (head, hhea, OS/2, fvar),
// so no glyf or loca reconstruction is needed.
// ---------------------------------------------------------------------------------------------

const KNOWN_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm', 'glyf', 'loca',
  'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern', 'LTSH', 'PCLT', 'VDMX', 'vhea',
  'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC', 'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL',
  'SVG ', 'sbix', 'acnt', 'avar', 'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar',
  'gvar', 'hsty', 'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat',
  'Gloc', 'Feat', 'Sill',
];

function readBase128(buf, start) {
  let value = 0;
  let offset = start;
  for (let i = 0; i < 5; i += 1) {
    const byte = buf[offset];
    offset += 1;
    value = value * 128 + (byte & 0x7f);
    if ((byte & 0x80) === 0) return { value, offset };
  }
  throw new Error('woff2: malformed UIntBase128');
}

function readWoff2Tables(buf) {
  if (buf.toString('ascii', 0, 4) !== 'wOF2') throw new Error('input is not a WOFF2 file');
  const numTables = buf.readUInt16BE(12);
  const totalCompressedSize = buf.readUInt32BE(20);
  let offset = 48;
  const dir = [];
  for (let i = 0; i < numTables; i += 1) {
    const flags = buf[offset];
    offset += 1;
    const known = flags & 0x3f;
    let tag;
    if (known === 63) {
      tag = buf.toString('latin1', offset, offset + 4);
      offset += 4;
    } else {
      tag = KNOWN_TAGS[known];
    }
    const version = (flags >> 6) & 0x03;
    const orig = readBase128(buf, offset);
    offset = orig.offset;
    const transformed = tag === 'glyf' || tag === 'loca' ? version === 0 : tag === 'hmtx' ? version === 1 : false;
    let stored = orig.value;
    if (transformed) {
      const len = readBase128(buf, offset);
      offset = len.offset;
      stored = len.value;
    }
    dir.push({ tag, stored, transformed });
  }
  const raw = brotliDecompressSync(buf.subarray(offset, offset + totalCompressedSize));
  const tables = {};
  let pos = 0;
  for (const entry of dir) {
    tables[entry.tag] = raw.subarray(pos, pos + entry.stored);
    pos += entry.stored;
  }
  return { tables };
}

/** Vertical metrics as the browser uses them: typo values when USE_TYPO_METRICS is set, hhea otherwise. */
function readFaceMetrics(relPath) {
  const fileBytes = readFileSync(resolve(ROOT, relPath));
  const { tables } = readWoff2Tables(fileBytes);
  const head = tables.head;
  const hhea = tables.hhea;
  const os2 = tables['OS/2'];
  const upm = head.readUInt16BE(18);
  const useTypo = ((os2.readUInt16BE(62) >> 7) & 1) === 1;
  const hheaMetrics = { ascent: hhea.readInt16BE(4), descent: -hhea.readInt16BE(6), gap: hhea.readInt16BE(8) };
  const typoMetrics = { ascent: os2.readInt16BE(68), descent: -os2.readInt16BE(70), gap: os2.readInt16BE(72) };
  const winMetrics = { ascent: os2.readUInt16BE(74), descent: os2.readUInt16BE(76), gap: 0 };
  const used = useTypo ? typoMetrics : hheaMetrics;
  const axes = [];
  if (tables.fvar) {
    const fvar = tables.fvar;
    const axesOffset = fvar.readUInt16BE(4);
    const axisCount = fvar.readUInt16BE(8);
    const axisSize = fvar.readUInt16BE(10);
    for (let i = 0; i < axisCount; i += 1) {
      const o = axesOffset + i * axisSize;
      axes.push({
        tag: fvar.toString('latin1', o, o + 4),
        min: fvar.readInt32BE(o + 4) / 65536,
        default: fvar.readInt32BE(o + 8) / 65536,
        max: fvar.readInt32BE(o + 12) / 65536,
      });
    }
  }
  return {
    file: relPath,
    bytes: fileBytes.length,
    base64: fileBytes.toString('base64'),
    upm,
    useTypo,
    hhea: hheaMetrics,
    typo: typoMetrics,
    win: winMetrics,
    used,
    ascentRatio: used.ascent / upm,
    descentRatio: used.descent / upm,
    gapRatio: used.gap / upm,
    axes,
  };
}

// ---------------------------------------------------------------------------------------------
// In-page measurement. This function runs in the browser through page.evaluate, so it must not
// refer to anything outside its own body.
// ---------------------------------------------------------------------------------------------

async function measureInPage(cfg) {
  const body = document.body;
  let uid = 0;
  const bytesOf = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;

  // Real faces, loaded from the same files the page ships.
  for (const real of cfg.real) {
    const face = new FontFace(real.family, bytesOf(real.base64), { weight: real.weight, style: 'normal' });
    document.fonts.add(face);
    await face.load();
  }

  // A local() face under a fresh family name, trying each name in turn. Null when none is installed.
  async function localFace(names, descriptors) {
    for (const name of names) {
      const family = `probe${(uid += 1)}`;
      const face = new FontFace(family, `local("${name}")`, descriptors);
      document.fonts.add(face);
      try {
        await face.load();
        return { family, matched: name };
      } catch {
        document.fonts.delete(face);
      }
    }
    return null;
  }

  function spanWidth(family, probe) {
    const el = document.createElement('span');
    el.style.cssText = [
      'position:absolute', 'left:0', 'top:0', 'white-space:pre',
      `font-family:"${family}"`, `font-size:${probe.size}px`, `font-weight:${probe.weight}`,
      `letter-spacing:${probe.ls}`, `font-kerning:${probe.kern}`,
      `font-variant-ligatures:${probe.lig}`, `font-feature-settings:${probe.ff}`,
    ].join(';');
    el.textContent = probe.text;
    body.appendChild(el);
    const width = el.getBoundingClientRect().width;
    el.remove();
    return width;
  }

  // Baseline (from the top of the line box) and line box height, from a zero-height inline-block
  // on the baseline. Chromium rounds ascent and descent to whole pixels, so these are integers.
  function baselineOf(family, v) {
    const div = document.createElement('div');
    div.style.cssText = [
      'position:absolute', 'left:0', 'top:0', 'white-space:nowrap',
      `font-family:"${family}"`, `font-size:${v.size}px`, `font-weight:${v.weight}`, `line-height:${v.lh}`,
    ].join(';');
    const marker = document.createElement('span');
    marker.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    div.append(marker, document.createTextNode('Hxgq'));
    body.appendChild(div);
    const box = div.getBoundingClientRect();
    const result = { baseline: marker.getBoundingClientRect().bottom - box.top, height: box.height };
    div.remove();
    return result;
  }

  function canvasMetrics(family, weight) {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = `${weight} 100px "${family}"`;
    const m = ctx.measureText('Hxgq');
    return { ascent100: m.fontBoundingBoxAscent, descent100: m.fontBoundingBoxDescent };
  }

  // Real-face reference values.
  const reference = {};
  for (const [key, fam] of Object.entries(cfg.families)) {
    const width = {};
    for (const probe of fam.probes) width[probe.id] = spanWidth(fam.family, probe);
    const vertical = {};
    for (const v of fam.verticals) vertical[v.id] = baselineOf(fam.family, v);
    reference[key] = {
      width,
      vertical,
      canvas: canvasMetrics(fam.family, 400),
      canvasAt500: canvasMetrics(fam.family, 500),
    };
  }

  // Width and baseline deltas of one candidate family against the real face of its key.
  function deltasAgainst(key, family) {
    const fam = cfg.families[key];
    const ref = reference[key];
    const widths = fam.probes.map((probe) => {
      const cand = spanWidth(family, probe);
      return { id: probe.id, real: ref.width[probe.id], candidate: cand, delta: cand - ref.width[probe.id] };
    });
    const verticals = fam.verticals.map((v) => {
      const cand = baselineOf(family, v);
      const real = ref.vertical[v.id];
      return {
        id: v.id,
        real,
        candidate: cand,
        baselineDelta: cand.baseline - real.baseline,
        heightDelta: cand.height - real.height,
      };
    });
    return { widths, verticals };
  }

  // Size-adjust that makes the primary probe's width equal the real width. Chromium quantizes the
  // effective font size, so the reachable widths step by about 1/16 px; the solver keeps the
  // closest value it reached and accepts an error of up to 0.04 px. It returns the percentage that
  // was measured, and the width error that remains at that percentage.
  async function solveSizeAdjust(key, names) {
    const fam = cfg.families[key];
    const probe = fam.probes.find((p) => p.id === fam.primary);
    const target = reference[key].width[probe.id];
    let pct = 100;
    let best = null;
    for (let i = 0; i < 12; i += 1) {
      const found = await localFace(names, { sizeAdjust: `${pct}%` });
      if (!found) return null;
      const width = spanWidth(found.family, probe);
      const error = Math.abs(target - width);
      if (best === null || error < best.error) best = { sizeAdjustPct: pct, matched: found.matched, error };
      if (error <= 0.04) break;
      pct = Math.round(pct * (target / width) * 1e4) / 1e4;
    }
    if (best.error > 0.1) throw new Error(`size-adjust for ${names[0]} on the ${key} probe is ${best.error.toFixed(3)} px off`);
    return best;
  }

  const results = {};
  for (const cand of cfg.candidates) {
    const fam = cfg.families[cand.font];
    const solved = await solveSizeAdjust(cand.font, cand.local);
    if (!solved) {
      results[cand.face] = { installed: false };
      continue;
    }
    const k = solved.sizeAdjustPct / 100;
    const r = fam.ascentRatio;
    const d = fam.descentRatio;
    const g = fam.gapRatio;
    // pct takes a ratio of the em and returns it as a percentage with four decimals.
    const pct = (ratio) => `${(Math.round(ratio * 1e6) / 1e4).toFixed(4)}%`;
    const descriptors = {
      sizeAdjust: `${solved.sizeAdjustPct}%`,
      ascentOverride: pct(r / k),
      descentOverride: pct(d / k),
      lineGapOverride: pct(g / k),
    };
    // Before: the same local face with the browser's own metrics (size-adjust 100%, no overrides).
    const before = await localFace(cand.local, { sizeAdjust: '100%' });
    const beforeDeltas = deltasAgainst(cand.font, before.family);
    // After: the same local face with the computed descriptors.
    const after = await localFace(cand.local, descriptors);
    const afterDeltas = deltasAgainst(cand.font, after.family);
    results[cand.face] = { installed: true, matched: solved.matched, descriptors, before: beforeDeltas, after: afterDeltas };
  }
  return { reference, results };
}

// ---------------------------------------------------------------------------------------------
// Node side: run the browser, assemble the report and the CSS.
// ---------------------------------------------------------------------------------------------

function buildCss(rows) {
  const lines = [];
  for (const row of rows) {
    lines.push('@font-face {');
    lines.push(`  font-family: "${row.face}";`);
    lines.push(`  src: ${row.sources};`);
    lines.push(`  size-adjust: ${row.sizeAdjust};`);
    lines.push(`  ascent-override: ${row.ascentOverride};`);
    lines.push(`  descent-override: ${row.descentOverride};`);
    lines.push(`  line-gap-override: ${row.lineGapOverride};`);
    lines.push('}');
  }
  return lines.join('\n');
}

function fmtDelta(n) {
  return `${n >= 0 ? '+' : ''}${n.toFixed(3)}`;
}

async function main() {
  const families = {};
  const real = [];
  for (const [key, fam] of Object.entries(FAMILIES)) {
    const metrics = readFaceMetrics(fam.file);
    families[key] = { ...fam, ascentRatio: metrics.ascentRatio, descentRatio: metrics.descentRatio, gapRatio: metrics.gapRatio };
    real.push({ key, family: fam.family, weight: fam.weight, base64: metrics.base64, metrics });
  }

  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
  let version;
  let raw;
  try {
    version = browser.version();
    const page = await browser.newPage();
    await page.setContent('<!doctype html><html><body></body></html>');
    raw = await page.evaluate(measureInPage, {
      real: real.map((r) => ({ family: r.family, weight: r.weight, base64: r.base64 })),
      families,
      candidates: CANDIDATES,
    });
  } finally {
    await browser.close();
  }

  // Real-face report.
  const realReport = {};
  for (const r of real) {
    const ref = raw.reference[r.key];
    realReport[r.family] = {
      file: r.metrics.file,
      bytes: r.metrics.bytes,
      unitsPerEm: r.metrics.upm,
      usesTypoMetrics: r.metrics.useTypo,
      hhea: r.metrics.hhea,
      typo: r.metrics.typo,
      win: r.metrics.win,
      used: r.metrics.used,
      ascentRatio: r.metrics.ascentRatio,
      descentRatio: r.metrics.descentRatio,
      axes: r.metrics.axes,
      chromiumFontBoundingBox100px: ref.canvas,
      chromiumFontBoundingBox100pxWeight500: ref.canvasAt500,
      widthsPx: ref.width,
      baselinesPx: ref.vertical,
    };
  }

  // Candidate rows. A candidate that is not installed takes its proxy's values.
  const rows = [];
  for (const cand of CANDIDATES) {
    const measured = raw.results[cand.face];
    const source = measured?.installed ? measured : raw.results[cand.proxy];
    if (!source || !source.installed) {
      throw new Error(`no measured values for ${cand.face} and no installed proxy ${cand.proxy ?? '(none)'}`);
    }
    const installed = Boolean(measured?.installed);
    const measuredOn = installed ? source.matched : cand.proxy;
    rows.push({
      face: cand.face,
      installed,
      measuredOn,
      kind: installed ? 'measured' : cand.kind,
      sources: [...cand.local.map((n) => `local("${n}")`)].join(', '),
      sizeAdjust: source.descriptors.sizeAdjust,
      ascentOverride: source.descriptors.ascentOverride,
      descentOverride: source.descriptors.descentOverride,
      lineGapOverride: source.descriptors.lineGapOverride,
      before: measured?.installed ? measured.before : null,
      after: measured?.installed ? measured.after : null,
    });
  }

  const payload = { chromium: version, real: realReport, candidates: rows };

  if (JSON_ONLY) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  console.log(`Chromium ${version}`);
  for (const [name, info] of Object.entries(realReport)) {
    console.log(`\n${name}  (${info.file}, ${info.bytes} bytes)`);
    console.log(`  unitsPerEm ${info.unitsPerEm}; USE_TYPO_METRICS ${info.usesTypoMetrics}; ascent ${info.used.ascent}, descent ${info.used.descent}, lineGap ${info.used.gap}`);
    console.log(`  ascent ${(info.ascentRatio * 100).toFixed(4)}% of em, descent ${(info.descentRatio * 100).toFixed(4)}% of em`);
    console.log(`  Chromium fontBoundingBox at 100 px: ascent ${info.chromiumFontBoundingBox100px.ascent100.toFixed(3)}, descent ${info.chromiumFontBoundingBox100px.descent100.toFixed(3)}`);
    console.log(`  axes: ${info.axes.map((a) => `${a.tag} ${a.min}-${a.max} (default ${a.default})`).join(', ')}`);
  }

  console.log('\nCandidates (deltas are candidate minus real, in px; "before" uses size-adjust 100% and no overrides)');
  for (const row of rows) {
    const head = `${row.face}: ${row.installed ? 'measured' : `proxy, ${row.kind}`} on "${row.measuredOn}"`;
    console.log(`\n${head}`);
    console.log(`  size-adjust ${row.sizeAdjust}, ascent-override ${row.ascentOverride}, descent-override ${row.descentOverride}, line-gap-override ${row.lineGapOverride}`);
    if (row.installed) {
      for (const w of row.before.widths) {
        const after = row.after.widths.find((x) => x.id === w.id);
        console.log(`  width ${w.id.padEnd(10)} real ${w.real.toFixed(3)}  before ${fmtDelta(w.delta)}  after ${fmtDelta(after.delta)}`);
      }
      for (const v of row.before.verticals) {
        const after = row.after.verticals.find((x) => x.id === v.id);
        console.log(`  baseline ${v.id.padEnd(11)} real ${v.real.baseline}/${v.real.height}  before ${fmtDelta(v.baselineDelta)}/${fmtDelta(v.heightDelta)}  after ${fmtDelta(after.baselineDelta)}/${fmtDelta(after.heightDelta)}`);
      }
    }
  }

  console.log('\n--- fonts.css @font-face block ---');
  console.log(buildCss(rows));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
