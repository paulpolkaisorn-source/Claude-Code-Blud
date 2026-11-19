import { Line } from "@react-three/drei";
import React, { useMemo } from "react";
import * as THREE from "three";
import { Atom, DustField, Electron, INNER_R, Nucleus, OrbitRing, OUTER_R, electronAngle, orbitPoint, orbitTrail, type Tilt } from "../components/Atom";
import { CameraRig, GlowSprite, Stage3D, hdr } from "../components/Stage3D";
import { STAR_DOT, starColorAt, starHalf, starPoint } from "../components/StarMark";
import { useLayout } from "../layout";
import { COLORS, EASE_INOUT, EASE_IN_SCENE, EASE_OUT_SCENE, clamp01, mixHex, ramp } from "../theme";
import { CUES } from "../timing";

/**
 * Shared 3D stage for S2 (into the atom) and S3 (collapse into the star).
 * Driven by the absolute frame F so the S2 -> S3 cut is a seamless match cut.
 */
export const STAR_SIZE = 2.25; // half height of the 3D star, close to the outer ring radius

const deg = (d: number) => (d * Math.PI) / 180;

const tiltsAt = (F: number): { inner: Tilt; outer: Tilt } => {
  const k = EASE_INOUT(ramp(F, 95, 215));
  return {
    // start nearly edge-on (thin lines through the nucleus), open up into 3D ellipses
    inner: { x: deg(8 + 56 * k), z: deg(-10 - 18 * k) },
    outer: { x: deg(4 + 70 * k), z: deg(6 + 12 * k) },
  };
};

/** Beat pulse: 1 on each beat, decaying over ~12 frames. */
const beatPulse = (F: number) => {
  const p = F % 30;
  return Math.exp(-p / 7);
};

const camAt = (F: number, vertical: boolean) => {
  // zoom-through arrival: start inside the light, pull out fast
  const arrive = EASE_IN_SCENE(ramp(F, 90, 132));
  let dist = 3.2 + (6.6 - 3.2) * arrive;
  // S2 orbit: 40 degrees around the atom
  let az = -20 + 40 * EASE_INOUT(ramp(F, 96, 240));
  let el = 14 - 6 * EASE_INOUT(ramp(F, 96, 240));
  if (F >= CUES.ringSnap) {
    const k = EASE_INOUT(ramp(F, 240, 300));
    az = 20 * (1 - k);
    el = 8 * (1 - k);
    dist = 6.6 + 1.0 * k - 0.22 * EASE_INOUT(ramp(F, 300, 414)); // pull back to frame the star, then a slow ~3% push
  }
  // micro drift, never fully static
  az += Math.sin(F * 0.021) * 0.6;
  el += Math.sin(F * 0.017 + 1) * 0.4;
  // portrait: frame the full atom first, then tighten onto the star
  if (vertical) dist *= 2.05 - 0.43 * EASE_INOUT(ramp(F, 240, 300));
  const a = deg(az);
  const e = deg(el);
  return {
    pos: [Math.sin(a) * Math.cos(e) * dist, Math.sin(e) * dist, Math.cos(a) * Math.cos(e) * dist] as [number, number, number],
  };
};

const v3 = (p: { x: number; y: number }, s = STAR_SIZE) => new THREE.Vector3(p.x * s, p.y * s, 0);

/** Star stroke half as 3D points + per-vertex colors. */
export const StarHalf3D: React.FC<{ stroke: number; dir: -1 | 1; progress: number; coolMix: number; intensity: number; width: number }> = ({
  stroke,
  dir,
  progress,
  coolMix,
  intensity,
  width,
}) => {
  const pts2 = starHalf(stroke, dir, progress, 28);
  const pts = pts2.map((p) => v3(p));
  const colors = pts2.map((p) => hdr(starColorAt(p, coolMix), 2.6 * intensity));
  const cores = pts2.map(() => hdr(COLORS.tubeWhite, 1.1 * intensity));
  if (progress <= 0.001) return null;
  return (
    <group>
      <Line points={pts} vertexColors={colors} lineWidth={width} toneMapped={false} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      <Line points={pts} vertexColors={cores} lineWidth={width * 0.35} toneMapped={false} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </group>
  );
};

