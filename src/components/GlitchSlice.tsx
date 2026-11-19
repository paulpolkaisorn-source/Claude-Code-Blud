import React, { useId } from "react";
import { AbsoluteFill } from "remotion";
import { rnd } from "../rand";

/**
 * Glitch slice transition device: RGB split + horizontal slice displacement,
 * applied as one SVG filter to everything inside (2D layers and WebGL canvases).
 * `amount` 0 = off. Deterministic: slice pattern is seeded by `seed`.
 */
export const GlitchSlice: React.FC<{
  amount: number;
  seed: number;
  children: React.ReactNode;
  width: number;
  height: number;
}> = ({ amount, seed, children, width, height }) => {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = `gl${raw}`;
  if (amount <= 0.001) return <AbsoluteFill>{children}</AbsoluteFill>;
  // Quantized band table: most bands stay put, a few jump hard left/right.
  const table = Array.from({ length: 14 }, (_, i) => {
    const r = rnd(`glitch-${seed}-${i}`);
    if (r < 0.45) return 0.5;
    return 0.5 + (rnd(`glitch-d-${seed}-${i}`) - 0.5) * 1.0;
  }).join(" ");
  const shift = 6 + 22 * amount;
  const freq = 0.006 + 0.02 * rnd(`glitch-f-${seed}`);
  return (
    <AbsoluteFill>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <filter id={id} x={0} y={0} width={width} height={height} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency={`0 ${freq}`} numOctaves={1} seed={seed} result="noise" />
            <feComponentTransfer in="noise" result="bands">
              <feFuncR type="discrete" tableValues={table} />
              <feFuncG type="discrete" tableValues="0.5" />
            </feComponentTransfer>
            <feDisplacementMap in="SourceGraphic" in2="bands" scale={140 * amount * (width / 1920)} xChannelSelector="R" yChannelSelector="G" result="disp" />
            <feColorMatrix in="disp" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
            <feOffset in="r" dx={shift} dy={0} result="r2" />
            <feColorMatrix in="disp" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
            <feColorMatrix in="disp" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
            <feOffset in="b" dx={-shift} dy={0} result="b2" />
            <feComposite in="r2" in2="g" operator="arithmetic" k1={0} k2={1} k3={1} k4={0} result="rg" />
            <feComposite in="rg" in2="b2" operator="arithmetic" k1={0} k2={1} k3={1} k4={0} />
          </filter>
        </defs>
      </svg>
      <AbsoluteFill style={{ filter: `url(#${id})` }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
