// Vector lettering + logos used to build the embossed / printed details procedurally
// (no font files needed, so the result is identical on every machine).

const G = {
  S: { w: 6, s: [[[5.3, 1.0], [1.0, 1.0], [1.0, 5.0], [5.0, 5.0], [5.0, 9.0], [0.7, 9.0]]] },
  U: { w: 6, s: [[[1, 0.9], [1, 9], [5, 9], [5, 0.9]]] },
  N: { w: 6, s: [[[1, 9.1], [1, 1], [5, 9], [5, 0.9]]] },
  D: { w: 6, s: [[[1, 1], [3.6, 1], [5, 2.6], [5, 7.4], [3.6, 9], [1, 9], [1, 1]]] },
  O: { w: 6, s: [[[1, 2.6], [2.4, 1], [3.6, 1], [5, 2.6], [5, 7.4], [3.6, 9], [2.4, 9], [1, 7.4], [1, 2.6]]] },
  W: { w: 6.6, s: [[[0.6, 1], [1.9, 9], [3.3, 3.4], [4.7, 9], [6.0, 1]]] },
  A: { w: 6, s: [[[0.8, 9.2], [3, 0.8], [5.2, 9.2]], [[1.8, 6.6], [4.2, 6.6]]] },
  I: { w: 4, s: [[[2, 1], [2, 9]]] },
  H: { w: 6, s: [[[1, 1], [1, 9]], [[5, 1], [5, 9]], [[1, 5], [5, 5]]] },
  M: { w: 6.6, s: [[[0.8, 9.2], [0.8, 1], [3.3, 6], [5.8, 1], [5.8, 9.2]]] },
  ' ': { w: 3, s: [] },
};

export function wordWidth(text, gap = 0.5) {
  let w = 0;
  for (const ch of text) w += (G[ch]?.w ?? 6) + gap;
  return w - gap;
}

/**
 * Draw a word with stroked vector letters. (x,y) is the left/baseline-top corner in canvas px.
 * `h` is the cap height in px. Returns drawn width in px.
 */
export function drawWord(ctx, text, x, y, h, { thickness = 1.9, skew = 0.0, gap = 0.55, stretch = 1, color = '#fff', join = 'miter' } = {}) {
  const s = h / 10;
  ctx.save();
  ctx.translate(x, y);
  ctx.transform(1, 0, -skew, 1, skew * h, 0); // horizontal shear (italic)
  ctx.scale(s * stretch, s);
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.lineJoin = join;
  ctx.miterLimit = 2.2;
  ctx.lineCap = 'butt';
  let cx = 0;
  for (const ch of text) {
    const g = G[ch];
    if (!g) {
      cx += 6 + gap;
      continue;
    }
    for (const poly of g.s) {
      ctx.beginPath();
      poly.forEach(([px, py], i) => (i ? ctx.lineTo(cx + px, py) : ctx.moveTo(cx + px, py)));
      ctx.stroke();
    }
    cx += g.w + gap;
  }
  ctx.restore();
  return (cx - gap) * s * stretch;
}

/** The Sundown wordmark: tall condensed SUNDOWN over wide italic AUDIO. Origin = top-left, width = w px. */
export function drawSundownLogo(ctx, x, y, w, { color = '#fff', sliced = true } = {}) {
  const topH = w * 0.2;
  const topWUnits = wordWidth('SUNDOWN', 0.35);
  const sx = w / (topWUnits * (topH / 10));
  ctx.save();
  drawWord(ctx, 'SUNDOWN', x, y, topH, { thickness: 1.7, skew: 0.12, gap: 0.35, stretch: sx, color });
  const botH = w * 0.14;
  const botWUnits = wordWidth('AUDIO', 0.5);
  const sx2 = (w * 0.9) / (botWUnits * (botH / 10));
  drawWord(ctx, 'AUDIO', x + w * 0.1, y + topH * 1.08, botH, { thickness: 2.2, skew: 0.28, gap: 0.5, stretch: sx2, color });
  if (sliced) {
    // fine horizontal slice through the SUNDOWN row, like the printed logo
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 4, y + topH * 0.52, w + 8, Math.max(1, w * 0.008));
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
}

function smoothPath(ctx, pts, close = true, t = 0.5) {
  // Catmull-Rom -> cubic bezier
  const n = pts.length;
  const get = (i) => pts[(i + n) % n];
  ctx.moveTo(pts[0][0], pts[0][1]);
  const last = close ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = close ? get(i - 1) : pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = close ? get(i + 1) : pts[Math.min(n - 1, i + 1)];
    const p3 = close ? get(i + 2) : pts[Math.min(n - 1, i + 2)];
    const c1x = p1[0] + ((p2[0] - p0[0]) * t) / 3 * 2 * 0.5;
    const c1y = p1[1] + ((p2[1] - p0[1]) * t) / 3 * 2 * 0.5;
    const c2x = p2[0] - ((p3[0] - p1[0]) * t) / 3 * 2 * 0.5;
    const c2y = p2[1] - ((p3[1] - p1[1]) * t) / 3 * 2 * 0.5;
    ctx.bezierCurveTo(c1x, c1y, c2x, c2y, p2[0], p2[1]);
  }
  if (close) ctx.closePath();
}

