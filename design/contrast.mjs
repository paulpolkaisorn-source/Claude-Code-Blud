// Art direction, core file: the locked palette (draft B hex values) and every colour pair the layout uses.
// Run: node design/contrast.mjs
// Exit 0: every pair meets its ratio, self-tests pass and the bloom check passes.
// Exit 1: any failure. Output is pasted verbatim into design/direction.md, heading 3.
// Merged from design/drafts/contrast-A.mjs and contrast-B.mjs. Hex is the source of truth; OKLCH is computed.

const PALETTE = [
  { token: 'paper', hex: '#F1ECE0', role: 'Page ground, acts I and III (paper theme)' },
  { token: 'paper-deep', hex: '#E4DCCB', role: 'Second paper: plates, pricing panel, table bands, hover rows' },
  { token: 'ink', hex: '#151512', role: 'Page ground, act II (ink theme); paper-theme text-1' },
  { token: 'ink-raised', hex: '#22211D', role: 'Raised panels on ink: code panel, capability card, hover rows' },
  { token: 'text-1-paper', hex: '#151512', role: 'Paper theme: headings, body, numerals' },
  { token: 'text-2-paper', hex: '#45413A', role: 'Paper theme: lede, secondary body' },
  { token: 'text-3-paper', hex: '#5E5A51', role: 'Paper theme: mono labels, captions, dimension text' },
  { token: 'rule-hair-paper', hex: '#7D786A', role: 'Paper theme: 1px hairlines, dimension lines, preloader outlines' },
  { token: 'rule-strong-paper', hex: '#3A3831', role: 'Paper theme: table rules, input borders, title block rules, rest underline of links' },
  { token: 'text-1-ink', hex: '#F1ECE0', role: 'Ink theme: headings, body, numerals' },
  { token: 'text-2-ink', hex: '#CFC8B9', role: 'Ink theme: lede, secondary body' },
  { token: 'text-3-ink', hex: '#A39D90', role: 'Ink theme: mono labels, captions, code comments' },
  { token: 'rule-hair-ink', hex: '#75705F', role: 'Ink theme: 1px hairlines, dimension lines, phantom outlines' },
  { token: 'rule-strong-ink', hex: '#E4DCCB', role: 'Ink theme: table rules, input borders, active card border, rest underline of links' },
  { token: 'seal', hex: '#B5312A', role: 'Seal red on paper: kireji block and seal mark (fill only)' },
  { token: 'seal-text-paper', hex: '#9A2820', role: 'Seal red on paper as text, focus ring, hover fill, selection fill' },
  { token: 'seal-ink', hex: '#E7735F', role: 'Seal on ink: kireji block, kicker labels, code keywords, focus ring, hover fill, cursor marker' },
  { token: 'code-string', hex: '#D8C58F', role: 'Ink theme code strings (ochre)' },
  { token: 'focus-paper', hex: '#9A2820', role: 'Focus ring, paper theme (2px, 3px offset)' },
  { token: 'focus-ink', hex: '#E7735F', role: 'Focus ring, ink theme (2px, 3px offset)' },
  { token: 'block-anodized', hex: '#2B2A26', role: '3D only: block material base, paper acts' },
  { token: 'block-steel', hex: '#BDB7A9', role: '3D only: block material base, ink act' },
];

