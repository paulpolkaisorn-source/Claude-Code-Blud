// Small shared helpers: math, scales, render loop, pointer tracking.

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const damp = (cur, target, rate, dt) => lerp(cur, target, 1 - Math.exp(-rate * dt));

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);
const PENTA = [0, 2, 4, 7, 9];
/** Major pentatonic note (as midi) for any integer scale degree, so every key sounds good. */
export function pentatonic(degree, root = 60) {
  const oct = Math.floor(degree / 5);
  const idx = ((degree % 5) + 5) % 5;
  return root + oct * 12 + PENTA[idx];
}

export const hsl = (h, s, l, a = 1) => `hsla(${h}, ${s}%, ${l}%, ${a})`;

/** Delta-timed requestAnimationFrame loop. fn(dt, elapsed). */
export function createLoop(fn) {
  let raf = 0;
  let alive = true;
  let last = 0;
  let elapsed = 0;
  const frame = (now) => {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    if (!last) last = now;
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1; // tab was hidden / long frame
    elapsed += dt;
    fn(dt, elapsed);
  };
  raf = requestAnimationFrame(frame);
  return {
    stop() {
      alive = false;
      cancelAnimationFrame(raf);
    },
  };
}

/** Calls cb({width,height}) now and on every size change. */
export function observeSize(el, cb) {
  const ro = new ResizeObserver(() => cb(el.clientWidth, el.clientHeight));
  ro.observe(el);
  cb(el.clientWidth, el.clientHeight);
  return () => ro.disconnect();
}

/**
 * Unified pointer tracking (mouse, touch, pen) with smoothed velocity.
 * Handlers receive a pointer object { id, x, y, px, py, vx, vy, speed, down, type }.
 * move() is also called for coalesced sub-events so fast strokes stay continuous.
 */
export function track(el, h) {
  const ptrs = new Map();
  const local = (e) => {
    const r = el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const make = (e, down) => {
    const { x, y } = local(e);
    return { id: e.pointerId, x, y, px: x, py: y, vx: 0, vy: 0, speed: 0, t: e.timeStamp, down, type: e.pointerType, sx: x, sy: y };
  };
  const advance = (p, e) => {
    const { x, y } = local(e);
    const dt = Math.max(1, e.timeStamp - p.t) / 1000;
    p.px = p.x;
    p.py = p.y;
    p.x = x;
    p.y = y;
    p.vx = lerp(p.vx, (x - p.px) / dt, 0.4);
    p.vy = lerp(p.vy, (y - p.py) / dt, 0.4);
    p.speed = Math.hypot(p.vx, p.vy);
    p.t = e.timeStamp;
  };
  const onDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    try { el.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    const p = make(e, true);
    ptrs.set(e.pointerId, p);
    h.down?.(p, e);
  };
  const onMove = (e) => {
    let p = ptrs.get(e.pointerId);
    if (!p) {
      if (e.pointerType !== 'mouse' || !h.hover) return;
      p = ptrs.get('hover') || make(e, false);
      p.id = 'hover';
      ptrs.set('hover', p);
    }
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    const list = events.length ? events : [e];
    for (const ev of list) {
      advance(p, ev);
      h.move?.(p, ev);
    }
  };
  const onUp = (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    advance(p, e);
    p.down = false;
    ptrs.delete(e.pointerId);
    h.up?.(p, e);
  };
  const onLeave = (e) => {
    if (e.pointerType === 'mouse' && ptrs.has('hover')) {
      ptrs.delete('hover');
      h.leave?.();
    }
  };
  const noMenu = (e) => e.preventDefault();
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
  el.addEventListener('pointerleave', onLeave);
  el.addEventListener('contextmenu', noMenu);
  return {
    pointers: ptrs,
    dispose() {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('contextmenu', noMenu);
    },
  };
}

/** Sets up a DPR-aware 2D canvas that fills `root`. Returns {canvas, ctx, size(), dispose}. */
export function createCanvas2D(root, { maxPixels = 3_000_000, onResize } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'game-canvas';
  root.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const api = { canvas, ctx, w: 0, h: 0, dpr: 1 };
  let initial = true; // the caller runs its own first layout after this returns
  const stop = observeSize(root, (w, h) => {
    if (!w || !h) return;
    let dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    if (w * h * dpr * dpr > maxPixels) dpr = Math.sqrt(maxPixels / (w * h));
    api.w = w;
    api.h = h;
    api.dpr = dpr;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!initial) onResize?.(w, h, dpr);
  });
  initial = false;
  api.dispose = () => {
    stop();
    canvas.remove();
  };
  return api;
}

export function safeStorage() {
  try {
    const k = '__hush_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return localStorage;
  } catch (_) {
    const mem = new Map();
    return {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, String(v)),
      removeItem: (k) => mem.delete(k),
    };
  }
}

export function detectQuality() {
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 4;
  const small = Math.min(screen.width, screen.height) < 520;
  return cores >= 6 && mem >= 4 && !small ? 'high' : 'low';
}
