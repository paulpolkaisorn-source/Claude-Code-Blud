// Vector re-drawings of the markings found on the InHuman: the SUNDOWN AUDIO
// wordmark (dust cap, flange badges, motor boot), the INHUMAN model name and
// the alien head emblem. Everything is drawn white-on-transparent into 2D
// canvases which the texture builders then composite into colour / height maps.

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// Stroke a centre-line polyline with rounded corners (radius per vertex).
function strokePath(ctx, pts, radii = [], closed = false) {
  ctx.beginPath();
  const n = pts.length;
  if (closed) {
    const last = pts[n - 1], first = pts[0];
    ctx.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      ctx.arcTo(p[0], p[1], q[0], q[1], radii[i] ?? 0);
    }
    ctx.closePath();
  } else {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n - 1; i++) {
      ctx.arcTo(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], radii[i] ?? 0);
    }
    ctx.lineTo(pts[n - 1][0], pts[n - 1][1]);
  }
  ctx.stroke();
}

// ---- SUNDOWN wordmark ------------------------------------------------------
// Heavy, tall, rounded "sundown" letters (lower-case style n/u/w shapes) with a
// thin horizon arc cut through their upper third. Glyph cell height = 100.
const SD_T = 24; // stroke weight
const SD_W = 66, SD_WW = 98;
const SD_GLYPHS = {
  S: { w: SD_W, draw(ctx, t) { const h = t / 2, w = SD_W; strokePath(ctx, [[w - h, 36], [w - h, h], [h, h], [h, 50], [w - h, 50], [w - h, 100 - h], [h, 100 - h], [h, 62]], [0, 13, 13, 10, 10, 13, 13]); } },
  U: { w: SD_W, draw(ctx, t) { const h = t / 2, w = SD_W; strokePath(ctx, [[h, 0], [h, 100 - h], [w - h, 100 - h], [w - h, 0]], [0, 18, 18]); ctx.fillRect(w - t, 60, t, 40); } },
  N: { w: SD_W, draw(ctx, t) { const h = t / 2, w = SD_W; strokePath(ctx, [[h, 100], [h, h], [w - h, h], [w - h, 100]], [0, 18, 18]); ctx.fillRect(0, 0, t, 40); } },
  D: { w: SD_W, draw(ctx, t) { const h = t / 2, w = SD_W; strokePath(ctx, [[h, h], [w - h, h], [w - h, 100 - h], [h, 100 - h]], [2, 22, 22, 2], true); } },
  O: { w: SD_W, draw(ctx, t) { const h = t / 2, w = SD_W; strokePath(ctx, [[h, h], [w - h, h], [w - h, 100 - h], [h, 100 - h]], [20, 20, 20, 20], true); } },
  W: { w: SD_WW, draw(ctx, t) { const h = t / 2, w = SD_WW; strokePath(ctx, [[h, 0], [h, 100 - h], [w - h, 100 - h], [w - h, 0]], [0, 16, 16]); ctx.fillRect(w / 2 - t / 2 + 0.5, 16, t - 1, 84); } },
};
const SD_GAP = 7;

function wordWidth(word, glyphs, gap) {
  let w = 0;
  for (const ch of word) w += glyphs[ch].w + gap;
  return w - gap;
}

