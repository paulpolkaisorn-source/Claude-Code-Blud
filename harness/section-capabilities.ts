// Harness for the capabilities section's 2D layer (architecture section 10a). Open /harness/section-capabilities.html on
// the dev server. ?nogl adds html.no-gl, so the static elevations show. The page boots the same modules as main.ts,
// emits loader:done after its first tick, runs its checks on the next tick and writes the result to
// document.documentElement.dataset.harness ('pass' or 'fail:<names>') and dataset.harnessChecks (JSON).

import { bus } from '../src/core/bus';
import { registerEases } from '../src/core/ease';
import { env } from '../src/core/env';
import { initHover } from '../src/core/hover';
import { initScroll } from '../src/core/scroll';
import { addTick, initTicker } from '../src/core/ticker';
import { initCapabilities } from '../src/sections/capabilities/capabilities';

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

registerEases();
initTicker();
initScroll();
initHover();

const el = document.getElementById('capabilities');
if (!(el instanceof HTMLElement)) throw new Error('harness: #capabilities is missing');
const section: HTMLElement = el;

initCapabilities({ el: section, reducedMotion: env.reducedMotion, gl: false });

// ---------- Block themes (D23.1) ----------
// With WebGL, src/choreo/theme-front.ts sets data-theme on each data-theme-block. This page has no GL, so window.__capQA
// stands in: setBlocks(theme) sets every block to paper or ink and gives the section the ground of that theme, and
// measure() reads every text element and graphic in the section, with the ground under it, and returns the WCAG
// contrast against the rules of direction.md heading 3 (4.5:1 for text, 3:1 for graphics and borders).

type BlockTheme = 'paper' | 'ink';
type Rgba = [number, number, number, number];

interface MeasureRow {
  block: string;
  item: string;
  kind: 'text' | 'graphic';
  fg: string;
  bg: string;
  ratio: number;
  need: number;
  pass: boolean;
}

function blocksOf(): HTMLElement[] {
  return Array.from(section.querySelectorAll<HTMLElement>('[data-theme-block]'));
}

/** Sets every block to one theme, and the section to the ground of that theme (the shader's ground with WebGL). */
function setBlocks(theme: BlockTheme): number {
  const blocks = blocksOf();
  for (const block of blocks) block.dataset.theme = theme;
  section.style.background = theme === 'paper' ? 'var(--paper)' : 'var(--ink)';
  return blocks.length;
}

function clamp255(v: number): number {
  return Math.min(255, Math.max(0, v));
}

/** The sRGB channels (0 to 255) and alpha of a computed colour: rgb(), rgba(), color(srgb ...) or oklab(...). */
function channels(colour: string): Rgba | null {
  const text = colour.trim();
  const fn = /^(rgba?|oklab|color)\((.*)\)$/.exec(text);
  if (fn === null) return null;
  const kind: string = fn[1];
  let body = fn[2];
  if (kind === 'color') {
    // color(srgb r g b / a): the values are 0 to 1.
    if (!body.startsWith('srgb ')) return null;
    body = body.slice('srgb '.length);
  }
  const parts = body
    .replace('/', ' ')
    .split(/[\s,]+/)
    .filter((s) => s !== '')
    .map((s) => (s.endsWith('%') ? parseFloat(s) / 100 : parseFloat(s)));
  if (kind === 'rgb' || kind === 'rgba') {
    const [r, g, b, a] = parts;
    return [r, g, b, a ?? 1];
  }
  if (kind === 'color') {
    const [r, g, b, a] = parts;
    return [r * 255, g * 255, b * 255, a ?? 1];
  }
  // oklab(L a b / alpha): Oklab to linear sRGB, then the sRGB transfer.
  const [L, a1, b1, alpha] = parts;
  const l = (L + 0.3963377774 * a1 + 0.2158037573 * b1) ** 3;
  const m = (L - 0.1055613458 * a1 - 0.0638541728 * b1) ** 3;
  const s = (L - 0.0894841775 * a1 - 1.291485548 * b1) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const enc = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
  return [clamp255(enc(lin[0]) * 255), clamp255(enc(lin[1]) * 255), clamp255(enc(lin[2]) * 255), alpha ?? 1];
}