/**
 * Alien-head emblem in normalised coordinates (head spans x -1..1, y -1..1.1; y down).
 * mode 'plate' fills the shield; 'lines' strokes the inner linework.
 */
export function drawAlienHead(ctx, cx, cy, size, { fill = '#fff', stroke = '#000', line = 0.03, mode = 'both' } = {}) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(size, size);
  const head = [
    [-0.96, -0.5], [-0.62, -0.78], [-0.28, -0.74], [0, -0.6], [0.28, -0.74], [0.62, -0.78], [0.96, -0.5],
    [0.9, -0.05], [0.72, 0.38], [0.4, 0.8], [0, 1.08], [-0.4, 0.8], [-0.72, 0.38], [-0.9, -0.05],
  ];
  const eyeL = [[-0.9, -0.38], [-0.62, -0.5], [-0.3, -0.3], [-0.1, 0.1], [-0.38, 0.14], [-0.7, 0.0]];
  const eyeR = eyeL.map(([x, y]) => [-x, y]);
  if (mode !== 'lines') {
    ctx.beginPath();
    smoothPath(ctx, head, true, 0.35);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (mode !== 'plate') {
    ctx.strokeStyle = stroke;
    ctx.fillStyle = stroke;
    ctx.lineWidth = line;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    smoothPath(ctx, head, true, 0.35);
    ctx.stroke();
    // second contour, a bit inside
    const inner = head.map(([x, y]) => [x * 0.9, y * 0.9 - 0.02]);
    ctx.lineWidth = line * 0.7;
    ctx.beginPath();
    smoothPath(ctx, inner, true, 0.35);
    ctx.stroke();
    // eyes
    for (const e of [eyeL, eyeR]) {
      ctx.lineWidth = line * 1.1;
      ctx.beginPath();
      smoothPath(ctx, e, true, 0.4);
      ctx.stroke();
      const e2 = e.map(([x, y]) => [x * 0.8 + (x < 0 ? -0.02 : 0.02), y * 0.8 - 0.02]);
      ctx.lineWidth = line * 0.6;
      ctx.beginPath();
      smoothPath(ctx, e2, true, 0.4);
      ctx.stroke();
    }
    // nostrils + mouth
    ctx.lineWidth = line * 0.9;
    ctx.beginPath();
    ctx.moveTo(-0.07, 0.36); ctx.lineTo(-0.02, 0.44);
    ctx.moveTo(0.07, 0.36); ctx.lineTo(0.02, 0.44);
    ctx.moveTo(-0.12, 0.62); ctx.quadraticCurveTo(0, 0.7, 0.12, 0.62);
    ctx.stroke();
  }
  ctx.restore();
}

/** Hornet / bee emblem inside a leaf-shaped shield (second band logo). */
export function drawBeeLogo(ctx, cx, cy, size, { fill = '#fff', stroke = '#000', line = 0.03, mode = 'both' } = {}) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(size, size);
  const shield = [
    [-0.62, -0.78], [-0.1, -1.0], [0.55, -0.7], [0.82, -0.05], [0.7, 0.62], [0.2, 1.0], [-0.4, 0.85], [-0.78, 0.2], [-0.82, -0.4],
  ];
  if (mode !== 'lines') {
    ctx.beginPath();
    smoothPath(ctx, shield, true, 0.4);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (mode !== 'plate') {
    ctx.strokeStyle = stroke;
    ctx.fillStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = line;
    ctx.beginPath();
    smoothPath(ctx, shield, true, 0.4);
    ctx.stroke();
    const inner = shield.map(([x, y]) => [x * 0.9, y * 0.9]);
    ctx.lineWidth = line * 0.6;
    ctx.beginPath();
    smoothPath(ctx, inner, true, 0.4);
    ctx.stroke();
    // wing (teardrop, upper left)
    ctx.lineWidth = line * 0.9;
    ctx.beginPath();
    smoothPath(ctx, [[-0.5, -0.62], [-0.18, -0.7], [0.05, -0.32], [-0.1, 0.05], [-0.42, -0.1], [-0.55, -0.38]], true, 0.45);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-0.45, -0.52); ctx.quadraticCurveTo(-0.25, -0.45, -0.18, -0.18);
    ctx.stroke();
    // head (big round eye) lower right
    ctx.beginPath();
    ctx.arc(0.22, 0.38, 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0.22, 0.38, 0.17, 0, Math.PI * 2);
    ctx.lineWidth = line * 0.6;
    ctx.stroke();
    // antennae + mandible + thorax stripes
    ctx.lineWidth = line * 0.8;
    ctx.beginPath();
    ctx.moveTo(0.1, 0.12); ctx.quadraticCurveTo(0.2, -0.2, 0.48, -0.32);
    ctx.moveTo(0.36, 0.14); ctx.quadraticCurveTo(0.5, -0.08, 0.66, -0.14);
    ctx.moveTo(-0.3, 0.3); ctx.quadraticCurveTo(-0.15, 0.45, 0.0, 0.62);
    ctx.moveTo(-0.34, 0.12); ctx.quadraticCurveTo(-0.2, 0.18, -0.05, 0.28);
    ctx.stroke();
  }
  ctx.restore();
}
