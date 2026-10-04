// Sundown Audio InHuman 18" — procedural model.
//
// Units: millimetres. Axis: +Y points out of the cone (front), the motor is at
// -Y. y = 0 is the front face of the flange. Angles follow the front-view clock
// convention from geom.js (0 = 12 o'clock, clockwise when facing the cone).
//
// Dimensions were measured from the manufacturer's orthographic-ish product
// shots (side profile + straight-on front) scaled to a 480 mm flange diameter.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TAU, DEG, radial, fillet, lathe, gridSurface, roundedLoop, extrudeShapeY, placeAlong, circlePoly } from './geom.js';
import { makeMaterials } from './materials.js';
import { flangeEmboss, bootEmboss, dustCapTextures, threadedHoleTexture } from './textures.js';

export const DIMS = {
  // frame flange + gasket ring
  flangeR: 240,
  gasketROut: 237.6,
  gasketRIn: 216.5,
  gasketThk: 9,
  frameRIn: 204,
  frameBottom: -24,
  boltR: 228.6,
  boltStart: 2 * DEG, // first through-hole, then alternating screw / hole every 22.5 deg
  badgeStart: 13.25 * DEG, // SUNDOWN AUDIO badges in every other gap
  // moving parts
  surroundIn: 167,
  surroundOut: 214,
  surroundBase: -4.5,
  surroundApex: 40,
  lipIn: 148,
  coneEdgeY: -8,
  coneNeckR: 66,
  coneNeckY: -96,
  capR: 73.5,
  capRise: 24,
  spiderY: -123,
  // basket
  spokeCount: 6,
  spokeStart: 28 * DEG,
  ringBottom: -41,
  platformTop: -125,
  mountTop: -228,
  mountBottom: -242,
  // motor
  bootTop: -281.5,
  bootBandTop: -293.5,
  bootBandBottom: -378.5,
  bootBottom: -391.5,
  bootR: 164.5,
  backDiscY: -421,
  backDiscR: 78,
  ventR: 23,
  // markings
  bootTextAngle: -24 * DEG,
  terminalAngle: 88 * DEG,
};

// Outer face of a spoke, (R, y) from just under the flange to the mount ring.
const SPOKE_OUTER = [
  [213.0, -24], [209.5, -45], [206.0, -69], [203.0, -89], [199.5, -109], [196.5, -129],
  [193.0, -149], [187.0, -168], [180.5, -181], [172.0, -192], [161.0, -202],
  [147.0, -211], [130.0, -219], [112.0, -225], [99.0, -229],
];

function mesh(geo, mat, name) {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  return m;
}

