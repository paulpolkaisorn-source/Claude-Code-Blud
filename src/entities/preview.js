// preview.js: select-screen 3D preview. Own WebGLRenderer on the given canvas, pedestal + turntable,
// idle breathing with an attack every 3 s. pause()/resume() stop and restart the rAF loop so one preview can live
// for the whole page (a canvas whose context was lost can never be reused). The loop also stops on dispose.
import * as THREE from 'three';
import { toonMat } from '../render/toon.js';
import { createBrawlerModel } from './models.js';

const SPIN = 0.5;        // turntable speed, rad/s
const ATTACK_EVERY = 3;  // s

export function createPreview(canvas, brawlerId) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x2a2440, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(2.5, 5, 3.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -1.6, right: 1.6, top: 2.2, bottom: -0.6, near: 0.5, far: 15 });
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);

  const podium = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.22, 28), toonMat(0x2b3360, { unique: true }));
  podium.position.y = 0.11;
  podium.receiveShadow = true;
  scene.add(podium);
  const turn = new THREE.Group();
  turn.position.y = 0.22;
  scene.add(turn);

  let model = null, alive = true, running = true, raf = 0, t = 0, nextAttack = ATTACK_EVERY, last = 0;

  function resize() {
    if (!alive) return;
    const w = Math.max(1, canvas.clientWidth || 1);
    const h = Math.max(1, canvas.clientHeight || 1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
    const distV = 1.25 / tanHalf;                 // fit height
    const distH = 0.95 / (tanHalf * camera.aspect); // fit width (narrow canvases)
    camera.position.set(0, 1.25, Math.max(distV, distH));
    camera.lookAt(0, 0.85, 0);
    camera.updateProjectionMatrix();
  }

  function setBrawler(id) {
    if (!alive) return;
    if (model) model.dispose();
    model = createBrawlerModel(id, { team: 0, isPlayer: true });
    turn.add(model.root);
    nextAttack = t + ATTACK_EVERY;
  }

  function frame() {
    if (!alive || !running) return;
    raf = requestAnimationFrame(frame);
    const now = performance.now();
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    t += dt;
    turn.rotation.y += dt * SPIN;
    if (model) {
      if (t >= nextAttack) {
        model.play('attack');
        nextAttack = t + ATTACK_EVERY;
      }
      model.update(dt, 0);
    }
    renderer.render(scene, camera);
  }

  function pause() {
    running = false;
    cancelAnimationFrame(raf);
  }

  function resume() {
    if (!alive || running) return;
    running = true;
    last = 0;
    resize();
    raf = requestAnimationFrame(frame);
  }

  function dispose() {
    if (!alive) return;
    alive = false;
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    if (model) {
      model.dispose();
      model = null;
    }
    podium.geometry.dispose();
    podium.material.dispose();
    renderer.dispose();
  }

  resize();
  setBrawler(brawlerId);
  window.addEventListener('resize', resize);
  raf = requestAnimationFrame(frame);

  return { setBrawler, resize, pause, resume, dispose };
}
