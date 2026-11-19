import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineSegments2 } from "three/examples/jsm/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/examples/jsm/lines/LineSegmentsGeometry.js";
import { rnd, rndRange } from "../rand";
import { COLORS, mixHex } from "../theme";
import { NeonSvg, circlePath, type NeonShape } from "./NeonTube";
import { hdr } from "./Stage3D";

/**
 * Circuit-board city. One layout drives both the flat 2D line art (SVG,
 * stroke-dashoffset draw-on) and the 3D light-buildings it extrudes into,
 * so the 2D -> 3D handoff lines up exactly.
 * World: x right, z toward the viewer of the top-down plan (screen down), y up.
 */
export type Building = { x: number; z: number; w: number; d: number; h: number; color: string; delay: number; col: number };
export type Trace = { pts: [number, number][]; color: string; delay: number };
export type CityData = { buildings: Building[]; traces: Trace[]; vias: { x: number; z: number; delay: number }[] };

const COLS: [number, number][] = [
  [2.1, 7.5],
  [8.7, 14.1],
  [15.3, 20.7],
];
const ROW_STEP = 6.4;
const ROW_DEPTH = 5.2;
const Z_START = 13;
const Z_END = -96;

const pickColor = (seed: string) => {
  const r = rnd(seed);
  if (r < 0.34) return COLORS.blue;
  if (r < 0.66) return COLORS.violet;
  if (r < 0.9) return COLORS.cyan;
  return COLORS.neon;
};

export const buildCity = (): CityData => {
  const buildings: Building[] = [];
  const traces: Trace[] = [];
  const vias: CityData["vias"] = [];
  let id = 0;
  for (let z0 = Z_START, row = 0; z0 > Z_END; z0 -= ROW_STEP, row++) {
    for (const side of [-1, 1]) {
      COLS.forEach(([xa, xb], col) => {
        const seed = `blk${row}-${side}-${col}`;
        if (rnd(`${seed}e`) < 0.07) return; // plaza
        const za = z0 - ROW_DEPTH;
        const zb = z0;
        const mode = rnd(`${seed}m`);
        const lots: [number, number, number, number][] = [];
        if (mode < 0.25) lots.push([xa, xb, za, zb]);
        else if (mode < 0.6) {
          const sx = xa + (xb - xa) * rndRange(`${seed}s`, 0.35, 0.65);
          lots.push([xa, sx, za, zb], [sx, xb, za, zb]);
        } else if (mode < 0.8) {
          const sz = za + (zb - za) * rndRange(`${seed}s`, 0.35, 0.65);
          lots.push([xa, xb, za, sz], [xa, xb, sz, zb]);
        } else {
          const sx = (xa + xb) / 2;
          const sz = (za + zb) / 2;
          lots.push([xa, sx, za, sz], [sx, xb, za, sz], [xa, sx, sz, zb], [sx, xb, sz, zb]);
        }
        lots.forEach(([x0, x1, q0, q1], li) => {
          const ls = `${seed}-${li}`;
          const inset = 0.32;
          const cxL = ((x0 + x1) / 2) * side;
          const czL = (q0 + q1) / 2;
          const hRange = col === 0 ? [3.6, 11.5] : col === 1 ? [2.2, 7.5] : [1.2, 5];
          const h = rndRange(`${ls}h`, hRange[0], hRange[1]);
          const dist = Math.hypot(cxL, czL);
          buildings.push({
            x: cxL,
            z: czL,
            w: Math.max(0.6, x1 - x0 - inset * 2),
            d: Math.max(0.6, q1 - q0 - inset * 2),
            h,
            color: pickColor(`${ls}c`),
            delay: dist * 0.75 + rnd(`${ls}d`) * 6,
            col,
          });
          id++;
        });
      });
      // cross-street trace with a 45 degree jog, ending in a via
      const zs = z0 + 0.6;
      if (rnd(`tr${row}${side}`) < 0.85) {
        const jogAt = rndRange(`tj${row}${side}`, 5, 13);
        const len = rndRange(`tl${row}${side}`, 15, 21);
        const dz = rnd(`tz${row}${side}`) < 0.5 ? 0.45 : -0.45;
        const pts: [number, number][] = [
          [1.7 * side, zs],
          [jogAt * side, zs],
          [(jogAt + Math.abs(dz)) * side, zs + dz],
          [len * side, zs + dz],
        ];
        const dist = Math.hypot(8 * side, zs);
        traces.push({ pts, color: rnd(`tc${row}${side}`) < 0.5 ? COLORS.cyan : COLORS.blue, delay: dist * 0.6 + 8 });
        vias.push({ x: len * side, z: zs + dz, delay: dist * 0.6 + 26 });
      }
    }
  }
  // avenue bus: four lanes running down the main street, with 45 degree lane jogs
  [-1.05, -0.5, 0.5, 1.05].forEach((x, lane) => {
    const pts: [number, number][] = [[x, Z_START + 2]];
    let cur = x;
    for (let z = Z_START - 4; z > Z_END; z -= 14) {
      const jog = rnd(`bus${lane}${z}`) < 0.4 ? (cur > 0 ? -0.18 : 0.18) * (lane % 2 ? 1 : -1) : 0;
      pts.push([cur, z]);
      if (jog !== 0) {
        cur += jog;
        pts.push([cur, z - Math.abs(jog)]);
      }
    }
    pts.push([cur, Z_END]);
    traces.push({ pts, color: lane === 1 || lane === 2 ? COLORS.cyan : COLORS.violet, delay: 2 + lane * 2 });
  });
  void id;
  return { buildings, traces, vias };
};

