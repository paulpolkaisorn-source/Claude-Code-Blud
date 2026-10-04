// Clicky Keys — 2D canvas. A mechanical keyboard with five switch types, real
// keyboard + touch input, spring-loaded keycaps, a lighting wave that ripples
// across the board and a notepad that shows what you type. All sound is
// synthesized per keystroke (noise bursts + pitched sweeps), nothing sampled.

import { createCanvas2D, track, createLoop, rand, clamp, lerp, safeStorage, mulberry32 } from '../util.js';
import { Pad } from '../audio.js';

// ---------------------------------------------------------------- key data
const FONT_UI = '600 {s}px Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const FONT_MONO = '"SF Mono", ui-monospace, Menlo, Consolas, "DejaVu Sans Mono", "Liberation Mono", monospace';
const FONT_TYPEWRITER = '"Courier New", Courier, "Nimbus Mono PS", "Liberation Mono", "DejaVu Sans Mono", monospace';

const L = (s) => [...s].map((c) => ({ code: 'Key' + c.toUpperCase(), base: c, sh: c.toUpperCase(), kind: 'alpha', w: 1 }));
const S = (code, base, sh, w = 1) => ({ code, base, sh, kind: 'sym', w });
const M = (code, label, w, kind = 'mod', extra = {}) => ({ code, label, w, kind, ...extra });

const ROWS_FULL = [
  [S('Backquote', '`', '~'), S('Digit1', '1', '!'), S('Digit2', '2', '@'), S('Digit3', '3', '#'), S('Digit4', '4', '$'),
    S('Digit5', '5', '%'), S('Digit6', '6', '^'), S('Digit7', '7', '&'), S('Digit8', '8', '*'), S('Digit9', '9', '('),
    S('Digit0', '0', ')'), S('Minus', '-', '_'), S('Equal', '=', '+'), M('Backspace', 'Back', 2)],
  [M('Tab', 'Tab', 1.5), ...L('qwertyuiop'), S('BracketLeft', '[', '{'), S('BracketRight', ']', '}'), S('Backslash', '\\', '|', 1.5)],
  [M('CapsLock', 'Caps', 1.75), ...L('asdfghjkl'), S('Semicolon', ';', ':'), S('Quote', "'", '"'), M('Enter', 'Enter', 2.25, 'accent')],
  [M('ShiftLeft', 'Shift', 1.75), ...L('zxcvbnm'), S('Comma', ',', '<'), S('Period', '.', '>'), S('Slash', '/', '?'),
    M('ShiftRight', 'Shift', 1.25), M('ArrowUp', '', 1, 'arrow', { dir: 'up' }), M('Delete', 'Del', 1)],
  [M('ControlLeft', 'Ctrl', 1.25), M('MetaLeft', 'Cmd', 1.25), M('AltLeft', 'Alt', 1.25), M('Space', '', 6.25, 'space'),
    M('AltRight', 'Alt', 1), M('ControlRight', 'Ctrl', 1), M('ArrowLeft', '', 1, 'arrow', { dir: 'left' }),
    M('ArrowDown', '', 1, 'arrow', { dir: 'down' }), M('ArrowRight', '', 1, 'arrow', { dir: 'right' })],
];

