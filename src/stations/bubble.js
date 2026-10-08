import { animate, spring, stagger } from 'animejs';
import { clamp, rand } from '../utils/math.js';

export const bubbleMeta = {
  id: 'bubble',
  name: 'Bubble Wrap',
  hint: 'Pop the bubbles. Press and drag across them to pop a row. The sheet re-inflates when it is empty.',
  cursor: { nx: 0.5, ny: 0.5 },
};

// Bubble wrap: a 2D canvas sheet over the desk. Pops are springy (anime.js), neighbours
// bounce, each pop picks a random timbre, and the sheet re-inflates once it is empty.
export function createBubble(app) {
  const host = app.sheetHost;
  const canvas = document.createElement('canvas');
  canvas.className = 'sheet-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  host.classList.add('show');
  const g = canvas.getContext('2d');

  let W = 1;
  let H = 1;
  let dpr = 1;
  let cell = 60;
  let cols = 1;
  let rows = 1;
  let bubbles = [];
  let sprite = null;
  let rings = [];
  let popCount = 0;
  let resetTimer = null;
  const anims = [];
  let disposed = false;

  function makeSprite(d) {
    const c = document.createElement('canvas');
    c.width = c.height = Math.max(16, Math.round(d));
    const k = c.getContext('2d');
    const s = c.width;
    const r = s / 2;
    const body = k.createRadialGradient(r * 0.7, r * 0.6, r * 0.05, r, r, r);
    body.addColorStop(0, 'rgba(255,255,255,0.95)');
    body.addColorStop(0.45, 'rgba(214,232,246,0.82)');
    body.addColorStop(0.82, 'rgba(160,196,226,0.6)');
    body.addColorStop(1, 'rgba(120,160,200,0.7)');
    k.fillStyle = body;
    k.beginPath();
    k.arc(r, r, r - 1, 0, Math.PI * 2);
    k.fill();
    k.strokeStyle = 'rgba(90,130,170,0.45)';
    k.lineWidth = Math.max(1, s * 0.02);
    k.stroke();
    k.fillStyle = 'rgba(255,255,255,0.85)';
    k.beginPath();
    k.ellipse(r * 0.6, r * 0.55, r * 0.28, r * 0.16, -0.6, 0, Math.PI * 2);
    k.fill();
    k.fillStyle = 'rgba(255,255,255,0.5)';
    k.beginPath();
    k.ellipse(r * 1.35, r * 1.4, r * 0.1, r * 0.06, 0.6, 0, Math.PI * 2);
    k.fill();
    return c;
  }

  function layout() {
    const box = host.getBoundingClientRect();
    W = Math.max(1, box.width);
    H = Math.max(1, box.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2) * app.quality.resScale;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    cell = clamp(Math.min(W, H) / 7.2, 44, 96);
    cols = Math.max(3, Math.floor(W / cell));
    rows = Math.max(3, Math.floor(H / cell));
    const ox = (W - cols * cell) / 2 + cell / 2;
    const oy = (H - rows * cell) / 2 + cell / 2;
    const old = bubbles;
    bubbles = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = bubbles.length;
        bubbles.push({
          x: ox + c * cell,
          y: oy + r * cell,
          r: cell * 0.46,
          s: 1,
          popped: old[i] ? old[i].popped : false,
        });
      }
    }
    popCount = bubbles.filter((b) => b.popped).length;
    sprite = makeSprite(cell * dpr);
  }

  function hitTest(p) {
    const rect = canvas.getBoundingClientRect();
    const x = p.x - rect.left;
    const y = p.y - rect.top;
    let best = null;
    let bestD = Infinity;
    for (const b of bubbles) {
      if (b.popped) continue;
      const d = Math.hypot(x - b.x, y - b.y);
      if (d < b.r * b.s * 1.15 && d < bestD) {
        best = b;
        bestD = d;
      }
    }
    return best;
  }

  function neighbours(b) {
    const out = [];
    for (const n of bubbles) {
      if (n === b || n.popped) continue;
      if (Math.hypot(n.x - b.x, n.y - b.y) < cell * 1.6) out.push(n);
    }
    return out;
  }

  function pop(b, p) {
    if (b.popped) return;
    b.popped = true;
    popCount++;
    const a = animate(b, {
      s: [1, 0.22],
      duration: 120,
      ease: 'outQuad',
    });
    trackAnim(a);
    for (const n of neighbours(b)) {
      n.s = 0.93;
      trackAnim(
        animate(n, {
          s: 1,
          ease: spring({ stiffness: 260, damping: 12 }),
        })
      );
    }
    rings.push({ x: b.x, y: b.y, t: 0 });
    if (rings.length > 14) rings.shift();
    app.voices.pop({ pan: p.pan, vel: rand(0.75, 1) });
    app.flow(0.18);
    app.haptic(8);
    app.bloomPulse(0.03);
    if (popCount >= bubbles.length) scheduleReset();
  }

  // Keeps only animations still running, so long sessions do not accumulate handles.
  function trackAnim(a) {
    for (let i = anims.length - 1; i >= 0; i--) if (anims[i].completed) anims.splice(i, 1);
    anims.push(a);
  }

  function scheduleReset() {
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      if (disposed) return;
      for (const b of bubbles) {
        b.popped = false;
        b.s = 0.2;
      }
      popCount = 0;
      trackAnim(
        animate(bubbles, {
          s: 1,
          delay: stagger(26, { from: 'center' }),
          ease: spring({ stiffness: 200, damping: 14 }),
        })
      );
    }, 1600);
  }

  function draw() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    // Film base: a cool, faintly warm plastic tint with a soft vignette.
    const base = g.createRadialGradient(W * 0.45, H * 0.4, Math.min(W, H) * 0.1, W / 2, H / 2, Math.max(W, H) * 0.7);
    base.addColorStop(0, 'rgba(60,72,92,0.35)');
    base.addColorStop(1, 'rgba(14,12,20,0.55)');
    g.fillStyle = base;
    g.fillRect(0, 0, W, H);

    for (const b of bubbles) {
      if (b.popped) {
        g.fillStyle = 'rgba(120,150,190,0.12)';
        g.strokeStyle = 'rgba(170,200,230,0.22)';
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(b.x, b.y, b.r * 0.92, b.r * 0.78, 0.3, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        g.beginPath();
        g.moveTo(b.x - b.r * 0.5, b.y + b.r * 0.2);
        g.quadraticCurveTo(b.x, b.y - b.r * 0.1, b.x + b.r * 0.5, b.y + b.r * 0.25);
        g.stroke();
      } else {
        const d = cell * b.s;
        g.drawImage(sprite, b.x - d / 2 + 0.5, b.y - d / 2 + 0.5, d - 1, d - 1);
      }
    }

    // Light rings expanding from each pop.
    for (const r of rings) {
      const k = r.t;
      const rad = cell * (0.35 + k * 1.3);
      g.strokeStyle = `rgba(255,236,210,${(0.35 * (1 - k)).toFixed(3)})`;
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(r.x, r.y, rad, 0, Math.PI * 2);
      g.stroke();
    }
  }

  const station = {
    group: null,
    cursorStart: bubbleMeta.cursor,
    enter() {},
    exit() {},
    pointerDown(p) {
      const b = hitTest(p);
      if (b) pop(b, p);
    },
    pointerMove(p, isDown) {
      if (!isDown) return;
      const b = hitTest(p);
      if (b) pop(b, p);
    },
    pointerUp() {},
    setQuality() {},
    resize() {
      layout();
    },
    step() {},
    frame(dt) {
      for (const r of rings) r.t = Math.min(1, r.t + dt * 1.6);
      rings = rings.filter((r) => r.t < 1);
      draw();
    },
    dispose() {
      disposed = true;
      clearTimeout(resetTimer);
      for (const a of anims) a.cancel?.();
      anims.length = 0;
      canvas.remove();
      host.classList.remove('show');
    },
  };

  layout();
  return station;
}
