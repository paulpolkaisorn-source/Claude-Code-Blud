// aim.js — ground aim decals: line, cone, arc (dotted path + target ring) and circle.
// MeshBasic, transparent, depthWrite false, y = 0.03, alpha 0.35, tinted by colour.
// All geometry is built once; set() only moves, scales, shows and recolours the parts.
// Local frame: forward is +Z, so group.rotation.y = atan2(dirX, dirZ) points the decal along the aim.
import * as THREE from 'three';

const ALPHA = 0.35;
const Y = 0.03;
const DOTS = 14;
const CONE_SEG = 12;
const CIRCLE_SEG = 40;
const SHAPES = ['line', 'cone', 'arc', 'circle'];

function flatGeo(positions, indices) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  return g;
}

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.55, 'rgba(255,255,255,0.95)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function createAim(scene) {
  const group = new THREE.Group();
  group.name = 'aim';
  group.visible = false;
  scene.add(group);

  // FrontSide with upward (+Y) winding everywhere: a DoubleSide transparent material would be drawn twice.
  const matShape = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: ALPHA, depthWrite: false,
  });
  const matDots = new THREE.MeshBasicMaterial({
    color: 0xffffff, map: dotTexture(), transparent: true, opacity: ALPHA, depthWrite: false,
  });

  // line: strip from the origin along +Z, half-width 0.1 tile; length is set to L * 0.5 in set().
  const line = new THREE.Mesh(flatGeo([-0.1, 0, 0, 0.1, 0, 0, 0.1, 0, 1, -0.1, 0, 1], [0, 2, 1, 0, 3, 2]), matShape);

  // cone: sector of radius 1 with half-angle 0.3 rad, scaled to the aim length.
  const cp = [0, 0, 0], ci = [];
  for (let k = 0; k <= CONE_SEG; k++) {
    const a = -0.3 + (0.6 * k) / CONE_SEG;
    cp.push(Math.sin(a), 0, Math.cos(a));
    if (k < CONE_SEG) ci.push(0, k + 1, k + 2);
  }
  const cone = new THREE.Mesh(flatGeo(cp, ci), matShape);

  // circle: filled disc of radius 1 at the aim point, scaled to the aim length.
  const dp = [0, 0, 0], di = [];
  for (let k = 0; k < CIRCLE_SEG; k++) {
    const a = (Math.PI * 2 * k) / CIRCLE_SEG;
    dp.push(Math.sin(a), 0, Math.cos(a));
    di.push(0, k + 1, ((k + 1) % CIRCLE_SEG) + 1);
  }
  const circle = new THREE.Mesh(flatGeo(dp, di), matShape);

  // arc: DOTS small quads along a gently bowed path from the origin to the target, plus a target ring.
  const dotPos = new Float32Array(DOTS * 4 * 3);
  const dotUv = new Float32Array(DOTS * 4 * 2);
  const dotIdx = new Uint16Array(DOTS * 6);
  for (let i = 0; i < DOTS; i++) {
    const b = i * 4;
    dotUv.set([0, 0, 1, 0, 1, 1, 0, 1], b * 2);
    dotIdx.set([b, b + 2, b + 1, b, b + 3, b + 2], i * 6);
  }
  const dotAttr = new THREE.BufferAttribute(dotPos, 3).setUsage(THREE.DynamicDrawUsage);
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', dotAttr);
  dotGeo.setAttribute('uv', new THREE.BufferAttribute(dotUv, 2));
  dotGeo.setIndex(new THREE.BufferAttribute(dotIdx, 1));
  const dots = new THREE.Mesh(dotGeo, matDots);
  dots.frustumCulled = false;

  const ringGeo = new THREE.RingGeometry(0.72, 0.9, CIRCLE_SEG);
  ringGeo.rotateX(-Math.PI / 2);          // lay the ring flat on the ground
  const target = new THREE.Mesh(ringGeo, matShape);

  for (const m of [line, cone, circle, dots, target]) { m.visible = false; m.renderOrder = 2; group.add(m); }

  let shapeNow = '';

  function layoutDots(L) {
    const r = 0.1, bow = 0.12 * L;
    for (let i = 0; i < DOTS; i++) {
      const t = (i + 1) / (DOTS + 1);
      const cz = t * L, cx = Math.sin(Math.PI * t) * bow;
      const o = i * 12;
      dotPos[o] = cx - r; dotPos[o + 1] = 0; dotPos[o + 2] = cz - r;
      dotPos[o + 3] = cx + r; dotPos[o + 4] = 0; dotPos[o + 5] = cz - r;
      dotPos[o + 6] = cx + r; dotPos[o + 7] = 0; dotPos[o + 8] = cz + r;
      dotPos[o + 9] = cx - r; dotPos[o + 10] = 0; dotPos[o + 11] = cz + r;
    }
    dotAttr.needsUpdate = true;
  }

  // radius (optional): blast radius for 'arc' target ring, zone radius for 'circle' (drawn at the aim point).
  function set(show, x, z, dirX, dirZ, length, shape, color, radius) {
    if (!show || SHAPES.indexOf(shape) < 0) { group.visible = false; shapeNow = ''; return; }
    const L = Math.max(0.05, length || 0);
    const hex = color === undefined ? 0xffffff : color;
    group.visible = true;
    group.position.set(x, Y, z);
    group.rotation.y = Math.atan2(dirX, dirZ);
    matShape.color.setHex(hex);
    matDots.color.setHex(hex);
    line.visible = shape === 'line';
    cone.visible = shape === 'cone';
    circle.visible = shape === 'circle';
    dots.visible = shape === 'arc' || shape === 'circle';
    target.visible = shape === 'arc';
    if (shape === 'line') {
      line.scale.set(2.5, 1, L);
    } else if (shape === 'cone') {
      cone.scale.set(L, 1, L);
    } else if (shape === 'circle') {
      const rc = radius > 0 ? radius : 1;
      layoutDots(L);
      circle.scale.set(rc, 1, rc);
      circle.position.set(0, 0, L);
    } else {
      layoutDots(L);
      const rt = (radius > 0 ? radius : 0.9) / 0.9;
      target.scale.set(rt, 1, rt);
      target.position.set(0, 0, L);
    }
    shapeNow = shape;
  }

  return {
    set,
    state() { return { visible: group.visible, shape: shapeNow }; },
    floats: dotPos.length + dotUv.length,
    dispose() {
      scene.remove(group);
      for (const m of [line, cone, circle, dots, target]) m.geometry.dispose();
      matShape.dispose();
      matDots.dispose();
      matDots.map.dispose();
    },
  };
}
