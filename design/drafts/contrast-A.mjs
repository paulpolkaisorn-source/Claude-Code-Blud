// Direction A (editorial print): contrast and colour check.
// Run: node design/drafts/contrast-A.mjs
// Computes WCAG 2.x relative luminance and contrast ratios for every text/background
// and UI pair used by direction-A.md, and converts every palette token to OKLCH.
// Exits with code 1 when any pair is below its minimum.

// ---------- palette (sRGB hex) ----------
export const palette = {
  paper: '#F2EDE3',
  'paper-deep': '#E7E0D2',
  ink: '#14130F',
  'ink-raised': '#23211C',
  'text-1 paper': '#14130F',
  'text-2 paper': '#4A463D',
  'text-3 paper': '#5F5A4E',
  'text-1 ink': '#EFEADC',
  'text-2 ink': '#BDB7A8',
  'text-3 ink': '#A39D8E',
  'rule paper': '#CBC3B1',
  'rule ink': '#3A372F',
  'rule-strong paper': '#7E7767',
  'rule-strong ink': '#8A8474',
  accent: '#B5392B',
  'accent-text paper': '#9B2D21',
  'accent-text ink': '#EE7A64',
  'on-accent': '#F2EDE3',
  'focus paper': '#9B2D21',
  'focus ink': '#EE7A64',
  'block paper': '#1E1D19',
  'block ink': '#E4DECD',
};

// ---------- pairs that ship: [label, foreground key, background key, minimum ratio] ----------
export const pairs = [
  ['Body and headings, paper', 'text-1 paper', 'paper', 4.5],
  ['Secondary text, paper', 'text-2 paper', 'paper', 4.5],
  ['Tertiary text and mono labels, paper', 'text-3 paper', 'paper', 4.5],
  ['Body and headings, paper-deep', 'text-1 paper', 'paper-deep', 4.5],
  ['Secondary text, paper-deep', 'text-2 paper', 'paper-deep', 4.5],
  ['Tertiary text and mono labels, paper-deep', 'text-3 paper', 'paper-deep', 4.5],
  ['Accent text (links, code keywords), paper', 'accent-text paper', 'paper', 4.5],
  ['Accent text, paper-deep', 'accent-text paper', 'paper-deep', 4.5],
  ['Default button label, paper (paper on ink)', 'paper', 'ink', 4.5],
  ['Hover button label and selection, both themes (on-accent on accent)', 'on-accent', 'accent', 4.5],
  ['Pressed button label, paper (paper on accent-text)', 'paper', 'accent-text paper', 4.5],
  ['Field border and UI boundary, paper', 'rule-strong paper', 'paper', 3.0],
  ['Focus ring, paper', 'focus paper', 'paper', 3.0],
  ['Focus ring, paper-deep', 'focus paper', 'paper-deep', 3.0],
  ['Body and headings, ink', 'text-1 ink', 'ink', 4.5],
  ['Secondary text, ink', 'text-2 ink', 'ink', 4.5],
  ['Tertiary text and mono labels, ink', 'text-3 ink', 'ink', 4.5],
  ['Body and headings, ink-raised', 'text-1 ink', 'ink-raised', 4.5],
  ['Secondary text, ink-raised', 'text-2 ink', 'ink-raised', 4.5],
  ['Tertiary text and mono labels, ink-raised', 'text-3 ink', 'ink-raised', 4.5],
  ['Accent text (links, code keywords), ink', 'accent-text ink', 'ink', 4.5],
  ['Accent text, ink-raised', 'accent-text ink', 'ink-raised', 4.5],
  ['Default button label and selection, ink (ink on text-1)', 'ink', 'text-1 ink', 4.5],
  ['Hover button label, ink (ink on accent-text)', 'ink', 'accent-text ink', 4.5],
  ['Field border and UI boundary, ink', 'rule-strong ink', 'ink', 3.0],
  ['Focus ring, ink', 'focus ink', 'ink', 3.0],
  ['Focus ring, ink-raised', 'focus ink', 'ink-raised', 3.0],
];

// ---------- WCAG 2.x ----------
export const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
};
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
export const relativeLuminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrastRatio = (a, b) => {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
};

// ---------- OKLCH (Bjorn Ottosson's sRGB to OKLab matrices) ----------
export const toOklch = (hex) => {
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
  return { L, C, H };
};
export const oklchString = (hex) => {
  const { L, C, H } = toOklch(hex);
  return `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;
};

// ---------- self-test of the formulas ----------
let failed = false;
const selfChecks = [
  ['black on white contrast', contrastRatio('#000000', '#FFFFFF'), 21],
  ['white OKLCH lightness', toOklch('#FFFFFF').L, 1],
];
for (const [name, got, want] of selfChecks) {
  const ok = Math.abs(got - want) < 0.001;
  if (!ok) failed = true;
  console.log(`self-test ${name}: ${got.toFixed(3)} (expected ${want}) ${ok ? 'OK' : 'FAIL'}`);
}

// ---------- contrast table ----------
console.log('');
console.log('| Pair | Foreground | Background | Ratio | Minimum | Result |');
console.log('|---|---|---|---|---|---|');
for (const [label, fg, bg, min] of pairs) {
  const ratio = contrastRatio(palette[fg], palette[bg]);
  const ok = ratio >= min;
  if (!ok) failed = true;
  console.log(
    `| ${label} | ${fg} ${palette[fg]} | ${bg} ${palette[bg]} | ${ratio.toFixed(2)}:1 | ${min.toFixed(1)}:1 | ${ok ? 'PASS' : 'FAIL'} |`,
  );
}

// ---------- palette in OKLCH ----------
console.log('');
console.log('| Token | Hex | OKLCH |');
console.log('|---|---|---|');
for (const [name, hex] of Object.entries(palette)) {
  console.log(`| ${name} | ${hex} | ${oklchString(hex)} |`);
}

if (failed) {
  console.log('\nRESULT: FAIL');
  process.exitCode = 1;
} else {
  console.log('\nRESULT: all pairs pass');
}
