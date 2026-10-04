import * as THREE from 'three';
import { rng } from './util.js';

/**
 * Procedural product-photo studio used for image based lighting: a white cyclorama, a few big
 * softboxes (these produce the window-shaped reflections you see on the lacquered carbon and the
 * chrome in the photos) and a darker floor.
 */
export function createStudioEnvironment(renderer, { exposure = 1, sky = [0.55, 0.16, 0.08], panelGain = 1, flags = [], bars = 0, flagColor = 0x050505, swirl = 0 } = {}) {
  const scene = new THREE.Scene();

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { k: { value: exposure }, swirl: { value: swirl } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} ',
    fragmentShader: `varying vec3 vP; uniform float k; uniform float swirl;
      void main(){
        float h = vP.y; // up in env space
        vec3 top = vec3(${sky[0].toFixed(3)});
        vec3 mid = vec3(${sky[1].toFixed(3)});
        vec3 bot = vec3(${sky[2].toFixed(3)});
        vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.7)) : mix(mid, bot, pow(-h, 0.6));
        if (swirl > 0.0) {
          // smooth bands of light and dark, the way a polished metal part reflects a studio
          float az = atan(vP.x, vP.z);
          float f = 0.5 + 0.5 * sin(2.0 * az + 2.2 * sin(3.0 * h + 0.6) + 0.8) * cos(1.5 * h + 0.3);
          float g = 0.5 + 0.5 * sin(5.0 * az - 3.0 * h + 1.7);
          float m = smoothstep(0.18, 0.75, f) * (0.55 + 0.45 * smoothstep(0.1, 0.9, g));
          c *= mix(1.0, mix(0.12, 1.25, m), swirl);
        }
        gl_FragColor = vec4(c * k, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(60, 48, 24), skyMat));

  const panel = (w, h, pos, intensity, look = new THREE.Vector3(0, 0, 0)) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color().setScalar(intensity * panelGain), side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.lookAt(look);
    scene.add(m);
    return m;
  };
  // key softbox above & in front, fill from below-front, strips on both sides, rim from behind
  // dark flags (cards) give polished metal the dark reflections it has in a real studio
  const rnd = rng(4);
  const all = [...flags];
  for (let k = 0; k < bars; k++) {
    const a = ((k * 360) / bars + (rnd() - 0.5) * 30) * (Math.PI / 180);
    all.push([8 + rnd() * 6, 60, [26 * Math.sin(a), (rnd() - 0.5) * 8, 26 * Math.cos(a)]]);
  }
  for (const [w, h, pos] of all) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: flagColor, side: THREE.DoubleSide }));
    f.position.set(...pos);
    f.lookAt(0, 0, 0);
    scene.add(f);
  }
  panel(20, 10, [0, 20, 16], 7);
  panel(34, 9, [0, -16, 15], 5);
  panel(7, 24, [-24, 2, 8], 5);
  panel(9, 24, [24, 2, 8], 6);
  panel(24, 9, [0, 8, -24], 8);
  panel(8, 8, [10, 22, -6], 6);
  panel(4, 26, [-14, 2, -22], 7);
  panel(4, 26, [14, 2, -22], 7);
  panel(30, 4, [0, 16, -14], 7);

  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(scene, 0.02);
  pm.dispose();
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
  return rt.texture;
}
