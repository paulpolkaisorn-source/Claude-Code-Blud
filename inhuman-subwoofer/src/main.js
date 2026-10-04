import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { buildSubwoofer } from './model/subwoofer.js';
import { LOD } from './model/geom.js';
import { buildStudioEnvironment, followCamera } from './studio.js';
import { VIEWS } from './views.js';

const params = new URLSearchParams(location.search);
const headless = params.has('headless');

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: headless, alpha: false });
renderer.setPixelRatio(headless ? 1 : Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);
scene.environment = buildStudioEnvironment(renderer);
scene.environmentIntensity = 1.0;

const camera = new THREE.PerspectiveCamera(22, window.innerWidth / window.innerHeight, 0.01, 50);
scene.add(camera);
// soft key light riding with the camera (upper left), aimed at the subject
const key = new THREE.DirectionalLight(0xffffff, 0.8);
key.position.set(-1.2, 2.0, 0.4);
camera.add(key);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 0.4;
controls.maxDistance = 6;

// Model is built in millimetres with the cone facing +Y; present it in metres
// with the cone facing the viewer (+Z) and 12 o'clock up.
if (params.has('lod')) LOD.scale = Number(params.get('lod'));
let model, holder;
if (params.has('glb')) {
  // inspect an exported file instead of the procedural build (?glb=models/sundown-inhuman-18.glb)
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const gltf = await new GLTFLoader().loadAsync(params.get('glb'));
  holder = gltf.scene;
  model = holder.getObjectByName('Sundown_InHuman_18') || holder;
  scene.add(holder);
} else {
  model = buildSubwoofer();
  model.scale.setScalar(0.001);
  model.rotation.x = Math.PI / 2;
  holder = new THREE.Group();
  holder.name = 'InHuman18';
  holder.add(model);
  holder.position.z = 0.2;
  scene.add(holder);
}

export function setView(v) {
  camera.fov = v.fov;
  camera.position.fromArray(v.position);
  camera.up.fromArray(v.up || [0, 1, 0]);
  controls.target.fromArray(v.target);
  camera.lookAt(controls.target);
  camera.updateProjectionMatrix();
  controls.update();
}

function resize(w = window.innerWidth, h = window.innerHeight) {
  renderer.setSize(w, h, !headless);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', () => { if (!headless) resize(); });

setView(VIEWS[params.get('view')] || VIEWS.hero);

// ---- UI ----
const ui = document.getElementById('ui');
if (ui && !headless) {
  for (const [name, v] of Object.entries(VIEWS)) {
    if (v.hidden) continue;
    const b = document.createElement('button');
    b.textContent = v.label;
    b.onclick = () => { controls.autoRotate = false; setView(v); };
    ui.querySelector('.views').appendChild(b);
  }
  const spin = ui.querySelector('#spin');
  spin.onclick = () => { controls.autoRotate = !controls.autoRotate; spin.classList.toggle('on', controls.autoRotate); };
  ui.querySelector('#glb').onclick = async () => {
    const buf = await exportGLB();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([buf], { type: 'model/gltf-binary' }));
    a.download = 'sundown-inhuman-18.glb';
    a.click();
  };
}
controls.autoRotateSpeed = 1.2;

function loop() {
  controls.update();
  followCamera(scene, camera);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

// ---- tooling hooks (used by tools/*.mjs through Playwright) ----
export async function exportGLB() {
  const exporter = new GLTFExporter();
  return exporter.parseAsync(holder, { binary: true, maxTextureSize: 4096 });
}

const maskMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
window.__api = {
  THREE, scene, camera, renderer, model, holder, controls, setView, resize, exportGLB,
  render(w, h, view) {
    if (w && h) resize(w, h);
    if (view) setView(view);
    camera.updateMatrixWorld();
    followCamera(scene, camera);
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/png');
  },
  // white-on-black silhouette (for camera fitting against photo alpha masks)
  renderMask(w, h, view) {
    if (w && h) resize(w, h);
    if (view) setView(view);
    const bg = scene.background, env = scene.environment;
    scene.background = new THREE.Color(0x000000);
    scene.overrideMaterial = maskMat;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.render(scene, camera);
    scene.overrideMaterial = null;
    scene.background = bg;
    scene.environment = env;
    renderer.toneMapping = THREE.NeutralToneMapping;
  },
};

if (headless) {
  window.__ready = true;
} else {
  loop();
  window.__ready = true;
}
