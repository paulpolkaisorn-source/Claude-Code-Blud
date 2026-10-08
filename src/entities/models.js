// models.js: procedural chunky low-poly brawler rigs (original art) with code animation, flash, opacity, dispose.
// Per model: 5 animated part meshes + 5 inverted-hull outlines + 1 team ring = 11 draw calls (cap 12).
import * as THREE from 'three';
import { BRAWLERS, PLAYER_COLOR, TEAM_COLORS } from '../contracts.js';
import { toonMat, addOutline, mergeColored } from '../render/toon.js';

const OUTLINE = 0.035;
const DEATH_DUR = 0.6;
const ONE_SHOT = { attack: 0.25, super: 0.45, hit: 0.2 };
const clamp01 = (v) => (v > 0 ? (v > 1 ? 1 : v) : 0);
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (u) => 1 - (1 - u) * (1 - u) * (1 - u);

// Part descriptors for mergeColored: { geo, color, matrix }, positioned relative to the owning pivot.
function P(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz),
  );
  return { geo, color, matrix: m };
}
const box = (w, h, d, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) =>
  P(new THREE.BoxGeometry(w, h, d), c, x, y, z, rx, ry, rz);
const cyl = (rt, rb, h, seg, c, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) =>
  P(new THREE.CylinderGeometry(rt, rb, h, seg), c, x, y, z, rx, ry, rz);
const cone = (r, h, seg, c, x = 0, y = 0, z = 0) => P(new THREE.ConeGeometry(r, h, seg), c, x, y, z);
const ico = (r, detail, c, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) =>
  P(new THREE.IcosahedronGeometry(r, detail), c, x, y, z, 0, 0, 0, sx, sy, sz);
const tor = (R, tube, rs, ts, c, x = 0, y = 0, z = 0, rx = 0) =>
  P(new THREE.TorusGeometry(R, tube, rs, ts), c, x, y, z, rx, 0, 0);

// ---- Designs. Local space: hip pivot at (0, H, 0); legs hang from the hip, arms from the shoulders.
function designRivet(A) {
  const steel = 0x3b4256, dark = 0x23283a, metal = 0x9aa3b8, rivet = 0xd9dde6, H = 0.48;
  const pad = (x) => [
    box(0.36, 0.2, 0.44, A, x, 0.52, 0),
    ...[-0.1, 0.1].flatMap((dx) => [-0.14, 0.14].map((dz) => ico(0.045, 0, rivet, x + dx, 0.63, dz))),
  ];
  const arm = [box(0.28, 0.46, 0.3, steel, 0, -0.23, 0), box(0.32, 0.26, 0.32, dark, 0, -0.5, 0)];
  const gun = [
    box(0.26, 0.26, 0.6, dark, 0, -0.5, 0.36),
    box(0.09, 0.09, 0.56, metal, -0.1, -0.44, 0.84),
    box(0.09, 0.09, 0.56, metal, 0.1, -0.44, 0.84),
    box(0.09, 0.09, 0.56, metal, 0, -0.58, 0.84),
    box(0.34, 0.3, 0.06, A, 0, -0.5, 1.1),
  ];
  return {
    H, legX: 0.22, shX: 0.56, shY: 0.44,
    body: [
      box(0.92, 0.56, 0.7, steel, 0, 0.28, 0),
      box(0.96, 0.12, 0.74, dark, 0, 0.02, 0),
      box(0.56, 0.3, 0.08, A, 0, 0.3, 0.38),
      box(0.7, 0.44, 0.12, dark, 0, 0.32, -0.42),
      box(0.5, 0.38, 0.5, steel, 0, 0.78, 0),
      box(0.46, 0.1, 0.06, 0xffe9b0, 0, 0.8, 0.26),
      ...pad(-0.56), ...pad(0.56),
    ],
    armL: arm,
    armR: [...arm, ...gun],
    leg: [box(0.3, H + 0.14, 0.34, steel, 0, (0.14 - H) / 2, 0), box(0.36, 0.14, 0.42, dark, 0, -H + 0.07, 0.03)],
  };
}

