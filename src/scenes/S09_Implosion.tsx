import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import * as THREE from "three";
import { Segments } from "../components/City";
import { roundedRectPoints } from "../components/GlassPanel";
import { HudText, frameCode } from "../components/HUD";
import { CameraRig, Stage3D, getGlowTexture, hdr } from "../components/Stage3D";
import { type Layout, useLayout } from "../layout";
import { rnd, rndRange } from "../rand";
import { COLORS, EASE_INOUT, EASE_IN_SCENE, EASE_OUT_SCENE, ramp } from "../theme";
import { SCENES } from "../timing";
import { STAR_SIZE, Star3D } from "./AtomStarStage";

const FOV = 40;
const camDist0 = (L: Layout) => (L.vertical ? 13.8 : 8);

/** On-screen half height (px) of the S9 star at frame 1440, so the montage's last star can match-cut onto it. */
export const implosionStarPx = (L: Layout) => (STAR_SIZE * (L.height / 2)) / (camDist0(L) * Math.tan((FOV * Math.PI) / 360));

const PALETTE = [COLORS.neon, COLORS.blue, COLORS.violet, COLORS.cyan, COLORS.tubeWhite, COLORS.violet, COLORS.blue];

/** Spiral pull: radius shrinks with an accelerating ease, angle winds up as it falls in. */
const pull = (F: number, start: number, dur: number) => EASE_OUT_SCENE(Math.max(0, Math.min(1, (F - start) / dur)));

const Particles: React.FC<{ F: number; count: number }> = ({ F, count }) => {
  const data = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        r0: Math.sqrt(rndRange(`ip${i}r`, 9, 300)),
        th: rnd(`ip${i}t`) * Math.PI * 2,
        y0: rndRange(`ip${i}y`, -1, 1),
        start: 1440 + rnd(`ip${i}s`) * 110,
        dur: rndRange(`ip${i}d`, 45, 80),
        c: new THREE.Color(PALETTE[Math.floor(rnd(`ip${i}c`) * PALETTE.length)]),
        k: rndRange(`ip${i}k`, 1, 3),
      })),
    [count],
  );
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    return g;
  }, [count]);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const col = geo.getAttribute("color") as THREE.BufferAttribute;
  data.forEach((d, i) => {
    const p = pull(F, d.start, d.dur);
    const r = d.r0 * Math.pow(1 - p, 1.4);
    const th = d.th + (F - 1440) * 0.012 + 7 * p * p;
    const y = d.y0 * d.r0 * 0.35 * (1 - p);
    pos.setXYZ(i, Math.cos(th) * r, y + Math.sin(th) * r * 0.55, Math.sin(th) * r * 0.6 - 1.5 * (1 - p));
    const fade = p >= 1 ? 0 : 1;
    const heat = 1 + 2 * p;
    col.setXYZ(i, d.c.r * d.k * heat * fade, d.c.g * d.k * heat * fade, d.c.b * d.k * heat * fade);
  });
  pos.needsUpdate = true;
  col.needsUpdate = true;
  return (
    <points geometry={geo} frustumCulled={false}>
      <pointsMaterial map={getGlowTexture()} size={0.16} sizeAttenuation vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  );
};