function setPlanarUV(geo, scale, offset = 0) {
  // planar projection onto the front-view plane: u = x, v = -z (12 o'clock up)
  const p = geo.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = p.getX(i) * scale + offset;
    uv[i * 2 + 1] = -p.getZ(i) * scale + offset;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

// ---------------------------------------------------------------------------
function buildFlange(M, D) {
  const g = new THREE.Group();
  g.name = 'frame_flange';
  const step = 22.5 * DEG;
  const holeAngles = [], screwAngles = [], badgeAngles = [];
  for (let k = 0; k < 16; k++) (k % 2 ? screwAngles : holeAngles).push(D.boltStart + k * step);
  for (let k = 0; k < 8; k++) badgeAngles.push(D.badgeStart + k * 45 * DEG);
  const at = (th, r) => [Math.sin(th) * r, Math.cos(th) * r];

  // top gasket ring: countersunk through-holes + counterbores for the screws
  const gb = 2.2;
  const gasket = circlePoly(0, 0, D.gasketROut - gb, 360, new THREE.Shape());
  gasket.holes.push(circlePoly(0, 0, D.gasketRIn + gb, 360));
  for (const th of holeAngles) gasket.holes.push(circlePoly(...at(th, D.boltR), 6.4, 28));
  for (const th of screwAngles) gasket.holes.push(circlePoly(...at(th, D.boltR), 7.7, 28));
  const gGeo = extrudeShapeY(gasket, D.gasketThk - 2 * gb, gb, { bevelSegments: 4 });
  // planar UVs (mm) are already the shape coordinates: map the 480 mm disc
  const emboss = flangeEmboss({ R: D.flangeR, angles: badgeAngles, badgeR: D.boltR });
  for (const t of Object.values(emboss)) {
    t.repeat.set(1 / (2 * D.flangeR), 1 / (2 * D.flangeR));
    t.offset.set(0.5, 0.5);
  }
  const gasketCapMat = M.frameBlack.clone();
  gasketCapMat.name = 'frame_gloss_black_badges';
  gasketCapMat.color.set(0xffffff);
  gasketCapMat.map = emboss.map;
  gasketCapMat.metalness = 1;
  gasketCapMat.metalnessMap = emboss.metalnessMap;
  gasketCapMat.normalMap = emboss.normalMap;
  gasketCapMat.normalScale = new THREE.Vector2(1.5, 1.5);
  g.add(mesh(gGeo, [gasketCapMat, M.frameBlack], 'gasket_ring'));

  // cast frame flange underneath
  const fb = 2.6;
  const frame = circlePoly(0, 0, D.flangeR - fb, 360, new THREE.Shape());
  frame.holes.push(circlePoly(0, 0, D.frameRIn + fb, 240));
  for (const th of holeAngles) frame.holes.push(circlePoly(...at(th, D.boltR), 3.7 + fb, 24));
  const fThk = -D.gasketThk - D.frameBottom; // 15
  const fGeo = extrudeShapeY(frame, fThk - 2 * fb, fb, { bevelSegments: 4 });
  fGeo.translate(0, -D.gasketThk + 0.3, 0);
  g.add(mesh(fGeo, M.frameBlack, 'frame_flange_ring'));

  // countersink bores so the through-holes read as real holes from the front
  const boreGeo = lathe([[3.9, 0.3], [3.9, D.frameBottom + 0.5]], { segments: 24, flip: true });
  for (const th of holeAngles) {
    const b = mesh(boreGeo, M.frameBlack, 'mount_hole_bore');
    b.position.copy(radial(th).multiplyScalar(D.boltR));
    b.position.y = -1.2;
    g.add(b);
  }

  // black socket-head button screws in the counterbores
  const head = lathe(fillet([[0, 1.9], [3.6, 1.6, 1.5], [5.3, 0.5, 0.8], [5.3, -5.5]], 6), { segments: 32 });
  const socket = new THREE.CylinderGeometry(1.9, 1.9, 0.6, 6);
  socket.translate(0, 1.75, 0);
  for (const th of screwAngles) {
    const p = radial(th).multiplyScalar(D.boltR);
    const s = new THREE.Group();
    s.name = 'gasket_screw';
    s.add(mesh(head, M.screwBlack, 'screw_head'));
    const sk = mesh(socket, M.holeDark, 'screw_socket');
    sk.rotation.y = th;
    s.add(sk);
    s.position.set(p.x, -3.1, p.z);
    g.add(s);
  }
  return g;
}

// ---------------------------------------------------------------------------
function surroundProfile(D) {
  // top surface, inner -> outer (clockwise => normals face out of the roll)
  const top = [];
  top.push([D.lipIn - 1.5, coneY(D, D.lipIn - 1.5) + 0.15]);
  top.push([D.lipIn, coneY(D, D.lipIn) + 1.1]);
  top.push([D.surroundIn - 4, D.surroundBase - 1.8]);
  const cx = (D.surroundIn + D.surroundOut) / 2;
  const a = (D.surroundOut - D.surroundIn) / 2;
  const H = D.surroundApex - D.surroundBase;
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const t = Math.PI - (i / N) * Math.PI;
    const r = cx + a * Math.cos(t);
    const s = Math.sin(t);
    // slightly squarer shoulders than a pure ellipse (Mega-Roll profile)
    const y = D.surroundBase + H * Math.pow(s, 0.82);
    top.push([r, y]);
  }
  top.push([D.surroundOut + 2, D.surroundBase - 1.5]);
  top.push([D.surroundOut + 5, D.surroundBase - 2]);
  // underside back to the start (2.4 mm wall)
  const under = [];
  for (let i = top.length - 1; i >= 0; i--) {
    const [r, y] = top[i];
    under.push([r - 0.2, y - 2.4]);
  }
  return [...top, [top[top.length - 1][0], top[top.length - 1][1]], ...under];
}

