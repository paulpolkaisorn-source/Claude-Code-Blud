// Harness for the pricing section's 2D layer (architecture section 10a). The page is the section partial between two
// 100vh spacers, with no WebGL: the boot runs the same order as src/main.ts, then emits loader:done after the first
// tick, which starts the entrances. Playwright drives the scroll states and reads the console.
//
// Block themes (D23.1). With WebGL, src/choreo/theme-front.ts sets data-theme on each data-theme-block. This page has no
// GL, so window.__pricingQA stands in for that module: setBlocks() sets a theme on every block, and setFront(p2) places
// each block by its centre against the mean front line, as the module does. measure() reads each text element's
// colour and the ground under it (the nearest background inside its block, or the block's own ground), and returns
// the WCAG contrast against the size rule of direction.md heading 3 (4.5:1 for text, 3:1 for large text).
//
// ?gl=0 runs the no-WebGL path, where initPricing cuts the section's theme at p2 = 0.5 by scroll position.
import { bus } from '../src/core/bus';
import { registerEases } from '../src/core/ease';
import { env } from '../src/core/env';
import { initHover } from '../src/core/hover';
import { initScroll } from '../src/core/scroll';
import { PRIORITY, addTick, initTicker } from '../src/core/ticker';
import type { Theme } from '../src/core/types';
import { initPricing } from '../src/sections/pricing/pricing';

registerEases();
initTicker();
initScroll();
initHover();

const section = document.getElementById('pricing');
const gl = new URLSearchParams(window.location.search).get('gl') !== '0';
if (section instanceof HTMLElement) {
  initPricing({ el: section, reducedMotion: env.reducedMotion, gl });
}

const off = addTick(() => {
  off();
  bus.emit('loader:done');
}, PRIORITY.input);

/** One text element as measured: its colour, its ground, and the contrast between them. */
export interface TextCheck {
  block: string;
  text: string;
  size: number;
  colour: string;
  ground: string;
  ratio: number;
  need: number;
  pass: boolean;
}

/** One token pair from direction.md heading 3, as this page computes it from the token values. */
export interface PairCheck {
  id: string;
  text: string;
  ground: string;
  ratio: number;
  doc: number;
}

type Rgba = [number, number, number, number];

/**
 * A computed colour as Rgba (channels 0 to 255). Chromium reports a colour-mix() result as color(srgb r g b), with
 * channels from 0 to 1, and any other colour as rgb() or rgba().
 */
function parseColour(value: string): Rgba | null {
  const m = /rgba?\(([^)]+)\)/.exec(value);
  if (m !== null) {
    const parts = m[1].split(/[\s,/]+/).filter((p) => p !== '').map(Number);
    return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
  }
  const s = /^color\(srgb\s+([^)]+)\)$/.exec(value.trim());
  if (s !== null) {
    const parts = s[1].split(/[\s/]+/).filter((p) => p !== '').map(Number);
    return [parts[0] * 255, parts[1] * 255, parts[2] * 255, parts.length > 3 ? parts[3] : 1];
  }
  const hex = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (hex !== null) {
    const n = Number.parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  return null;
}

function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(c: Rgba): number {
  return 0.2126 * linear(c[0]) + 0.7152 * linear(c[1]) + 0.0722 * linear(c[2]);
}

/** WCAG 2 contrast ratio between two opaque colours. */
function ratio(a: Rgba, b: Rgba): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function blockOf(el: HTMLElement, root: HTMLElement): HTMLElement {
  return el.closest<HTMLElement>('[data-theme-block]') ?? root;
}

/** The first background, from el up to its block (inclusive), that is not transparent. Null when there is none. */
function groundOf(el: HTMLElement, block: HTMLElement): Rgba | null {
  for (let node: HTMLElement | null = el; node !== null; node = node.parentElement) {
    const c = parseColour(getComputedStyle(node).backgroundColor);
    if (c !== null && c[3] > 0) return c;
    if (node === block) break;
  }
  return null;
}

