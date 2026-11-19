import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { rnd, rndRange } from "../rand";
import { COLORS } from "../theme";
import { GlowSprite, hdr } from "./Stage3D";

export const TUNNEL_DEPTH = 130;

type Props = {
  /** Distance travelled so far (world units). Drives all streak positions. */
  travel: number;
  /** Current speed (units/frame), stretches streaks like motion blur. */
  speed: number;
  count?: number;
  palette?: string[];
  seed?: string;
  rMin?: number;
  rMax?: number;
  intensity?: number;
};

const DEFAULT_PALETTE = [COLORS.blue, COLORS.blue, COLORS.violet, COLORS.violet, COLORS.cyan, COLORS.tubeWhite, COLORS.neon];

/**
 * Hyperspeed light streaks in a cylindrical tunnel around the camera axis.
 * One InstancedMesh, positions computed from `travel` so any frame is reproducible.
 */
export const StreakTunnel: React.FC<Props> = ({
  travel,
  speed,
  count = 520,
  palette = DEFAULT_PALETTE,
  seed = "st",
  rMin = 1.6,
  rMax = 7,
  intensity = 1,
}) => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const r = Math.sqrt(rndRange(`${seed}r${i}`, rMin * rMin, rMax * rMax));
        const th = rnd(`${seed}t${i}`) * Math.PI * 2;
        return {
          x: Math.cos(th) * r,
          y: Math.sin(th) * r * 0.82,
          z0: rnd(`${seed}z${i}`) * TUNNEL_DEPTH,
          rate: rndRange(`${seed}v${i}`, 0.75, 1.3),
          w: rndRange(`${seed}w${i}`, 0.012, 0.04),
          color: palette[Math.floor(rnd(`${seed}c${i}`) * palette.length) % palette.length],
          bright: rndRange(`${seed}b${i}`, 1.2, 3.6),
        };
      }),
    [count, seed, rMin, rMax, palette],
  );
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const col = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    data.forEach((d, i) => {
      const z = -TUNNEL_DEPTH + 4 + ((d.z0 + travel * d.rate) % TUNNEL_DEPTH);
      const len = 0.4 + speed * d.rate * 3.2;
      dummy.position.set(d.x, d.y, z - len / 2);
      dummy.scale.set(d.w, d.w, len);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      // fade in from the far end so streaks don't pop
      const far = Math.min(1, (z + TUNNEL_DEPTH - 4) / 25);
      const c = hdr(d.color, d.bright * intensity * far);
      col.copy(c);
      m.setColorAt(i, col);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[geo, undefined, count]} frustumCulled={false}>
      <meshBasicMaterial toneMapped={false} blending={THREE.AdditiveBlending} transparent depthWrite={false} />
    </instancedMesh>
  );
};

/** Ring gates rushing past: strong depth cue. */
export const TunnelRings: React.FC<{ travel: number; color?: string; count?: number; spacing?: number; radius?: number; intensity?: number }> = ({
  travel,
  color = COLORS.violet,
  count = 7,
  spacing = 18,
  radius = 6.5,
  intensity = 1,
}) => {
  const geo = useMemo(() => new THREE.TorusGeometry(radius, 0.018, 6, 96), [radius]);
  const span = count * spacing;
  return (
    <group>
      {Array.from({ length: count }, (_, i) => {
        const z = -span + 4 + ((i * spacing + travel) % span);
        const far = Math.min(1, (z + span - 4) / 30);
        return (
          <mesh key={i} geometry={geo} position={[0, 0, z]} scale={[1, 0.82, 1]}>
            <meshBasicMaterial color={hdr(color, 1.6 * intensity * far)} toneMapped={false} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

/** The bright packet of light racing ahead of the streaks. */
export const LightPacket: React.FC<{ position: [number, number, number]; t: number; intensity?: number; color?: string }> = ({ position, t, intensity = 1, color = COLORS.cyan }) => {
  const pulse = 1 + 0.12 * Math.sin(t * 0.9);
  return (
    <group position={position}>
      <mesh scale={[0.32 * pulse, 0.32 * pulse, 0.32 * pulse]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial color={hdr(COLORS.tubeWhite, 5 * intensity)} toneMapped={false} />
      </mesh>
      <GlowSprite scale={3.2 * pulse} color={color} opacity={0.9 * intensity} intensity={2} />
      <GlowSprite scale={[9, 0.5]} color={color} opacity={0.6 * intensity} intensity={1.6} />
      <GlowSprite scale={[0.35, 4]} color={COLORS.tubeWhite} opacity={0.35 * intensity} intensity={1.4} />
      {/* comet tail toward the camera */}
      {Array.from({ length: 7 }, (_, i) => (
        <GlowSprite key={i} position={[0, 0, 0.9 * (i + 1)]} scale={1.9 - i * 0.22} color={i < 2 ? COLORS.tubeWhite : color} opacity={(0.55 - i * 0.07) * intensity} intensity={1.4} />
      ))}
    </group>
  );
};
