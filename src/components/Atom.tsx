import { Line } from "@react-three/drei";
import React, { useMemo } from "react";
import * as THREE from "three";
import { rnd, rndRange } from "../rand";
import { COLORS, mixHex } from "../theme";
import { GlowSprite, getGlowTexture, hdr } from "./Stage3D";

/**
 * Neon atom: 10 protons + 10 neutrons in the nucleus, 2 electrons on the inner
 * shell, 8 on the outer shell. Electron orbits are the only constant-speed motion
 * in the film.
 */
export const INNER_R = 1.15;
export const OUTER_R = 2.4;
export const INNER_PERIOD = 84; // frames per revolution
export const OUTER_PERIOD = 150;

export type Tilt = { x: number; z: number };

/** Point on a tilted circular orbit. */
export const orbitPoint = (r: number, tilt: Tilt, angle: number, out = new THREE.Vector3()) => {
  out.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
  out.applyEuler(new THREE.Euler(tilt.x, 0, tilt.z, "ZXY"));
  return out;
};

export const electronAngle = (ring: "inner" | "outer", index: number, t: number) => {
  const period = ring === "inner" ? INNER_PERIOD : OUTER_PERIOD;
  const count = ring === "inner" ? 2 : 8;
  return (t / period) * Math.PI * 2 + (index / count) * Math.PI * 2 + (ring === "inner" ? 0.4 : 0);
};

// ---------- Nucleus ----------
const NUCLEONS = (() => {
  const list: { p: THREE.Vector3; proton: boolean }[] = [];
  const shells = [
    { n: 6, r: 0.13 },
    { n: 14, r: 0.27 },
  ];
  let k = 0;
  for (const s of shells) {
    for (let i = 0; i < s.n; i++) {
      const y = 1 - (2 * (i + 0.5)) / s.n;
      const rr = Math.sqrt(1 - y * y);
      const th = i * 2.399963 + s.r * 10;
      list.push({ p: new THREE.Vector3(Math.cos(th) * rr * s.r, y * s.r, Math.sin(th) * rr * s.r), proton: k % 2 === 0 });
      k++;
    }
  }
  return list; // 20 nucleons, alternating protons / neutrons -> 10 + 10
})();

export const Nucleus: React.FC<{ scale?: number; color?: string; intensity?: number; spin?: number }> = ({ scale = 1, color = COLORS.neon, intensity = 1, spin = 0 }) => {
  const geo = useMemo(() => new THREE.SphereGeometry(0.105, 18, 14), []);
  if (scale <= 0.001) return null;
  return (
    <group scale={scale} rotation={[spin * 0.6, spin, 0]}>
      {NUCLEONS.map((n, i) => (
        <mesh key={i} geometry={geo} position={n.p}>
          <meshBasicMaterial color={n.proton ? hdr(color, 2.6 * intensity) : hdr(mixHex(color, COLORS.tubeWhite, 0.55), 1.5 * intensity)} toneMapped={false} />
        </mesh>
      ))}
      <GlowSprite scale={1.6} color={color} opacity={0.55 * Math.min(1, intensity)} intensity={1.6} />
      <GlowSprite scale={0.7} color={COLORS.tubeWhite} opacity={0.5 * Math.min(1, intensity)} intensity={1.2} />
    </group>
  );
};

// ---------- Rings ----------
const ringPoints = (r: number, tilt: Tilt, from = 0, to = Math.PI * 2, n = 160) => {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) pts.push(orbitPoint(r, tilt, from + ((to - from) * i) / n));
  return pts;
};

/** Glowing orbit ring. snap 0..1 breaks it into arcs that fly outward and fade. */
export const OrbitRing: React.FC<{
  r: number;
  tilt: Tilt;
  color?: string;
  intensity?: number;
  width?: number;
  snap?: number;
  snapPhase?: number;
}> = ({ r, tilt, color = COLORS.neon, intensity = 1, width = 2.6, snap = 0, snapPhase = 0 }) => {
  const arcs = useMemo(() => {
    if (snap <= 0) return null;
    return Array.from({ length: 8 }, (_, i) => {
      const a0 = snapPhase + (i / 8) * Math.PI * 2 + 0.12;
      const a1 = snapPhase + ((i + 1) / 8) * Math.PI * 2 - 0.12;
      return { a0, a1, mid: (a0 + a1) / 2, drift: rndRange(`arc-${i}`, 0.7, 1.3) };
    });
  }, [snap > 0, snapPhase]);
  if (intensity <= 0.001) return null;
  if (!arcs) {
    const pts = ringPoints(r, tilt);
    return (
      <group>
        <Line points={pts} color={hdr(color, 2.2 * intensity)} lineWidth={width} toneMapped={false} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        <Line points={pts} color={hdr(COLORS.tubeWhite, 0.9 * intensity)} lineWidth={width * 0.4} toneMapped={false} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </group>
    );
  }
  const fade = Math.max(0, 1 - snap);
  return (
    <group>
      {arcs.map((a, i) => {
        const push = 1 + snap * 0.9 * a.drift;
        const pts = ringPoints(r * push, tilt, a.a0 + snap * 0.3, a.a1 - snap * 0.3, 40);
        return (
          <Line
            key={i}
            points={pts}
            color={hdr(color, 2.6 * intensity * fade)}
            lineWidth={width * (1 - 0.5 * snap)}
            toneMapped={false}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        );
      })}
    </group>
  );
};