function lipY(D, r) {
  const a = [D.lipIn, coneY(D, D.lipIn) + 1.1], b = [D.surroundIn - 4, D.surroundBase - 1.8];
  const t = (r - a[0]) / (b[0] - a[0]);
  return a[1] + (b[1] - a[1]) * t;
}

function coneY(D, r) {
  // gently curved straight-sided cone from the surround joint to the neck
  const t = (D.surroundIn - r) / (D.surroundIn - D.coneNeckR);
  const lin = D.coneEdgeY + (D.coneNeckY - D.coneEdgeY) * t;
  return lin + 5 * Math.sin(Math.PI * t); // a little convex towards the front
}

function buildMoving(M, D) {
  const g = new THREE.Group();
  g.name = 'moving_assembly';

  // surround
  const sGeo = lathe(surroundProfile(D), { segments: 220 });
  g.add(mesh(sGeo, M.surround, 'surround'));

  // cone (front + back skins, 3 mm)
  const front = [], back = [];
  for (let i = 0; i <= 40; i++) {
    const r = D.coneNeckR + ((D.surroundIn + 2 - D.coneNeckR) * i) / 40;
    front.push([r, coneY(D, r)]);
  }
  for (let i = front.length - 1; i >= 0; i--) back.push([front[i][0] + 0.6, front[i][1] - 3]);
  const coneGeo = lathe(front, { segments: 200 });
  setPlanarUV(coneGeo, 1);
  const coneMat = M.carbon.clone();
  coneMat.side = THREE.FrontSide;
  g.add(mesh(coneGeo, coneMat, 'cone'));
  const coneBack = lathe([[front[front.length - 1][0] + 0.6, front[front.length - 1][1] - 0.2], ...back], { segments: 200 });
  setPlanarUV(coneBack, 1);
  g.add(mesh(coneBack, M.carbonBack, 'cone_back'));

  // glue lip with two rows of stitching on the cone (r 148 .. 167)
  const lipStitch = stitchRing(D, M);
  g.add(lipStitch);

  // dust cap: shallow dome, carbon with printed logo
  const capBaseY = coneY(D, D.capR) + 0.6;
  const Rs = (D.capR ** 2 + D.capRise ** 2) / (2 * D.capRise);
  const dome = [];
  for (let i = 0; i <= 40; i++) {
    const r = (D.capR * i) / 40;
    dome.push([r, capBaseY + Math.sqrt(Rs * Rs - r * r) - (Rs - D.capRise)]);
  }
  dome.push([D.capR + 0.8, capBaseY - 1.2]);
  const capGeo = lathe(dome, { segments: 160 });
  const capTex = dustCapTextures({ R: D.capR + 1 });
  setPlanarUV(capGeo, 1 / (2 * (D.capR + 1)), 0);
  {
    const uv = capGeo.attributes.uv;
    for (let i = 0; i < uv.count; i++) { uv.setX(i, uv.getX(i) + 0.5); uv.setY(i, uv.getY(i) + 0.5); }
  }
  const capMat = M.carbon.clone();
  capMat.name = 'dust_cap_carbon_logo';
  capMat.map = capTex.map;
  capMat.normalMap = capTex.normalMap;
  capMat.side = THREE.FrontSide;
  g.add(mesh(capGeo, capMat, 'dust_cap'));
  // rolled rim of the cap
  const rim = new THREE.TorusGeometry(D.capR + 0.4, 1.3, 12, 160);
  rim.rotateX(Math.PI / 2);
  rim.translate(0, capBaseY - 0.4, 0);
  const rimMat = M.chrome.clone();
  rimMat.name = 'dust_cap_rim';
  rimMat.color.set(0xd0d0d0);
  rimMat.roughness = 0.1;
  g.add(mesh(rim, rimMat, 'dust_cap_rim'));

  // voice-coil former and spider
  const former = lathe([[D.coneNeckR - 1.5, D.coneNeckY + 2], [D.coneNeckR - 1.5, D.spiderY - 30]], { segments: 96 });
  g.add(mesh(former, M.voiceCoil, 'voice_coil_former'));
  const sp = [];
  const r0 = D.coneNeckR - 1, r1 = 164;
  for (let i = 0; i <= 150; i++) {
    const r = r0 + ((r1 - r0) * i) / 150;
    const t = (r - r0) / (r1 - r0);
    sp.push([r, D.spiderY + 3.2 * Math.sin(TAU * 7.5 * t) * Math.sin(Math.PI * Math.min(1, t * 1.15))]);
  }
  g.add(mesh(lathe(sp, { segments: 120 }), M.spider, 'spider'));
  return g;
}