function designPip(A) {
  const jacket = 0x2d3f5c, skin = 0xf3c7a1, dark = 0x222838, cap = 0x1b8fa8, boot = 0x1a1d28, rifle = 0x2b2f3c, H = 0.54;
  const arm = [box(0.14, 0.38, 0.14, jacket, 0, -0.19, 0), box(0.13, 0.12, 0.13, skin, 0, -0.44, 0)];
  const goggles = [-0.09, 0.09].flatMap((x) => [
    cyl(0.125, 0.125, 0.03, 8, dark, x, 0.74, 0.19, Math.PI / 2),
    cyl(0.1, 0.1, 0.04, 8, A, x, 0.74, 0.21, Math.PI / 2),
  ]);
  return {
    H, legX: 0.13, shX: 0.27, shY: 0.42,
    body: [
      box(0.42, 0.46, 0.32, jacket, 0, 0.27, 0),
      box(0.07, 0.4, 0.02, A, 0, 0.27, 0.165),
      box(0.34, 0.32, 0.34, skin, 0, 0.7, 0),
      box(0.36, 0.05, 0.36, dark, 0, 0.74, 0),
      ...goggles,
      box(0.36, 0.08, 0.36, cap, 0, 0.9, 0),
      box(0.36, 0.03, 0.18, cap, 0, 0.86, 0.22),
    ],
    armL: arm,
    armR: [
      ...arm,
      box(0.1, 0.16, 0.24, dark, 0, -0.36, -0.1),
      box(0.07, 0.09, 1.0, rifle, 0, -0.42, 0.42),
      cyl(0.06, 0.06, 0.22, 8, dark, 0, -0.32, 0.32, Math.PI / 2),
      cyl(0.045, 0.045, 0.03, 8, A, 0, -0.32, 0.44, Math.PI / 2),
      box(0.05, 0.05, 0.08, dark, 0, -0.42, 0.95),
    ],
    leg: [box(0.15, H + 0.14, 0.16, rifle, 0, (0.14 - H) / 2, 0), box(0.17, 0.14, 0.24, boot, 0, -H + 0.07, 0.03)],
  };
}

function designMortara(A) {
  const khaki = 0x6b5a3e, dark = 0x2b2420, hat = 0xe8b923, skin = 0xe9b98c, bomb = 0x8a2d2d, rack = 0x3d4a2a, H = 0.5;
  const arm = [box(0.2, 0.42, 0.22, khaki, 0, -0.21, 0), ico(0.1, 0, skin, 0, -0.46, 0)];
  const goggles = [-0.12, 0.12].flatMap((x) => [
    cyl(0.11, 0.11, 0.04, 8, dark, x, 0.79, 0.23, Math.PI / 2),
    cyl(0.09, 0.09, 0.05, 8, A, x, 0.79, 0.25, Math.PI / 2),
  ]);
  return {
    H, legX: 0.18, shX: 0.42, shY: 0.42,
    body: [
      ico(0.42, 1, khaki, 0, 0.4, 0, 1, 1.05, 0.95),
      cyl(0.43, 0.43, 0.1, 10, dark, 0, 0.12, 0),
      box(0.1, 0.1, 0.06, A, 0, 0.12, 0.43),
      ico(0.27, 1, skin, 0, 0.9, 0),
      ...goggles,
      P(new THREE.SphereGeometry(0.3, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), hat, 0, 0.92, 0),
      cyl(0.34, 0.34, 0.04, 10, hat, 0, 0.92, 0),
      box(0.5, 0.56, 0.22, rack, 0, 0.42, -0.4),
      cyl(0.09, 0.09, 0.34, 7, bomb, -0.14, 0.5, -0.56),
      cyl(0.09, 0.09, 0.34, 7, bomb, 0.14, 0.5, -0.56),
      box(0.04, 0.08, 0.04, A, -0.14, 0.72, -0.56),
      box(0.04, 0.08, 0.04, A, 0.14, 0.72, -0.56),
    ],
    armL: arm,
    armR: [
      ...arm,
      cyl(0.12, 0.1, 0.62, 8, 0x4f5b3a, 0, -0.44, 0.42, Math.PI / 2),
      cyl(0.14, 0.14, 0.05, 8, A, 0, -0.44, 0.72, Math.PI / 2),
      cyl(0.1, 0.1, 0.02, 8, 0x101010, 0, -0.44, 0.75, Math.PI / 2),
    ],
    leg: [box(0.2, H + 0.14, 0.22, 0x3e3a33, 0, (0.14 - H) / 2, 0), box(0.22, 0.14, 0.28, dark, 0, -H + 0.07, 0.03)],
  };
}