// Flat (un-warped) SUNDOWN AUDIO lockup. Returns canvas, white on transparent.
// scale = px per glyph-unit (SUNDOWN cap height = 100 units).
export function drawSundownFlat(scale = 4, { audio = true } = {}) {
  const word = 'SUNDOWN';
  const sw = wordWidth(word, SD_GLYPHS, SD_GAP);
  const audioH = audio ? 78 : 0;
  const pad = 8;
  const W = (sw + pad * 2) * scale;
  const H = (100 + (audio ? 10 + audioH : 0) + pad * 2) * scale;
  const c = makeCanvas(W, H);
  const ctx = c.getContext('2d');
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(pad, pad);
  ctx.fillStyle = ctx.strokeStyle = '#fff';
  ctx.lineWidth = SD_T;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  let x = 0;
  for (const ch of word) {
    ctx.save();
    ctx.translate(x, 0);
    SD_GLYPHS[ch].draw(ctx, SD_T);
    ctx.restore();
    x += SD_GLYPHS[ch].w + SD_GAP;
  }
  // horizon arc cut through the upper third of the letters
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(-5, 33);
  ctx.quadraticCurveTo(sw * 0.5, 14, sw + 5, 33);
  ctx.stroke();
  ctx.globalCompositeOperation = 'source-over';

  if (audio) {
    ctx.save();
    ctx.translate(0, 100 + 10);
    drawAudioInto(ctx, sw, audioH);
    ctx.restore();
  }
  ctx.restore();
  return c;
}

// AUDIO: wide, heavy, italic serif caps filling `width` units, cap height `h`.
function drawAudioInto(ctx, width, h, { xScale = 1.16, stroke = 9, inset = 0.035 } = {}) {
  ctx.save();
  ctx.fillStyle = ctx.strokeStyle = '#fff';
  ctx.font = `italic 900 ${h * 1.32}px "Georgia", "Times New Roman", "Liberation Serif", "DejaVu Serif", serif`;
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = stroke;
  const letters = 'AUDIO';
  const widths = [...letters].map((l) => ctx.measureText(l).width);
  const natural = widths.reduce((a, b) => a + b, 0);
  const target = width * (1 - inset);
  const spacing = (target - natural * xScale) / (letters.length - 1);
  let ax = width * inset;
  for (let i = 0; i < letters.length; i++) {
    ctx.save();
    ctx.translate(ax, h * 0.98);
    ctx.scale(xScale, 0.98);
    ctx.fillText(letters[i], 0, 0);
    ctx.strokeText(letters[i], 0, 0);
    ctx.restore();
    ax += widths[i] * xScale + spacing;
  }
  ctx.restore();
}

// Stand-alone AUDIO line (used on the motor boot, where it is set wider and bolder).
export function drawAudio(scale = 4, { width = 520, height = 70, xScale = 1.75, stroke = 12 } = {}) {
  const pad = 10;
  const c = makeCanvas((width + pad * 2) * scale, (height * 1.25 + pad * 2) * scale);
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  ctx.translate(pad, pad);
  drawAudioInto(ctx, width, height, { xScale, stroke, inset: 0 });
  return c;
}

// The real mark is drawn in perspective: its right end is ~25% taller than the
// left end and the baseline falls away to the right. Warp column by column.
export function warpPerspective(src, { left = 0.86, right = 1.12, drop = 0.1 } = {}) {
  const W = src.width, H = src.height;
  const outH = Math.ceil(H * (right + drop + 0.05));
  const c = makeCanvas(W, outH);
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  const step = 1;
  for (let x = 0; x < W; x += step) {
    const f = x / (W - 1);
    const s = left + (right - left) * f;
    const cy = outH / 2 + (f - 0.5) * drop * H;
    ctx.drawImage(src, x, 0, step, H, x, cy - (s * H) / 2, step, s * H);
  }
  return c;
}

export function drawSundownLogo(scale = 4, opts = {}) {
  return warpPerspective(drawSundownFlat(scale, opts), opts.warp);
}

// ---- INHUMAN model name ------------------------------------------------------
const IN_T = 19;
const IN_GLYPHS = {
  I: { w: 20, paths: [[[[10, 0], [10, 100]], []]] },
  N: { w: 54, paths: [[[[10, 100], [10, 10], [44, 10], [44, 100]], [0, 12, 12]]] },
  H: { w: 54, paths: [[[[10, 0], [10, 100]], []], [[[44, 0], [44, 100]], []], [[[10, 50], [44, 50]], []]] },
  U: { w: 54, paths: [[[[10, 0], [10, 90], [44, 90], [44, 0]], [0, 12, 12]]] },
  M: { w: 80, paths: [[[[10, 100], [10, 10], [70, 10], [70, 100]], [0, 10, 10]], [[[40, 10], [40, 100]], []]] },
  A: { w: 56, paths: [[[[10, 100], [10, 10], [46, 10], [46, 100]], [0, 14, 14]], [[[10, 56], [46, 56]], []]] },
};

