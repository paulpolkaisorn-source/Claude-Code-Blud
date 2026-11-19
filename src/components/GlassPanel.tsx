import { Line, RoundedBox } from "@react-three/drei";
import React, { useMemo } from "react";
import * as THREE from "three";
import { COLORS, FONTS, TYPE, withAlpha } from "../theme";
import { GlowSprite, hdr } from "./Stage3D";

/** Perimeter of a rounded rectangle, starting at the top-left corner going clockwise. */
export const roundedRectPoints = (w: number, h: number, r: number, perCorner = 10) => {
  const pts: THREE.Vector3[] = [];
  const hw = w / 2;
  const hh = h / 2;
  const corners = [
    { cx: -hw + r, cy: hh - r, a0: Math.PI, a1: Math.PI / 2 },
    { cx: hw - r, cy: hh - r, a0: Math.PI / 2, a1: 0 },
    { cx: hw - r, cy: -hh + r, a0: 0, a1: -Math.PI / 2 },
    { cx: -hw + r, cy: -hh + r, a0: -Math.PI / 2, a1: -Math.PI },
  ];
  corners.forEach((c) => {
    for (let i = 0; i <= perCorner; i++) {
      const a = c.a0 + ((c.a1 - c.a0) * i) / perCorner;
      pts.push(new THREE.Vector3(c.cx + Math.cos(a) * r, c.cy + Math.sin(a) * r, 0));
    }
  });
  pts.push(pts[0].clone());
  return pts;
};

/** Resample a polyline by arc length (so draw progress is uniform). */
export const resample = (pts: THREE.Vector3[], n: number) => {
  const segLen: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const l = pts[i].distanceTo(pts[i - 1]);
    segLen.push(l);
    total += l;
  }
  const out: THREE.Vector3[] = [];
  for (let k = 0; k <= n; k++) {
    let d = (k / n) * total;
    let i = 0;
    while (i < segLen.length - 1 && d > segLen[i]) {
      d -= segLen[i];
      i++;
    }
    const t = segLen[i] > 0 ? Math.min(1, d / segLen[i]) : 0;
    out.push(pts[i].clone().lerp(pts[i + 1], t));
  }
  return out;
};

let sheenTex: THREE.Texture | null = null;
const getSheen = () => {
  if (sheenTex) return sheenTex;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 160;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 256, 160);
  g.addColorStop(0, "rgba(255,255,255,0.55)");
  g.addColorStop(0.35, "rgba(255,255,255,0.08)");
  g.addColorStop(0.6, "rgba(255,255,255,0.02)");
  g.addColorStop(1, "rgba(255,255,255,0.12)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 160);
  sheenTex = new THREE.CanvasTexture(c);
  sheenTex.colorSpace = THREE.SRGBColorSpace;
  return sheenTex;
};

/**
 * Frosted-glass panel: real transmission (rough glass blurs what's behind it)
 * + a neon edge light that traces the border as the panel arrives.
 */
export const GlassPanel: React.FC<{
  w: number;
  h: number;
  depth?: number;
  position: [number, number, number];
  rotation: [number, number, number];
  /** 0..1 border trace progress. */
  trace: number;
  /** Edge light color. */
  color?: string;
  /** Overall brightness of the edge light (dims when the panel moves away). */
  glow?: number;
  /** Frame, for the traveling highlight once the border is complete. */
  t: number;
  opacity?: number;
  headScale?: number;
  sheen?: number;
}> = ({ w, h, depth = 0.12, position, rotation, trace, color = COLORS.blue, glow = 1, t, opacity = 1, headScale = 0.7, sheen = 0.22 }) => {
  const r = Math.min(w, h) * 0.09;
  const border = useMemo(() => resample(roundedRectPoints(w, h, r, 12), 220), [w, h, r]);
  const n = Math.max(2, Math.floor(border.length * Math.min(1, trace)));
  const drawn = border.slice(0, n);
  const head = drawn[drawn.length - 1];
  const zf = depth / 2 + 0.004;
  const colors = drawn.map((_, i) => {
    // brighter toward the moving head while tracing, a slow traveling highlight after
    const fromHead = (n - i) / border.length;
    const travel = ((i / border.length - (t * 0.006) % 1) + 1) % 1;
    const hl = trace >= 1 ? Math.exp(-Math.min(travel, 1 - travel) * 18) * 1.6 : 0;
    const k = (trace < 1 ? 0.9 + 2.4 * Math.exp(-fromHead * 9) : 1.1) + hl;
    return hdr(color, k * glow);
  });
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[w, h, depth]} radius={Math.min(r, depth / 2 - 0.001)} smoothness={3}>
        <meshPhysicalMaterial
          color={new THREE.Color("#AFC0F0")}
          roughness={0.18}
          metalness={0.15}
          clearcoat={1}
          clearcoatRoughness={0.1}
          transparent
          opacity={0.14 * opacity}
          depthWrite={false}
        />
      </RoundedBox>
      {/* glass sheen */}
      <mesh position={[0, 0, zf]}>
        <planeGeometry args={[w * 0.985, h * 0.975]} />
        <meshBasicMaterial map={getSheen()} transparent opacity={sheen * opacity} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      {/* neon edge light */}
      {trace > 0.002 && (
        <group position={[0, 0, zf]}>
          <Line points={drawn} vertexColors={colors} lineWidth={3.2} toneMapped={false} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
          <Line points={drawn} color={hdr(COLORS.tubeWhite, 0.9 * glow)} lineWidth={1.1} toneMapped={false} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
          {trace < 1 && head && <GlowSprite position={[head.x, head.y, 0.01]} scale={headScale} color={color} opacity={glow} intensity={2.2} />}
        </group>
      )}
    </group>
  );
};