function designLumen(A) {
  const robe = 0x4b3b78, robe2 = 0x2b2250, wood = 0x6b4a2a, glow = 0xfff6a0, skin = 0xf0d2b0, H = 0.5;
  const arm = [box(0.14, 0.4, 0.16, robe, 0, -0.2, 0), ico(0.08, 0, skin, 0, -0.42, 0)];
  return {
    H, legX: 0.12, shX: 0.24, shY: 0.46,
    body: [
      cyl(0.2, 0.4, 0.66, 8, robe, 0, 0.23, 0),
      cyl(0.42, 0.42, 0.06, 8, A, 0, -0.07, 0),
      cyl(0.2, 0.2, 0.07, 8, A, 0, 0.3, 0),
      cyl(0.1, 0.1, 0.12, 6, robe2, 0, 0.66, 0),
      cyl(0.22, 0.26, 0.05, 6, robe2, 0, 0.7, 0),
      cyl(0.26, 0.2, 0.36, 6, A, 0, 0.9, 0),
      cone(0.28, 0.16, 6, 0x3a2d5c, 0, 1.13, 0),
      tor(0.36, 0.04, 6, 18, A, 0, 1.28, 0, Math.PI / 2),
    ],
    armL: arm,
    armR: [...arm, cyl(0.035, 0.045, 1.5, 5, wood, 0, -0.25, 0.04), ico(0.16, 1, glow, 0, 0.66, 0.04)],
    leg: [box(0.13, H + 0.14, 0.14, robe2, 0, (0.14 - H) / 2, 0), box(0.15, 0.12, 0.22, A, 0, -H + 0.06, 0.04)],
  };
}

const DESIGN = { rivet: designRivet, pip: designPip, mortara: designMortara, lumen: designLumen };

