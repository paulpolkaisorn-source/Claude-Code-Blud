// Art direction B (industrial object): palette, oklch() values and WCAG 2.x contrast.
// Run: node design/drafts/contrast-B.mjs
// Prints two markdown tables (palette, contrast) for design/drafts/direction-B.md section 3.
// Exits with code 1 if any pair fails its required ratio, so nothing below threshold can ship.

// ---------- palette (hex is the source of truth; oklch is computed) ----------
const PALETTE = [
  { token: 'paper', hex: '#F1ECE0', role: 'Page ground, Act I and Act III (paper theme)' },
  { token: 'paper-deep', hex: '#E4DCCB', role: 'Second paper tone: plates, pricing panel, table bands' },
  { token: 'ink', hex: '#151512', role: 'Page ground, Act II (ink theme); paper-theme text-1' },
  { token: 'ink-raised', hex: '#22211D', role: 'Raised panels on ink: code panel, capability card' },
  { token: 'text-1-paper', hex: '#151512', role: 'Paper theme: headings, body, numerals' },
  { token: 'text-2-paper', hex: '#45413A', role: 'Paper theme: lede, secondary body' },
  { token: 'text-3-paper', hex: '#5E5A51', role: 'Paper theme: mono labels, captions, dimension text' },
  { token: 'rule-hair-paper', hex: '#7D786A', role: 'Paper theme: 1px hairlines, dimension lines' },
  { token: 'rule-strong-paper', hex: '#3A3831', role: 'Paper theme: table rules, input borders, 2px title block rules' },
  { token: 'text-1-ink', hex: '#F1ECE0', role: 'Ink theme: headings, body, numerals' },
  { token: 'text-2-ink', hex: '#CFC8B9', role: 'Ink theme: lede, secondary body' },
  { token: 'text-3-ink', hex: '#A39D90', role: 'Ink theme: mono labels, captions, code comments' },
  { token: 'rule-hair-ink', hex: '#75705F', role: 'Ink theme: 1px hairlines, dimension lines' },
  { token: 'rule-strong-ink', hex: '#E4DCCB', role: 'Ink theme: table rules, input borders, title block rules' },
  { token: 'seal', hex: '#B5312A', role: 'Accent fill (cinnabar seal red) on paper: kireji block, seal mark' },
  { token: 'seal-text-paper', hex: '#9A2820', role: 'Accent as text on paper: kicker labels, link underline, focus ring on paper' },
  { token: 'seal-ink', hex: '#E7735F', role: 'Accent on ink: kicker labels, kireji block, code keywords, focus ring on ink' },
  { token: 'code-string', hex: '#D8C58F', role: 'Ink theme code strings (ochre)' },
  { token: 'focus-paper', hex: '#9A2820', role: 'Focus ring, paper theme (2px, 3px offset)' },
  { token: 'focus-ink', hex: '#E7735F', role: 'Focus ring, ink theme (2px, 3px offset)' },
  { token: 'block-anodized', hex: '#2B2A26', role: '3D only: block material base, paper acts' },
  { token: 'block-steel', hex: '#BDB7A9', role: '3D only: block material base, ink act' },
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

// ---------- every text / UI / graphic pair the layout uses ----------
// need: 4.5 for text of any size, 3 for UI boundaries, focus indicators and graphics (WCAG 1.4.11)
const PAIRS = [
  // Paper theme (Act I and Act III)
  { id: 'P01', fg: 'text-1-paper', bg: 'paper', need: 4.5, use: 'Headings, body on page ground' },
  { id: 'P02', fg: 'text-1-paper', bg: 'paper-deep', need: 4.5, use: 'Body on plates and pricing panel' },
  { id: 'P03', fg: 'text-2-paper', bg: 'paper', need: 4.5, use: 'Lede and secondary body' },
  { id: 'P04', fg: 'text-2-paper', bg: 'paper-deep', need: 4.5, use: 'Secondary body on panels' },
  { id: 'P05', fg: 'text-3-paper', bg: 'paper', need: 4.5, use: 'Mono labels and captions' },
  { id: 'P06', fg: 'text-3-paper', bg: 'paper-deep', need: 4.5, use: 'Mono labels and captions on panels' },
  { id: 'P07', fg: 'seal-text-paper', bg: 'paper', need: 4.5, use: 'Kicker labels, link text, pricing emphasis' },
  { id: 'P08', fg: 'seal-text-paper', bg: 'paper-deep', need: 4.5, use: 'Kicker labels on panels' },
  { id: 'P09', fg: 'paper', bg: 'text-1-paper', need: 4.5, use: 'Primary button: paper label on ink fill' },
  { id: 'P10', fg: 'paper', bg: 'seal-text-paper', need: 4.5, use: 'Primary button hover: paper label on seal fill' },
  { id: 'P11', fg: 'rule-strong-paper', bg: 'paper', need: 3, use: 'Table rules, input borders' },
  { id: 'P12', fg: 'rule-hair-paper', bg: 'paper', need: 3, use: 'Dimension lines and 1px hairlines' },
  { id: 'P13', fg: 'rule-hair-paper', bg: 'paper-deep', need: 3, use: 'Dimension lines on panels' },
  { id: 'P14', fg: 'focus-paper', bg: 'paper', need: 3, use: 'Focus ring on paper' },
  { id: 'P15', fg: 'block-anodized', bg: 'paper', need: 3, use: '3D block material vs page (graphic)' },
  { id: 'P16', fg: 'seal', bg: 'paper', need: 3, use: 'Kireji block vs page, Act I and III (graphic)' },
  // Ink theme (Act II)
  { id: 'I01', fg: 'text-1-ink', bg: 'ink', need: 4.5, use: 'Headings, body on page ground' },
  { id: 'I02', fg: 'text-1-ink', bg: 'ink-raised', need: 4.5, use: 'Code text on code panel' },
  { id: 'I03', fg: 'text-2-ink', bg: 'ink', need: 4.5, use: 'Lede and secondary body' },
  { id: 'I04', fg: 'text-2-ink', bg: 'ink-raised', need: 4.5, use: 'Secondary body on capability card' },
  { id: 'I05', fg: 'text-3-ink', bg: 'ink', need: 4.5, use: 'Mono labels and captions' },
  { id: 'I06', fg: 'text-3-ink', bg: 'ink-raised', need: 4.5, use: 'Code comments and labels on panels' },
  { id: 'I07', fg: 'seal-ink', bg: 'ink', need: 4.5, use: 'Kicker labels on page ground' },
  { id: 'I08', fg: 'seal-ink', bg: 'ink-raised', need: 4.5, use: 'Code keywords' },
  { id: 'I09', fg: 'code-string', bg: 'ink-raised', need: 4.5, use: 'Code strings' },
  { id: 'I10', fg: 'ink', bg: 'paper', need: 4.5, use: 'Primary button label on paper fill (ink theme)' },
  { id: 'I11', fg: 'ink', bg: 'seal-ink', need: 4.5, use: 'Primary button pressed: ink label on seal fill' },
  { id: 'I12', fg: 'rule-hair-ink', bg: 'ink', need: 3, use: 'Dimension lines and 1px hairlines' },
  { id: 'I13', fg: 'rule-hair-ink', bg: 'ink-raised', need: 3, use: 'Dimension lines on panels' },
  { id: 'I14', fg: 'rule-strong-ink', bg: 'ink', need: 3, use: 'Table rules, input borders' },
  { id: 'I15', fg: 'focus-ink', bg: 'ink', need: 3, use: 'Focus ring on ink' },
  { id: 'I16', fg: 'focus-ink', bg: 'ink-raised', need: 3, use: 'Focus ring on ink-raised panels' },
  { id: 'I17', fg: 'block-steel', bg: 'ink', need: 3, use: '3D block material vs page (graphic)' },
  { id: 'I18', fg: 'seal-ink', bg: 'ink', need: 3, use: 'Kireji block vs page, Act II (graphic)' },
];

// ---------- output ----------
const f2 = (n) => n.toFixed(2);
const f3 = (n) => n.toFixed(3);
const lines = [];
lines.push('| Token | Hex | oklch() | Role |');
lines.push('|---|---|---|---|');
for (const p of PALETTE) {
  const o = oklch(p.hex);
  lines.push(`| ${p.token} | ${p.hex} | oklch(${f3(o.L)} ${f3(o.C)} ${o.H.toFixed(1)}) | ${p.role} |`);
}
lines.push('');
lines.push('| Pair | Text or graphic | Background | Ratio | Needs | Result | Use |');
lines.push('|---|---|---|---|---|---|---|');
let failures = 0;
for (const pr of PAIRS) {
  const fgHex = hexOf(pr.fg);
  const bgHex = hexOf(pr.bg);
  const ratio = contrastRatio(fgHex, bgHex);
  const pass = ratio >= pr.need;
  if (!pass) failures += 1;
  lines.push(`| ${pr.id} | ${pr.fg} ${fgHex} | ${pr.bg} ${bgHex} | ${f2(ratio)}:1 | ${pr.need}:1 | ${pass ? 'PASS' : 'FAIL'} | ${pr.use} |`);
}
lines.push('');
lines.push(`Pairs checked: ${PAIRS.length}. Failures: ${failures}.`);
console.log(lines.join('\n'));
if (failures > 0) {
  console.error(`FAIL: ${failures} pair(s) below required contrast`);
  process.exit(1);
}