/**
 * CSS 3D mirror of the WebGL camera, for crisp DOM text riding on 3D panels.
 * Valid for a camera at (cx, cy, cz) looking straight down -z (no rotation).
 * World point (x, y, z) -> CSS translate3d(k(x-cx), -k(y-cy), k z) with
 * perspective P = (H/2)/tan(fov/2) and k = P / cz.
 */
export type CssCam = { cx: number; cy: number; cz: number; fov: number; width: number; height: number };

export const PanelText: React.FC<{
  cam: CssCam;
  w: number;
  h: number;
  depth: number;
  position: [number, number, number];
  rotation: [number, number, number];
  text: string;
  /** Text opacity (the frosted pane stays). */
  opacity: number;
  index: number;
  unit: number;
  /** Panel radius as a fraction of min(w, h). */
  radius?: number;
}> = ({ cam, w, h, depth, position, rotation, text, opacity, index, unit, radius = 0.09 }) => {
  const P = cam.height / 2 / Math.tan((cam.fov * Math.PI) / 360);
  const k = P / cam.cz;
  const X = k * (position[0] - cam.cx);
  const Y = -k * (position[1] - cam.cy);
  const Z = k * position[2];
  const pw = w * k;
  const ph = h * k;
  const fs = Math.min(ph * 0.17, (pw * 0.84) / Math.max(8, text.length * 0.5));
  return (
    <div style={{ position: "absolute", inset: 0, perspective: `${P}px`, perspectiveOrigin: "50% 50%", pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: cam.width / 2 - pw / 2,
          top: cam.height / 2 - ph / 2,
          width: pw,
          height: ph,
          transform: `translate3d(${X}px, ${Y}px, ${Z}px) rotateX(${-rotation[0]}rad) rotateY(${rotation[1]}rad) rotateZ(${-rotation[2]}rad) translateZ(${(k * depth) / 2 + 1}px)`,
          backfaceVisibility: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* frosted pane: blurs whatever the WebGL canvas shows behind the panel */}
        <div
          style={{
            position: "absolute",
            inset: Math.max(2, 0.012 * Math.min(pw, ph)),
            borderRadius: radius * Math.min(pw, ph) * 0.92,
            backdropFilter: `blur(${Math.max(6, 0.035 * ph)}px) saturate(1.5) brightness(1.18)`,
            background: `linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 38%, rgba(140,160,255,0.05) 70%, rgba(255,255,255,0.10) 100%)`,
            boxShadow: `inset 0 0 ${0.08 * ph}px rgba(160,180,255,0.18)`,
          }}
        />
        <div
          style={{
            opacity,
            position: "absolute",
            top: ph * 0.1,
            left: pw * 0.07,
            fontFamily: FONTS.mono,
            fontWeight: 500,
            fontSize: Math.max(12 * unit, ph * 0.065),
            letterSpacing: "0.12em",
            color: withAlpha(COLORS.cyan, 0.85),
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </div>
        <div
          style={{
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: fs,
            letterSpacing: TYPE.titleTracking,
            lineHeight: 1.1,
            color: COLORS.tubeWhite,
            textAlign: "center",
            maxWidth: pw * 0.84,
            opacity,
            position: "relative",
            textShadow: `0 0 ${3 * unit}px ${withAlpha(COLORS.tubeWhite, 0.6)}, 0 0 ${20 * unit}px ${withAlpha(COLORS.blue, 0.8)}`,
          }}
        >
          {text || ""}
        </div>
      </div>
    </div>
  );
};
