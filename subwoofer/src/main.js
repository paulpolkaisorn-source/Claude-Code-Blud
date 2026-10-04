import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { createViewer } from './viewer.js';
import { VIEWS } from './views.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('c');
const wrap = document.getElementById('wrap');

const harness = params.has('harness');
const silhouette = params.has('sil');
const noTex = params.has('notex');
const quality = parseFloat(params.get('q') || '1');

let viewer = null;
function size() {
  const r = wrap.getBoundingClientRect();
  return [Math.max(2, Math.floor(r.width)), Math.max(2, Math.floor(r.height))];
}


function boundaryOf(m, w, h) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!m[i]) continue;
    if (x === 0 || y === 0 || x === w - 1 || y === h - 1 || !m[i - 1] || !m[i + 1] || !m[i - w] || !m[i + w]) out[i] = 1;
  }
  return out;
}
function distanceTransform(src, w, h) {
  const INF = 1e9, d = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) d[i] = src[i] ? 0 : INF;
  const a = 1, b = 1.41421356;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + a);
    if (y > 0) { v = Math.min(v, d[i - w] + a); if (x > 0) v = Math.min(v, d[i - w - 1] + b); if (x < w - 1) v = Math.min(v, d[i - w + 1] + b); }
    d[i] = v;
  }
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
    const i = y * w + x;
    let v = d[i];
    if (x < w - 1) v = Math.min(v, d[i + 1] + a);
    if (y < h - 1) { v = Math.min(v, d[i + w] + a); if (x < w - 1) v = Math.min(v, d[i + w + 1] + b); if (x > 0) v = Math.min(v, d[i + w - 1] + b); }
    d[i] = v;
  }
  return d;
}

/** Binary glTF in metres (the model itself is built in inches). */
async function exportGLB() {
  const holder = new THREE.Group();
  holder.name = 'Export';
  holder.scale.setScalar(0.0254);
  const clone = viewer.state.root.clone(true);
  clone.rotation.set(0, 0, 0);
  holder.add(clone);
  holder.updateMatrixWorld(true);
  const exporter = new GLTFExporter();
  return new Promise((res, rej) => exporter.parse(holder, res, rej, { binary: true, onlyVisible: true, maxTextureSize: 4096 }));
}