function stitchRing(D, M) {
  const g = new THREE.Group();
  g.name = 'surround_glue_lip';
  // stitch rows: short dashes following the cone surface
  const rows = [D.lipIn + 1.8, D.lipIn + 8.6];
  const dashes = [];
  for (const r of rows) {
    const n = Math.round((TAU * r) / 3.4);
    for (let k = 0; k < n; k++) {
      const th = (k / n) * TAU + (r === rows[0] ? 0 : 0.01);
      const b = new THREE.BoxGeometry(2.2, 0.6, 0.9);
      b.translate(0, 0.25, 0);
      const slope = Math.atan((lipY(D, r + 1) - lipY(D, r)) * -1);
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -th, 0));
      const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0);
      const pos = radial(th).multiplyScalar(r);
      pos.y = lipY(D, r) + 0.15;
      const qq = q.clone();
      // tilt the dash along the cone slope (rotate about the tangent axis)
      const tangent = new THREE.Vector3(Math.cos(th), 0, Math.sin(th));
      qq.premultiply(new THREE.Quaternion().setFromAxisAngle(tangent, -slope));
      qq.multiply(tilt);
      m4.compose(pos, qq, new THREE.Vector3(1, 1, 1));
      b.applyMatrix4(m4);
      dashes.push(b);
    }
  }
  const merged = mergeGeometries(dashes);
  const stitchMat = M.screwBlack.clone();
  stitchMat.name = 'stitching';
  stitchMat.color.set(0x050505);
  stitchMat.metalness = 0;
  stitchMat.roughness = 0.5;
  g.add(mesh(merged, stitchMat, 'stitching'));
  return g;
}

// ---------------------------------------------------------------------------
function buildSpoke(D, theta, curve, len) {
  const N = 110;
  const rcF = 22; // window corner radius
  const s0 = 18; // arc length where the upper ring ends
  const halfW = 24;
  const sectionAt = (s) => {
    let wo = halfW;
    if (s < s0) wo += rcF;
    else if (s < s0 + rcF) { const d = s0 + rcF - s; wo += rcF - Math.sqrt(Math.max(0, rcF * rcF - d * d)); }
    const sb = len - s; // distance from the bottom end
    if (sb < 26) { const d = (26 - sb) / 26; wo += 9 * d * d; }
    const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const depth = 14 + 20 * smooth(10, 100, s) - 4 * smooth(len - 70, len, s);
    const wi = wo * 0.72;
    // outer face carries two raised rails along the window edges
    const rail = 2.6;
    return roundedLoop([
      [-wo, 0], [-wi, depth], [wi, depth], [wo, 0],
      [wo - 1.5, -rail], [wo - 8, -rail], [wo - 11, 0],
      [-wo + 11, 0], [-wo + 8, -rail], [-wo + 1.5, -rail],
    ], 2.4, 3);
  };
  const rows = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const P = curve.getPointAt(u);
    const T = curve.getTangentAt(u);
    const nin = new THREE.Vector2(T.y, -T.x).normalize();
    rows.push({ P, nin, sec: sectionAt(u * len) });
  }
  const cols = rows[0].sec.length;
  return gridSurface(N + 1, cols, (i, j) => {
    const { P, nin, sec } = rows[i];
    const [a, n] = sec[j];
    const R2 = P.x + n * nin.x;
    const y2 = P.y + n * nin.y;
    const th = theta + a / P.x;
    return [R2 * Math.sin(th), y2, -R2 * Math.cos(th)];
  }, { closedCols: true });
}

