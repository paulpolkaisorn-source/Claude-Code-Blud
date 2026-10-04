import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildModel } from './model.js';
import { createStudioEnvironment } from './env.js';
import { P as DEFAULT_P } from './params.js';

export function createViewer({
  canvas, width = 800, height = 800, silhouette = false, textures = true, quality = 1, P = DEFAULT_P,
  preserveDrawingBuffer = false, frozen = false, pixelRatio = Math.min(window.devicePixelRatio || 1, 2), background = 0xffffff, alpha = false,
}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha, preserveDrawingBuffer, powerPreference: 'high-performance' });
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = silhouette ? THREE.NoToneMapping : THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  scene.background = silhouette ? new THREE.Color(0xffffff) : alpha ? null : new THREE.Color(background);
  if (!silhouette) {
    scene.environment = createStudioEnvironment(renderer);
    scene.environmentIntensity = 1.0;
  }
  // polished metals reflect a bright white cyclorama, lacquered black parts a dark studio with softboxes
  const brightEnv = silhouette ? null : createStudioEnvironment(renderer, window.__envBright || { sky: [1.3, 1.0, 0.6], panelGain: 0.8, swirl: 1.0 });

  const camera = new THREE.PerspectiveCamera(24, width / height, 1, 400);
  camera.position.set(0, 0, 60);

  const state = { P, textures, quality, silhouette, root: null, spin: 0, roll: 0, frozen: !!frozen };
  const stage = new THREE.Group();
  scene.add(stage);

  function rebuild(Pover) {
    if (state.root) {
      stage.remove(state.root);
      state.root.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
      });
    }
    if (Pover) state.P = Pover;
    state.root = buildModel({ P: state.P, textures: state.textures, silhouette: state.silhouette, quality: state.quality });
    state.root.rotation.z = state.spin;
    if (brightEnv) state.root.traverse((o) => { if (o.isMesh && o.material.userData && o.material.userData.bright) { o.material.envMap = brightEnv; o.material.needsUpdate = true; } });
    stage.add(state.root);
    return state.root;
  }
  rebuild();

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 8;
  controls.maxDistance = 140;
  controls.target.set(0, 0, -3.5);

  function resize(w, h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /**
   * Camera described the way the photo fit uses it: spherical position around `target`,
   * a roll around the view axis, a lens, a spin of the object about its own axis and an
   * optional principal point shift (fraction of image size).
   */
  function setPose({ yaw = 0, pitch = 0, roll = 0, dist = 60, fov = 24, target = [0, 0, -3.5], spin = 0, shiftX = 0, shiftY = 0, crop = null, rollMode = 'camera' }) {
    const t = new THREE.Vector3(...target);
    const cp = Math.cos(pitch * Math.PI / 180);
    camera.position.set(
      t.x + dist * cp * Math.sin(yaw * Math.PI / 180),
      t.y + dist * Math.sin(pitch * Math.PI / 180),
      t.z + dist * cp * Math.cos(yaw * Math.PI / 180),
    );
    camera.up.set(0, 1, 0);
    camera.lookAt(t);
    state.roll = roll;
    stage.quaternion.identity();
    stage.position.set(0, 0, 0);
    if (roll) {
      const axis = new THREE.Vector3().subVectors(t, camera.position).normalize();
      if (rollMode === 'stage') {
        // keep the camera upright (so orbit controls keep working) and turn the model about the view axis instead
        const q = new THREE.Quaternion().setFromAxisAngle(axis, -roll * Math.PI / 180);
        stage.quaternion.copy(q);
        stage.position.copy(t).sub(t.clone().applyQuaternion(q));
      } else {
        camera.up.applyAxisAngle(axis, roll * Math.PI / 180);
        camera.lookAt(t);
      }
    }
    camera.fov = fov;
    controls.target.copy(t);
    state.spin = spin * Math.PI / 180;
    if (state.root) state.root.rotation.z = state.spin;
    const w = renderer.domElement.width;
    const h = renderer.domElement.height;
    if (crop) {
      // render only a window [x0,y0,x1,y1] of a larger full frame (used to mimic cropped/zoomed photos)
      const [x0, y0, x1, y1, fw, fh] = crop;
      camera.aspect = fw / fh;
      camera.setViewOffset(fw, fh, x0 - shiftX * fw, y0 - shiftY * fh, x1 - x0, y1 - y0);
    } else if (shiftX || shiftY) camera.setViewOffset(w, h, -shiftX * w, -shiftY * h, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  function render() {
    if (!state.frozen) controls.update();
    renderer.render(scene, camera);
  }

  return { renderer, scene, camera, controls, state, stage, rebuild, resize, setPose, render };
}