const Content: React.FC<{ F: number }> = ({ F }) => {
  const L = useLayout();
  const tilts = tiltsAt(F);
  const cam = camAt(F, L.vertical);
  const snapT = clamp01((F - CUES.ringSnap) / 22);
  const postSnap = F >= CUES.ringSnap;

  // ---- S2: plain atom ----
  if (!postSnap) {
    return (
      <>
        <CameraRig position={cam.pos} lookAt={[0, 0, 0]} />
        <DustField t={F} count={240} radius={12} opacity={0.45} size={0.07} />
        <Atom t={F} innerTilt={tilts.inner} outerTilt={tilts.outer} intensity={1} />
      </>
    );
  }

  // ---- S3: ring snaps, electrons fly in and draw the star ----
  const coolMix = EASE_INOUT(ramp(F, 282, 352));
  const color = mixHex(COLORS.neon, COLORS.blue, coolMix);
  const innerCollapse = EASE_OUT_SCENE(ramp(F, 244, 276));
  const snapPhase = electronAngle("outer", 0, CUES.ringSnap) - Math.PI / 8;

  const electrons = Array.from({ length: 8 }, (_, e) => {
    const stroke = Math.floor(e / 2);
    const dir: -1 | 1 = e % 2 === 0 ? -1 : 1;
    const start = orbitPoint(OUTER_R, tilts.outer, electronAngle("outer", e, CUES.ringSnap));
    const mid = v3(starPoint(stroke, 0.5));
    // stagger each electron by 2 frames so the collapse reads as a sequence
    const flyStart = 240 + (e % 4) * 2;
    const flyEnd = flyStart + 24;
    const drawStart = 266 + (e % 4) * 2;
    const drawEnd = drawStart + 52;
    const flyK = EASE_IN_SCENE(ramp(F, flyStart, flyEnd));
    const drawK = EASE_INOUT(ramp(F, drawStart, drawEnd));
    const ctrl = start.clone().multiplyScalar(0.35).add(new THREE.Vector3(-start.z * 0.4, start.y * 0.2, start.x * 0.4));
    const flyPos = (k: number) => {
      const u = 1 - k;
      return new THREE.Vector3(
        u * u * start.x + 2 * u * k * ctrl.x + k * k * mid.x,
        u * u * start.y + 2 * u * k * ctrl.y + k * k * mid.y,
        u * u * start.z + 2 * u * k * ctrl.z + k * k * mid.z,
      );
    };
    let trail: THREE.Vector3[];
    if (F < drawStart) {
      trail = Array.from({ length: 16 }, (_, i) => flyPos(Math.max(0, flyK - i * 0.035)));
    } else {
      const pts = starHalf(stroke, dir, drawK, 28).map((p) => v3(p));
      trail = pts.reverse().slice(0, 10);
    }
    const fadeOut = 1 - ramp(F, drawEnd, drawEnd + 16);
    return { e, stroke, dir, drawK, trail, fadeOut, landed: F >= drawEnd };
  });

  const starIntensity = 1 + 0.35 * beatPulse(F) * ramp(F, 330, 340);
  const shock = ramp(F, 330, 372);
  const preGlitchPush = EASE_OUT_SCENE(ramp(F, 400, 420));
  const spin = Math.sin(F * 0.02) * 0.04 + deg(-3) * EASE_INOUT(ramp(F, 320, 414));

  return (
    <>
      <CameraRig position={cam.pos} lookAt={[0, 0, 0]} />
      <DustField t={F} count={240} radius={12} opacity={0.45} color={mixHex(COLORS.tubeWhite, COLORS.blue, coolMix * 0.6)} size={0.07} />
      <group rotation={[0, 0, spin]} scale={1 + 0.06 * preGlitchPush}>
        {/* beat flash at the snap */}
        <GlowSprite scale={6 * (1 - snapT) + 0.01} color={COLORS.neon} opacity={(1 - snapT) * 0.9} intensity={1.6} />
        <OrbitRing r={OUTER_R} tilt={tilts.outer} color={COLORS.neon} intensity={1.2 * (1 - snapT)} width={3} snap={Math.max(0.0001, snapT)} snapPhase={snapPhase} />
        {/* inner shell collapses into the nucleus */}
        {innerCollapse < 1 && (
          <group>
            <OrbitRing r={INNER_R * (1 - innerCollapse)} tilt={tilts.inner} color={COLORS.neon} intensity={0.6 * (1 - innerCollapse)} width={2} />
            {[0, 1].map((i) => (
              <Electron
                key={i}
                trail={orbitTrail(INNER_R * (1 - innerCollapse), tilts.inner, electronAngle("inner", i, F), 0.9)}
                intensity={1 - innerCollapse}
              />
            ))}
          </group>
        )}
        {/* nucleus becomes the star's center dot */}
        <group scale={1 - 0.45 * coolMix}>
          <Nucleus color={color} intensity={1 + 0.4 * coolMix} spin={F * 0.01} />
        </group>
        <mesh>
          <sphereGeometry args={[STAR_DOT * STAR_SIZE * coolMix + 0.001, 24, 16]} />
          <meshBasicMaterial color={hdr(mixHex(COLORS.cyan, COLORS.tubeWhite, 0.4), 3 * coolMix)} toneMapped={false} />
        </mesh>
        {/* star strokes */}
        {electrons.map((el) => (
          <StarHalf3D key={`s${el.e}`} stroke={el.stroke} dir={el.dir} progress={el.drawK} coolMix={coolMix} intensity={starIntensity} width={L.vertical ? 5.5 : 6.5} />
        ))}
        {/* the electrons themselves */}
        {electrons.map((el) => (
          <Electron key={`e${el.e}`} trail={el.trail} color={color} intensity={el.fadeOut} width={5} size={0.085} />
        ))}
        {/* tip sparkles as electrons land */}
        {electrons.map((el) => {
          if (!el.landed) return null;
          const tip = v3(starPoint(el.stroke, el.dir === 1 ? 1 : 0));
          const k = ramp(F, 318 + (el.e % 4) * 2, 340);
          return <GlowSprite key={`t${el.e}`} position={[tip.x, tip.y, tip.z]} scale={0.9 * (1 - k) + 0.25} color={COLORS.cyan} opacity={0.9 * (1 - k) + 0.25} intensity={1.5} />;
        })}
        {/* shockwave when the mark completes */}
        {shock > 0 && shock < 1 && <ShockRing r={0.5 + shock * 5.5} opacity={(1 - shock) * 0.9} color={COLORS.blue} />}
      </group>
    </>
  );
};

