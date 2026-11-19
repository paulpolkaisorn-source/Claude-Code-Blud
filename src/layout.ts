import { useVideoConfig } from "remotion";

export type Layout = {
  width: number;
  height: number;
  vertical: boolean;
  /** Scale factor relative to a 1080 px short side. */
  unit: number;
  cx: number;
  cy: number;
  /** Title-safe area: 90% of the frame, centered. */
  safe: { x: number; y: number; w: number; h: number };
  aspect: number;
};

export const makeLayout = (width: number, height: number): Layout => {
  const unit = Math.min(width, height) / 1080;
  return {
    width,
    height,
    vertical: height > width,
    unit,
    cx: width / 2,
    cy: height / 2,
    safe: { x: width * 0.05, y: height * 0.05, w: width * 0.9, h: height * 0.9 },
    aspect: width / height,
  };
};

export const useLayout = (): Layout => {
  const { width, height } = useVideoConfig();
  return makeLayout(width, height);
};

/**
 * Vertical FOV (degrees) that keeps a landscape shot's horizontal coverage
 * in a narrower frame, capped so portrait does not get fisheye distortion.
 */
export const fitFov = (landscapeVFov: number, aspect: number, maxFov = 78) => {
  const ref = 16 / 9;
  if (aspect >= ref) return landscapeVFov;
  const halfH = Math.tan((landscapeVFov * Math.PI) / 360) * ref; // horizontal half extent at distance 1
  const wantV = (2 * Math.atan(halfH / aspect) * 180) / Math.PI;
  return Math.min(maxFov, wantV);
};