/** Remnants of earlier scenes (atom rings, streaks, building boxes, panel frames) spiralling into the star. */
const Debris: React.FC<{ F: number; L: Layout }> = ({ F, L }) => {
  const pos: number[] = [];
  const colr: number[] = [];
  const seg = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Color) => {
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    colr.push(c.r, c.g, c.b, c.r, c.g, c.b);
  };
  const spiral = (r: number, th: number, z: number) => new THREE.Vector3(Math.cos(th) * r, Math.sin(th) * r, z);

  // atom rings (orange) shrinking and winding
  for (let k = 0; k < 3; k++) {
    const p = pull(F, 1440 + k * 12, 100);
    const R = (5.5 + k * 1.6) * (1 - p);
    const c = hdr(COLORS.neon, 2.2 * (1 - p * 0.3));
    const tiltX = 1.1 + k * 0.4 + p * 2;
    const tiltZ = k * 0.7 + p * 3;
    const e = new THREE.Euler(tiltX, 0, tiltZ);
    for (let i = 0; i < 48; i++) {
      const a0 = (i / 48) * Math.PI * 2;
      const a1 = ((i + 1) / 48) * Math.PI * 2;
      seg(new THREE.Vector3(Math.cos(a0) * R, 0, Math.sin(a0) * R).applyEuler(e), new THREE.Vector3(Math.cos(a1) * R, 0, Math.sin(a1) * R).applyEuler(e), c);
    }
  }
  // radial streaks
  for (let i = 0; i < 90; i++) {
    const start = 1440 + rnd(`ds${i}s`) * 120;
    const p = pull(F, start, rndRange(`ds${i}d`, 30, 55));
    const r0 = rndRange(`ds${i}r`, 6, 16);
    const r = r0 * (1 - p);
    const th = rnd(`ds${i}t`) * Math.PI * 2 + p * 2.5;
    const len = 0.3 + 2.4 * p * (1 - p) * 4;
    const z = rndRange(`ds${i}z`, -3, 2) * (1 - p);
    const c = hdr(PALETTE[Math.floor(rnd(`ds${i}c`) * PALETTE.length)], 2 * (p < 1 ? 1 : 0));
    seg(spiral(r, th, z), spiral(r + len, th - 0.05, z), c);
  }
  // building boxes
  for (let i = 0; i < 12; i++) {
    const p = pull(F, 1450 + i * 7, 70);
    const r = rndRange(`db${i}r`, 6, 11) * (1 - p);
    const th = rnd(`db${i}t`) * Math.PI * 2 + 4 * p;
    const ctr = spiral(r, th, rndRange(`db${i}z`, -2, 1) * (1 - p));
    const s = 0.6 * (1 - p) + 0.02;
    const rot = new THREE.Euler(p * 3 + i, p * 2, i);
    const c = hdr(i % 2 ? COLORS.violet : COLORS.cyan, 2);
    const corners = [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z) => new THREE.Vector3(x * s, y * s * 1.6, z * s).applyEuler(rot).add(ctr))));
    const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
    edges.forEach(([a, b]) => seg(corners[a], corners[b], c));
  }
  // glass panel frames
  for (let i = 0; i < 3; i++) {
    const p = pull(F, 1460 + i * 15, 80);
    const r = (7 + i * 1.5) * (1 - p);
    const th = i * 2.1 + 3.5 * p;
    const ctr = spiral(r, th, -1 * (1 - p));
    const sc = 1 - p * 0.95;
    const rot = new THREE.Euler(0.3 + p * 2, 0.5 + p * 1.5, th);
    const pts = roundedRectPoints(3.2 * sc, 1.8 * sc, 0.2 * sc, 4).map((q) => q.clone().applyEuler(rot).add(ctr));
    const c = hdr([COLORS.blue, COLORS.violet, COLORS.cyan][i], 2);
    for (let j = 1; j < pts.length; j++) seg(pts[j - 1], pts[j], c);
  }
  return <Segments positions={new Float32Array(pos)} colors={new Float32Array(colr)} width={2} width2={L.width} height2={L.height} depthTest={false} />;
};

/** S9 | 1440-1620 | Everything is pulled into the center star; bloom ramps to maximum; white at 1618. */
export const S09_Implosion: React.FC = () => {
  const f = useCurrentFrame();
  const L = useLayout();
  const F = SCENES.S09.from + f;
  const build = EASE_IN_SCENE(ramp(F, 1440, 1616));
  const d = camDist0(L) * (1 - 0.04 * EASE_INOUT(ramp(F, 1440, 1600)));
  const roll = 0.25 * Math.pow(build, 2);
  const beat = Math.exp(-(F % 30) / 7);
  const starI = 1 + 2.6 * build + 0.4 * beat;
  const swell = 1 + 0.2 * EASE_OUT_SCENE(ramp(F, 1570, 1618));
  const bloom = 1.2 + 6.5 * Math.pow(build, 2.2) + 0.3 * beat;
  const threshold = 0.18 - 0.16 * build;
  return (
    <AbsoluteFill>
      <Stage3D fx={{ bloom, threshold, radius: 0.8, ca: 0.0008 + 0.007 * build }} fov={FOV}>
        <CameraRig position={[0, 0, d]} lookAt={[0, 0, 0]} roll={roll} />
        <Particles F={F} count={2600} />
        <Debris F={F} L={L} />
        <group scale={swell} rotation={[0, 0, -0.0012 * (F - 1440) - 0.15 * build * build]}>
          <Star3D intensity={starI} width={L.vertical ? 5.5 : 6.5} />
        </group>
      </Stage3D>
      <HudText corner="tl" color={COLORS.blue}>{"Ne / 10"}</HudText>
      <HudText corner="tr" opacity={0.5}>{`F ${frameCode(F)}`}</HudText>
    </AbsoluteFill>
  );
};