let cached: CityData | null = null;
export const getCity = () => (cached ??= buildCity());

// ---------- 2D plan (SVG) ----------
export type PlanView = { cx: number; cy: number; zc: number; s: number; width: number; height: number };

const toS = (v: PlanView, x: number, z: number) => ({ x: v.cx + x * v.s, y: v.cy + (z - v.zc) * v.s });

/** Flat line art: footprints with IC-style pins, traces with jogs, vias. draw(t) in frames since start. */
export const City2D: React.FC<{ view: PlanView; t: number; bloom: number; intensity?: number }> = ({ view, t, bloom, intensity = 1 }) => {
  const city = getCity();
  const shapes: NeonShape[] = [];
  const inView = (x: number, z: number, m = 2) => {
    const p = toS(view, x, z);
    return p.x > -m * view.s && p.x < view.width + m * view.s && p.y > -m * view.s && p.y < view.height + m * view.s;
  };
  const tube = Math.max(1.2, view.s * 0.03);
  city.buildings.forEach((b) => {
    if (!inView(b.x, b.z)) return;
    const prog = Math.max(0, Math.min(1, (t - b.delay * 0.45) / 18));
    if (prog <= 0) return;
    const a = toS(view, b.x - b.w / 2, b.z - b.d / 2);
    const c = toS(view, b.x + b.w / 2, b.z + b.d / 2);
    const r = Math.min(c.x - a.x, c.y - a.y) * 0.08;
    const d = `M ${a.x + r} ${a.y} L ${c.x - r} ${a.y} Q ${c.x} ${a.y} ${c.x} ${a.y + r} L ${c.x} ${c.y - r} Q ${c.x} ${c.y} ${c.x - r} ${c.y} L ${a.x + r} ${c.y} Q ${a.x} ${c.y} ${a.x} ${c.y - r} L ${a.x} ${a.y + r} Q ${a.x} ${a.y} ${a.x + r} ${a.y} Z`;
    shapes.push({ d, color: b.color, width: tube, progress: prog, intensity });
    // chip pins along the long sides
    const pinLen = view.s * 0.16;
    const horizontal = c.x - a.x > c.y - a.y;
    const n = Math.max(2, Math.floor((horizontal ? c.x - a.x : c.y - a.y) / (view.s * 0.55)));
    let pins = "";
    for (let i = 1; i < n; i++) {
      if (horizontal) {
        const px = a.x + ((c.x - a.x) * i) / n;
        pins += `M ${px} ${a.y} L ${px} ${a.y - pinLen} M ${px} ${c.y} L ${px} ${c.y + pinLen} `;
      } else {
        const py = a.y + ((c.y - a.y) * i) / n;
        pins += `M ${a.x} ${py} L ${a.x - pinLen} ${py} M ${c.x} ${py} L ${c.x + pinLen} ${py} `;
      }
    }
    const pinProg = Math.max(0, Math.min(1, (t - b.delay * 0.45 - 12) / 10));
    if (pins && pinProg > 0) shapes.push({ d: pins, color: mixHex(b.color, COLORS.tubeWhite, 0.3), width: tube * 0.6, intensity: intensity * 0.8 * pinProg });
  });
  city.traces.forEach((tr) => {
    const prog = Math.max(0, Math.min(1, (t - tr.delay * 0.5) / 26));
    if (prog <= 0) return;
    const pts = tr.pts.map(([x, z]) => toS(view, x, z));
    const d = `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");
    shapes.push({ d, color: tr.color, width: tube * 0.75, progress: prog, intensity: intensity * 0.9 });
  });
  city.vias.forEach((v) => {
    if (!inView(v.x, v.z)) return;
    const k = Math.max(0, Math.min(1, (t - v.delay * 0.5) / 8));
    if (k <= 0) return;
    const p = toS(view, v.x, v.z);
    shapes.push({ d: circlePath(p.x, p.y, view.s * 0.13 * k), color: COLORS.tubeWhite, width: tube, fill: true, intensity });
  });
  // PCB substrate dot grid
  const dots: React.ReactNode[] = [];
  const step = view.s * 1.6;
  for (let gx = (view.cx % step) - step; gx < view.width + step; gx += step) {
    for (let gy = (view.cy % step) - step; gy < view.height + step; gy += step) {
      dots.push(<circle key={`${gx}-${gy}`} cx={gx} cy={gy} r={1.1} fill={COLORS.blue} opacity={0.16} />);
    }
  }
  return <NeonSvg width={view.width} height={view.height} shapes={shapes} bloom={bloom} bloomRadius={view.s * 0.22} under={<g>{dots}</g>} />;
};

// ---------- 3D city ----------
const BOX_EDGES: [number, number, number, number, number, number][] = [
  // bottom
  [-1, 0, -1, 1, 0, -1],
  [1, 0, -1, 1, 0, 1],
  [1, 0, 1, -1, 0, 1],
  [-1, 0, 1, -1, 0, -1],
  // top
  [-1, 1, -1, 1, 1, -1],
  [1, 1, -1, 1, 1, 1],
  [1, 1, 1, -1, 1, 1],
  [-1, 1, 1, -1, 1, -1],
  // verticals
  [-1, 0, -1, -1, 1, -1],
  [1, 0, -1, 1, 1, -1],
  [1, 0, 1, 1, 1, 1],
  [-1, 0, 1, -1, 1, 1],
];

/** Fat neon line segments from flat arrays (positions + linear HDR colors), rebuilt every frame. */
export const Segments: React.FC<{ positions: Float32Array; colors: Float32Array; width: number; width2?: number; height2?: number; depthTest?: boolean }> = ({
  positions,
  colors,
  width,
  width2,
  height2,
  depthTest = true,
}) => {
  const obj = useMemo(() => {
    const geo = new LineSegmentsGeometry();
    const mat = new LineMaterial({ linewidth: width, vertexColors: true, worldUnits: false, toneMapped: false, depthTest, transparent: false });
    return new LineSegments2(geo, mat);
  }, [width, depthTest]);
  const lastLen = useRef(-1);
  useLayoutEffect(() => {
    const g = obj.geometry;
    if (lastLen.current !== positions.length) {
      g.setPositions(positions);
      g.setColors(colors);
      lastLen.current = positions.length;
    } else {
      // same segment count: update GPU buffers in place (no per-frame allocations)
      const pa = (g.attributes.instanceStart as THREE.InterleavedBufferAttribute).data;
      pa.array.set(positions);
      pa.needsUpdate = true;
      const ca = (g.attributes.instanceColorStart as THREE.InterleavedBufferAttribute).data;
      ca.array.set(colors);
      ca.needsUpdate = true;
    }
    (obj.material as LineMaterial).resolution.set(width2 ?? 1920, height2 ?? 1080);
  });
  useLayoutEffect(() => () => obj.geometry.dispose(), [obj]);
  return <primitive object={obj} frustumCulled={false} />;
};

/**
 * Light-buildings. heightK(b) returns 0..1 extrusion for each building.
 * Edges glow in the building color; faces are near-black so silhouettes stay readable.
 */
export const City3D: React.FC<{
  heightK: (b: Building) => number;
  width: number;
  height: number;
  groundGlow?: number;
  tint?: (hex: string) => string;
  edgeBoost?: number;
}> = ({ heightK, width, height, groundGlow = 1, tint = (c) => c, edgeBoost = 1 }) => {
  const city = getCity();
  const faces = useRef<THREE.InstancedMesh>(null);
  const boxGeo = useMemo(() => {
    const g = new THREE.BoxGeometry(1, 1, 1);
    g.translate(0, 0.5, 0);
    return g;
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colTmp = useMemo(() => new THREE.Color(), []);

  // building edges + floor bands
  const pos: number[] = [];
  const col: number[] = [];
  const pushSeg = (a: number[], b: number[], c: THREE.Color) => {
    pos.push(a[0], a[1], a[2], b[0], b[1], b[2]);
    col.push(c.r, c.g, c.b, c.r, c.g, c.b);
  };
  const hs: number[] = [];
  city.buildings.forEach((b) => {
    const k = Math.max(0, Math.min(1.08, heightK(b)));
    const h = Math.max(0.002, b.h * k);
    hs.push(h);
    const c = hdr(tint(b.color), 2.2 * edgeBoost);
    const cTop = hdr(mixHex(tint(b.color), COLORS.tubeWhite, 0.35), 2.6 * edgeBoost);
    const hw = b.w / 2;
    const hd = b.d / 2;
    BOX_EDGES.forEach((e, i) => {
      pushSeg([b.x + e[0] * hw, e[1] * h, b.z + e[2] * hd], [b.x + e[3] * hw, e[4] * h, b.z + e[5] * hd], i >= 4 && i < 8 ? cTop : c);
    });
    // floor bands (lit window rows); constant count so GPU buffers update in place
    const bands = Math.floor(b.h / 1.4);
    const cb = hdr(tint(b.color), 0.9 * edgeBoost * Math.min(1, k * 4));
    for (let j = 1; j <= bands; j++) {
      const y = (j / (bands + 1)) * h;
      pushSeg([b.x - hw, y, b.z + hd], [b.x + hw, y, b.z + hd], cb);
      pushSeg([b.x + hw, y, b.z - hd], [b.x + hw, y, b.z + hd], cb);
      pushSeg([b.x - hw, y, b.z - hd], [b.x - hw, y, b.z + hd], cb);
    }
  });
  // ground traces + vias
  const gpos: number[] = [];
  const gcol: number[] = [];
  city.traces.forEach((tr) => {
    const c = hdr(tint(tr.color), 1.6 * groundGlow);
    for (let i = 1; i < tr.pts.length; i++) {
      gpos.push(tr.pts[i - 1][0], 0.015, tr.pts[i - 1][1], tr.pts[i][0], 0.015, tr.pts[i][1]);
      gcol.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }
  });
  city.vias.forEach((v) => {
    const c = hdr(COLORS.tubeWhite, 1.4 * groundGlow);
    const r = 0.13;
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * Math.PI * 2;
      const a1 = ((i + 1) / 8) * Math.PI * 2;
      gpos.push(v.x + Math.cos(a0) * r, 0.015, v.z + Math.sin(a0) * r, v.x + Math.cos(a1) * r, 0.015, v.z + Math.sin(a1) * r);
      gcol.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }
  });

  useLayoutEffect(() => {
    const m = faces.current;
    if (!m) return;
    city.buildings.forEach((b, i) => {
      dummy.position.set(b.x, 0, b.z);
      dummy.scale.set(b.w * 0.985, hs[i] * 0.995, b.d * 0.985);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      colTmp.copy(new THREE.Color(mixHex(COLORS.void, tint(b.color), 0.07)));
      m.setColorAt(i, colTmp);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -40]}>
        <planeGeometry args={[80, 160]} />
        <meshBasicMaterial color={COLORS.void} />
      </mesh>
      <instancedMesh ref={faces} args={[boxGeo, undefined, city.buildings.length]} frustumCulled={false}>
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <Segments positions={new Float32Array(pos)} colors={new Float32Array(col)} width={2.2} width2={width} height2={height} />
      <Segments positions={new Float32Array(gpos)} colors={new Float32Array(gcol)} width={1.6} width2={width} height2={height} />
    </group>
  );
};