const ShockRing: React.FC<{ r: number; opacity: number; color: string }> = ({ r, opacity, color }) => {
  const pts = useMemo(() => Array.from({ length: 121 }, (_, i) => new THREE.Vector3(Math.cos((i / 120) * Math.PI * 2), Math.sin((i / 120) * Math.PI * 2), 0)), []);
  return (
    <group scale={[r, r, 1]}>
      <Line points={pts} color={hdr(color, 2 * opacity)} lineWidth={3} toneMapped={false} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </group>
  );
};

export const AtomStarStage: React.FC<{ F: number }> = ({ F }) => {
  // Bloom animated per scene: overexposed on arrival, beat pulses, spike at the snap.
  const arrival = 1 - EASE_IN_SCENE(ramp(F, 90, 128));
  const snapSpike = F >= 240 ? Math.exp(-(F - 240) / 6) : 0;
  const bloom = 1.15 + 2.2 * arrival + 0.25 * beatPulse(F) + 1.6 * snapSpike + 0.4 * ramp(F, 330, 345) * Math.exp(-Math.max(0, F - 345) / 30);
  const ca = 0.0007 + 0.006 * snapSpike + 0.003 * arrival;
  return (
    <Stage3D fx={{ bloom, threshold: 0.16, radius: 0.75, ca }} fov={40}>
      <Content F={F} />
    </Stage3D>
  );
};

/** The finished 3D star mark (all four strokes + nucleus dot), used by S9. */
export const Star3D: React.FC<{ intensity: number; width: number; coolMix?: number }> = ({ intensity, width, coolMix = 1 }) => (
  <group>
    {[0, 1, 2, 3].flatMap((stroke) =>
      ([-1, 1] as const).map((dir) => <StarHalf3D key={`${stroke}${dir}`} stroke={stroke} dir={dir} progress={1} coolMix={coolMix} intensity={intensity} width={width} />),
    )}
    <mesh>
      <sphereGeometry args={[STAR_DOT * STAR_SIZE, 24, 16]} />
      <meshBasicMaterial color={hdr(mixHex(COLORS.cyan, COLORS.tubeWhite, 0.4), 3 * intensity)} toneMapped={false} />
    </mesh>
    <GlowSprite scale={1.4} color={COLORS.cyan} opacity={0.6} intensity={1.2 * intensity} />
  </group>
);