export function createBrawlerModel(brawlerId, { team = 0, isPlayer = false } = {}) {
  const stats = BRAWLERS[brawlerId];
  if (!stats || !DESIGN[brawlerId]) throw new Error(`createBrawlerModel: unknown brawler "${brawlerId}"`);
  const D = DESIGN[brawlerId](stats.color);
  const H = D.H;

  const root = new THREE.Group();
  root.name = `brawler-${brawlerId}`;
  const tilt = new THREE.Group();          // whole body: death topple/sink, victory hop
  root.add(tilt);
  const hip = new THREE.Group();           // torso pivot: bob and lean; parent of body and arms
  hip.position.set(0, H, 0);
  tilt.add(hip);
  const legL = new THREE.Group();
  legL.position.set(-D.legX, H, 0);
  tilt.add(legL);
  const legR = new THREE.Group();
  legR.position.set(D.legX, H, 0);
  tilt.add(legR);
  const armL = new THREE.Group();
  armL.position.set(-D.shX, D.shY, 0);
  hip.add(armL);
  const armR = new THREE.Group();
  armR.position.set(D.shX, D.shY, 0);
  hip.add(armR);

  const meshes = [], mats = [], outlines = [];
  const part = (pivot, parts, name) => {
    const mat = toonMat(0xffffff, { vertexColors: true, unique: true });
    const mesh = new THREE.Mesh(mergeColored(parts), mat);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    pivot.add(mesh);
    outlines.push(addOutline(mesh, OUTLINE));
    meshes.push(mesh);
    mats.push(mat);
  };
  part(hip, D.body, 'body');
  part(armL, D.armL, 'armL');
  part(armR, D.armR, 'armR');
  part(legL, D.leg, 'legL');
  part(legR, D.leg, 'legR');

  const ringMat = new THREE.MeshBasicMaterial({
    color: isPlayer ? PLAYER_COLOR : TEAM_COLORS[team], transparent: true, opacity: 0.85, depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.44, 0.56, 28), ringMat);
  ring.name = 'ring';
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  ring.castShadow = false;
  ring.receiveShadow = false;
  root.add(ring);

  // Animation state (numbers only; no per-frame allocation).
  let base = 'move', time = 0, phase = 0, victoryT = 0;
  let oneshot = null, oneT = 0, dead = false, deathT = 0, disposed = false;

  function basePose(d, s) {
    phase += d * (6 + 8 * s);
    const idle = 1 - s;
    const br = Math.sin(time * 2.6) * idle;   // breathe while standing
    const sw = Math.sin(phase) * s;           // stride while moving
    tilt.rotation.x = 0;
    tilt.position.y = 0;
    hip.position.y = H + br * 0.025 + Math.abs(sw) * 0.05;
    hip.rotation.x = 0.16 * s + br * 0.02;
    hip.rotation.z = idle * 0.025 * Math.sin(time * 1.3);
    legL.rotation.x = sw * 0.7;
    legR.rotation.x = -sw * 0.7;
    armL.rotation.x = -sw * 0.6 + br * 0.05;
    armR.rotation.x = sw * 0.35 + br * 0.03;
    armL.rotation.z = -0.06;
    armR.rotation.z = 0.06;
  }

  function victoryPose(d) {
    victoryT += d;
    const hop = Math.abs(Math.sin(victoryT * 5));
    const wave = Math.sin(victoryT * 10) * 0.2;
    tilt.rotation.x = 0;
    tilt.position.y = hop * 0.35;
    hip.position.y = H;
    hip.rotation.x = -0.05;
    hip.rotation.z = 0;
    legL.rotation.x = -hop * 0.35;
    legR.rotation.x = -hop * 0.35;
    armL.rotation.x = -2.7 + wave;
    armR.rotation.x = -2.7 - wave;
    armL.rotation.z = -0.3;
    armR.rotation.z = 0.3;
  }

  // Overlays a one-shot on top of the base pose. Each one reads the base value first and blends back to it.
  function overlay() {
    const bH = hip.rotation.x, bL = armL.rotation.x, bR = armR.rotation.x;
    if (oneshot === 'attack') {
      const u = oneT / ONE_SHOT.attack;
      const w = u < 0.7 ? 1 : (1 - u) / 0.3;
      armR.rotation.x = lerp(bR, -1.35 + 0.5 * Math.sin(Math.PI * u), w);
      hip.rotation.x = bH - 0.12 * Math.sin(Math.PI * u);
    } else if (oneshot === 'super') {
      if (oneT < 0.2) {
        const e = easeOut(oneT / 0.2);
        armR.rotation.x = lerp(bR, 0.9, e);
        armL.rotation.x = lerp(bL, 0.6, e);
        hip.rotation.x = lerp(bH, -0.12, e);
      } else if (oneT < 0.3) {
        const e = easeOut((oneT - 0.2) / 0.1);
        armR.rotation.x = lerp(0.9, -2.3, e);
        armL.rotation.x = lerp(0.6, -1.6, e);
        hip.rotation.x = lerp(-0.12, 0.3, e);
      } else {
        const w = 1 - (oneT - 0.3) / 0.15;
        armR.rotation.x = lerp(bR, -2.3, w);
        armL.rotation.x = lerp(bL, -1.6, w);
        hip.rotation.x = lerp(bH, 0.3, w);
      }
    } else {
      const u = oneT / ONE_SHOT.hit;
      const f = Math.sin(Math.PI * u) * (1 - 0.5 * u);
      hip.rotation.x = bH - 0.28 * f;
      hip.rotation.z += 0.12 * Math.sin(u * Math.PI * 3) * (1 - u);
      armL.rotation.x = bL + 0.5 * f;
      armR.rotation.x = bR + 0.5 * f;
    }
  }

  // Death: topple backwards and sink over DEATH_DUR, then hold the final pose.
  function deathPose(u) {
    const e = u * u;
    tilt.rotation.x = -1.5 * e;
    tilt.position.y = -0.22 * e;
    hip.position.y = lerp(hip.position.y, H, e);
    hip.rotation.x = lerp(hip.rotation.x, 0, e);
    hip.rotation.z = lerp(hip.rotation.z, 0, e);
    legL.rotation.x = lerp(legL.rotation.x, 0.5, e);
    legR.rotation.x = lerp(legR.rotation.x, -0.4, e);
    armL.rotation.x = lerp(armL.rotation.x, -1.0, e);
    armR.rotation.x = lerp(armR.rotation.x, 0.6, e);
    armL.rotation.z = lerp(armL.rotation.z, -0.3, e);
    armR.rotation.z = lerp(armR.rotation.z, 0.3, e);
  }

  function setPose(x, z, facing) {
    root.position.set(x, 0, z);
    root.rotation.y = facing;
  }

  function play(anim) {
    if (dead) {
      if (anim !== 'idle' && anim !== 'run') return;   // death holds; a base anim (respawn) revives
      dead = false;
      deathT = 0;
      tilt.rotation.x = 0;
      tilt.position.y = 0;
    }
    switch (anim) {
      case 'idle':
      case 'run':
        base = 'move';
        break;
      case 'victory':
        base = 'victory';
        victoryT = 0;
        break;
      case 'attack':
      case 'super':
      case 'hit':
        oneshot = anim;
        oneT = 0;
        break;
      case 'death':
        dead = true;
        deathT = 0;
        oneshot = null;
        break;
      default:
        break;
    }
  }

  function update(dt, speed01) {
    const d = dt > 0 ? (dt > 0.1 ? 0.1 : dt) : 0;
    const s = clamp01(speed01);
    time += d;
    if (dead) {
      deathT = deathT + d < DEATH_DUR ? deathT + d : DEATH_DUR;
      deathPose(deathT / DEATH_DUR);
      return;
    }
    if (base === 'victory') victoryPose(d);
    else basePose(d, s);
    if (oneshot !== null) {
      oneT += d;
      if (oneT >= ONE_SHOT[oneshot]) oneshot = null;
      else overlay();
    }
  }

  function setOpacity(a) {
    const v = clamp01(a);
    const translucent = v < 1;
    for (let i = 0; i < mats.length; i++) {
      mats[i].transparent = translucent;
      mats[i].opacity = v;
    }
    for (let i = 0; i < outlines.length; i++) outlines[i].visible = !translucent;
    ringMat.opacity = 0.85 * v;
  }

  function setFlash(f) {
    const v = clamp01(f);
    for (let i = 0; i < mats.length; i++) mats[i].emissive.setRGB(v, v, v);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    for (let i = 0; i < meshes.length; i++) {
      meshes[i].geometry.dispose();
      mats[i].dispose();
    }
    for (let i = 0; i < outlines.length; i++) outlines[i].geometry.dispose();
    ring.geometry.dispose();
    ringMat.dispose();
    if (root.parent) root.parent.remove(root);
  }

  return { root, brawlerId, setPose, play, update, setOpacity, setFlash, dispose };
}
