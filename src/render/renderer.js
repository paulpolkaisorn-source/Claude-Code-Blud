// renderer.js: WebGL renderer, scene, sun and hemisphere lights, camera rig, post chain and quality switching.
// Public API: ARCHITECTURE.md "render". render(dt) allocates nothing per frame.
import * as THREE from 'three';
import { bus, EV, GRID } from '../contracts.js';
import { createCameraRig } from './camera.js';
import { createPost } from './post.js';
import { QUALITY_PRESETS, pixelRatioFor, createAutoQuality } from './quality.js';

const SKY = 0x9fd8ff;
const SHADOW_MAP_SIZE = 2048;
const HEMI_INTENSITY = 1.1;
const SUN_INTENSITY = 2.0;
const SUN_DIR = new THREE.Vector3(0.45, -1, -0.55).normalize();   // unit direction the sun shines in

// Scratch objects, allocated once at module load.
const _ctr = new THREE.Vector3(), _f = new THREE.Vector3(), _r = new THREE.Vector3();
const _u = new THREE.Vector3(), _p = new THREE.Vector3(), _v = new THREE.Vector3();
const _n = new THREE.Vector3(), _d = new THREE.Vector3();

export function createRenderer(canvas, { mobile = false, clock } = {}) {
  const now = typeof clock === 'function' ? clock : () => performance.now();

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.info.autoReset = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  const fog = new THREE.Fog(SKY, 20, 80);
  scene.fog = fog;

  const hemi = new THREE.HemisphereLight(0xdcf0ff, 0x6b7a55, HEMI_INTENSITY);
  const sun = new THREE.DirectionalLight(0xfff1d8, SUN_INTENSITY);
  sun.castShadow = true;
  sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(hemi, sun, sun.target);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 300);
  const rig = createCameraRig(camera);
  const post = createPost(renderer, scene, camera, { samples: mobile ? 0 : 4 });
  const auto = createAutoQuality({ threshold: 45, sustain: 3 });

  let quality = 'high';
  let usePost = true;
  let cssW = 1, cssH = 1;
  let lastT = -1;
  let drawCalls = 0, triangles = 0;

  // Fits the sun's orthographic shadow frustum around the arena (y 0..3), measured in the light's own basis.
  function fitSun(cols, rows) {
    _ctr.set(cols / 2, 0, rows / 2);
    _f.copy(SUN_DIR);
    _r.set(-_f.z, 0, _f.x).normalize();
    _u.crossVectors(_r, _f).normalize();
    let hu = 0, hv = 0, hw = 0;
    for (let i = 0; i < 8; i++) {
      _p.set(i & 1 ? cols : 0, i & 2 ? 3 : 0, i & 4 ? rows : 0).sub(_ctr);
      hu = Math.max(hu, Math.abs(_p.dot(_r)));
      hv = Math.max(hv, Math.abs(_p.dot(_u)));
      hw = Math.max(hw, Math.abs(_p.dot(_f)));
    }
    const half = Math.max(hu, hv) + 1;
    const back = hw + 4;   // the light sits this far back along -f from the arena centre
    sun.target.position.copy(_ctr);
    sun.position.copy(_ctr).addScaledVector(_f, -back);
    const sc = sun.shadow.camera;
    sc.left = -half;
    sc.right = half;
    sc.top = half;
    sc.bottom = -half;
    sc.near = 0.5;
    sc.far = back + hw + 4;
    sc.updateProjectionMatrix();
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth || 1;
    const h = canvas.clientHeight || window.innerHeight || 1;
    const pr = pixelRatioFor(quality, window.devicePixelRatio, mobile);
    cssW = w;
    cssH = h;
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    post.setSize(w, h, pr);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const dist = rig.setAspect(camera.aspect);
    fog.near = dist * 1.3;
    fog.far = dist * 3.4;
  }

  function applyQuality(level) {
    quality = level;
    const preset = QUALITY_PRESETS[level];
    usePost = preset.bloom;
    renderer.shadowMap.enabled = preset.shadows;
    sun.castShadow = preset.shadows;
    resize();
  }

  const onResize = () => resize();
  const offShake = bus.on(EV.SCREEN_SHAKE, (p) => rig.shake(p.intensity, p.duration));
  window.addEventListener('resize', onResize);

  fitSun(GRID.cols, GRID.rows);
  resize();

  const R = {
    renderer, scene, camera, hemi, sun, resize,

    setArenaBounds(cols, rows) {
      rig.setBounds(cols, rows);
      fitSun(cols, rows);
    },
    follow(x, z, dt) { rig.follow(x, z, dt); },
    snap(x, z) { rig.snap(x, z); },
    shake(intensity, duration) { rig.shake(intensity, duration); },

    render(dt) {
      if (!(dt > 0)) dt = 1 / 60;
      rig.step(dt);
      renderer.info.reset();
      if (usePost) post.render(dt);
      else renderer.render(scene, camera);
      drawCalls = renderer.info.render.calls;
      triangles = renderer.info.render.triangles;
      // Sampled after the frame is drawn, so an automatic drop applies from the next frame on.
      const t = now();
      if (lastT >= 0 && auto.frame((t - lastT) / 1000)) {
        applyQuality('low');
        bus.emit(EV.QUALITY_CHANGE, { level: 'low' });
      }
      lastT = t;
    },

    setQuality(level) { applyQuality(level === 'low' ? 'low' : 'high'); },
    autoQuality(on) { auto.set(on); },

    // Writes out.x, out.y in CSS px (canvas top-left origin) and out.visible (in front and on screen).
    worldToScreen(x, y, z, out = {}) {
      _v.set(x, y, z).applyMatrix4(camera.matrixWorldInverse);
      const inFront = _v.z < -camera.near;
      _v.applyMatrix4(camera.projectionMatrix);
      out.x = (_v.x * 0.5 + 0.5) * cssW;
      out.y = (0.5 - _v.y * 0.5) * cssH;
      out.visible = inFront && _v.z <= 1 && out.x >= 0 && out.x <= cssW && out.y >= 0 && out.y <= cssH;
      return out;
    },

    // sx, sy in CSS px relative to the canvas top-left. Writes out.x, out.z where the ray hits y = 0.
    screenToGround(sx, sy, out = {}) {
      const nx = (sx / cssW) * 2 - 1;
      const ny = 1 - (sy / cssH) * 2;
      _n.set(nx, ny, -1).unproject(camera);
      _d.set(nx, ny, 1).unproject(camera).sub(_n);
      if (Math.abs(_d.y) < 1e-9) {
        out.x = _n.x;
        out.z = _n.z;
        out.hit = false;
        return out;
      }
      const t = -_n.y / _d.y;
      out.x = _n.x + _d.x * t;
      out.z = _n.z + _d.z * t;
      out.hit = t >= 0;
      return out;
    },

    stats(out) {
      const o = out || {};
      o.fps = auto.fps;
      o.drawCalls = drawCalls;
      o.triangles = triangles;
      o.quality = quality;
      o.bloom = usePost;
      o.shadows = renderer.shadowMap.enabled;
      return o;
    },

    dispose() {
      window.removeEventListener('resize', onResize);
      offShake();
      post.dispose();
      renderer.dispose();
    },
  };
  return R;
}
