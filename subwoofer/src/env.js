import * as THREE from 'three';

/**
 * Procedural product-photo studio used for image based lighting: a white cyclorama, a few big
 * softboxes (these produce the window-shaped reflections you see on the lacquered carbon and the
 * chrome in the photos) and a darker floor.
 */
export function createStudioEnvironment(renderer, { exposure = 1, sky = [0.55, 0.16, 0.08], panelGain = 1, flags = [] } = {}) {
  const scene = new THREE.Scene();

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { k: { value: exposure } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);} ',
    fragmentShader: `varying vec3 vP; uniform float k;
      void main(){
        float h = vP.y; // up in env space
        vec3 top = vec3(${sky[0].toFixed(3)});
        vec3 mid = vec3(${sky[1].toFixed(3)});
        vec3 bot = vec3(${sky[2].toFixed(3)});
        vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.7)) : mix(mid, bot, pow(-h, 0.6));
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
  // black flags (cards) give polished metal the dark reflections it has in a real studio
  for (const [w, h, pos] of flags) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0x050505, side: THREE.DoubleSide }));
    f.position.set(...pos);
    f.lookAt(0, 0, 0);
    scene.add(f);
  }
  panel(20, 10, [0, 20, 16], 7);
  panel(34, 9, [0, -16, 15], 5);
  panel(7, 24, [-24, 2, 8], 5);
  panel(9, 24, [24, 2, 8], 6);
  panel(20, 7, [0, 8, -24], 5);
  panel(8, 8, [10, 22, -6], 5);

  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(scene, 0.02);
  pm.dispose();
  scene.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) o.material.dispose();
  });
  return rt.texture;
}