function buildBasket(M, D) {
  const g = new THREE.Group();
  g.name = 'basket';
  const spokeAngles = [];
  for (let k = 0; k < D.spokeCount; k++) spokeAngles.push(D.spokeStart + (k * TAU) / D.spokeCount);

  // upper ring that ties the spoke tops together under the flange
  const ring = lathe(fillet([
    [196, D.frameBottom + 1, 0],
    [213, D.frameBottom + 1, 0],
    [211.2, D.ringBottom + 3, 3],
    [208.5, D.ringBottom, 3],
    [197, D.ringBottom + 1, 3],
    [196, D.frameBottom + 1, 0],
  ], 6), { segments: 240 });
  g.add(mesh(ring, M.frameBlack, 'basket_upper_ring'));

  // six swept spokes
  const curve = new THREE.CatmullRomCurve3(SPOKE_OUTER.map(([r, y]) => new THREE.Vector3(r, y, 0)), false, 'centripetal');
  const len = curve.getLength();
  const spokeGeos = spokeAngles.map((th) => buildSpoke(D, th, curve, len));
  g.add(mesh(mergeGeometries(spokeGeos), M.frameBlack, 'basket_spokes'));

  // stepped spider-landing platform
  const P0 = D.platformTop;
  // five terraces stepping inwards towards the motor
  const terraces = [[166, 0], [158, 9], [150, 17], [143, 25], [136, 32]];
  const platPts = [[118, P0, 0]];
  terraces.forEach(([r, dy], i) => {
    const next = terraces[i + 1];
    platPts.push([r, P0 - dy, 1.4]);
    platPts.push([r, P0 - (next ? next[1] : 39), 1.4]);
  });
  platPts.push([118, P0 - 39, 0]);
  const plat = lathe(fillet(platPts, 4), { segments: 220 });
  g.add(mesh(plat, M.frameBlack, 'spider_platform'));

  // faceted lower cup between platform and mount ring (flats between spokes)
  const cupProfile = [[136, P0 - 39], [134, P0 - 48], [126, D.mountTop + 22], [108, D.mountTop + 4], [100, D.mountTop]];
  let cup = lathe(cupProfile, { segments: D.spokeCount, thetaStart: D.spokeStart, exact: true });
  cup = cup.toNonIndexed();
  cup.computeVertexNormals();
  g.add(mesh(cup, M.frameBlack, 'basket_lower_cup'));

  // slotted black mount ring with the chrome hub visible through the slots
  const slots = 12;
  const blocks = [];
  for (let k = 0; k < slots; k++) {
    const a0 = D.spokeStart + (k / slots) * TAU + 3.2 * DEG;
    const a1 = D.spokeStart + ((k + 1) / slots) * TAU - 3.2 * DEG;
    const sh = new THREE.Shape();
    const p = (th, r) => [Math.sin(th) * r, Math.cos(th) * r];
    sh.moveTo(...p(a0, 101));
    for (let s = 1; s <= 12; s++) sh.lineTo(...p(a0 + ((a1 - a0) * s) / 12, 101));
    for (let s = 12; s >= 0; s--) sh.lineTo(...p(a0 + ((a1 - a0) * s) / 12, 90));
    sh.closePath();
    const bg = extrudeShapeY(sh, 12, 1, { curveSegments: 4, bevelSegments: 2 });
    bg.translate(0, D.mountTop, 0);
    blocks.push(bg);
  }
  g.add(mesh(mergeGeometries(blocks), M.frameBlack, 'mount_ring'));

  // chrome button screws on the cup flats
  const screw = lathe(fillet([[0, 2], [3.2, 1.7, 1.2], [4.6, 0.3, 0.6], [4.6, -1]], 5), { segments: 28 });
  const sock = new THREE.CylinderGeometry(1.6, 1.6, 0.5, 6);
  sock.translate(0, 1.8, 0);
  for (const th of spokeAngles) {
    const a = th + Math.PI / D.spokeCount;
    const r = 113, y = D.mountTop + 10;
    const n = radial(a).multiplyScalar(Math.cos(Math.PI / D.spokeCount));
    n.y = -0.62;
    const s = new THREE.Group();
    s.name = 'cup_screw';
    s.add(mesh(screw, M.chrome, 'screw_head'));
    s.add(mesh(sock, M.holeDark, 'screw_socket'));
    placeAlong(s, radial(a).multiplyScalar(r * Math.cos(Math.PI / D.spokeCount)).setY(y), n);
    g.add(s);
  }
  return { group: g, spokeAngles, curve, len };
}