// ---------- Electron ----------
/** Bright electron head + fading light trail. trail[0] = head, then older points. */
export const Electron: React.FC<{ trail: THREE.Vector3[]; color?: string; intensity?: number; size?: number; width?: number }> = ({
  trail,
  color = COLORS.neon,
  intensity = 1,
  size = 0.075,
  width = 4,
}) => {
  const colors = useMemo(() => {
    const n = trail.length;
    return trail.map((_, i) => {
      const k = Math.pow(1 - i / Math.max(1, n - 1), 1.6);
      const c = hdr(mixHex(COLORS.tubeWhite, color, Math.min(1, i / (n * 0.25))), 3.2 * k * intensity);
      return c;
    });
  }, [trail, color, intensity]);
  if (intensity <= 0.001 || trail.length === 0) return null;
  return (
    <group>
      {trail.length > 1 && (
        <Line points={trail} vertexColors={colors} lineWidth={width} toneMapped={false} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      )}
      <mesh position={trail[0]}>
        <sphereGeometry args={[size, 16, 12]} />
        <meshBasicMaterial color={hdr(mixHex(color, COLORS.tubeWhite, 0.6), 4 * intensity)} toneMapped={false} />
      </mesh>
      <GlowSprite position={[trail[0].x, trail[0].y, trail[0].z]} scale={size * 9} color={color} opacity={Math.min(1, intensity)} intensity={1.4} />
    </group>
  );
};

/** Orbital trail behind an electron (analytic, so it's deterministic). */
export const orbitTrail = (r: number, tilt: Tilt, angle: number, trailAngle = 0.9, n = 22) => {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) pts.push(orbitPoint(r, tilt, angle - (trailAngle * i) / n));
  return pts;
};

// ---------- Dust ----------
/** Floating dust motes in 3D, drifting slowly. Gives parallax so camera moves read. */
export const DustField: React.FC<{ t: number; count?: number; radius?: number; color?: string; opacity?: number; size?: number; seed?: string }> = ({
  t,
  count = 260,
  radius = 14,
  color = COLORS.tubeWhite,
  opacity = 0.6,
  size = 0.06,
  seed = "dust",
}) => {
  const base = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: rndRange(`${seed}x${i}`, -radius, radius),
        y: rndRange(`${seed}y${i}`, -radius * 0.6, radius * 0.6),
        z: rndRange(`${seed}z${i}`, -radius, radius * 0.4),
        ph: rnd(`${seed}p${i}`) * 6.28,
      })),
    [count, radius, seed],
  );
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    return g;
  }, [count]);
  const arr = geo.getAttribute("position") as THREE.BufferAttribute;
  base.forEach((b, i) => {
    arr.setXYZ(i, b.x + Math.sin(t * 0.011 + b.ph) * 0.35, b.y + Math.sin(t * 0.008 + b.ph * 1.7) * 0.25 + t * 0.002, b.z);
  });
  arr.needsUpdate = true;
  return (
    <points geometry={geo}>
      <pointsMaterial map={getGlowTexture()} size={size} sizeAttenuation color={hdr(color, 1.2)} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </points>
  );
};

/** Complete atom at local time t (frames), used by S2 and the montage. */
export const Atom: React.FC<{
  t: number;
  innerTilt: Tilt;
  outerTilt: Tilt;
  color?: string;
  intensity?: number;
  trail?: number;
}> = ({ t, innerTilt, outerTilt, color = COLORS.neon, intensity = 1, trail = 0.9 }) => {
  return (
    <group>
      <Nucleus color={color} intensity={intensity} spin={t * 0.01} />
      <OrbitRing r={INNER_R} tilt={innerTilt} color={color} intensity={0.55 * intensity} width={2} />
      <OrbitRing r={OUTER_R} tilt={outerTilt} color={color} intensity={0.55 * intensity} width={2.4} />
      {[0, 1].map((i) => (
        <Electron key={`i${i}`} trail={orbitTrail(INNER_R, innerTilt, electronAngle("inner", i, t), trail * 1.1)} color={color} intensity={intensity} />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <Electron key={`o${i}`} trail={orbitTrail(OUTER_R, outerTilt, electronAngle("outer", i, t), trail)} color={color} intensity={intensity} />
      ))}
    </group>
  );
};