function boot(opts = {}) {
  const [w, h] = opts.width ? [opts.width, opts.height] : size();
  viewer = createViewer({
    canvas, width: w, height: h, silhouette: opts.silhouette ?? silhouette, textures: !(opts.noTex ?? noTex), quality: opts.quality ?? quality,
    preserveDrawingBuffer: harness || !!opts.preserve, frozen: harness, pixelRatio: opts.pixelRatio ?? (harness ? 1 : undefined),
  });
  window.__sub = {
    viewer,
    exportGLB,
    async exportGLBBase64() {
      const buf = await exportGLB();
      const bytes = new Uint8Array(buf);
      let s = '';
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      return btoa(s);
    },
    resize(w, h) { viewer.resize(w, h); },
    pose(p) { viewer.setPose(p); viewer.render(); },
    rebuild(P) { viewer.rebuild(P); },
    shot() { viewer.render(); return canvas.toDataURL('image/png'); },
    refs: {},
    setRef(name, w, h, b64) {
      const bin = atob(b64);
      const a = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
      window.__sub.refs[name] = { w, h, a };
    },
    // render a silhouette at the reference size and compare. Returns {iou, bbox of model mask}
    iou(name, pose) {
      const r = window.__sub.refs[name];
      if (viewer.renderer.domElement.width !== r.w || viewer.renderer.domElement.height !== r.h) viewer.resize(r.w, r.h);
      viewer.setPose(pose);
      viewer.render();
      const gl = viewer.renderer.getContext();
      const w = gl.drawingBufferWidth;
      const h = gl.drawingBufferHeight;
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let inter = 0, uni = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, n = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const m = px[((h - 1 - y) * w + x) * 4] < 128 ? 1 : 0;
          const q = r.a[y * w + x];
          if (m && q) inter++;
          if (m || q) uni++;
          if (m) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
      }
      return { iou: uni ? inter / uni : 0, bbox: [x0, y0, x1, y1], area: n };
    },

    // symmetric chamfer distance (in px) between model and reference silhouette boundaries
    chamfer(name, pose) {
      const S = window.__sub;
      const r = S.refs[name];
      if (!r.dt) { r.bnd = boundaryOf(r.a, r.w, r.h); r.dt = distanceTransform(r.bnd, r.w, r.h); }
      if (viewer.renderer.domElement.width !== r.w || viewer.renderer.domElement.height !== r.h) viewer.resize(r.w, r.h);
      viewer.setPose(pose);
      viewer.render();
      const gl = viewer.renderer.getContext();
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const m = new Uint8Array(w * h);
      let n = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (px[((h - 1 - y) * w + x) * 4] < 128) { m[y * w + x] = 1; n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      if (n < 20) return { score: 1e3, area: n, bbox: [0, 0, 0, 0], iou: 0 };
      const mb = boundaryOf(m, w, h);
      const md = distanceTransform(mb, w, h);
      let a = 0, na = 0, b = 0, nb = 0, inter = 0, uni = 0;
      for (let i = 0; i < w * h; i++) {
        if (mb[i]) { a += r.dt[i]; na++; }
        if (r.bnd[i]) { b += md[i]; nb++; }
        if (m[i] && r.a[i]) inter++;
        if (m[i] || r.a[i]) uni++;
      }
      return { score: a / na + b / nb, area: n, bbox: [x0, y0, x1, y1], iou: inter / uni };
    },
    overlay(name, pose, scale = 2) {
      const r = window.__sub.refs[name];
      if (viewer.renderer.domElement.width !== r.w || viewer.renderer.domElement.height !== r.h) viewer.resize(r.w, r.h);
      viewer.setPose(pose);
      viewer.render();
      const gl = viewer.renderer.getContext();
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      const img = ctx.createImageData(w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const m = px[((h - 1 - y) * w + x) * 4] < 128 ? 1 : 0;
        const q = r.a[y * w + x];
        const k = (y * w + x) * 4;
        let col = [255, 255, 255];
        if (m && q) col = [150, 150, 150];
        else if (m) col = [40, 90, 230];
        else if (q) col = [235, 60, 50];
        img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      const c2 = document.createElement('canvas');
      c2.width = w * scale; c2.height = h * scale;
      const c2x = c2.getContext('2d');
      c2x.imageSmoothingEnabled = false;
      c2x.drawImage(c, 0, 0, c2.width, c2.height);
      return c2.toDataURL('image/png');
    },
  };
  return viewer;
}

function startUI() {
  const bar = document.getElementById('bar');
  const loading = document.getElementById('loading');
  const root = document.documentElement;

  boot({ pixelRatio: Math.min(window.devicePixelRatio || 1, 2) });
  const c = viewer.controls;
  c.autoRotate = true;
  c.autoRotateSpeed = 0.9;
  viewer.setPose({ ...VIEWS[1].pose, rollMode: 'stage' });
  c.addEventListener('start', () => { c.autoRotate = false; setPressed(rotBtn, false); });

  const mk = (label, cls, fn) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    if (cls) b.className = cls;
    b.addEventListener('click', () => fn(b));
    bar.appendChild(b);
    return b;
  };
  const setPressed = (b, on) => b.setAttribute('aria-pressed', on ? 'true' : 'false');

  // --- camera fly-to
  let fly = null;
  const cur = () => {
    const t = c.target;
    const d = viewer.camera.position.clone().sub(t);
    const dist = d.length();
    return { yaw: Math.atan2(d.x, d.z) * 180 / Math.PI, pitch: Math.asin(d.y / dist) * 180 / Math.PI, roll: viewer.state.roll || 0, dist, fov: viewer.camera.fov, spin: viewer.state.spin * 180 / Math.PI, target: [t.x, t.y, t.z] };
  };
  const flyTo = (pose) => {
    const a = cur();
    const b = { ...pose };
    let dy = ((b.yaw - a.yaw + 540) % 360) - 180;
    fly = { a, b, dy, t0: performance.now(), dur: 900 };
    c.autoRotate = false;
    setPressed(rotBtn, false);
  };
  const stepFly = (now) => {
    if (!fly) return;
    const k = Math.min(1, (now - fly.t0) / fly.dur);
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    const { a, b, dy } = fly;
    viewer.setPose({
      yaw: a.yaw + dy * e, pitch: a.pitch + (b.pitch - a.pitch) * e, dist: a.dist + (b.dist - a.dist) * e,
      fov: a.fov + (b.fov - a.fov) * e, spin: a.spin + (b.spin - a.spin) * e,
      target: a.target.map((v, i) => v + (b.target[i] - v) * e), roll: a.roll + (b.roll - a.roll) * e, rollMode: 'stage',
    });
    if (k >= 1) fly = null;
  };

  const viewBtns = VIEWS.map((v) => mk(v.label, '', () => flyTo(v.pose)));
  void viewBtns;
  const sep = document.createElement('div');
  sep.className = 'sep';
  bar.appendChild(sep);
  const rotBtn = mk('Rotate', '', (b) => { c.autoRotate = !c.autoRotate; setPressed(b, c.autoRotate); });
  setPressed(rotBtn, true);
  mk('Dark', '', (b) => {
    const dark = root.dataset.bg !== 'dark';
    root.dataset.bg = dark ? 'dark' : 'light';
    viewer.scene.background = new THREE.Color(dark ? 0x101113 : 0xffffff);
    setPressed(b, dark);
  });
  mk('Download .glb', 'dl', async (b) => {
    const old = b.textContent;
    b.textContent = 'Exporting…';
    try {
      const buf = await exportGLB();
      const url = URL.createObjectURL(new Blob([buf], { type: 'model/gltf-binary' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sundown-subwoofer.glb';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } finally {
      b.textContent = old;
    }
  });

  window.addEventListener('resize', () => {
    const [w, h] = size();
    viewer.resize(w, h);
  });
  const loop = (now) => {
    stepFly(now);
    viewer.render();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  loading.classList.add('done');
  setTimeout(() => loading.remove(), 600);
}

if (harness) {
  window.__boot = boot;
  window.__ready = true;
} else {
  // let the loading screen paint before the (CPU heavy) procedural texture generation starts
  requestAnimationFrame(() => setTimeout(startUI, 30));
}