// Compact (phone) layout: 10 wide, taller keys. Entries are code or [code, width].
const ROWS_COMPACT = [
  { off: 0, keys: ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'] },
  { off: 0, keys: [...'QWERTYUIOP'].map((c) => 'Key' + c) },
  { off: 0.5, keys: [...'ASDFGHJKL'].map((c) => 'Key' + c) },
  { off: 0, keys: [['ShiftLeft', 1.5], ...[...'ZXCVBNM'].map((c) => 'Key' + c), ['Backspace', 1.5]] },
  { off: 0, keys: [['Comma', 1.25], ['Space', 5.5], ['Period', 1.25], ['Enter', 2]] },
];

const INFO = {};
const ALPHA_ROWS = [];
ROWS_FULL.forEach((row, r) => {
  let x = 0;
  row.forEach((d) => {
    const info = { ...d, fx: x, fy: r, fw: d.w, row: r };
    // Pitch character of the key: big keys sound lower, plus a gentle position tilt.
    let pf = 1;
    if (d.code === 'Space') pf = 0.58;
    else if (d.code === 'Enter') pf = 0.76;
    else if (/^Shift/.test(d.code)) pf = 0.8;
    else if (d.code === 'Backspace') pf = 0.84;
    else if (d.code === 'Tab' || d.code === 'CapsLock') pf = 0.88;
    else if (d.kind === 'mod' || d.kind === 'arrow') pf = 0.94;
    pf *= 1.08 - ((x + d.w / 2) / 15) * 0.16;
    pf *= r === 0 ? 1.04 : r === 4 ? 0.97 : 1;
    let h = 0;
    for (let i = 0; i < d.code.length; i++) h = (h * 31 + d.code.charCodeAt(i)) % 997;
    pf *= 1 + ((h % 17) / 17 - 0.5) * 0.08;
    info.pf = pf;
    info.stab = d.code === 'Space' ? 1 : d.code === 'Enter' ? 0.75 : d.code === 'Backspace' || /^Shift/.test(d.code) ? 0.55 : d.code === 'Tab' || d.code === 'CapsLock' ? 0.3 : 0;
    info.pan = clamp(((x + d.w / 2) / 15 - 0.5) * 1.15, -0.6, 0.6);
    INFO[d.code] = info;
    x += d.w;
  });
  ALPHA_ROWS.push(row.filter((d) => d.kind === 'alpha').map((d) => INFO[d.code]));
});
const CODE_ALIAS = { NumpadEnter: 'Enter' };

// char -> {code, shift} for the demo typist
const CHAR_TO = {};
for (const info of Object.values(INFO)) {
  if (info.base) CHAR_TO[info.base] = { code: info.code, shift: false };
  if (info.sh && info.sh !== info.base) CHAR_TO[info.sh] = { code: info.code, shift: true };
}
CHAR_TO[' '] = { code: 'Space', shift: false };

// ---------------------------------------------------------------- themes
const THEMES = [
  {
    id: 'graphite', name: 'Graphite', swatch: '#5b6070', glow: [160, 130, 255], litScale: 0.6, caret: '#b9a4ff',
    bg: ['#1f2036', '#07070e'],
    caseTop: ['#6a6f80', '#3a3e4c'], caseFront: ['#2a2d38', '#14161d'], plate: ['#14151c', '#0a0b10'], logo: 'rgba(255,255,255,0.28)',
    alpha: { top: ['#555b6c', '#3f4452'], side: ['#343845', '#20232d'], leg: '#eceef7' },
    mod: { top: ['#434858', '#323644'], side: ['#2a2d39', '#191b23'], leg: '#b9bdcc' },
    accent: { top: ['#9672ee', '#7653d3'], side: ['#52389c', '#37256f'], leg: '#f7f2ff' },
  },
  {
    id: 'cream', name: 'Cream', swatch: '#f0e4cc', glow: [255, 205, 140], litScale: 0.7, caret: '#ffcf9a',
    bg: ['#3b2f29', '#110c09'],
    caseTop: ['#d9d3c7', '#a9a397'], caseFront: ['#8a8478', '#5b574f'], plate: ['#38332d', '#1f1b17'], logo: 'rgba(60,50,40,0.5)',
    alpha: { top: ['#f6ecd6', '#e6d9bb'], side: ['#d3c3a1', '#b9a885'], leg: '#5d5348' },
    mod: { top: ['#dccdac', '#cbbb97'], side: ['#bba98a', '#9e8c6d'], leg: '#5d5348' },
    accent: { top: ['#e58a5a', '#d07040'], side: ['#b4562c', '#8b3f1d'], leg: '#fff3e8' },
  },
  {
    id: 'pastel', name: 'Pastel', swatch: '#f6b7d3', glow: [255, 170, 225], litScale: 0.7, caret: '#ffb8e3',
    bg: ['#392c5c', '#150f2b'],
    caseTop: ['#efe8f8', '#bdb3d6'], caseFront: ['#a69bc2', '#766c93'], plate: ['#3a3250', '#211c33'], logo: 'rgba(90,70,130,0.45)',
    alpha: { top: ['#fff3f8', '#f6dfeb'], side: ['#e9c3d6', '#d3a5bd'], leg: '#8c6a88' },
    mod: { top: ['#cfe4f7', '#b8d3ee'], side: ['#9dbbda', '#7f9fc2'], leg: '#566f90' },
    accent: { top: ['#b8ecd8', '#97dcc1'], side: ['#6fc0a2', '#53a083'], leg: '#33705a' },
  },
  {
    id: 'rgb', name: 'Neon RGB', swatch: 'conic-gradient(#ff3b8d,#ffb13b,#8dff3b,#3bd5ff,#8a3bff,#ff3b8d)', glow: [140, 120, 255], litScale: 1, caret: '#7ee7ff', rgb: true,
    bg: ['#10101e', '#030307'],
    caseTop: ['#2a2b3a', '#14151e'], caseFront: ['#13141c', '#08080d'], plate: ['#07070c', '#030306'], logo: 'rgba(255,255,255,0.22)',
    alpha: { top: ['#2b2c3a', '#1c1d28'], side: ['#12121a', '#07070c'], leg: '#ffffff' },
    mod: { top: ['#262733', '#191a24'], side: ['#10101a', '#06060b'], leg: '#ffffff' },
    accent: { top: ['#2d2840', '#1e1a2e'], side: ['#120f1e', '#07050e'], leg: '#ffffff' },
  },
];

// ---------------------------------------------------------------- switches
const SWITCHES = [
  { id: 'clicky', label: 'Clicky', short: 'Clicky', hint: 'Clicky: a crisp click on the way down, a thock at the bottom.' },
  { id: 'tactile', label: 'Tactile', short: 'Tactile', hint: 'Tactile: a soft bump and a round thock.' },
  { id: 'linear', label: 'Linear', short: 'Linear', hint: 'Linear: smooth, deep and quiet.' },
  { id: 'creamy', label: 'Creamy', short: 'Creamy', hint: 'Creamy: dampened, marble-like thock.' },
  { id: 'typewriter', label: 'Typewriter', short: 'Typer', hint: 'Typewriter: heavy clack. Press Enter for the carriage bell.' },
];

const SENTENCES = [
  'Breathe in slowly, and let the day fall away.',
  'Soft rain on the window, warm light, nothing left to do.',
  'Just listen to the quiet clicks.',
];

const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

function rr(g, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

const NHUE = 24;

export function create(env) {
  const { audio, bus, hud, root, settings, gfx } = env;
  const lv = gfx.level;
  const store = safeStorage();

  let switchId = store.getItem('hush:keys:switch');
  if (!SWITCHES.some((s) => s.id === switchId)) switchId = 'clicky';
  let themeIdx = parseInt(store.getItem('hush:keys:theme') || '0', 10);
  if (!(themeIdx >= 0 && themeIdx < THEMES.length)) themeIdx = 0;
  let theme = THEMES[themeIdx];

  // text state
  let text = '';
  let lines = [''];
  let linesDirty = true;
  let scrollY = 0;
  let lastTypeT = -10;
  let keystrokes = 0;
  let capsOn = false;
  let shiftLatch = false;

  // layout state
  let compact = false;
  let U = 60, V = 60, gp = 3;
  let keys = [];
  const byCode = new Map();
  let caseR = { x: 0, y: 0, w: 0, h: 0, lip: 0, rad: 0 };
  let panelR = { x: 0, y: 0, w: 0, h: 0 };
  let boardX = 0, boardY = 0, boardW = 0, boardH = 0;
  let np = { fs: 18, lineH: 26, charW: 10, cols: 30, maxLines: 5, textX: 0, textTop: 0, hdr: 28, font: '' };
  let bgCanvas = null, fgCanvas = null, fgBox = null;
  let capSprites = new Map();
  let glowSet = [], ringSet = [];
  const sf0 = () => cv.dpr * Math.max(1, gfx.ss, lv >= 3 ? 1.25 : 1);

  // dynamic state
  const held = new Map(); // code -> source
  const ptrKey = new Map();
  let ripples = [];
  let sparks = [];
  let bokeh = [];
  let energy = 0;
  let hoverKey = null;
  let caretX = 0, caretY = 0;
  let elapsed = 0;
  let intens = new Float32Array(80);
  let intensHue = new Int8Array(80);
  let demo = null;
  let demoBtn = null;
  let alive = true;

  const MAX_RIPPLES = Math.round(6 + 8 * gfx.particles);
  const MAX_SPARKS = Math.round(40 * gfx.particles);

  const cv = createCanvas2D(root, { maxPixels: gfx.pixels2D, onResize: layout });
  const { ctx } = cv;

  // ------------------------------------------------------------ sprites
  function glowColor(i, a) {
    if (theme.rgb) return `hsla(${(i * 360) / NHUE},100%,62%,${a})`;
    return rgba(theme.glow, a);
  }

  function buildLightSets() {
    const n = theme.rgb ? NHUE : 1;
    glowSet = [];
    ringSet = [];
    for (let i = 0; i < n; i++) {
      const g = makeCanvas(96, 96);
      const gc = g.getContext('2d');
      const gr = gc.createRadialGradient(48, 48, 0, 48, 48, 48);
      gr.addColorStop(0, glowColor(i, 0.95));
      gr.addColorStop(0.3, glowColor(i, 0.5));
      gr.addColorStop(0.68, glowColor(i, 0.12));
      gr.addColorStop(1, glowColor(i, 0));
      gc.fillStyle = gr;
      gc.fillRect(0, 0, 96, 96);
      glowSet.push(g);
      const rsz = lv >= 3 ? 256 : 160;
      const r = makeCanvas(rsz, rsz);
      const rc = r.getContext('2d');
      const h = rsz / 2;
      const rg = rc.createRadialGradient(h, h, 0, h, h, h);
      rg.addColorStop(0, glowColor(i, 0));
      rg.addColorStop(0.55, glowColor(i, 0));
      rg.addColorStop(0.8, glowColor(i, 0.45));
      rg.addColorStop(0.88, glowColor(i, 0.8));
      rg.addColorStop(0.95, glowColor(i, 0.3));
      rg.addColorStop(1, glowColor(i, 0));
      rc.fillStyle = rg;
      rc.fillRect(0, 0, rsz, rsz);
      ringSet.push(r);
    }
  }
  const hueIdx = (deg) => (theme.rgb ? ((Math.round(deg / (360 / NHUE)) % NHUE) + NHUE) % NHUE : 0);

  function buildCap(pk, wU) {
    const pal = theme[pk];
    const sf = sf0();
    const Wk = wU * U;
    const bw = Wk - 2 * gp;
    const bh = V - 2 * gp;
    const pad = 2;
    const c = makeCanvas((bw + pad * 2) * sf, (bh + pad * 2) * sf);
    const g = c.getContext('2d');
    g.scale(sf, sf);
    g.translate(pad, pad);
    const r0 = Math.min(U * 0.17, bw * 0.22);
    // body (the sloped sides of the cap)
    let gr = g.createLinearGradient(0, 0, 0, bh);
    gr.addColorStop(0, pal.side[0]);
    gr.addColorStop(1, pal.side[1]);
    g.fillStyle = gr;
    rr(g, 0, 0, bw, bh, r0);
    g.fill();
    // lit lip along the bottom front edge
    gr = g.createLinearGradient(0, bh * 0.7, 0, bh);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(1, 'rgba(255,255,255,0.13)');
    g.fillStyle = gr;
    rr(g, 0, 0, bw, bh, r0);
    g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.42)';
    g.lineWidth = 0.9;
    rr(g, 0.45, 0.45, bw - 0.9, bh - 0.9, r0);
    g.stroke();
    // top face
    const il = U * 0.1, it = U * 0.06, ib = (V - U) * 0.15 + U * 0.17;
    const tx = il, ty = it, tw = bw - il * 2, th = bh - it - ib;
    const r1 = r0 * 0.72;
    g.save();
    g.shadowColor = 'rgba(0,0,0,0.38)';
    g.shadowBlur = U * 0.07 * sf;
    g.shadowOffsetY = U * 0.02 * sf;
    gr = g.createLinearGradient(tx, ty, tx + tw * 0.25, ty + th);
    gr.addColorStop(0, pal.top[0]);
    gr.addColorStop(1, pal.top[1]);
    g.fillStyle = gr;
    rr(g, tx, ty, tw, th, r1);
    g.fill();
    g.restore();
    g.save();
    rr(g, tx, ty, tw, th, r1);
    g.clip();
    if (lv >= 1) {
      // spherical dish: centre a touch darker, rim catches light
      const dg = g.createRadialGradient(tx + tw / 2, ty + th * 0.5, 0, tx + tw / 2, ty + th * 0.5, Math.max(tw, th) * 0.62);
      dg.addColorStop(0, 'rgba(0,0,0,0.09)');
      dg.addColorStop(0.65, 'rgba(0,0,0,0)');
      dg.addColorStop(1, 'rgba(255,255,255,0.07)');
      g.fillStyle = dg;
      g.fillRect(tx, ty, tw, th);
    }
    if (lv >= 2) {
      const sg = g.createLinearGradient(tx, ty, tx + tw * 0.4, ty + th * 0.7);
      sg.addColorStop(0, 'rgba(255,255,255,0.2)');
      sg.addColorStop(0.5, 'rgba(255,255,255,0.03)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = sg;
      g.fillRect(tx, ty, tw, th);
    }
    if (lv >= 3) {
      // fine ABS grain
      const rnd = mulberry32(wU * 977 + pk.length * 31);
      const n = Math.round((tw * th) / (lv >= 5 ? 7 : 12));
      for (let i = 0; i < n; i++) {
        g.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
        g.fillRect(tx + rnd() * tw, ty + rnd() * th, 0.7, 0.7);
      }
    }
    g.restore();
    // bevel line around the top face
    const bg = g.createLinearGradient(tx, ty, tx + tw * 0.4, ty + th);
    bg.addColorStop(0, 'rgba(255,255,255,0.4)');
    bg.addColorStop(0.5, 'rgba(255,255,255,0.05)');
    bg.addColorStop(1, 'rgba(0,0,0,0.3)');
    g.strokeStyle = bg;
    g.lineWidth = Math.max(0.8, U * 0.02);
    rr(g, tx + 0.4, ty + 0.4, tw - 0.8, th - 0.8, r1);
    g.stroke();
    return { c, cw: bw + pad * 2, ch: bh + pad * 2, pad, tx, ty, tw, th };
  }

  function capFor(key) {
    const pk = key.pk;
    const id = pk + '|' + key.w;
    let s = capSprites.get(id);
    if (!s) { s = buildCap(pk, key.w); capSprites.set(id, s); }
    return s;
  }

  // ------------------------------------------------------------ static layers
  function buildBG(w, h) {
    const dpr = cv.dpr;
    bgCanvas = makeCanvas(w * dpr, h * dpr);
    const g = bgCanvas.getContext('2d');
    g.scale(dpr, dpr);
    const gr = g.createRadialGradient(w / 2, h * 0.58, 0, w / 2, h * 0.58, Math.max(w, h) * 0.85);
    gr.addColorStop(0, theme.bg[0]);
    gr.addColorStop(1, theme.bg[1]);
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    // a warm lamp pool behind the board
    const lg = g.createRadialGradient(w / 2, caseR.y + caseR.h * 0.55, 0, w / 2, caseR.y + caseR.h * 0.55, caseR.w * 0.75);
    lg.addColorStop(0, rgba(theme.glow, 0.1));
    lg.addColorStop(1, rgba(theme.glow, 0));
    g.fillStyle = lg;
    g.fillRect(0, 0, w, h);
    if (lv >= 1) {
      // desk grain
      const rnd = mulberry32(5);
      g.globalAlpha = 0.5;
      for (let i = 0; i < 70; i++) {
        g.strokeStyle = `rgba(255,255,255,${0.012 + rnd() * 0.02})`;
        g.lineWidth = 0.6 + rnd() * 1.2;
        const y = rnd() * h;
        g.beginPath();
        g.moveTo(0, y);
        g.bezierCurveTo(w * 0.3, y + rnd() * 10 - 5, w * 0.7, y + rnd() * 10 - 5, w, y + rnd() * 8 - 4);
        g.stroke();
      }
      g.globalAlpha = 1;
    }
    const vg = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.8);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    g.fillStyle = vg;
    g.fillRect(0, 0, w, h);
  }

  function buildFG() {
    const dpr = cv.dpr;
    const m = Math.ceil(U * 1.4);
    const x0 = Math.floor(Math.min(caseR.x, panelR.x) - m);
    const y0 = Math.floor(Math.min(caseR.y, panelR.y) - m);
    const x1 = Math.ceil(Math.max(caseR.x + caseR.w, panelR.x + panelR.w) + m);
    const y1 = Math.ceil(caseR.y + caseR.h + m);
    fgBox = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    fgCanvas = makeCanvas(fgBox.w * dpr, fgBox.h * dpr);
    const g = fgCanvas.getContext('2d');
    g.scale(dpr, dpr);
    g.translate(-x0, -y0);
    const sh = (blur, oy, col) => {
      g.shadowColor = col;
      g.shadowBlur = blur * dpr;
      g.shadowOffsetY = oy * dpr;
    };
    const noSh = () => { g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0; };
    const c = caseR;
    const topH = c.h - c.lip;

    // case: soft ground shadow, front face, top surface
    g.save();
    sh(U * 1.0, U * 0.38, 'rgba(0,0,0,0.65)');
    g.fillStyle = '#000';
    rr(g, c.x, c.y + c.lip, c.w, topH, c.rad);
    g.fill();
    g.restore();
    let gr = g.createLinearGradient(0, c.y, 0, c.y + c.h);
    gr.addColorStop(0, theme.caseFront[0]);
    gr.addColorStop(1, theme.caseFront[1]);
    g.fillStyle = gr;
    rr(g, c.x, c.y + c.lip, c.w, topH, c.rad);
    g.fill();
    gr = g.createLinearGradient(c.x, c.y, c.x + c.w * 0.5, c.y + topH);
    gr.addColorStop(0, theme.caseTop[0]);
    gr.addColorStop(1, theme.caseTop[1]);
    g.fillStyle = gr;
    rr(g, c.x, c.y, c.w, topH, c.rad);
    g.fill();
    if (lv >= 2) {
      // brushed sheen
      g.save();
      rr(g, c.x, c.y, c.w, topH, c.rad);
      g.clip();
      const sg = g.createLinearGradient(c.x, c.y, c.x + c.w, c.y);
      sg.addColorStop(0, 'rgba(255,255,255,0)');
      sg.addColorStop(0.25, 'rgba(255,255,255,0.1)');
      sg.addColorStop(0.5, 'rgba(255,255,255,0)');
      sg.addColorStop(0.8, 'rgba(255,255,255,0.07)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = sg;
      g.fillRect(c.x, c.y, c.w, topH);
      g.restore();
    }
    // rim light
    const eg = g.createLinearGradient(0, c.y, 0, c.y + topH);
    eg.addColorStop(0, 'rgba(255,255,255,0.45)');
    eg.addColorStop(0.15, 'rgba(255,255,255,0.1)');
    eg.addColorStop(1, 'rgba(0,0,0,0.35)');
    g.strokeStyle = eg;
    g.lineWidth = Math.max(1, U * 0.022);
    rr(g, c.x + 0.5, c.y + 0.5, c.w - 1, topH - 1, c.rad);
    g.stroke();

    // plate recess
    const pm = U * 0.15;
    const px = boardX - pm, py = boardY - pm, pw = boardW + pm * 2, ph = boardH + pm * 2;
    const pr = U * 0.22;
    gr = g.createLinearGradient(0, py, 0, py + ph);
    gr.addColorStop(0, theme.plate[0]);
    gr.addColorStop(1, theme.plate[1]);
    g.fillStyle = gr;
    rr(g, px, py, pw, ph, pr);
    g.fill();
    g.save();
    rr(g, px, py, pw, ph, pr);
    g.clip();
    sh(U * 0.22, 0, 'rgba(0,0,0,0.85)');
    g.lineWidth = U * 0.34;
    g.strokeStyle = '#000';
    rr(g, px, py, pw, ph, pr);
    g.stroke();
    g.restore();
    g.strokeStyle = 'rgba(255,255,255,0.1)';
    g.lineWidth = 1;
    rr(g, px - 0.5, py - 0.5, pw + 1, ph + 1, pr + 0.5);
    g.stroke();

    // switch wells under every key
    for (const k of keys) {
      const Wk = k.w * U;
      g.fillStyle = 'rgba(0,0,0,0.55)';
      rr(g, k.x + gp * 0.35, k.y + gp * 0.35 + V * 0.03, Wk - gp * 0.7, V - gp * 0.7, U * 0.17);
      g.fill();
    }

    // screws + wordmark on the bezel
    if (lv >= 1) {
      const sr = Math.max(2, U * 0.055);
      for (const [sx, sy] of [[c.x + U * 0.2, c.y + U * 0.2], [c.x + c.w - U * 0.2, c.y + U * 0.2], [c.x + U * 0.2, c.y + topH - U * 0.2], [c.x + c.w - U * 0.2, c.y + topH - U * 0.2]]) {
        const sg = g.createRadialGradient(sx - sr * 0.3, sy - sr * 0.3, 0, sx, sy, sr * 1.2);
        sg.addColorStop(0, 'rgba(255,255,255,0.55)');
        sg.addColorStop(1, 'rgba(0,0,0,0.5)');
        g.fillStyle = sg;
        g.beginPath();
        g.arc(sx, sy, sr, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.55)';
        g.lineWidth = 0.9;
        g.beginPath();
        g.moveTo(sx - sr * 0.6, sy - sr * 0.3);
        g.lineTo(sx + sr * 0.6, sy + sr * 0.3);
        g.stroke();
      }
    }
    g.fillStyle = theme.logo;
    g.font = `700 ${Math.max(8, U * 0.17)}px Inter, system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    if ('letterSpacing' in g) g.letterSpacing = `${Math.max(2, U * 0.08)}px`;
    g.fillText('H U S H', c.x + c.w / 2, boardY + boardH + (c.y + topH - (boardY + boardH)) * 0.52);
    if ('letterSpacing' in g) g.letterSpacing = '0px';

    // notepad glass
    const p = panelR;
    const pRad = Math.max(12, U * 0.22);
    g.save();
    sh(U * 0.6, U * 0.2, 'rgba(0,0,0,0.5)');
    g.fillStyle = '#111220';
    rr(g, p.x, p.y, p.w, p.h, pRad);
    g.fill();
    g.restore();
    gr = g.createLinearGradient(0, p.y, 0, p.y + p.h);
    gr.addColorStop(0, '#1b1c30');
    gr.addColorStop(1, '#10111d');
    g.fillStyle = gr;
    rr(g, p.x, p.y, p.w, p.h, pRad);
    g.fill();
    g.save();
    rr(g, p.x, p.y, p.w, p.h, pRad);
    g.clip();
    g.fillStyle = 'rgba(255,255,255,0.045)';
    g.fillRect(p.x, p.y, p.w, np.hdr);
    g.fillStyle = 'rgba(255,255,255,0.07)';
    g.fillRect(p.x, p.y + np.hdr, p.w, 1);
    const wg = g.createRadialGradient(p.x + p.w / 2, p.y + p.h, 0, p.x + p.w / 2, p.y + p.h, p.w * 0.7);
    wg.addColorStop(0, rgba(theme.glow, 0.08));
    wg.addColorStop(1, rgba(theme.glow, 0));
    g.fillStyle = wg;
    g.fillRect(p.x, p.y, p.w, p.h);
    g.restore();
    const eg2 = g.createLinearGradient(0, p.y, 0, p.y + p.h);
    eg2.addColorStop(0, 'rgba(255,255,255,0.22)');
    eg2.addColorStop(1, 'rgba(255,255,255,0.05)');
    g.strokeStyle = eg2;
    g.lineWidth = 1;
    rr(g, p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1, pRad);
    g.stroke();
    const dotR = np.hdr * 0.13;
    ['#ff6b6b', '#ffd166', '#6be585'].forEach((col, i) => {
      g.fillStyle = col;
      g.globalAlpha = 0.55;
      g.beginPath();
      g.arc(p.x + 16 + i * dotR * 3.2, p.y + np.hdr / 2, dotR, 0, Math.PI * 2);
      g.fill();
    });
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(255,255,255,0.4)';
    g.font = `600 ${Math.max(10, np.hdr * 0.4)}px Inter, system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('notes.txt', p.x + p.w / 2, p.y + np.hdr / 2 + 0.5);
  }

  // ------------------------------------------------------------ layout
  function layout() {
    const w = cv.w;
    const h = cv.h;
    if (!w) return;
    compact = w < 600;
    const units = compact ? 10 : 15;
    const rowK = compact ? 1.26 : 1;
    const topPad = compact ? 54 : 58;
    const bottomPad = h < 480 ? 70 : compact ? 150 : 100;
    const availH = Math.max(160, h - topPad - bottomPad);
    const side = compact ? 8 : 18;
    const mO = 0.46;
    const gap = compact ? 14 : 22;
    const Uw = (w - side * 2) / (units + 2 * mO);
    const minPanel = clamp(availH * 0.3, 60, 180);
    const Uh = (availH - minPanel - gap) / (5 * rowK + 2 * mO + 0.25);
    U = clamp(Math.min(Uw, Uh, 84), 12, 84);
    V = U * rowK;
    gp = Math.max(1.5, U * 0.055);
    boardW = units * U;
    boardH = 5 * V;
    const lip = U * 0.2;
    const cw = boardW + 2 * mO * U;
    const ch = boardH + 2 * mO * U + lip;
    const pw = clamp(cw, 200, 860);
    const ph = clamp(availH - ch - gap, minPanel, compact ? 230 : 210);
    const total = ph + gap + ch;
    const y0 = topPad + Math.max(0, (availH - total) / 2);
    panelR = { x: (w - pw) / 2, y: y0, w: pw, h: ph };
    caseR = { x: (w - cw) / 2, y: y0 + ph + gap, w: cw, h: ch, lip, rad: U * 0.34 };
    boardX = caseR.x + mO * U;
    boardY = caseR.y + mO * U;

    // notepad metrics
    np.hdr = compact ? 24 : 30;
    np.fs = compact ? 15 : clamp(U * 0.27, 15, 21);
    np.lineH = Math.round(np.fs * 1.5);
    np.font = switchId === 'typewriter' ? FONT_TYPEWRITER : FONT_MONO;
    ctx.font = `${np.fs}px ${np.font}`;
    np.charW = ctx.measureText('M').width || np.fs * 0.6;
    const padX = compact ? 14 : 20;
    np.textX = panelR.x + padX;
    np.cols = Math.max(8, Math.floor((panelR.w - padX * 2 - 6) / np.charW));
    np.maxLines = clamp(Math.floor((panelR.h - np.hdr - 16) / np.lineH), 2, 6);
    np.textTop = panelR.y + np.hdr + (panelR.h - np.hdr - np.maxLines * np.lineH) / 2;
    linesDirty = true;

    // keys
    keys = [];
    byCode.clear();
    const rows = compact
      ? ROWS_COMPACT
      : ROWS_FULL.map((r) => ({ off: 0, keys: r.map((d) => [d.code, d.w]) }));
    rows.forEach((row, r) => {
      let x = row.off;
      for (const e of row.keys) {
        const code = Array.isArray(e) ? e[0] : e;
        const info = INFO[code];
        const kw = Array.isArray(e) ? e[1] : info.w;
        const key = {
          code, info, w: kw, u: x, r,
          x: boardX + x * U, y: boardY + r * V,
          pk: info.kind === 'accent' ? 'accent' : info.kind === 'mod' || info.kind === 'arrow' ? 'mod' : 'alpha',
          p: 0, v: 0, down: false, flash: 0, idx: keys.length,
        };
        key.cx = key.x + (kw * U) / 2;
        key.cy = key.y + V / 2;
        keys.push(key);
        byCode.set(code, key);
        x += kw;
      }
    });
    for (const code of held.keys()) { const k = byCode.get(code); if (k) { k.down = true; k.p = 1; } }
    ptrKey.clear();
    if (intens.length < keys.length) { intens = new Float32Array(keys.length); intensHue = new Int8Array(keys.length); }
    ripples = [];
    capSprites = new Map();
    buildLightSets();
    buildBG(w, h);
    buildFG();
    caretX = np.textX;
    caretY = np.textTop;
    if (!bokeh.length) {
      const n = Math.round(10 * gfx.particles);
      for (let i = 0; i < n; i++) bokeh.push({ x: Math.random(), y: Math.random(), r: rand(30, 110), sp: rand(0.004, 0.014), ph: rand(0, 6.28), hue: Math.random() * 360, a: rand(0.35, 1) });
    }
  }

  function rebuildTheme() {
    capSprites = new Map();
    buildLightSets();
    buildBG(cv.w, cv.h);
    buildFG();
    for (const k of keys) k.pk = k.info.kind === 'accent' ? 'accent' : k.info.kind === 'mod' || k.info.kind === 'arrow' ? 'mod' : 'alpha';
  }

  // ------------------------------------------------------------ text
  function wrapText(cols) {
    const out = [];
    for (const p of text.split('\n')) {
      let s = p;
      while (s.length > cols) {
        let cut = s.lastIndexOf(' ', cols);
        cut = cut <= 0 ? cols : cut + 1;
        out.push(s.slice(0, cut));
        s = s.slice(cut);
      }
      out.push(s);
    }
    return out;
  }

  function refreshLines() {
    const next = wrapText(np.cols);
    const prevN = lines.length;
    if (next.length !== prevN && Math.max(next.length, prevN) > np.maxLines) scrollY += (next.length > prevN ? 1 : -1) * np.lineH;
    lines = next;
    linesDirty = false;
  }

  const isShift = () => shiftLatch || held.has('ShiftLeft') || held.has('ShiftRight');

  function applyTyping(info, realKey) {
    const code = info.code;
    let changed = true;
    if (code === 'Backspace') {
      if (text.length) text = text.slice(0, -1);
      else changed = false;
    } else if (code === 'Enter') text += '\n';
    else if (code === 'Tab') text += '  ';
    else if (code === 'Space') text += ' ';
    else if (info.kind === 'alpha' || info.kind === 'sym') {
      if (realKey && realKey.length === 1) text += realKey;
      else if (info.kind === 'alpha') text += isShift() !== capsOn ? info.sh : info.base;
      else text += isShift() ? info.sh : info.base;
      shiftLatch = false;
    } else changed = false;
    if (changed) {
      if (text.length > 1800) text = text.slice(-1200);
      linesDirty = true;
      lastTypeT = elapsed;
    }
  }

  // ------------------------------------------------------------ sound
  const recent = [];
  function crowd(w) {
    const now = performance.now();
    while (recent.length && now - recent[0].t > 120) recent.shift();
    let c = 0;
    for (const e of recent) c += e.w;
    recent.push({ t: now, w });
    return c;
  }

  function soundDown(info, vel) {
    if (!audio.ready || !bus) return;
    const c = crowd(1);
    if (c > 9) return;
    const lite = c >= 3.5;
    const gm = 1 / (1 + 0.24 * c);
    const v = clamp(vel, 0.4, 1.1) * gm;
    const pf = info.pf * rand(0.96, 1.04);
    const pan = clamp(info.pan + rand(-0.06, 0.06), -0.8, 0.8);
    const T = (o) => audio.tone(bus, { pan, ...o });
    const N = (o) => audio.burst(bus, { pan, ...o });
    const big = info.stab > 0;
    switch (switchId) {
      case 'clicky': {
        N({ dur: 0.012, attack: 0.0003, gain: 0.4 * v, type: 'bandpass', freq: 3300 * pf, freqEnd: 2100 * pf, q: 1.3, send: 0.06 });
        if (!lite) T({ freq: 4400 * pf, freqEnd: 2700 * pf, dur: 0.012, gain: 0.12 * v, attack: 0.0005, send: 0.05 });
        const d = rand(0.014, 0.021);
        T({ freq: 200 * pf, freqEnd: 80 * pf, sweepTime: 0.05, dur: 0.09, gain: 0.46 * v, delay: d, attack: 0.001, send: 0.1 });
        N({ kind: 'pink', dur: 0.032, gain: 0.4 * v, type: 'lowpass', freq: 1700 * pf, freqEnd: 500, q: 0.7, delay: d, send: 0.08 });
        if (!lite) N({ dur: 0.012, gain: 0.16 * v, type: 'bandpass', freq: 2300 * pf, q: 1, delay: d, send: 0.05 });
        break;
      }
      case 'tactile': {
        N({ kind: 'pink', dur: 0.016, attack: 0.001, gain: 0.26 * v, type: 'lowpass', freq: 1200 * pf, q: 0.7, send: 0.06 });
        if (!lite) T({ freq: 340 * pf, freqEnd: 190 * pf, dur: 0.03, gain: 0.12 * v, attack: 0.002, send: 0.06 });
        const d = rand(0.02, 0.027);
        T({ freq: 178 * pf, freqEnd: 72 * pf, sweepTime: 0.06, dur: 0.1, gain: 0.5 * v, delay: d, attack: 0.001, send: 0.1 });
        N({ kind: 'pink', dur: 0.036, gain: 0.38 * v, type: 'bandpass', freq: 950 * pf, q: 0.8, delay: d, send: 0.08 });
        if (!lite) N({ dur: 0.01, gain: 0.1 * v, type: 'bandpass', freq: 1900 * pf, q: 1, delay: d, send: 0.05 });
        break;
      }
      case 'linear': {
        N({ dur: 0.008, attack: 0.0005, gain: 0.1 * v, type: 'bandpass', freq: 1700 * pf, q: 0.8, send: 0.05 });
        const d = rand(0.011, 0.016);
        T({ freq: 152 * pf, freqEnd: 62 * pf, sweepTime: 0.07, dur: 0.12, gain: 0.52 * v, delay: d, attack: 0.001, send: 0.1 });
        if (!lite) T({ freq: 310 * pf, freqEnd: 115 * pf, dur: 0.05, gain: 0.14 * v, delay: d, attack: 0.001, send: 0.08 });
        N({ kind: 'pink', dur: 0.045, gain: 0.4 * v, type: 'lowpass', freq: 720 * pf, q: 0.7, delay: d, send: 0.08 });
        break;
      }
      case 'creamy': {
        T({ freq: 106 * pf, freqEnd: 50 * pf, sweepTime: 0.09, dur: 0.17, gain: 0.58 * v, attack: 0.002, send: 0.14 });
        T({ freq: 245 * pf, freqEnd: 118 * pf, sweepTime: 0.05, dur: 0.07, gain: 0.26 * v, attack: 0.001, send: 0.12 });
        if (!lite) T({ freq: 520 * pf, freqEnd: 250 * pf, dur: 0.035, gain: 0.07 * v, attack: 0.001, send: 0.1 });
        N({ kind: 'pink', dur: 0.06, gain: 0.36 * v, type: 'lowpass', freq: 430 * pf, q: 0.8, attack: 0.002, send: 0.12 });
        break;
      }
      default: { // typewriter
        N({ dur: 0.02, attack: 0.0003, gain: 0.46 * v, type: 'bandpass', freq: 4200 * pf, q: 0.9, send: 0.08 });
        if (!lite) {
          N({ dur: 0.006, attack: 0.0002, gain: 0.2 * v, type: 'highpass', freq: 6500, send: 0.05 });
          N({ dur: 0.05, attack: 0.0004, gain: 0.2 * v, type: 'bandpass', freq: 1700 * pf, q: 6, send: 0.12 });
          N({ dur: 0.04, attack: 0.0004, gain: 0.12 * v, type: 'bandpass', freq: 2900 * pf, q: 6, send: 0.12 });
        }
        T({ freq: 128 * pf, freqEnd: 58 * pf, sweepTime: 0.06, dur: 0.12, gain: 0.5 * v, attack: 0.001, send: 0.1 });
        N({ kind: 'pink', dur: 0.03, gain: 0.3 * v, type: 'lowpass', freq: 800, q: 0.7, delay: 0.034, send: 0.08 });
        if (!lite) {
          N({ dur: 0.003, gain: 0.1 * v, type: 'bandpass', freq: 2600, q: 3, delay: 0.052, send: 0.05 });
          N({ dur: 0.003, gain: 0.09 * v, type: 'bandpass', freq: 2900, q: 3, delay: 0.064, send: 0.05 });
        }
        if (info.code === 'Enter') carriageReturn(pan, v, lite);
      }
    }
    if (big && !lite) rattle(info.stab, pan, v);
    if (info.code === 'Space') T({ freq: 90, freqEnd: 52, dur: 0.1, gain: 0.2 * v, delay: 0.012, attack: 0.002, send: 0.08 });
  }

  function rattle(amt, pan, v) {
    const n = amt > 0.8 ? 3 : amt > 0.4 ? 2 : 1;
    let d = 0.005;
    for (let i = 0; i < n; i++) {
      audio.burst(bus, { kind: 'white', dur: 0.005, attack: 0.0002, gain: 0.1 * amt * v, type: 'bandpass', freq: rand(2800, 4200), q: 4, pan: pan + rand(-0.05, 0.05), send: 0.05, delay: d });
      d += rand(0.006, 0.012);
    }
  }

  function carriageReturn(pan, v, lite) {
    const n = lite ? 7 : 13;
    for (let i = 0; i < n; i++) {
      audio.burst(bus, { kind: 'white', dur: 0.004, attack: 0.0002, gain: 0.075 * v, type: 'bandpass', freq: 2100 + i * 70 + rand(-200, 200), q: 3.5, pan, send: 0.06, delay: 0.07 + i * 0.024 + rand(0, 0.004) });
    }
    audio.burst(bus, { kind: 'pink', dur: n * 0.024, attack: 0.06, gain: 0.1 * v, type: 'bandpass', freq: 650, freqEnd: 2300, q: 1.1, pan, send: 0.1, delay: 0.07, curve: 'lin' });
    const end = 0.07 + n * 0.024 + 0.02;
    audio.tone(bus, { freq: 150, freqEnd: 62, dur: 0.1, gain: 0.34 * v, pan, send: 0.1, delay: end, attack: 0.001 });
    audio.burst(bus, { kind: 'pink', dur: 0.03, gain: 0.24 * v, type: 'lowpass', freq: 1400, pan, send: 0.08, delay: end });
    audio.bell(bus, { freq: 2350, gain: 0.1 * v, decay: 1.5, vel: 0.8, delay: end + 0.012, pan: pan * 0.5, send: 0.35, partials: [[1, 1, 1], [2.32, 0.35, 0.5], [4.1, 0.15, 0.3]] });
  }

  function soundUp(info, vel) {
    if (!audio.ready || !bus) return;
    const c = crowd(0.5);
    if (c > 5) return;
    const gm = 1 / (1 + 0.3 * c);
    const v = clamp(vel, 0.4, 1.1) * gm;
    const pf = info.pf * rand(0.96, 1.04);
    const pan = clamp(info.pan + rand(-0.06, 0.06), -0.8, 0.8);
    const T = (o) => audio.tone(bus, { pan, ...o });
    const N = (o) => audio.burst(bus, { pan, ...o });
    switch (switchId) {
      case 'clicky':
        N({ dur: 0.008, attack: 0.0003, gain: 0.17 * v, type: 'bandpass', freq: 2900 * pf, q: 1.2, send: 0.05 });
        T({ freq: 3700 * pf, freqEnd: 2400 * pf, dur: 0.01, gain: 0.05 * v, attack: 0.0005, send: 0.04 });
        N({ kind: 'pink', dur: 0.014, gain: 0.1 * v, type: 'lowpass', freq: 900, delay: 0.004, send: 0.05 });
        break;
      case 'tactile':
        N({ dur: 0.007, gain: 0.12 * v, type: 'bandpass', freq: 2000 * pf, q: 1, send: 0.05 });
        T({ freq: 280 * pf, freqEnd: 150 * pf, dur: 0.025, gain: 0.07 * v, send: 0.05 });
        break;
      case 'linear':
        N({ dur: 0.007, gain: 0.09 * v, type: 'bandpass', freq: 1500 * pf, q: 0.9, send: 0.05 });
        T({ freq: 220 * pf, freqEnd: 130 * pf, dur: 0.03, gain: 0.08 * v, send: 0.06 });
        break;
      case 'creamy':
        T({ freq: 175 * pf, freqEnd: 105 * pf, dur: 0.05, gain: 0.11 * v, attack: 0.002, send: 0.1 });
        N({ kind: 'pink', dur: 0.02, gain: 0.07 * v, type: 'lowpass', freq: 600, send: 0.08 });
        break;
      default:
        N({ dur: 0.012, gain: 0.14 * v, type: 'bandpass', freq: 1800 * pf, q: 2, send: 0.06 });
        T({ freq: 400 * pf, freqEnd: 220 * pf, dur: 0.03, gain: 0.09 * v, send: 0.06 });
    }
    if (info.stab > 0.4 && c < 2) rattle(info.stab * 0.5, pan, v);
  }

  // ------------------------------------------------------------ key press / release
  function ripple(x, y) {
    const hue = (x / Math.max(1, cv.w)) * 360 + elapsed * 40;
    ripples.push({ x, y, t: 0, hue: hueIdx(hue) });
    if (ripples.length > MAX_RIPPLES) ripples.shift();
  }

  function press(code, src, realKey, vel) {
    const info = INFO[code];
    if (!info || held.has(code)) return false;
    held.set(code, src);
    const key = byCode.get(code);
    let ox, oy;
    if (key) {
      key.down = true;
      key.v += 9;
      key.flash = 1;
      ox = key.cx;
      oy = key.cy;
    } else {
      ox = boardX + ((info.fx + info.fw / 2) / 15) * boardW;
      oy = boardY + (info.fy + 0.5) * V;
    }
    ripple(ox, oy);
    energy = Math.min(1.4, energy + 0.2);
    if (lv >= 2 && sparks.length < MAX_SPARKS) {
      const n = Math.round(2 * gfx.particles);
      const hi = hueIdx((ox / Math.max(1, cv.w)) * 360 + elapsed * 40);
      for (let i = 0; i < n; i++) sparks.push({ x: ox + rand(-U * 0.3, U * 0.3), y: oy - V * 0.1, vx: rand(-14, 14), vy: rand(-60, -22), t: 0, life: rand(0.6, 1.2), s: rand(0.6, 1.4), hue: hi });
    }
    if (code === 'CapsLock') capsOn = !capsOn;
    if (src !== 'kb' && /^Shift/.test(code) && src !== 'demo') shiftLatch = !shiftLatch;
    soundDown(info, vel ?? rand(0.8, 1));
    applyTyping(info, realKey);
    keystrokes++;
    hud.setStat(`Keystrokes ${keystrokes.toLocaleString()}`);
    return true;
  }

  function release(code, src, vel) {
    if (!held.has(code) || (src && held.get(code) !== src)) return;
    held.delete(code);
    const key = byCode.get(code);
    if (key) { key.down = false; key.v -= 1.5; }
    const info = INFO[code];
    if (info) soundUp(info, vel ?? rand(0.8, 1));
  }

  function releaseAll() {
    for (const [code, src] of [...held]) release(code, src);
    ptrKey.clear();
  }

  // ------------------------------------------------------------ real keyboard
  const PREVENT = new Set(['Space', 'Backspace', 'Tab', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Quote', 'Slash']);
  const settingsOpen = () => { const el = document.getElementById('settings'); return !!el && !el.hidden; };

  function onKeyDown(e) {
    if (e.key === 'Escape' || settingsOpen()) return;
    const t = e.target;
    if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    const code = CODE_ALIAS[e.code] || e.code;
    const info = INFO[code];
    if (!info) return;
    const isModKey = info.kind === 'mod' && /^(Control|Alt|Meta|Shift)/.test(code);
    if ((e.ctrlKey || e.metaKey || e.altKey) && !isModKey) return;
    if (PREVENT.has(code)) e.preventDefault();
    if (e.repeat) return;
    const ae = document.activeElement;
    if (ae && ae.tagName === 'BUTTON') ae.blur();
    audio.unlock?.();
    press(code, 'kb', e.key, rand(0.8, 1));
  }
  function onKeyUp(e) {
    const code = CODE_ALIAS[e.code] || e.code;
    if (!INFO[code]) return;
    if (PREVENT.has(code)) e.preventDefault();
    release(code, 'kb');
  }
  const onBlur = () => releaseAll();
  const onAmb = (e) => pad?.setLevel(e.detail ? padLevel : 0);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  window.addEventListener('hush:ambience', onAmb);

  // ------------------------------------------------------------ pointer
  function hit(x, y) {
    if (x < boardX || y < boardY || x >= boardX + boardW || y >= boardY + boardH) {
      // forgiving: allow a margin of half a key around the board
      if (x < boardX - U * 0.4 || y < boardY - V * 0.4 || x > boardX + boardW + U * 0.4 || y > boardY + boardH + V * 0.4) return null;
    }
    let best = null;
    let bd = Infinity;
    for (const k of keys) {
      const Wk = k.w * U;
      const dx = x < k.x ? k.x - x : x > k.x + Wk ? x - k.x - Wk : 0;
      const dy = y < k.y ? k.y - y : y > k.y + V ? y - k.y - V : 0;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = k; if (d === 0) break; }
    }
    return best;
  }

  const tracker = track(root, {
    hover: true,
    down(p) {
      audio.unlock?.();
      hoverKey = null;
      const k = hit(p.x, p.y);
      if (!k) return;
      const src = 'ptr' + p.id;
      if (press(k.code, src, null, rand(0.82, 1))) {
        ptrKey.set(p.id, k);
        audio.haptic?.(6);
      }
    },
    move(p) {
      if (!p.down) {
        const k = p.type === 'mouse' ? hit(p.x, p.y) : null;
        hoverKey = k;
        return;
      }
      const cur = ptrKey.get(p.id);
      if (Math.hypot(p.x - p.sx, p.y - p.sy) < U * 0.6) return;
      const k = hit(p.x, p.y);
      if (k === cur) return;
      const src = 'ptr' + p.id;
      if (cur) release(cur.code, src);
      ptrKey.delete(p.id);
      if (k && press(k.code, src, null, rand(0.7, 0.95))) ptrKey.set(p.id, k);
    },
    up(p) {
      const cur = ptrKey.get(p.id);
      ptrKey.delete(p.id);
      if (cur) release(cur.code, 'ptr' + p.id);
    },
    leave() { hoverKey = null; },
  });

  // ------------------------------------------------------------ demo typist
  function neighbor(code) {
    const info = INFO[code];
    if (!info || info.kind !== 'alpha') return null;
    const row = ALPHA_ROWS[info.row];
    const i = row.indexOf(info);
    const j = i + (Math.random() < 0.5 ? -1 : 1);
    return row[j] || row[i + (j < i ? 1 : -1)] || null;
  }

  function buildDemo() {
    const ev = [];
    let t = 0.35;
    let tempo = 1;
    const tap = (code, at, hold) => { ev.push({ t: at, type: 'd', code }); ev.push({ t: at + hold, type: 'u', code }); };
    const typeChar = (ch, at) => {
      const m = CHAR_TO[ch] || CHAR_TO[ch.toLowerCase()];
      if (!m) return;
      const needShift = m.shift || (ch !== ch.toLowerCase() && !/[^a-z]/i.test(ch));
      if (needShift) tap('ShiftLeft', at - 0.075, 0.2);
      tap(m.code, at, rand(0.06, 0.12));
    };
    SENTENCES.forEach((s, si) => {
      const typoAt = Math.random() < 0.8 ? 6 + Math.floor(Math.random() * (s.length - 12)) : -1;
      for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (i === typoAt && /[a-z]/.test(ch)) {
          const nb = neighbor('Key' + ch.toUpperCase());
          if (nb) {
            tap(nb.code, t, rand(0.06, 0.1));
            t += rand(0.2, 0.32);
            tap('Backspace', t, rand(0.07, 0.11));
            t += rand(0.14, 0.24);
          }
        }
        typeChar(ch, t);
        tempo = clamp(tempo + rand(-0.07, 0.07), 0.78, 1.3);
        let dt = rand(0.1, 0.19) * tempo;
        if (ch === ' ') dt += rand(0.03, 0.09);
        else if (ch === ',') dt += rand(0.22, 0.34);
        else if (ch === '.') dt += rand(0.3, 0.45);
        t += dt;
      }
      if (si < SENTENCES.length - 1) {
        t += rand(0.2, 0.35);
        tap('Enter', t, 0.11);
        t += rand(0.7, 1.0);
      }
    });
    ev.sort((a, b) => a.t - b.t);
    return { ev, i: 0, t: 0, end: t + 0.6 };
  }

  function stopDemo() {
    if (!demo) return;
    for (const [code, src] of [...held]) if (src === 'demo') release(code, 'demo');
    demo = null;
    if (demoBtn) demoBtn.textContent = 'Demo';
  }

  function toggleDemo() {
    audio.unlock?.();
    if (demo) { stopDemo(); return; }
    demo = buildDemo();
    if (demoBtn) demoBtn.textContent = 'Stop';
  }

  function stepDemo(dt) {
    if (!demo) return;
    demo.t += dt;
    while (demo.i < demo.ev.length && demo.ev[demo.i].t <= demo.t) {
      const e = demo.ev[demo.i++];
      if (e.type === 'd') press(e.code, 'demo', null, rand(0.7, 1));
      else release(e.code, 'demo', rand(0.7, 1));
    }
    if (demo.i >= demo.ev.length && demo.t > demo.end) stopDemo();
  }

  // ------------------------------------------------------------ HUD
  const styleEl = document.createElement('style');
  styleEl.textContent = '@media (max-width: 560px){.keys-seg button{padding:8px 9px !important;font-size:13px !important}.keys-seg{max-width:100%}}';
  document.head.appendChild(styleEl);
  const narrow = window.innerWidth < 560;
  const segApi = hud.segmented({
    label: narrow ? undefined : 'Switch',
    options: SWITCHES.map((s) => ({ id: s.id, label: narrow ? s.short : s.label })),
    value: switchId,
    onChange(id) {
      audio.unlock?.();
      switchId = id;
      store.setItem('hush:keys:switch', id);
      const nf = id === 'typewriter' ? FONT_TYPEWRITER : FONT_MONO;
      if (nf !== np.font) { np.font = nf; ctx.font = `${np.fs}px ${nf}`; np.charW = ctx.measureText('M').width || np.fs * 0.6; np.cols = Math.max(8, Math.floor((panelR.w - (compact ? 28 : 40) - 6) / np.charW)); linesDirty = true; }
      hud.setHint(SWITCHES.find((s) => s.id === id).hint, 4000);
      // audition the new switch
      const info = INFO.KeyH;
      soundDown(info, 0.9);
      setTimeout(() => { if (alive) soundUp(info, 0.9); }, 90);
    },
  });
  segApi.el.classList.add('keys-seg');
  hud.swatches({
    colors: THEMES.map((t) => t.swatch),
    value: themeIdx,
    onChange(i) {
      themeIdx = i;
      theme = THEMES[i];
      store.setItem('hush:keys:theme', String(i));
      rebuildTheme();
    },
  });
  demoBtn = hud.button({ label: 'Demo', title: 'Type a soothing sentence for you', onClick: toggleDemo });
  hud.setHint('Type on your keyboard, tap the keys, or press Demo.', 8000);
  hud.setStat('Keystrokes 0');

  // ------------------------------------------------------------ ambience
  let pad = null;
  const padLevel = 0.032;
  if (audio.ready && bus) {
    pad = new Pad(audio, bus, {
      chords: [[48, 55, 59, 64], [45, 52, 57, 60], [41, 48, 52, 57], [43, 50, 55, 59]],
      gain: settings.ambience ? padLevel : 0,
      cutoff: 800,
      period: 22,
    });
  }

  // ------------------------------------------------------------ render
  function updateKeys(dt) {
    const steps = Math.max(1, Math.ceil(dt / 0.008));
    const h = dt / steps;
    const K = 1500;
    const C = 58;
    for (const k of keys) {
      if (k.down || k.p !== 0 || k.v !== 0) {
        const target = k.down ? 1 : 0;
        for (let i = 0; i < steps; i++) {
          const a = (target - k.p) * K - k.v * C;
          k.v += a * h;
          k.p += k.v * h;
        }
        if (k.p > 1.15) { k.p = 1.15; if (k.v > 0) k.v = 0; }
        if (!k.down && Math.abs(k.p) < 0.002 && Math.abs(k.v) < 0.02) { k.p = 0; k.v = 0; }
      }
      if (k.flash > 0) k.flash = Math.max(0, k.flash - dt * 2.4);
    }
  }

  function updateLight(dt) {
    const speed = U * 9;
    const life = 1.15;
    const wid = U * 1.05;
    for (let i = ripples.length - 1; i >= 0; i--) {
      ripples[i].t += dt;
      if (ripples[i].t >= life) ripples.splice(i, 1);
    }
    for (const k of keys) {
      let I = k.flash * 0.9;
      let best = 0;
      let bh = 0;
      if (k.flash > 0) bh = hueIdx((k.cx / cv.w) * 360 + elapsed * 40);
      for (const r of ripples) {
        const rad = r.t * speed;
        const dx = k.cx - r.x;
        const dy = k.cy - r.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const z = (d - rad) / wid;
        if (z > 3 || z < -3) continue;
        const amp = Math.pow(1 - r.t / life, 1.6);
        const val = Math.exp(-z * z) * amp * 0.85;
        I += val;
        if (val > best) { best = val; bh = r.hue; }
      }
      intens[k.idx] = Math.min(1.3, I);
      intensHue[k.idx] = bh;
    }
  }

  function drawLegend(k, dz) {
    const info = k.info;
    const pal = theme[k.pk];
    const rgb = theme.rgb;
    const I = intens[k.idx];
    let col;
    if (rgb) {
      const hue = (info.fx * 24 + elapsed * 45) % 360;
      col = `hsl(${hue},100%,${Math.min(92, 66 + I * 26)}%)`;
    } else col = pal.leg;
    ctx.fillStyle = col;
    const cx = k.cx;
    const topC = k.y + gp + U * 0.06 + (V - 2 * gp - U * 0.06 - ((V - U) * 0.15 + U * 0.17)) / 2 + dz;
    if (info.kind === 'arrow') {
      const s = U * 0.13;
      ctx.beginPath();
      if (info.dir === 'up') { ctx.moveTo(cx, topC - s); ctx.lineTo(cx + s * 1.1, topC + s * 0.8); ctx.lineTo(cx - s * 1.1, topC + s * 0.8); }
      else if (info.dir === 'down') { ctx.moveTo(cx, topC + s); ctx.lineTo(cx + s * 1.1, topC - s * 0.8); ctx.lineTo(cx - s * 1.1, topC - s * 0.8); }
      else if (info.dir === 'left') { ctx.moveTo(cx - s, topC); ctx.lineTo(cx + s * 0.8, topC - s * 1.1); ctx.lineTo(cx + s * 0.8, topC + s * 1.1); }
      else { ctx.moveTo(cx + s, topC); ctx.lineTo(cx - s * 0.8, topC - s * 1.1); ctx.lineTo(cx - s * 0.8, topC + s * 1.1); }
      ctx.closePath();
      ctx.fill();
      return;
    }
    if (info.kind === 'space') return;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (info.kind === 'alpha') {
      ctx.font = fontMain;
      ctx.fillText(info.sh, cx, topC + 0.5);
    } else if (info.kind === 'sym') {
      const sh = isShift();
      if (compact) {
        ctx.font = fontMain;
        ctx.fillText(sh ? info.sh : info.base, cx, topC + 0.5);
      } else {
        ctx.font = fontSmall;
        ctx.globalAlpha = sh ? 1 : 0.6;
        ctx.fillText(info.sh, cx, topC - U * 0.14);
        ctx.globalAlpha = sh ? 0.6 : 1;
        ctx.fillText(info.base, cx, topC + U * 0.13);
        ctx.globalAlpha = 1;
      }
    } else {
      ctx.font = fontMod;
      ctx.fillText(info.label, cx, topC + 0.5);
    }
  }

  let fontMain = '', fontSmall = '', fontMod = '', fontKey = '';
  function setFonts() {
    fontKey = U.toFixed(2) + compact;
    fontMain = FONT_UI.replace('{s}', Math.max(10, U * (compact ? 0.38 : 0.33)).toFixed(1));
    fontSmall = FONT_UI.replace('{s}', Math.max(8, U * 0.24).toFixed(1));
    fontMod = FONT_UI.replace('{s}', Math.max(8.5, U * (compact ? 0.26 : 0.22)).toFixed(1));
  }

  function render(dt, time) {
    elapsed = time;
    const w = cv.w;
    const h = cv.h;
    if (!w || !bgCanvas) return;
    const rgb = theme.rgb;
    if (fontKey !== U.toFixed(2) + compact) setFonts();
    stepDemo(dt);
    updateKeys(dt);
    updateLight(dt);
    energy *= Math.exp(-1.1 * dt);
    if (linesDirty) refreshLines();
    scrollY *= Math.exp(-13 * dt);
    if (Math.abs(scrollY) < 0.05) scrollY = 0;

    // --- desk, ambient glow, bokeh
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(bgCanvas, 0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    const baseHue = hueIdx(time * 22);
    const ag = glowSet[rgb ? baseHue : 0];
    const aa = (rgb ? 0.1 : 0.05) + energy * (rgb ? 0.14 : 0.07);
    ctx.globalAlpha = aa;
    ctx.drawImage(ag, caseR.x - caseR.w * 0.2, caseR.y - caseR.h * 0.5, caseR.w * 1.4, caseR.h * 2);
    for (const b of bokeh) {
      const bx = ((b.x + Math.sin(time * b.sp * 6 + b.ph) * 0.03) % 1) * w;
      const by = (b.y + Math.cos(time * b.sp * 5 + b.ph) * 0.03) * h;
      ctx.globalAlpha = (0.05 + 0.05 * Math.sin(time * 0.4 + b.ph)) * b.a * (1 + energy * 1.6);
      const sp = glowSet[rgb ? hueIdx(b.hue + time * 14) : 0];
      ctx.drawImage(sp, bx - b.r, by - b.r, b.r * 2, b.r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // --- case + notepad glass
    ctx.drawImage(fgCanvas, fgBox.x, fgBox.y, fgBox.w, fgBox.h);

    // --- lighting wave across the case
    if (ripples.length) {
      ctx.save();
      rr(ctx, caseR.x, caseR.y, caseR.w, caseR.h - caseR.lip, caseR.rad);
      ctx.clip();
      ctx.globalCompositeOperation = 'lighter';
      const speed = U * 9;
      for (const r of ripples) {
        const rad = r.t * speed + U;
        ctx.globalAlpha = Math.pow(1 - r.t / 1.15, 1.5) * (rgb ? 0.5 : 0.22 * theme.litScale + 0.06);
        const s = rad / 0.86;
        ctx.drawImage(ringSet[r.hue], r.x - s, r.y - s, s * 2, s * 2);
      }
      ctx.restore();
    }

    // --- underglow in the gaps
    const ls = theme.litScale;
    ctx.globalCompositeOperation = 'lighter';
    if (rgb || lv >= 1) {
      for (const k of keys) {
        const I = intens[k.idx];
        const Wk = k.w * U;
        if (rgb) {
          const hi = hueIdx(k.info.fx * 24 + time * 45);
          const idle = 0.34 + 0.06 * Math.sin(time * 1.3 + k.info.fx);
          ctx.globalAlpha = idle;
          ctx.drawImage(glowSet[hi], k.cx - Wk * 0.78, k.cy - V * 0.8, Wk * 1.56, V * 1.6);
        }
        if (I > 0.03) {
          ctx.globalAlpha = Math.min(1, I * (rgb ? 0.95 : 0.55 * ls));
          ctx.drawImage(glowSet[intensHue[k.idx] % glowSet.length], k.cx - Wk * 0.85, k.cy - V * 0.9, Wk * 1.7, V * 1.8);
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // --- keycaps
    for (const k of keys) {
      const sp = capFor(k);
      const p = k.p;
      const dz = p * V * 0.085;
      const sc = 1 - 0.022 * clamp(p, -0.3, 1);
      const dw = sp.cw * sc;
      const dh = sp.ch * sc;
      const x = k.x + gp - sp.pad + (sp.cw - dw) / 2;
      const y = k.y + gp - sp.pad + dz + (sp.ch - dh) / 2;
      ctx.drawImage(sp.c, x, y, dw, dh);
      if (p > 0.02) {
        ctx.globalAlpha = Math.min(0.5, p * 0.16);
        ctx.fillStyle = '#000';
        rr(ctx, k.x + gp + sp.tx, k.y + gp + sp.ty + dz, sp.tw, sp.th, U * 0.12);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      drawLegend(k, dz);
      // lighting on the cap face
      const I = intens[k.idx] + (hoverKey === k ? 0.18 : 0);
      if (I > 0.03) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(0.5, I * (rgb ? 0.2 : 0.2 * ls));
        const hi = rgb ? intensHue[k.idx] % glowSet.length : 0;
        ctx.drawImage(glowSet[hi], k.x + gp + sp.tx - 2, k.y + gp + sp.ty + dz - 2, sp.tw + 4, sp.th + 4);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      // indicator lights (shift latch / caps lock)
      const code = k.code;
      if ((code === 'CapsLock' && capsOn) || (/^Shift/.test(code) && (shiftLatch || (held.has(code) && held.get(code) !== 'kb')))) {
        const rr0 = Math.max(1.8, U * 0.05);
        ctx.fillStyle = rgba(theme.rgb ? [120, 255, 200] : theme.glow, 0.95);
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = rr0 * 3;
        ctx.beginPath();
        ctx.arc(k.x + gp + U * 0.2, k.y + gp + U * 0.17 + dz, rr0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // --- sparks
    if (sparks.length) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.t += dt;
        if (s.t >= s.life) { sparks.splice(i, 1); continue; }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy *= 0.985;
        const a = 1 - s.t / s.life;
        ctx.globalAlpha = a * 0.7;
        const sz = U * 0.22 * s.s;
        ctx.drawImage(glowSet[s.hue % glowSet.length], s.x - sz / 2, s.y - sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    drawNotepad(dt, time);
  }

  function drawNotepad(dt, time) {
    const p = panelR;
    const n = lines.length;
    const start = Math.max(0, n - np.maxLines);
    ctx.save();
    ctx.beginPath();
    ctx.rect(p.x + 6, p.y + np.hdr + 2, p.w - 12, p.h - np.hdr - 8);
    ctx.clip();
    ctx.font = `${np.fs}px ${np.font}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    if (!text.length) {
      ctx.fillStyle = 'rgba(232,234,250,0.28)';
      ctx.fillText('start typing...', np.textX + np.charW * 0.4, np.textTop + np.lineH / 2);
    }
    for (let i = Math.max(0, start - 1); i < n; i++) {
      const row = i - start;
      const y = np.textTop + row * np.lineH + np.lineH / 2 + scrollY;
      const a = 0.45 + 0.55 * clamp((row + 1) / Math.max(1, np.maxLines - 1), 0, 1);
      ctx.fillStyle = `rgba(232,234,250,${(0.93 * a).toFixed(3)})`;
      ctx.fillText(lines[i], np.textX, y);
    }
    // caret
    const last = lines[n - 1] || '';
    const tx = np.textX + last.length * np.charW + 1;
    const ty = np.textTop + (n - 1 - start) * np.lineH;
    const kk = 1 - Math.exp(-28 * dt);
    caretX += (tx - caretX) * kk;
    caretY += (ty - caretY) * kk;
    const since = time - lastTypeT;
    const vis = since < 0.55 || Math.floor((since - 0.55) / 0.53) % 2 === 1 || !text.length && Math.floor(time / 0.53) % 2 === 0;
    if (vis) {
      const cc = theme.caret;
      ctx.fillStyle = cc;
      ctx.shadowColor = cc;
      ctx.shadowBlur = lv >= 1 ? 8 : 0;
      ctx.fillRect(caretX, caretY + np.lineH * 0.14 + scrollY, 2, np.lineH * 0.72);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  // everything is defined: first layout, then run
  layout();
  const loop = createLoop(render);

  return {
    destroy() {
      alive = false;
      loop.stop();
      stopDemo();
      releaseAll();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('hush:ambience', onAmb);
      tracker.dispose();
      pad?.stop();
      styleEl.remove();
      cv.dispose();
    },
  };
}
