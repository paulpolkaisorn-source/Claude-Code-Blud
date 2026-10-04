// Product-photography lighting baked into a PMREM environment.
//
// The softboxes are laid out in *camera space* (camera at the origin looking
// down -Z, +Y up) and the environment is re-oriented every frame so the rig
// follows the camera, like a photographer moving lights with the camera. That
// keeps the look of the reference shots from any angle: face-on gloss stays
// black, tilted chrome picks up big white panels, edges get rim highlights.

import * as THREE from 'three';

export function buildStudioEnvironment(renderer) {
  const scene = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.SphereGeometry(10, 48, 24), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide }));
  room.material.color.setScalar(0.1);
  scene.add(room);

  const panel = (w, h, intensity, pos, look = new THREE.Vector3(0, 0, -3)) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
    m.material.color.setScalar(intensity);
    m.position.copy(pos);
    m.lookAt(look);
    scene.add(m);
  };
  // subject sits ~3 m in front of the camera (z = -3)
  panel(10, 5, 4.5, new THREE.Vector3(0, 6.5, -2.0)); // big overhead box
  panel(4, 7, 3.4, new THREE.Vector3(-7, 1.5, -1.5)); // left strip
  panel(4, 7, 2.6, new THREE.Vector3(7, 0.5, -2.5)); // right strip
  panel(6, 3.5, 2.2, new THREE.Vector3(0, 3.8, 3.5)); // over-the-shoulder key (high, behind camera)
  panel(9, 3, 1.2, new THREE.Vector3(0, -5.5, -2.5)); // white sweep bounce below
  panel(3, 6, 2.4, new THREE.Vector3(-4.5, 2.5, -9)); // back-left rim
  panel(3, 6, 2.0, new THREE.Vector3(4.5, 2.5, -9)); // back-right rim
  // a mid-grey card directly behind the camera keeps face-on gloss from going pitch black
  panel(5, 3, 0.6, new THREE.Vector3(0, 0, 6));

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.03).texture;
  pmrem.dispose();
  return env;
}

// Orient the environment so the camera-space rig follows `camera`.
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
export function followCamera(scene, camera) {
  _q.copy(camera.quaternion).invert();
  _e.setFromQuaternion(_q, 'XYZ');
  scene.environmentRotation.set(-_e.x, -_e.y, -_e.z, 'XYZ');
}
