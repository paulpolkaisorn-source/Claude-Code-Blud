import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { random } from "remotion";
import { COLORS } from "../theme";

/**
 * Film grain over everything. A seeded noise tile is built once, then offset
 * per frame with a seeded jump, so every render is identical.
 * (postprocessing's NoiseEffect reads the wall clock, so it is not deterministic.)
 */
const makeGrainTile = (size: number): string => {
  if (typeof document === "undefined") return "";
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) return "";
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const v = Math.floor(random(`grain-${i}`) * 255);
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL("image/png");
};

export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.04 }) => {
  const frame = useCurrentFrame();
  const tile = useMemo(() => makeGrainTile(256), []);
  const ox = Math.floor(random(`gx-${frame}`) * 256);
  const oy = Math.floor(random(`gy-${frame}`) * 256);
  return (
    <AbsoluteFill
      style={{
        backgroundImage: `url(${tile})`,
        backgroundPosition: `${ox}px ${oy}px`,
        backgroundSize: "384px 384px",
        imageRendering: "pixelated",
        opacity,
        pointerEvents: "none",
      }}
    />
  );
};

/** Light vignette over everything. */
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.55 }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 75% 75% at 50% 50%, rgba(5,6,10,0) 55%, rgba(5,6,10,${strength}) 100%)`,
      pointerEvents: "none",
    }}
  />
);

/** Full-frame flash. `amount` 0..1. */
export const Flash: React.FC<{ amount: number; color?: string }> = ({ amount, color = COLORS.tubeWhite }) =>
  amount <= 0.001 ? null : <AbsoluteFill style={{ background: color, opacity: Math.min(1, amount), pointerEvents: "none" }} />;

/**
 * Whip-pan device: horizontal motion blur + translate, applied to any layer.
 * `blur` in px (horizontal only), `x` in px.
 */
export const Whip: React.FC<{ x: number; blur: number; children: React.ReactNode; id: string }> = ({ x, blur, children, id }) => {
  if (blur < 0.5 && Math.abs(x) < 0.5) return <AbsoluteFill>{children}</AbsoluteFill>;
  return (
    <AbsoluteFill>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <filter id={id} x="-20%" y="0%" width="140%" height="100%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${blur} 0`} edgeMode="duplicate" />
          </filter>
        </defs>
      </svg>
      <AbsoluteFill style={{ transform: `translateX(${x}px)`, filter: blur >= 0.5 ? `url(#${id})` : undefined }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