// ---------------------------------------------------------------------------
function buildMotor(M, D) {
  const g = new THREE.Group();
  g.name = 'motor';

  // chrome hub under the mount ring
  g.add(mesh(lathe([[89.5, D.mountTop + 2], [89.5, D.mountBottom - 1]], { segments: 120 }), M.chrome, 'top_plate_hub'));

  // chrome top plate: flat top, near-vertical wall, flared skirt into the boot
  const flare = [];
  const p0 = [140.2, -257], c = [142.5, -273], p1 = [161, -281.5];
  for (let i = 1; i <= 16; i++) {
    const t = i / 16;
    flare.push([
      (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0],
      (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1],
    ]);
  }
  const plate = fillet([
    [86, D.mountBottom + 0.5, 0],
    [134, D.mountBottom + 0.5, 4],
    [139, -248, 6],
    [140.2, -257, 0],
  ], 8).concat(flare, [[161.5, -288]]);
  g.add(mesh(lathe(plate, { segments: 240 }), M.chrome, 'top_plate'));

  // threaded holes around the shoulder
  const holeTex = threadedHoleTexture();
  const holeMat = new THREE.MeshPhysicalMaterial({ name: 'threaded_hole', map: holeTex, metalness: 0.7, roughness: 0.45, transparent: true, alphaTest: 0.5, polygonOffset: true, polygonOffsetFactor: -2 });
  const holeGeo = new THREE.CircleGeometry(4.2, 32);
  holeGeo.rotateX(-Math.PI / 2);
  for (let k = 0; k < 8; k++) {
    const th = D.spokeStart + 22.5 * DEG + k * 45 * DEG;
    // point on the flare at t ~ 0.42
    const t = 0.42;
    const r = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0];
    const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1];
    const dr = 2 * (1 - t) * (c[0] - p0[0]) + 2 * t * (p1[0] - c[0]);
    const dy = 2 * (1 - t) * (c[1] - p0[1]) + 2 * t * (p1[1] - c[1]);
    const nn = radial(th).multiplyScalar(-dy);
    nn.y = dr;
    nn.normalize();
    const h = mesh(holeGeo, holeMat, 'top_plate_threaded_hole');
    placeAlong(h, radial(th).multiplyScalar(r).setY(y).addScaledVector(nn, 0.15), nn);
    g.add(h);
  }

  // rubber boot with moulded markings
  const bootProfile = fillet([
    [156, D.bootTop, 0],
    [165.5, D.bootTop, 2],
    [168.6, D.bootTop - 3, 1.6],
    [168.6, D.bootBandTop + 3.2, 1.6],
    [166.2, D.bootBandTop + 1.2, 0.8],
    [D.bootR, D.bootBandTop, 0],
    [D.bootR, D.bootBandBottom, 0],
    [166.4, D.bootBandBottom - 1.2, 0.8],
    [167.8, D.bootBandBottom - 3.2, 1.6],
    [167.8, D.bootBottom + 3, 2],
    [164.6, D.bootBottom, 1.5],
    [159, D.bootBottom, 0],
  ], 6);
  const bootGeo = lathe(bootProfile, { segments: 360 });
  // remap UVs: band gets the emboss tile (1/3 turn per tile), lips stay flat
  {
    let sTop = 0, sBot = 0, acc = 0;
    for (let i = 1; i < bootProfile.length; i++) {
      acc += Math.hypot(bootProfile[i][0] - bootProfile[i - 1][0], bootProfile[i][1] - bootProfile[i - 1][1]);
      if (Math.abs(bootProfile[i][0] - D.bootR) < 1e-6 && Math.abs(bootProfile[i][1] - D.bootBandTop) < 1e-6) sTop = acc;
      if (Math.abs(bootProfile[i][0] - D.bootR) < 1e-6 && Math.abs(bootProfile[i][1] - D.bootBandBottom) < 1e-6) sBot = acc;
    }
    const uv = bootGeo.attributes.uv;
    const tile = TAU / 3;
    for (let i = 0; i < uv.count; i++) {
      const th = uv.getX(i) * TAU;
      uv.setX(i, 0.25 + (th - D.bootTextAngle) / tile);
      uv.setY(i, (sBot - uv.getY(i)) / (sBot - sTop));
    }
  }
  const bootMat = M.boot.clone();
  bootMat.name = 'boot_rubber_markings';
  const emb = bootEmboss({ arcMM: (TAU / 3) * D.bootR, bandMM: D.bootBandTop - D.bootBandBottom });
  for (const t of [emb.normalMap, emb.map]) t.wrapT = THREE.ClampToEdgeWrapping;
  // keep the fine rubber grain on top of the moulded relief via the clearcoat normal
  bootMat.clearcoat = 0.08;
  bootMat.clearcoatRoughness = 0.6;
  bootMat.clearcoatNormalMap = bootMat.normalMap;
  bootMat.normalMap = emb.normalMap;
  bootMat.map = emb.map;
  bootMat.normalScale = new THREE.Vector2(1.0, 1.0);
  g.add(mesh(bootGeo, bootMat, 'motor_boot'));

  // spun-chrome back plate (cone towards the centre disc)
  const back = fillet([
    [163.6, D.bootBottom + 4, 0],
    [163.6, D.bootBottom - 1.5, 1.2],
    [D.backDiscR + 2, D.backDiscY + 0.5, 3],
    [D.backDiscR - 4, D.backDiscY + 0.5, 0],
  ], 8);
  // traverse outer -> inner on the back face so the normal faces -Y (out)
  const backGeo = lathe(back, { segments: 240 });
  g.add(mesh(backGeo, M.spunChrome, 'back_plate'));

  // satin centre disc with 16 + 8 holes and the pole vent
  const disc = circlePoly(0, 0, D.backDiscR, 160, new THREE.Shape());
  const holes = [];
  for (let k = 0; k < 16; k++) holes.push([66, (k / 16) * TAU + D.spokeStart]);
  for (let k = 0; k < 8; k++) holes.push([47, (k / 8) * TAU + D.spokeStart + TAU / 16]);
  for (const [r, a] of holes) disc.holes.push(circlePoly(Math.sin(a) * r, Math.cos(a) * r, 2.7, 16));
  disc.holes.push(circlePoly(0, 0, D.ventR + 4.5, 72));
  const discGeo = extrudeShapeY(disc, 1.6, 0.5, { bevelSegments: 2 });
  discGeo.rotateX(Math.PI); // face -Y
  discGeo.translate(0, D.backDiscY, 0);
  g.add(mesh(discGeo, M.satinAlu, 'back_center_plate'));
  const behind = new THREE.RingGeometry(D.ventR + 4.6, D.backDiscR - 1, 96);
  behind.rotateX(Math.PI / 2);
  behind.translate(0, D.backDiscY + 0.6, 0);
  g.add(mesh(behind, M.holeDark, 'back_hole_floor'));

  // vent: chamfer, polished bore and the bullet tip of the pole piece
  const vent = fillet([
    [D.ventR + 4.6, D.backDiscY - 0.05, 0],
    [D.ventR, D.backDiscY + 3, 1],
    [D.ventR, D.backDiscY + 26, 0],
  ], 4);
  g.add(mesh(lathe(vent, { segments: 96 }), M.chrome, 'pole_vent'));
  // bullet tip of the cross-cut pole piece, recessed ~7 mm inside the vent
  const apex = D.backDiscY + 7;
  const bullet = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * (Math.PI / 2);
    bullet.push([16.5 * Math.sin(a), apex + 12 * (1 - Math.cos(a))]);
  }
  g.add(mesh(lathe(bullet, { segments: 96, flip: true }), M.chrome, 'pole_piece_tip'));
  const ventFloor = new THREE.RingGeometry(16.4, D.ventR + 0.1, 64);
  ventFloor.rotateX(Math.PI / 2);
  ventFloor.translate(0, apex + 12, 0);
  g.add(mesh(ventFloor, M.holeDark, 'vent_gap'));
  return g;
}

