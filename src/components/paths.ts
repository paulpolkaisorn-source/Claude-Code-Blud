export type Pt = [number, number];

export const polyLength = (pts: Pt[]) => {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  }
  return len;
};

/** Point at fraction t (0..1) along a polyline. */
export const pointAt = (pts: Pt[], t: number): Pt => {
  const total = polyLength(pts);
  let target = Math.max(0, Math.min(1, t)) * total;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (target <= seg || i === pts.length - 1) {
      const k = seg === 0 ? 0 : Math.min(1, target / seg);
      return [
        pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k,
        pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k,
      ];
    }
    target -= seg;
  }
  return pts[pts.length - 1];
};

export const toD = (pts: Pt[]) =>
  pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0]},${p[1]}`).join(" ");