// need: 4.5 for text of any size; 3 for UI boundaries, focus indicators and graphics (WCAG 1.4.11).
const PAIRS = [
  // Paper theme (acts I and III)
  { id: 'P01', fg: 'text-1-paper', bg: 'paper', need: 4.5, use: 'Headings, body, numerals on the page ground' },
  { id: 'P02', fg: 'text-1-paper', bg: 'paper-deep', need: 4.5, use: 'Body on plates, pricing panel, hover rows' },
  { id: 'P03', fg: 'text-2-paper', bg: 'paper', need: 4.5, use: 'Lede and secondary body' },
  { id: 'P04', fg: 'text-2-paper', bg: 'paper-deep', need: 4.5, use: 'Secondary body on panels' },
  { id: 'P05', fg: 'text-3-paper', bg: 'paper', need: 4.5, use: 'Mono labels, captions, dimension text; colour settle starts here' },
  { id: 'P06', fg: 'text-3-paper', bg: 'paper-deep', need: 4.5, use: 'Mono labels and captions on panels' },
  { id: 'P07', fg: 'seal-text-paper', bg: 'paper', need: 4.5, use: 'Kicker labels, pricing emphasis, link hover underline' },
  { id: 'P08', fg: 'seal-text-paper', bg: 'paper-deep', need: 4.5, use: 'Kicker labels on panels' },
  { id: 'P09', fg: 'paper', bg: 'text-1-paper', need: 4.5, use: 'Primary button label on ink fill (paper theme)' },
  { id: 'P10', fg: 'paper', bg: 'seal-text-paper', need: 4.5, use: 'Primary button hover: paper label on seal-text fill' },
  { id: 'P11', fg: 'rule-strong-paper', bg: 'paper', need: 3, use: 'Table rules, input and secondary button borders, rest underline of links' },
  { id: 'P12', fg: 'rule-hair-paper', bg: 'paper', need: 3, use: 'Dimension lines, 1px hairlines, preloader outlines' },
  { id: 'P13', fg: 'rule-hair-paper', bg: 'paper-deep', need: 3, use: 'Dimension lines on panels' },
  { id: 'P14', fg: 'focus-paper', bg: 'paper', need: 3, use: 'Focus ring on paper' },
  { id: 'P15', fg: 'block-anodized', bg: 'paper', need: 3, use: '3D block material against the page (graphic)' },
  { id: 'P16', fg: 'seal', bg: 'paper', need: 3, use: 'Kireji block against the page, acts I and III (graphic)' },
  { id: 'P17', fg: 'focus-paper', bg: 'paper-deep', need: 3, use: 'Focus ring on paper-deep panels and table rows' },
  { id: 'P18', fg: 'rule-strong-paper', bg: 'paper-deep', need: 3, use: 'Table rules on the pricing panel (graphic)' },
  { id: 'P19', fg: 'paper', bg: 'seal-text-paper', need: 4.5, use: 'Selected text, paper theme (::selection: background seal-text, colour paper)' },
  // Ink theme (act II)
  { id: 'I01', fg: 'text-1-ink', bg: 'ink', need: 4.5, use: 'Headings, body, numerals on the page ground' },
  { id: 'I02', fg: 'text-1-ink', bg: 'ink-raised', need: 4.5, use: 'Code text on the code panel; body on the capability card' },
  { id: 'I03', fg: 'text-2-ink', bg: 'ink', need: 4.5, use: 'Lede and secondary body' },
  { id: 'I04', fg: 'text-2-ink', bg: 'ink-raised', need: 4.5, use: 'Secondary body on the capability card and code panel' },
  { id: 'I05', fg: 'text-3-ink', bg: 'ink', need: 4.5, use: 'Mono labels and captions' },
  { id: 'I06', fg: 'text-3-ink', bg: 'ink-raised', need: 4.5, use: 'Code comments and labels on panels' },
  { id: 'I07', fg: 'seal-ink', bg: 'ink', need: 4.5, use: 'Kicker labels; link hover underline on ink' },
  { id: 'I08', fg: 'seal-ink', bg: 'ink-raised', need: 4.5, use: 'Code keywords' },
  { id: 'I09', fg: 'code-string', bg: 'ink-raised', need: 4.5, use: 'Code strings' },
  { id: 'I10', fg: 'ink', bg: 'paper', need: 4.5, use: 'Primary button label on paper fill (ink theme)' },
  { id: 'I11', fg: 'ink', bg: 'seal-ink', need: 4.5, use: 'Primary button hover: ink label on seal-ink fill (ink theme)' },
  { id: 'I12', fg: 'rule-hair-ink', bg: 'ink', need: 3, use: 'Dimension lines, 1px hairlines' },
  { id: 'I13', fg: 'rule-hair-ink', bg: 'ink-raised', need: 3, use: 'Dimension lines on panels' },
  { id: 'I14', fg: 'rule-strong-ink', bg: 'ink', need: 3, use: 'Table rules, input and secondary button borders, rest underline of links' },
  { id: 'I15', fg: 'focus-ink', bg: 'ink', need: 3, use: 'Focus ring on ink' },
  { id: 'I16', fg: 'focus-ink', bg: 'ink-raised', need: 3, use: 'Focus ring on panels' },
  { id: 'I17', fg: 'block-steel', bg: 'ink', need: 3, use: '3D block material against the page (graphic)' },
  { id: 'I18', fg: 'seal-ink', bg: 'ink', need: 3, use: 'Kireji block against the page, act II (graphic); cursor marker' },
  { id: 'I19', fg: 'ink', bg: 'text-1-ink', need: 4.5, use: 'Selected text, ink theme (::selection: background text-1, colour ink)' },
  { id: 'I20', fg: 'rule-hair-ink', bg: 'ink', need: 3, use: 'Phantom outlines in the family section; inactive capability groups in the no-WebGL fallback (graphic)' },
  { id: 'I21', fg: 'seal-ink', bg: 'ink-raised', need: 3, use: 'Capability mark and cap-2 active step on a raised card (graphic)' },
  { id: 'I22', fg: 'rule-strong-ink', bg: 'ink-raised', need: 3, use: 'Active capability card border (graphic)' },
];

