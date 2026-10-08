// crystals.js — one instanced mesh of glowing octahedra for the game's pooled crystals (one draw call).
// Crystal objects follow contracts.js: { active, x, y, z, age, settled }. y is the ground-contact height; the gem
// floats above it, spins always, and bobs only while settled. Inactive slots are scaled to zero. sync() allocates nothing.
import * as THREE from 'three';
import { CRYSTAL_COLOR } from '../contracts.js';
import { toonMat } from '../render/toon.js';

const POP_TIME = 0.25;     // seconds for a newly spawned crystal to grow to full size
const GEM_LIFT = 0.42;     // centre height above the contact point

export function createCrystalView(scene, max = 40) {
  const geo = new THREE.OctahedronGeometry(0.22, 0);
  geo.scale(1, 1.6, 1);
  const mesh = new THREE.InstancedMesh(geo, toonMat(CRYSTAL_COLOR, { emissive: CRYSTAL_COLOR, emissiveIntensity: 0.9 }), max);
  mesh.name = 'crystals';
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < max; i++) mesh.setMatrixAt(i, hidden);
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
  const dummy = new THREE.Object3D();

  return {
    sync(crystals, time) {
      for (let i = 0; i < max; i++) {
        const c = crystals[i];
        if (!c || !c.active) { mesh.setMatrixAt(i, hidden); continue; }
        const pop = c.age < POP_TIME ? Math.max(0.05, c.age / POP_TIME) : 1;
        const bob = c.settled ? Math.sin(time * 2.4 + i * 1.7) * 0.07 : 0;
        dummy.position.set(c.x, c.y + GEM_LIFT + bob, c.z);
        dummy.rotation.set(0, time * 1.6 + i * 0.9, 0);
        dummy.scale.setScalar(pop);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      scene.remove(mesh);
      geo.dispose();
    },
  };
}