function linear(channel: number): number {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminance(c: Rgba): number {
  return 0.2126 * linear(c[0]) + 0.7152 * linear(c[1]) + 0.0722 * linear(c[2]);
}

function contrast(a: Rgba, b: Rgba): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function hex(c: Rgba): string {
  return `#${c
    .slice(0, 3)
    .map((v) => Math.round(v).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;
}

/** The ground under an element: its nearest background that is not transparent, up to and including the section. */
function groundOf(el: Element): Rgba | null {
  for (let node: Element | null = el; node !== null; node = node.parentElement) {
    const bg = channels(getComputedStyle(node).backgroundColor);
    if (bg !== null && bg[3] > 0) return bg;
    if (node === section) break;
  }
  return null;
}

function blockName(el: Element): string {
  const block = el.closest<HTMLElement>('[data-theme-block]');
  if (block === null) return 'none';
  if (block.dataset.card !== undefined) return `card ${Number(block.dataset.card) + 1}`;
  return block.classList.contains('cap__head') ? 'head' : 'intro';
}

/** Every text element and graphic in the section, with its colour and the ground under it. */
function measure(): MeasureRow[] {
  const rows: MeasureRow[] = [];
  const add = (block: string, item: string, kind: 'text' | 'graphic' | 'border', fgColour: string, bgEl: Element): void => {
    const fg = channels(fgColour);
    const bg = groundOf(bgEl);
    if (fg === null || bg === null) return;
    const need = kind === 'text' ? 4.5 : 3;
    const r = contrast(fg, bg);
    rows.push({ block, item, kind: kind === 'text' ? 'text' : 'graphic', fg: hex(fg), bg: hex(bg), ratio: Math.round(r * 100) / 100, need, pass: r >= need });
  };

  for (const el of Array.from(section.querySelectorAll<HTMLElement>('*'))) {
    if (el.getClientRects().length === 0) continue;
    const hasText = Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== '');
    if (!hasText) continue;
    const label = el.classList.contains('cap__char') ? 'title character (reveal start)' : `${el.tagName.toLowerCase()}.${el.className.toString().split(' ')[0]}`;
    add(blockName(el), label, 'text', getComputedStyle(el).color, el);
  }

  for (const shape of Array.from(section.querySelectorAll<SVGElement>('svg *'))) {
    if (shape.getClientRects().length === 0) continue;
    const cs = getComputedStyle(shape);
    if (parseFloat(cs.opacity) === 0) continue;
    const label = `svg ${shape.getAttribute('class') ?? shape.tagName}`;
    if (cs.stroke !== 'none' && parseFloat(cs.strokeWidth) > 0) add(blockName(shape), label, 'graphic', cs.stroke, shape);
    if (cs.fill !== 'none' && shape.getAttribute('fill') !== 'none') add(blockName(shape), label, 'graphic', cs.fill, shape);
  }

  for (const card of Array.from(section.querySelectorAll<HTMLElement>('.cap-card'))) {
    const name = blockName(card);
    add(name, 'card border (against the section ground)', 'border', getComputedStyle(card).borderTopColor, card.parentElement ?? card);
    const mark = card.querySelector<HTMLElement>('.cap-card__mark');
    if (mark !== null) {
      add(name, 'mark outline', 'graphic', getComputedStyle(mark).borderTopColor, card);
      const fill = channels(getComputedStyle(mark).backgroundColor);
      if (fill !== null && fill[3] > 0) add(name, 'mark fill (active)', 'graphic', getComputedStyle(mark).backgroundColor, card);
    }
  }
  return rows;
}

/** The theme tokens each block resolves to, for the report: the values the block's own colours come from. */
function blockTokens(): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const block of blocksOf()) {
    const cs = getComputedStyle(block);
    out[blockName(block)] = {
      theme: block.dataset.theme ?? '(none)',
      bg: cs.getPropertyValue('--bg').trim(),
      bgRaised: cs.getPropertyValue('--bg-raised').trim(),
      text1: cs.getPropertyValue('--text-1').trim(),
      text2: cs.getPropertyValue('--text-2').trim(),
      text3: cs.getPropertyValue('--text-3').trim(),
      sealText: cs.getPropertyValue('--seal-text').trim(),
      ruleHair: cs.getPropertyValue('--rule-hair').trim(),
      seal: cs.getPropertyValue('--seal').trim(),
    };
  }
  return out;
}

Object.assign(window, { __capQA: { setBlocks, measure, blockTokens } });

/** The checks that depend on this page's own markup and state. They run once the first layout pass has happened. */
function runChecks(): void {
  const checks: Check[] = [];
  const record = (name: string, ok: boolean, detail: string): void => {
    checks.push({ name, ok, detail });
  };

  const title = section.querySelector<HTMLElement>('h2#capabilities-title');
  record('title is the section h2', title !== null && section.getAttribute('aria-labelledby') === 'capabilities-title', String(title?.tagName));

  const cards = Array.from(section.querySelectorAll<HTMLElement>('.cap-card'));
  record('three cards', cards.length === 3, String(cards.length));
  const buttons = cards.map((card) => card.querySelector<HTMLButtonElement>('.cap-card__button'));
  const pressed = buttons.filter((b) => b?.getAttribute('aria-pressed') === 'true').length;
  record('exactly one card is pressed', pressed === 1, `pressed ${pressed}`);
  const stops = buttons.map((b) => b?.tabIndex ?? -2);
  record('roving tabindex: one stop at 0, the others -1', stops.filter((t) => t === 0).length === 1 && stops.filter((t) => t === -1).length === 2, stops.join(','));

  const boxes = cards.map((card) => card.getBoundingClientRect());
  record('cards have size', boxes.every((b) => b.width > 0 && b.height > 0), boxes.map((b) => `${Math.round(b.width)}x${Math.round(b.height)}`).join(' | '));

  const fallback = section.querySelectorAll('.cap__fallback svg rect');
  record('no-WebGL elevations hold 17 squares each', fallback.length === 51, String(fallback.length));
  const aria = Array.from(section.querySelectorAll<HTMLElement>('.gl-fallback')).every((f) => f.getAttribute('aria-hidden') === 'true');
  record('fallbacks are aria-hidden', aria, '');
  record('section carries the marker cursor', section.dataset.cursor === 'marker', String(section.dataset.cursor));

  const chars = section.querySelectorAll('.cap__char').length;
  if (env.reducedMotion) {
    record('reduced motion: title is not split', chars === 0 && title?.getAttribute('aria-label') === null, `chars ${chars}`);
  } else {
    record('title is split into characters until the reveal', chars > 0 || title?.getAttribute('aria-label') !== null, `chars ${chars}`);
  }

  // D23.1: one data-theme-block per visually separate text block: the head (kicker and title), the intro and three cards.
  const blocks = blocksOf();
  record('five theme blocks: head, intro, three cards', blocks.length === 5, String(blocks.length));
  record('no block carries a data-theme before a front sets one', blocks.every((b) => !b.hasAttribute('data-theme')), '');
  const first = blocks.length > 0 ? getComputedStyle(blocks[0]).getPropertyValue('--text-1').trim() : '';
  const sectionText1 = getComputedStyle(section).getPropertyValue('--text-1').trim();
  record('a block without a theme takes the section tokens', first !== '' && first === sectionText1, `${first} / ${sectionText1}`);

  const failed = checks.filter((c) => !c.ok).map((c) => c.name);
  document.documentElement.dataset.harnessChecks = JSON.stringify(checks);
  document.documentElement.dataset.harness = failed.length === 0 ? 'pass' : `fail:${failed.join('; ')}`;
}

let ticks = 0;
const stop = addTick(() => {
  ticks += 1;
  if (ticks === 1) {
    bus.emit('loader:done');
    return;
  }
  if (ticks === 2) {
    runChecks();
    stop();
  }
});