// ---------- colour maths ----------
const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const relLuminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b; // WCAG 2.x relative luminance
};
const contrastRatio = (fgHex, bgHex) => {
  const a = relLuminance(fgHex);
  const b = relLuminance(bgHex);
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
};
// OKLab (Bjorn Ottosson) from linear sRGB
const oklch = (hex) => {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C, H: C < 0.0005 ? 0 : H };
};
const hexOf = (token) => {
  const found = PALETTE.find((p) => p.token === token);
  if (!found) throw new Error(`unknown token ${token}`);
  return found.hex;
};
// Linear-space luminance of an sRGB colour whose channels are offset by delta (sRGB units), clamped to [0, 1].
const linearLumOffset = (hex, delta) => {
  const lin = hexToRgb(hex).map((c) => toLinear(Math.min(1, Math.max(0, c + delta))));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
};
const encodedLumOffset = (hex, delta) => {
  const enc = hexToRgb(hex).map((c) => Math.min(1, Math.max(0, c + delta)));
  return 0.2126 * enc[0] + 0.7152 * enc[1] + 0.0722 * enc[2];
};

const f2 = (n) => n.toFixed(2);
const f3 = (n) => n.toFixed(3);
const lines = [];
let failures = 0;

// ---------- self-tests ----------
const selfBlack = contrastRatio('#000000', '#FFFFFF');
const selfWhiteL = oklch('#FFFFFF').L;
const selfOk = Math.abs(selfBlack - 21) < 0.001 && Math.abs(selfWhiteL - 1) < 0.001;
if (!selfOk) failures += 1;
lines.push(`self-test black on white contrast: ${selfBlack.toFixed(3)} (expected 21) ${Math.abs(selfBlack - 21) < 0.001 ? 'OK' : 'FAIL'}`);
lines.push(`self-test white OKLCH lightness: ${selfWhiteL.toFixed(3)} (expected 1) ${Math.abs(selfWhiteL - 1) < 0.001 ? 'OK' : 'FAIL'}`);
lines.push('');

// ---------- palette ----------
lines.push('| Token | Hex | oklch() | Role |');
lines.push('|---|---|---|---|');
for (const p of PALETTE) {
  const o = oklch(p.hex);
  lines.push(`| ${p.token} | ${p.hex} | oklch(${f3(o.L)} ${f3(o.C)} ${o.H.toFixed(1)}) | ${p.role} |`);
}
lines.push('');

// ---------- pairs ----------
lines.push('| Pair | Text or graphic | Background | Ratio | Needs | Result | Use |');
lines.push('|---|---|---|---|---|---|---|');
for (const pr of PAIRS) {
  const fgHex = hexOf(pr.fg);
  const bgHex = hexOf(pr.bg);
  const ratio = contrastRatio(fgHex, bgHex);
  const pass = ratio >= pr.need;
  if (!pass) failures += 1;
  const kind = pr.need === 4.5 ? 'text' : 'graphic';
  lines.push(`| ${pr.id} | ${pr.fg} ${fgHex} (${kind}) | ${pr.bg} ${bgHex} | ${f2(ratio)}:1 | ${pr.need}:1 | ${pass ? 'PASS' : 'FAIL'} | ${pr.use} |`);
}
lines.push('');
lines.push(`Pairs checked: ${PAIRS.length}. Failures: ${failures}.`);
lines.push('');

// ---------- bloom threshold, linear working space (D11) ----------
const BLOOM = 0.96;
const bloomRows = [
  { name: 'paper base #F1ECE0', hex: '#F1ECE0', delta: 0 },
  { name: 'paper fibre peak (base +0.018 sRGB)', hex: '#F1ECE0', delta: 0.018 },
  { name: 'ink base #151512', hex: '#151512', delta: 0 },
  { name: 'ink fibre peak (base +0.010 sRGB)', hex: '#151512', delta: 0.010 },
];
lines.push('Bloom check: luminanceThreshold 0.96 compared in linear space (Rec. 709 weights on linear RGB).');
lines.push('| Surface | Linear luminance | Encoded luminance (information only) | Threshold | Result |');
lines.push('|---|---|---|---|---|');
for (const row of bloomRows) {
  const lin = linearLumOffset(row.hex, row.delta);
  const enc = encodedLumOffset(row.hex, row.delta);
  const pass = lin < BLOOM;
  if (!pass) failures += 1;
  lines.push(`| ${row.name} | ${f3(lin)} | ${f3(enc)} | ${BLOOM} | ${pass ? 'PASS (below threshold)' : 'FAIL (blooms)'} |`);
}
lines.push('');

console.log(lines.join('\n'));
if (failures > 0) {
  console.error(`FAIL: ${failures} check(s) failed`);
  process.exit(1);
}
console.log('RESULT: all pairs, self-tests and the bloom check pass.');
