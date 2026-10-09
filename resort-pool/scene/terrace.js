// Travertine terrace with a hole for the pool, wooden sun deck, balustrade and the terrain around it.
import * as THREE from 'three';
import { POOL } from '../pool-config.js';
import { COPING_W } from './shell.js';
import { TERRACE, WOOD, GROUND_Y } from './layout.js';
import { makeStone, makeWood, setAniso, shared } from './textures.js';
import { metricBox } from './geo.js';
import { addBreakup } from './breakup.js';

export function buildTerrace({ aniso = 8 }) {
  const group = new THREE.Group(); group.name = 'terrace';
  const colliders = [];
  const T = TERRACE, dk = POOL.deckY;
  const stone = shared('deckStone', () => makeStone({ seed: 11, tintVar: 0.03 }));
  setAniso(stone, aniso);
  const deckMat = new THREE.MeshStandardMaterial({
    map: stone.map, roughnessMap: stone.rough, roughness: 1, normalMap: stone.normal, normalScale: new THREE.Vector2(0.7, 0.7), envMapIntensity: 0.5,
  });
  addBreakup(deckMat, { scale: 0.21, amount: 0.1 });
  // slab with a rectangular hole around the pool and coping
  const shape = new THREE.Shape();
  shape.moveTo(T.minX, -T.minZ); shape.lineTo(T.maxX, -T.minZ); shape.lineTo(T.maxX, -T.maxZ); shape.lineTo(T.minX, -T.maxZ); shape.closePath();
  const hx = POOL.maxX + COPING_W, hz = POOL.maxZ + COPING_W;
  const hole = new THREE.Path();
  hole.moveTo(-hx, -hz); hole.lineTo(-hx, hz); hole.lineTo(hx, hz); hole.lineTo(hx, -hz); hole.closePath();
  shape.holes.push(hole);
  const depth = dk - T.bottom;
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(-Math.PI / 2);
  g.translate(0, T.bottom, 0);
  const slab = new THREE.Mesh(g, deckMat); slab.name = 'deck'; slab.receiveShadow = true; group.add(slab);
  // inner wall of the hole is hidden behind the coping; nothing else to do for the pool edge

  // wooden sun deck raised a few centimetres above the travertine
  const wood = shared('teak', () => makeWood({ seed: 5 }));
  setAniso(wood, aniso);
  const woodMat = new THREE.MeshStandardMaterial({ map: wood.map, roughnessMap: wood.rough, roughness: 1, normalMap: wood.normal, normalScale: new THREE.Vector2(0.8, 0.8), envMapIntensity: 0.45 });
  addBreakup(woodMat, { scale: 0.33, amount: 0.12 });
  const w = WOOD, ww = w.maxX - w.minX, wd = w.maxZ - w.minZ;
  const wm = new THREE.Mesh(metricBox(ww, w.rise, wd), woodMat);
  wm.position.set((w.minX + w.maxX) / 2, dk + w.rise / 2, (w.minZ + w.maxZ) / 2);
  wm.receiveShadow = true; wm.castShadow = true; wm.name = 'sun-deck'; group.add(wm);

  // low travertine kerb with a glass balustrade along the sea side
  const kerbMat = deckMat;
  const kerb = new THREE.Mesh(metricBox(0.3, 0.38, T.maxZ - T.minZ), kerbMat);
  kerb.position.set(T.maxX - 0.15, dk + 0.19, (T.minZ + T.maxZ) / 2); kerb.castShadow = true; kerb.receiveShadow = true; group.add(kerb);
  colliders.push(new THREE.Box3(new THREE.Vector3(T.maxX - 0.3, 0, T.minZ), new THREE.Vector3(T.maxX, 1.2, T.maxZ)));
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xcfe6ec, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.22, envMapIntensity: 1.4, side: THREE.DoubleSide, depthWrite: false });
  const rail = new THREE.MeshStandardMaterial({ color: 0xdfe3e6, metalness: 1, roughness: 0.28, envMapIntensity: 1.2 });
  const panelsN = 12, span = (T.maxZ - T.minZ) / panelsN;
  for (let i = 0; i < panelsN; i++) {
    const pz = T.minZ + (i + 0.5) * span;
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.95, span - 0.06), glass);
    p.position.set(T.maxX - 0.15, dk + 0.38 + 0.475, pz); p.renderOrder = 4; group.add(p);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 10), rail);
    post.position.set(T.maxX - 0.15, dk + 0.38 + 0.5, T.minZ + i * span); post.castShadow = true; group.add(post);
  }
  const handrail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, T.maxZ - T.minZ, 10).rotateX(Math.PI / 2), rail);
  handrail.position.set(T.maxX - 0.15, dk + 0.38 + 0.97, (T.minZ + T.maxZ) / 2); group.add(handrail);

  return { group, colliders, deckMat, woodMat };
}