// ---------------------------------------------------------------------------
function buildTerminals(M, D, curve) {
  const g = new THREE.Group();
  g.name = 'terminals';
  // find the spoke point at y ~ -172
  let u = 0.5;
  for (let i = 0; i <= 200; i++) { const p = curve.getPointAt(i / 200); if (p.y <= -170) { u = i / 200; break; } }
  const P = curve.getPointAt(u);
  const housing = new RoundedBoxGeometry(30, 16, 12, 3, 2.5);
  const post = lathe(fillet([[0, -30], [3.4, -30, 1], [4.6, -28.5, 0.8], [4.6, -4, 0], [6.2, -4, 0.6], [6.2, 0]], 5), { segments: 40, flip: true });
  const band = lathe([[4.75, -22], [4.75, -19.3]], { segments: 40, flip: true });
  const setScrew = new THREE.CylinderGeometry(1.6, 1.6, 1.2, 6);
  setScrew.rotateZ(Math.PI / 2);
  for (const base of [D.terminalAngle, D.terminalAngle + Math.PI]) {
    const t = new THREE.Group();
    t.name = 'terminal_block';
    const hm = mesh(housing, M.plasticBlack, 'terminal_housing');
    hm.position.set(0, -2, 0);
    t.add(hm);
    for (const [side, pol] of [[-8.5, M.red], [8.5, M.polarityBlack]]) {
      const pg = new THREE.Group();
      pg.add(mesh(post, M.nickel, 'terminal_post'));
      pg.add(mesh(band, pol, 'polarity_band'));
      const ss = mesh(setScrew, M.holeDark, 'set_screw');
      ss.position.set(0, -12, -4.4);
      ss.rotation.y = Math.PI / 2;
      pg.add(ss);
      pg.position.set(side, -10, -1);
      t.add(pg);
    }
    // local frame: x = tangent, y = axis, z = outward radial
    const out = radial(base);
    const tan = new THREE.Vector3(-Math.cos(base), 0, -Math.sin(base));
    const m4 = new THREE.Matrix4().makeBasis(tan, new THREE.Vector3(0, 1, 0), out);
    t.quaternion.setFromRotationMatrix(m4);
    t.position.copy(out.clone().multiplyScalar(P.x + 3)).setY(P.y);
    g.add(t);
  }
  return g;
}

// ---------------------------------------------------------------------------
export function buildSubwoofer(overrides = {}) {
  const D = { ...DIMS, ...overrides };
  const M = makeMaterials();
  const root = new THREE.Group();
  root.name = 'Sundown_InHuman_18';
  root.add(buildFlange(M, D));
  root.add(buildMoving(M, D));
  const basket = buildBasket(M, D);
  root.add(basket.group);
  root.add(buildMotor(M, D));
  root.add(buildTerminals(M, D, basket.curve));
  root.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  root.userData.dims = D;
  root.userData.materials = M;
  return root;
}