function blockName(block: HTMLElement, root: HTMLElement): string {
  if (block === root) return 'section';
  if (block.classList.contains('pricing__kicker')) return 'kicker';
  if (block.classList.contains('pricing__title')) return 'title';
  if (block.classList.contains('pricing__intro')) return 'intro';
  if (block.classList.contains('pricing__table-panel')) return 'table-panel';
  if (block.classList.contains('pricing__avail')) return 'availability';
  return block.className;
}

/** Text is an element that has a non-blank text node of its own. */
function textElements(root: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const seen = new Set<HTMLElement>();
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (!(node.textContent ?? '').trim()) continue;
    const parent = node.parentElement;
    if (parent === null || seen.has(parent)) continue;
    if (parent.closest('.sr-only, .gl-fallback') !== null) continue;
    seen.add(parent);
    out.push(parent);
  }
  return out;
}

function measure(root: HTMLElement): TextCheck[] {
  const rows: TextCheck[] = [];
  for (const el of textElements(root)) {
    const block = blockOf(el, root);
    const style = getComputedStyle(el);
    const colour = parseColour(style.color);
    const ground = groundOf(el, block) ?? parseColour(getComputedStyle(block).getPropertyValue('--bg').trim()) ?? null;
    if (colour === null || ground === null) {
      rows.push({ block: blockName(block, root), text: (el.textContent ?? '').trim().slice(0, 28), size: 0, colour: style.color, ground: 'unparsed', ratio: 0, need: 0, pass: false });
      continue;
    }
    const size = Number.parseFloat(style.fontSize);
    const bold = Number.parseInt(style.fontWeight, 10) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const need = large ? 3 : 4.5;
    const r = ratio(colour, ground);
    rows.push({
      block: blockName(block, root),
      text: (el.textContent ?? '').trim().slice(0, 28),
      size: Math.round(size * 100) / 100,
      colour: style.color,
      ground: `rgb(${ground[0]}, ${ground[1]}, ${ground[2]})`,
      ratio: Math.round(r * 100) / 100,
      need,
      pass: r >= need,
    });
  }
  return rows;
}

