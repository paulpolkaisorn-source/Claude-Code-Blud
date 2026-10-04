import * as THREE from 'three';
import {
  latheZ, extrudeZ, ringShape, planarUV, gridSurface, cylZ, cyl, mesh, mergeGeos, finishGeometry,
  splineProfile, TAU, DEG, lerp, clamp, smoothstep, rng,
} from './util.js';
import { P as DEFAULT_P } from './params.js';
import { makeCarbon, makeBand, makeFlangeDecals, makeDustLogo, makeRubberGrain } from './textures.js';

const V3 = THREE.Vector3;

/** Rotate planar uv by `rotDeg` and scale so that one weave tile spans `tile` inches. */
function weaveUV(g, tile, rotDeg) {
  const p = g.attributes.position;
  const uv = new Float32Array(p.count * 2);
  const c = Math.cos(rotDeg * DEG);
  const s = Math.sin(rotDeg * DEG);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    uv[i * 2] = (x * c - y * s) / tile;
    uv[i * 2 + 1] = (x * s + y * c) / tile;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

function offsetProfile(profile, off) {
  // move every point along its left-hand normal
  return profile.map(([r, z], i) => {
    const a = profile[Math.max(0, i - 1)];
    const b = profile[Math.min(profile.length - 1, i + 1)];
    let tr = b[0] - a[0];
    let tz = b[1] - a[1];
    const l = Math.hypot(tr, tz) || 1;
    tr /= l; tz /= l;
    return [r + off * -tz, z + off * tr];
  });
}

function profileAt(profile, r) {
  // z at radius r (profile monotonic in r)
  for (let i = 0; i < profile.length - 1; i++) {
    const [r0, z0] = profile[i];
    const [r1, z1] = profile[i + 1];
    if ((r - r0) * (r - r1) <= 0 && r0 !== r1) {
      const t = (r - r0) / (r1 - r0);
      return { z: lerp(z0, z1, t), tr: r1 - r0, tz: z1 - z0 };
    }
  }
  return { z: profile[profile.length - 1][1], tr: 1, tz: 0 };
}

export function makeMaterials({ textures = true, silhouette = false, P = DEFAULT_P } = {}) {
  const M = {};
  if (silhouette) {
    const black = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
    return new Proxy({}, { get: () => black });
  }
  M.gloss = new THREE.MeshPhysicalMaterial({
    name: 'BlackGloss', color: 0x060606, roughness: 0.16, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.04, side: THREE.DoubleSide,
  });
  M.glossBack = new THREE.MeshPhysicalMaterial({
    name: 'ConeBackGloss', color: 0x030303, roughness: 0.1, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.03, side: THREE.BackSide,
  });
  M.rubber = new THREE.MeshPhysicalMaterial({
    name: 'SurroundRubber', color: 0x303033, roughness: 0.52, metalness: 0.0, sheen: 0.4, sheenRoughness: 0.5, sheenColor: new THREE.Color(0x777777), side: THREE.DoubleSide,
  });
  M.thread = new THREE.MeshStandardMaterial({ name: 'Thread', color: 0x000000, roughness: 1.0, metalness: 0.0, envMapIntensity: 0.0 });
  M.tape = new THREE.MeshStandardMaterial({ name: 'SeamTape', color: 0x080808, roughness: 0.55 });
  M.chrome = new THREE.MeshPhysicalMaterial({ name: 'Chrome', color: 0xffffff, metalness: 1, roughness: 0.035, side: THREE.DoubleSide });
  M.nickel = new THREE.MeshStandardMaterial({ name: 'Nickel', color: 0xd7d9db, metalness: 1, roughness: 0.22, side: THREE.DoubleSide });
  M.brushed = new THREE.MeshStandardMaterial({ name: 'BrushedPlate', color: 0xe8e9ea, metalness: 1, roughness: 0.3, side: THREE.DoubleSide });
  M.redPlastic = new THREE.MeshStandardMaterial({ name: 'TerminalRing', color: 0xb01818, roughness: 0.4 });
  M.whitePlastic = new THREE.MeshStandardMaterial({ name: 'TerminalWhite', color: 0xd8d8d0, roughness: 0.45 });
  M.blackPlastic = new THREE.MeshPhysicalMaterial({ name: 'TerminalCup', color: 0x090909, roughness: 0.3, clearcoat: 0.6, side: THREE.DoubleSide });
  M.lipRubber = new THREE.MeshPhysicalMaterial({ name: 'BandLip', color: 0x101011, roughness: 0.4, clearcoat: 0.4, side: THREE.DoubleSide });
  M.dustRim = new THREE.MeshStandardMaterial({ name: 'DustCapRim', color: 0xd6d6d6, metalness: 1, roughness: 0.18 });
  for (const k of ['chrome', 'nickel', 'brushed', 'dustRim']) M[k].userData.bright = true;

  if (textures) {
    const carbon = makeCarbon();
    M.carbon = new THREE.MeshPhysicalMaterial({
      name: 'CarbonFibre', map: carbon.map, normalMap: carbon.normalMap, normalScale: new THREE.Vector2(0.9, 0.9),
      roughnessMap: carbon.roughnessMap, roughness: 1, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.035, side: THREE.FrontSide,
      color: 0xffffff,
    });
    const flange = makeFlangeDecals({ R: P.R, plateR: P.plateR, plateAngles: P.plateAnglesCW, arcTexts: [
      { deg: 52, text: 'SUNDOWN', span: 17 }, { deg: 82, text: 'AUDIO', span: 12 }, { deg: 232, text: 'SUNDOWN', span: 17 }, { deg: 262, text: 'AUDIO', span: 12 },
    ] });
    M.flange = new THREE.MeshPhysicalMaterial({
      name: 'FlangeBlack', map: flange.map, normalMap: flange.normalMap, normalScale: new THREE.Vector2(1, 1),
      roughnessMap: flange.roughnessMap, roughness: 1, metalness: 0.0, clearcoat: 0.8, clearcoatRoughness: 0.08, side: THREE.DoubleSide,
    });
    const circ = TAU * P.band.r;
    const h = Math.abs(P.band.z0 - P.band.z1);
    const band = makeBand({ circumference: circ, height: h, pxPerIn: 230, layout: P.bandLayout });
    M.band = new THREE.MeshPhysicalMaterial({
      name: 'MotorBand', color: 0xffffff, map: band.map, normalMap: band.normalMap, normalScale: new THREE.Vector2(1, 1),
      roughness: 0.72, metalness: 0.05, side: THREE.DoubleSide,
    });
    M.dustLogo = new THREE.MeshStandardMaterial({
      name: 'DustCapLogo', map: makeDustLogo(), transparent: true, alphaTest: 0.35, roughness: 0.35, metalness: 0.0, side: THREE.FrontSide,
    });
    M.rubber.normalMap = makeRubberGrain();
    M.rubber.normalMap.repeat.set(10, 10);
  } else {
    M.carbon = new THREE.MeshStandardMaterial({ name: 'CarbonFibre', color: 0x15161a, roughness: 0.3, side: THREE.FrontSide });
    M.flange = M.gloss;
    M.band = new THREE.MeshStandardMaterial({ name: 'MotorBand', color: 0x3d3d40, roughness: 0.7, metalness: 0.2, side: THREE.DoubleSide });
    M.dustLogo = new THREE.MeshBasicMaterial({ visible: false });
  }
  return M;
}

/* ------------------------------------------------------------------------------------------ */

export function buildModel({ P = DEFAULT_P, textures = true, silhouette = false, quality = 1 } = {}) {
  const M = makeMaterials({ textures, silhouette, P });
  const root = new THREE.Group();
  root.name = 'SundownSubwoofer';
  const seg = silhouette ? 72 : Math.round(160 * quality);
  const add = (grp, geo, mat, name) => {
    const m = mesh(geo, mat, name);
    grp.add(m);
    return m;
  };
  const group = (name) => {
    const g = new THREE.Group();
    g.name = name;
    root.add(g);
    return g;
  };

  /* ---------------------------------- flange ---------------------------------- */
  {
    const g = group('Flange');
    const holes = [];
    for (let k = 0; k < 8; k++) {
      const a = k * 45 * DEG;
      holes.push({ x: P.mountR * Math.cos(a), y: P.mountR * Math.sin(a), r: P.mountHoleR });
    }
    const shape = ringShape(P.R, P.flangeInner, holes);
    const fg = extrudeZ(shape, P.flangeT, { z0: -P.flangeT, bevel: 0.035, curveSegs: Math.round(128 * quality) });
    planarUV(fg, P.R);
    add(g, fg, M.flange, 'FlangeRing');

    // raised bezels around the mounting holes
    const bez = [];
    const scr = [];
    for (let k = 0; k < 8; k++) {
      const a = k * 45 * DEG;
      const b = latheZ([[0.06, -0.3], [0.06, 0.012], [0.095, 0.03], [0.14, 0.03], [0.165, 0.005], [0.165, -0.01]], { segments: 32, crease: 50 });
      b.translate(P.mountR * Math.cos(a), P.mountR * Math.sin(a), 0);
      bez.push(b);
      // pan-head screw between holes
      const a2 = (k * 45 + 22.5) * DEG;
      const s = latheZ([[0, 0.032], [0.04, 0.032], [0.07, 0.024], [0.075, 0.0], [0.095, 0.0], [0.105, 0.014], [0.095, 0.034], [0.075, 0.034]].reverse(), { segments: 24, crease: 50 });
      s.translate(P.mountR * Math.cos(a2), P.mountR * Math.sin(a2), 0);
      scr.push(s);
    }
    if (!silhouette) {
      add(g, mergeGeos(bez), M.gloss, 'HoleBezels');
      add(g, mergeGeos(scr), M.gloss, 'FlangeScrews');
    }
    // rear fasteners
    const rear = [];
    for (let k = 0; k < 8; k++) {
      const a2 = (k * 45 + 22.5) * DEG;
      const s = latheZ([[0, -0.52], [0.09, -0.52], [0.11, -0.47], [0.11, -0.4]], { segments: 12, crease: 50 });
      s.translate(7.5 * Math.cos(a2), 7.5 * Math.sin(a2), 0);
      rear.push(s);
    }
    if (!silhouette) add(g, mergeGeos(rear), M.gloss, 'RearFasteners');
  }

  /* --------------------------------- surround --------------------------------- */
  {
    const g = group('Surround');
    const prof = splineProfile(P.roll.pts, 40);
    add(g, latheZ(prof, { segments: seg, crease: 60 }), M.rubber, 'RubberRoll');
  }

  /* ----------------------------------- cone ----------------------------------- */
  const coneProfile = [];
  {
    const g = group('Cone');
    const { rTop, zTop, capR, depth, power } = P.cone;
    const N = 64;
    // inner -> outer so that the front (concave) face is the front-facing one
    for (let i = 0; i <= N; i++) {
      const t = i / N; // 0 = outer edge, 1 = dust cap
      const r = lerp(rTop, capR, t);
      let z = zTop - depth * Math.pow(t, power);
      // small up-turn right at the outer lip to meet the surround
      z += 0.14 * Math.exp(-t * 28);
      coneProfile.push([r, z]);
    }
    coneProfile.reverse(); // dust cap -> outer edge
    const cg = latheZ(coneProfile, { segments: seg, crease: 45, uvMode: 'planar', uvR: rTop });
    weaveUV(cg, P.weave.tile, P.weave.rotDeg);
    add(g, cg, M.carbon, 'ConeFront');
    add(g, cg.clone(), M.glossBack, 'ConeBack');

    // black tape at the outer lip of the cone
    const tapePts = coneProfile.filter(([r]) => r >= rTop - 0.38);
    const tape = offsetProfile(tapePts, 0.006);
    add(g, latheZ(tape, { segments: seg, crease: 45 }), M.tape, 'ConeEdgeTape');

    // stitched seams
    const rows = [rTop - 0.52, rTop - 0.37];
    const stitchGeos = [];
    const base = new THREE.BoxGeometry(0.15, 0.034, 0.012);
    for (const rr of silhouette ? [] : rows) {
      const { z, tr, tz } = profileAt(coneProfile, rr);
      const count = Math.floor((TAU * rr) / 0.235);
      const nrm2 = new THREE.Vector2(-tz, tr).normalize(); // (r,z) left normal
      for (let i = 0; i < count; i++) {
        const a = (i / count) * TAU;
        const tang = new V3(-Math.sin(a), Math.cos(a), 0);
        const rad = new V3(Math.cos(a) * tr, Math.sin(a) * tr, tz).normalize();
        const nor = new V3(Math.cos(a) * nrm2.x, Math.sin(a) * nrm2.x, nrm2.y).normalize();
        const m = new THREE.Matrix4().makeBasis(tang, rad.negate(), nor);
        m.setPosition(rr * Math.cos(a) + nor.x * 0.004, rr * Math.sin(a) + nor.y * 0.004, z + nor.z * 0.004);
        const bg = base.clone().applyMatrix4(m);
        stitchGeos.push(bg);
      }
    }
    if (!silhouette) add(g, mergeGeos(stitchGeos.map((x) => { x.deleteAttribute('uv'); x.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(x.attributes.position.count * 2), 2)); return x; })), M.thread, 'Stitching');
  }

  /* --------------------------------- dust cap --------------------------------- */
  {
    const g = group('DustCap');
    const { capR } = P.cone;
    const zJ = coneProfile[0][1]; // z where cap meets the cone
    const H = P.cap.height;
    const prof = [];
    const N = 36;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const r = t * capR;
      const z = zJ + H * Math.pow(1 - Math.pow(t, 2.6), 0.55);
      prof.push([r, z]);
    }
    const dg = latheZ(prof, { segments: seg, crease: 45, uvMode: 'planar', uvR: capR });
    weaveUV(dg, P.weave.tile, P.weave.rotDeg + 90);
    add(g, dg, M.carbon, 'DustCapShell');
    // logo decal slightly proud of the dome, planar projection
    const lp = offsetProfile(prof, 0.006).filter(([r]) => r < capR * 0.8);
    const lg = latheZ(lp, { segments: seg, crease: 45 });
    planarUV(lg, capR * 1.1);
    add(g, lg, M.dustLogo, 'DustCapLogo');
    // polished rim
    const rim = latheZ([[capR - 0.04, zJ - 0.03], [capR + 0.05, zJ - 0.03], [capR + 0.075, zJ + 0.03], [capR + 0.04, zJ + 0.085], [capR - 0.02, zJ + 0.07]], { segments: seg, crease: 55 });
    add(g, rim, M.dustRim, 'DustCapRim');
    // inside of the cap (visible through no window, but keeps the mesh closed)
    add(g, latheZ(prof, { segments: seg, crease: 45 }), M.glossBack, 'DustCapBack');
  }

  /* ---------------------------------- basket ---------------------------------- */
  const shell = (() => {
    const n = 300;
    const sp = splineProfile(P.basketPts, n);
    const arr = sp.map(([r, z], i) => {
      const a = sp[Math.max(0, i - 1)];
      const b = sp[Math.min(n, i + 1)];
      let tr = b[0] - a[0];
      let tz = b[1] - a[1];
      const l = Math.hypot(tr, tz);
      tr /= l; tz /= l;
      return { r, z, nr: -tz, nz: tr };
    });
    return (s) => {
      const f = clamp(s, 0, 1) * n;
      const i = Math.min(n - 1, Math.floor(f));
      const t = f - i;
      const a = arr[i];
      const b = arr[i + 1];
      return { r: lerp(a.r, b.r, t), z: lerp(a.z, b.z, t), nr: lerp(a.nr, b.nr, t), nz: lerp(a.nz, b.nz, t) };
    };
  })();
  const shellPoint = (s, phi, off = 0) => {
    const q = shell(s);
    const r = q.r + off * q.nr;
    return new V3(r * Math.cos(phi), r * Math.sin(phi), q.z + off * q.nz);
  };
  const SPOKES = P.spokeCount;
  const halfAngle = (s) => {
    // radians: narrow spoke, flaring into the rim at the top and into the solid neck at the bottom
    const base = lerp(16, 21, smoothstep(0, 0.7, s));
    const top = 13 * (1 - smoothstep(0.0, 0.12, s));
    const bottom = (180 / SPOKES - base) * smoothstep(0.58, 0.76, s);
    return (base + top + bottom) * DEG;
  };
  const S_END = 0.77;
  {
    const g = group('Basket');
    const spokes = [];
    const rails = [];
    const ribs = [];
    for (let k = 0; k < SPOKES; k++) {
      const phiC = (P.spokePhi0 + (360 / SPOKES) * k) * DEG;
      const P3 = (x, s, off) => shellPoint(s, phiC + x * halfAngle(s), off);
      const faceGrid = (nu, nv, f, flip = false) => gridSurface(nu, nv, f, { flip, crease: 50 });
      const slab = ({ xA, xB, sA, sB, offA, offB, nu = 6, nv = 56 }) => {
        const out = [];
        out.push(faceGrid(nu, nv, (u, v) => P3(lerp(xA, xB, u), lerp(sA, sB, v), offB)));
        out.push(faceGrid(nu, nv, (u, v) => P3(lerp(xA, xB, u), lerp(sA, sB, v), offA), true));
        out.push(faceGrid(2, nv, (u, v) => P3(xA, lerp(sA, sB, v), lerp(offA, offB, u))));
        out.push(faceGrid(2, nv, (u, v) => P3(xB, lerp(sA, sB, v), lerp(offA, offB, u)), true));
        out.push(faceGrid(nu, 2, (u, v) => P3(lerp(xA, xB, u), sB, lerp(offA, offB, v))));
        return mergeGeos(out);
      };
      spokes.push(slab({ xA: -1, xB: 1, sA: 0.0, sB: S_END, offA: -0.3, offB: 0.0, nu: 10, nv: 80 }));
      // raised side rails (the "tub" edges seen on the cast spokes)
      for (const [xa, xb] of [[-1, -0.86], [0.86, 1]]) {
        rails.push(slab({ xA: xa, xB: xb, sA: 0.04, sB: S_END - 0.02, offA: 0, offB: 0.2, nu: 2, nv: 80 }));
      }
      // cross ribs near the neck
      for (const s0 of [0.4, 0.47, 0.54, 0.61]) {
        ribs.push(slab({ xA: -0.86, xB: 0.86, sA: s0, sB: s0 + 0.026, offA: 0, offB: 0.13, nu: 10, nv: 3 }));
      }
    }
    add(g, mergeGeos(spokes), M.gloss, 'Spokes');
    add(g, mergeGeos(rails), M.gloss, 'SpokeRails');
    add(g, mergeGeos(ribs), M.gloss, 'SpokeRibs');

    // solid, terraced neck
    const nSteps = 40;
    const neckProf = [];
    for (let i = 0; i <= nSteps; i++) {
      const s = lerp(0.7, 1, i / nSteps);
      const q = shell(s);
      neckProf.push([q.r - 0.02 * q.nr, q.z - 0.02 * q.nz]);
    }
    add(g, latheZ(neckProf, { segments: seg, crease: 50 }), M.gloss, 'Neck');
    const terr = [];
    for (const s0 of [0.8, 0.865, 0.93]) {
      const pr = [];
      for (const [ds, off] of [[-0.035, 0], [-0.02, 0.16], [0.02, 0.16], [0.035, 0]]) {
        const q = shell(s0 + ds);
        pr.push([q.r + off * q.nr, q.z + off * q.nz]);
      }
      terr.push(latheZ(pr, { segments: seg, crease: 50 }));
    }
    add(g, mergeGeos(terr), M.gloss, 'NeckTerraces');
  }

  /* --------------------------------- terminals --------------------------------- */
  {
    const g = group('Terminals');
    const phi = P.terminalPhi * DEG;
    const s0 = 0.64;
    const q = shell(s0);
    const origin = shellPoint(s0, phi, 0.0);
    const nrm = new V3(Math.cos(phi) * q.nr, Math.sin(phi) * q.nr, q.nz).normalize();
    const tangP = new V3(-Math.sin(phi), Math.cos(phi), 0);
    const along = new V3().crossVectors(nrm, tangP).normalize(); // up the shell, towards the rim
    const basis = new THREE.Matrix4().makeBasis(tangP, along, nrm);
    const place = (geo, x = 0, y = 0, n = 0) => {
      const m = basis.clone();
      m.setPosition(origin.clone().addScaledVector(tangP, x).addScaledVector(along, y).addScaledVector(nrm, n));
      return geo.applyMatrix4(m);
    };
    // shallow black cup plus a shelf
    const cup = place(new THREE.BoxGeometry(2.0, 1.75, 0.55), 0, 0, 0.05);
    cup.deleteAttribute('uv');
    add(g, finishGeometry(addUV0(cup), 30), M.blackPlastic, 'TerminalCup');
    const posts = [];
    const rings = [];
    const whites = [];
    for (const x of [-0.42, 0.42]) {
      const post = new THREE.CylinderGeometry(0.115, 0.115, 0.8, 20);
      post.rotateX(Math.PI / 2); // along +Z local ... then to normal
      // make post axis along local +Z (normal): after rotateX axis is Z already
      place(post, x, 0.15, 0.55);
      posts.push(post);
      const ring = new THREE.CylinderGeometry(0.122, 0.122, 0.07, 20);
      ring.rotateX(Math.PI / 2);
      place(ring, x, 0.15, 0.4);
      rings.push(ring);
      const wt = new THREE.CylinderGeometry(0.122, 0.122, 0.05, 20);
      wt.rotateX(Math.PI / 2);
      place(wt, x, 0.15, 0.31);
      whites.push(wt);
    }
    add(g, mergeGeos(posts), M.nickel, 'TerminalPosts');
    add(g, mergeGeos(rings), M.redPlastic, 'TerminalRedRings');
    add(g, mergeGeos(whites), M.whitePlastic, 'TerminalWhiteRings');
  }

  /* ---------------------------- chrome funnel + bolts ---------------------------- */
  {
    const g = group('MotorFront');
    const prof = splineProfile(P.funnel, 40);
    add(g, latheZ(prof, { segments: seg, crease: 60 }), M.chrome, 'ChromeFunnel');
    const bolts = [];
    for (let k = 0; k < 6; k++) {
      const a = (k * 60 + 30) * DEG;
      const pz = profileAt(prof, 4.55);
      const b = latheZ([[0, 0.07], [0.085, 0.07], [0.11, 0.045], [0.12, 0.0]], { segments: 14, crease: 50 });
      // orient along the funnel normal
      const n2 = new THREE.Vector2(-pz.tz, pz.tr).normalize();
      const nrm = new V3(Math.cos(a) * n2.x, Math.sin(a) * n2.x, n2.y);
      const q = new THREE.Quaternion().setFromUnitVectors(new V3(0, 0, 1), nrm);
      b.applyQuaternion(q);
      b.translate(4.55 * Math.cos(a), 4.55 * Math.sin(a), pz.z);
      bolts.push(b);
    }
    if (!silhouette) add(g, mergeGeos(bolts), M.nickel, 'FunnelBolts');
  }

  /* ----------------------------------- motor band ----------------------------------- */
  {
    const g = group('MotorBand');
    const { r, z0, z1 } = P.band;
    const c = 0.07;
    const prof = [
      [r - 0.2, z0 + 0.0], [r - 0.04, z0 - 0.0], [r, z0 - 0.04], [r, z0 - 0.04 - 0.01],
      [r, z1 + 0.05], [r - 0.03, z1 + 0.0],
    ];
    // textured outer face (front -> rear so that the normal points outwards)
    const face = latheZ([[r, z0 - 0.04], [r, z1 + 0.02]], { segments: Math.round(720 * quality), crease: 90, uvMode: 'cyl', vZ: [z0 - 0.04, z1 + 0.02] });
    add(g, face, M.band, 'BandFace');
    // chamfers
    const front = latheZ([[r - 0.22, z0 + 0.02], [r - 0.06, z0 + 0.0], [r, z0 - 0.04]], { segments: seg, crease: 70 });
    add(g, front, M.lipRubber, 'BandFrontChamfer');
    // rear lip (black ring around the chrome end cap)
    const lip = latheZ([[r, z1 + 0.02], [r - 0.03, z1 - 0.01], [r - 0.07, z1 - 0.025], [P.endCap.r + 0.08, z1 - 0.025], [P.endCap.r + 0.02, z1 + P.endCap.recess + 0.04]], { segments: seg, crease: 70 });
    add(g, lip, M.lipRubber, 'BandRearLip');
  }

  /* ----------------------------------- end cap ----------------------------------- */
  {
    const g = group('EndCap');
    const { r: rc, recess, dome, plateR, boreR } = P.endCap;
    const zr = P.band.z1 + recess; // chrome rim sits recessed into the band lip
    const zp = zr - dome; // centre plate plane
    const dish = [];
    const N = 28;
    for (let i = 0; i <= N; i++) {
      const t = i / N; // 0 at the rim -> 1 at the plate edge
      const r = lerp(rc, plateR, t);
      const z = zr - dome * Math.pow(t, 1.6);
      dish.push([r, z]);
    }
    add(g, latheZ(dish, { segments: seg, crease: 60 }), M.chrome, 'ChromeDish');
    // brushed centre plate
    const plate = latheZ([[plateR, zp], [plateR - 0.03, zp - 0.02], [boreR + 0.1, zp - 0.02], [boreR, zp - 0.01]], { segments: seg, crease: 60 });
    add(g, plate, M.brushed, 'VentPlate');
    // bore
    const bore = latheZ([[boreR, zp - 0.01], [boreR - 0.04, zp + 0.05], [boreR - 0.1, zp + 0.3], [boreR - 0.28, zp + 0.42], [0.18, zp + 0.5], [0, zp + 0.55]], { segments: 48, crease: 55 });
    add(g, bore, M.nickel, 'VentBore');
    // vent holes
    const holes = [];
    const dark = [];
    const ringsOf = [[12, plateR * 0.84, 0.0], [8, plateR * 0.58, 22.5]];
    for (const [n, rr, off] of ringsOf) {
      for (let i = 0; i < n; i++) {
        const a = (off + (i * 360) / n) * DEG;
        const ferrule = latheZ([[0.075, zp - 0.02], [0.062, zp - 0.025], [0.05, zp - 0.012], [0.05, zp + 0.1]], { segments: 14, crease: 50 });
        ferrule.translate(rr * Math.cos(a), rr * Math.sin(a), 0);
        holes.push(ferrule);
        const d = latheZ([[0, zp - 0.005], [0.05, zp - 0.005]], { segments: 14 });
        d.translate(rr * Math.cos(a), rr * Math.sin(a), 0);
        dark.push(d);
      }
    }
    if (!silhouette) {
      add(g, mergeGeos(holes), M.nickel, 'VentFerrules');
      add(g, mergeGeos(dark), M.blackPlastic, 'VentHoles');
    }
  }

  return root;
}

function addUV0(g) {
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  return g;
}