export function drawInhuman(scale = 4) {
  const word = 'INHUMAN';
  const gap = 11;
  const ww = wordWidth(word, IN_GLYPHS, gap);
  const pad = 6;
  const c = makeCanvas((ww + pad * 2) * scale, (100 + pad * 2) * scale);
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  ctx.translate(pad, pad);
  ctx.strokeStyle = '#fff';
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'miter';
  const each = (fn) => {
    let x = 0;
    for (const ch of word) {
      ctx.save();
      ctx.translate(x, 0);
      for (const [pts, radii] of IN_GLYPHS[ch].paths) fn(pts, radii);
      ctx.restore();
      x += IN_GLYPHS[ch].w + gap;
    }
  };
  ctx.lineWidth = IN_T;
  each((pts, radii) => strokePath(ctx, pts, radii));
  // engraved in-line running down the middle of every stroke
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineWidth = 3.2;
  ctx.save();
  ctx.beginPath();
  ctx.rect(-10, 7, ww + 20, 86);
  ctx.clip();
  each((pts, radii) => strokePath(ctx, pts, radii));
  ctx.restore();
  return c;
}

// ---- Alien head emblem -------------------------------------------------------
// Returns a *height* canvas (grey levels = relief) of size 100x132 units.
export function drawAlienHeight(scale = 4) {
  const W = 100, H = 132;
  const c = makeCanvas(W * scale, H * scale);
  const ctx = c.getContext('2d');
  ctx.scale(scale, scale);
  const head = new Path2D('M50 2 C79 2 98 21 98 49 C98 74 83 95 67 112 C60 120 55 128 50 128 C45 128 40 120 33 112 C17 95 2 74 2 49 C2 21 21 2 50 2 Z');
  const eyeL = new Path2D('M46.5 80 C44 58 29 43 7 40 C6 62 22 79 46.5 80 Z');
  const eyeR = new Path2D('M53.5 80 C56 58 71 43 93 40 C94 62 78 79 53.5 80 Z');
  const lidL = new Path2D('M10 45 C24 47 37 56 43 72');
  const lidR = new Path2D('M90 45 C76 47 63 56 57 72');
  const browL = new Path2D('M6 35 C20 34 36 42 46 55');
  const browR = new Path2D('M94 35 C80 34 64 42 54 55');

  // raised head plate
  ctx.fillStyle = 'rgb(120,120,120)';
  ctx.fill(head);
  // outline groove around the plate
  ctx.strokeStyle = 'rgb(40,40,40)';
  ctx.lineWidth = 2.2;
  ctx.stroke(head);
  // eye sockets: raised rims, recessed pupils
  ctx.fillStyle = 'rgb(205,205,205)';
  ctx.fill(eyeL); ctx.fill(eyeR);
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgb(60,60,60)';
  ctx.stroke(eyeL); ctx.stroke(eyeR);
  ctx.lineWidth = 1.8;
  ctx.strokeStyle = 'rgb(70,70,70)';
  ctx.stroke(lidL); ctx.stroke(lidR);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = 'rgb(175,175,175)';
  ctx.stroke(browL); ctx.stroke(browR);
  // nose slits, mouth, cheek creases
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgb(55,55,55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(46.5, 92); ctx.lineTo(47.5, 97.5);
  ctx.moveTo(53.5, 92); ctx.lineTo(52.5, 97.5);
  ctx.stroke();
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(41, 108); ctx.quadraticCurveTo(50, 104.5, 59, 108);
  ctx.stroke();
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(18, 86); ctx.quadraticCurveTo(26, 96, 35, 101);
  ctx.moveTo(82, 86); ctx.quadraticCurveTo(74, 96, 65, 101);
  ctx.stroke();
  return c;
}