/** The token pairs of direction.md heading 3 that pricing uses, computed from the token values in this page. */
function pairs(root: HTMLElement): PairCheck[] {
  const probe = (theme: Theme | null): Record<string, Rgba | null> => {
    const div = document.createElement('div');
    if (theme !== null) div.dataset.theme = theme;
    root.appendChild(div);
    const cs = getComputedStyle(div);
    const get = (name: string): Rgba | null => parseColour(cs.getPropertyValue(name).trim());
    const out: Record<string, Rgba | null> = {
      bg: get('--bg'),
      raised: get('--bg-raised'),
      text1: get('--text-1'),
      text2: get('--text-2'),
      text3: get('--text-3'),
      hair: get('--rule-hair'),
      strong: get('--rule-strong'),
      seal: get('--seal-text'),
    };
    div.remove();
    return out;
  };
  const paper = probe(null);
  const ink = probe('ink');
  const rows: PairCheck[] = [];
  const add = (id: string, textName: string, ground: string, t: Rgba | null, g: Rgba | null, doc: number): void => {
    if (t === null || g === null) return;
    rows.push({ id, text: textName, ground, ratio: Math.round(ratio(t, g) * 100) / 100, doc });
  };
  // Paper theme (the :root values; the blocks use the same values through the scoped rule in pricing.css).
  add('P01', 'text-1', 'bg', paper.text1, paper.bg, 15.52);
  add('P02', 'text-1', 'bg-raised', paper.text1, paper.raised, 13.41);
  add('P03', 'text-2', 'bg', paper.text2, paper.bg, 8.61);
  add('P04', 'text-2', 'bg-raised', paper.text2, paper.raised, 7.44);
  add('P05', 'text-3', 'bg', paper.text3, paper.bg, 5.83);
  add('P06', 'text-3', 'bg-raised', paper.text3, paper.raised, 5.04);
  add('P07', 'seal-text', 'bg', paper.seal, paper.bg, 6.6);
  add('P08', 'seal-text', 'bg-raised', paper.seal, paper.raised, 5.71);
  add('P12', 'rule-hair (graphic)', 'bg', paper.hair, paper.bg, 3.74);
  add('P13', 'rule-hair (graphic)', 'bg-raised', paper.hair, paper.raised, 3.23);
  add('P11', 'rule-strong (graphic)', 'bg', paper.strong, paper.bg, 9.95);
  add('P18', 'rule-strong (graphic)', 'bg-raised', paper.strong, paper.raised, 8.6);
  // Ink theme.
  add('I01', 'text-1', 'bg', ink.text1, ink.bg, 15.52);
  add('I02', 'text-1', 'bg-raised', ink.text1, ink.raised, 13.67);
  add('I03', 'text-2', 'bg', ink.text2, ink.bg, 10.99);
  add('I04', 'text-2', 'bg-raised', ink.text2, ink.raised, 9.68);
  add('I05', 'text-3', 'bg', ink.text3, ink.bg, 6.78);
  add('I06', 'text-3', 'bg-raised', ink.text3, ink.raised, 5.97);
  add('I07', 'seal-text', 'bg', ink.seal, ink.bg, 6.11);
  add('I08', 'seal-text', 'bg-raised', ink.seal, ink.raised, 5.38);
  add('I12', 'rule-hair (graphic)', 'bg', ink.hair, ink.bg, 3.69);
  add('I13', 'rule-hair (graphic)', 'bg-raised', ink.hair, ink.raised, 3.25);
  add('I14', 'rule-strong (graphic)', 'bg', ink.strong, ink.bg, 13.41);
  add('I22', 'rule-strong (graphic)', 'bg-raised', ink.strong, ink.raised, 11.81);
  return rows;
}

/** The blocks of the section, in page order. */
function blocksOf(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-theme-block]'));
}

/**
 * Sets the theme of every block (or of the blocks in ids). The section's own theme is not touched, so a block can be
 * tested against a section of the other theme.
 */
function setBlocks(theme: Theme, ids?: readonly string[]): number {
  if (!(section instanceof HTMLElement)) return 0;
  const picked = blocksOf(section).filter((b) => ids === undefined || ids.includes(blockName(b, section)));
  for (const b of picked) b.dataset.theme = theme;
  return picked.length;
}

/**
 * Places each block as the theme front does (theme-front.ts): the paper (lower) theme when its centre is below the
 * front line, ink (upper) otherwise. The front line is (1.12 - 1.24 p) x the viewport height.
 */
function setFront(p2: number): { front: number; blocks: Record<string, Theme> } {
  const out: Record<string, Theme> = {};
  if (!(section instanceof HTMLElement)) return { front: 0, blocks: out };
  const front = (1.12 - 1.24 * p2) * window.innerHeight;
  for (const b of blocksOf(section)) {
    const r = b.getBoundingClientRect();
    const theme: Theme = r.top + r.height / 2 > front ? 'paper' : 'ink';
    b.dataset.theme = theme;
    out[blockName(b, section)] = theme;
  }
  return { front, blocks: out };
}

function setSection(theme: Theme): void {
  if (section instanceof HTMLElement) section.dataset.theme = theme;
}

/** For Playwright: the QA surface of this harness. */
declare global {
  interface Window {
    __pricingQA: {
      setBlocks(theme: Theme, ids?: readonly string[]): number;
      setFront(p2: number): { front: number; blocks: Record<string, Theme> };
      setSection(theme: Theme): void;
      measure(): TextCheck[];
      pairs(): PairCheck[];
    };
  }
}

if (section instanceof HTMLElement) {
  window.__pricingQA = {
    setBlocks,
    setFront,
    setSection,
    measure: () => measure(section),
    pairs: () => pairs(section),
  };
}
