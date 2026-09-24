import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { GpuCard } from "../components/GpuCard";
import { GpuDie } from "../components/GpuDie";
import { content } from "../data/content";
import { COLORS, FONTS, ease, EASE_IN, enter } from "../theme";

const T = content.radeonDeepDive;

// Internal beats (all on the 15-frame grid).
export const RADEON_BEATS = { card: 0, die: 210, rays: 330, upscale: 450, arch: 570 };

/** Fan angle from a linear spin-up: integral of speed, so rotation never jumps. */
const fanAngle = (f: number) => {
  const ramp = 100;
  const max = 38;
  return f < ramp ? (max * f * f) / (2 * ramp) : (max * ramp) / 2 + max * (f - ramp);
};

const Kicker: React.FC<{ text: string; p: number; color?: string }> = ({ text, p, color = COLORS.radeon }) => (
  <div style={{ position: "absolute", left: 96, top: 84, display: "flex", alignItems: "center", gap: 20, opacity: p, transform: `translateX(${(1 - p) * -30}px)` }}>
    <div style={{ width: 48, height: 3, background: color }} />
    <div style={{ fontFamily: FONTS.headline, fontWeight: 700, fontSize: 56, color: COLORS.white }}>{text}</div>
  </div>
);

const CardBeat: React.FC<{ f: number }> = ({ f }) => {
  const rot = enter(f, 0);
  const zoom = ease(f, [150, 210], [0, 1], EASE_IN);
  const scale = 1 + zoom * 13;
  const darken = ease(f, [175, 208]);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `perspective(2200px) rotateY(${(1 - rot) * -60 - 10 * (1 - zoom)}deg) rotateX(${8 * (1 - zoom)}deg) scale(${scale})`, opacity: 0.35 + 0.65 * rot }}>
        <svg width="100%" height="100%" viewBox="0 0 1920 1080">
          <g style={{ filter: `drop-shadow(0 0 10px rgba(237,28,36,0.6))` }}>
            <GpuCard cx={960} cy={540} w={1100} h={360} fans={3} fanAngle={fanAngle(f)} solid strokeWidth={4} />
          </g>
        </svg>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%, #3a0508 0%, #0A0A0B 70%)", opacity: darken }} />
    </AbsoluteFill>
  );
};

const DieBeat: React.FC<{ f: number; labels: boolean }> = ({ f, labels }) => {
  const local = f - RADEON_BEATS.die;
  const s = interpolate(enter(local, 0), [0, 1], [1.35, 1]);
  const wave = ease(local, [10, 95], [-0.15, 1.3], (t) => t);
  const labelIn = labels ? ease(local, [20, 40]) : 0;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${s * (1 + local * 0.0006)})` }}>
        <svg width="100%" height="100%" viewBox="0 0 1920 1080">
          <GpuDie cx={960} cy={560} wave={wave} />
        </svg>
      </AbsoluteFill>
      <Kicker text={T.computeUnits} p={labelIn} />
    </AbsoluteFill>
  );
};

// Ray tracing: light at top-left, rays hit shapes, bounce, shapes gain reflections.
const LIGHT = { x: 330, y: 190 };
const FLOOR = 800;
const SPHERE = { x: 820, y: 640, r: 150 };
const CUBE = { x: 1300, y: 690, s: 190 };
const PYR = { x: 1640, y: 790, w: 230, h: 260 };
const RAYS: { hit: [number, number]; bounce: [number, number] }[] = [
  { hit: [720, 540], bounce: [1180, 250] },
  { hit: [770, 610], bounce: [1250, 640] },
  { hit: [1210, 610], bounce: [1600, 330] },
  { hit: [1260, 700], bounce: [1560, 720] },
  { hit: [600, 800], bounce: [820, 960] },
  { hit: [1605, 640], bounce: [1900, 520] },
];

const RayBeat: React.FC<{ f: number; labels: boolean }> = ({ f, labels }) => {
  const local = f - RADEON_BEATS.rays;
  const refl = ease(local, [55, 90]);
  const labelIn = labels ? ease(local, [8, 28]) : 0;
  const shapesIn = 0.4 + 0.6 * enter(local, 0);
  const seg = (a: [number, number], b: [number, number], p: number) => [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p];
  return (
    <AbsoluteFill>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080">
        <defs>
          <radialGradient id="sphereG" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#3a3a40" />
            <stop offset="100%" stopColor="#101012" />
          </radialGradient>
          <linearGradient id="reflG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.8} />
            <stop offset="40%" stopColor={COLORS.radeon} stopOpacity={0.35} />
            <stop offset="100%" stopColor={COLORS.radeon} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="floorFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </linearGradient>
          <mask id="floorMask">
            <rect x={0} y={FLOOR} width={1920} height={280} fill="url(#floorFade)" />
          </mask>
        </defs>
        <line x1={0} x2={1920} y1={FLOOR} y2={FLOOR} stroke={COLORS.white} strokeOpacity={0.2} />
        {(["main", "mirror"] as const).map((k) => (
          <g key={k} opacity={shapesIn} mask={k === "mirror" ? "url(#floorMask)" : undefined}
            transform={k === "mirror" ? `translate(0 ${FLOOR * 2}) scale(1 -1)` : undefined}>
            {k === "mirror" && refl === 0 ? null : (
              <g opacity={k === "mirror" ? refl : 1}>
                <circle cx={SPHERE.x} cy={SPHERE.y} r={SPHERE.r} fill="url(#sphereG)" stroke={COLORS.white} strokeOpacity={0.3} />
                <ellipse cx={SPHERE.x - 50} cy={SPHERE.y - 60} rx={60 * refl} ry={34 * refl} fill="url(#reflG)" />
                <polygon points={`${CUBE.x - CUBE.s / 2},${CUBE.y - CUBE.s / 2 + 30} ${CUBE.x},${CUBE.y - CUBE.s / 2 - 10} ${CUBE.x + CUBE.s / 2},${CUBE.y - CUBE.s / 2 + 30} ${CUBE.x},${CUBE.y - CUBE.s / 2 + 70}`}
                  fill="#26262b" stroke={COLORS.white} strokeOpacity={0.3} />
                <polygon points={`${CUBE.x - CUBE.s / 2},${CUBE.y - CUBE.s / 2 + 30} ${CUBE.x},${CUBE.y - CUBE.s / 2 + 70} ${CUBE.x},${FLOOR} ${CUBE.x - CUBE.s / 2},${FLOOR - 40}`}
                  fill="#18181c" stroke={COLORS.white} strokeOpacity={0.3} />
                <polygon points={`${CUBE.x + CUBE.s / 2},${CUBE.y - CUBE.s / 2 + 30} ${CUBE.x},${CUBE.y - CUBE.s / 2 + 70} ${CUBE.x},${FLOOR} ${CUBE.x + CUBE.s / 2},${FLOOR - 40}`}
                  fill="#111114" stroke={COLORS.white} strokeOpacity={0.3} />
                <polygon points={`${CUBE.x - CUBE.s / 2},${CUBE.y - CUBE.s / 2 + 30} ${CUBE.x},${CUBE.y - CUBE.s / 2 + 70} ${CUBE.x},${FLOOR} ${CUBE.x - CUBE.s / 2},${FLOOR - 40}`}
                  fill="url(#reflG)" opacity={refl * 0.6} />
                <polygon points={`${PYR.x - PYR.w / 2},${PYR.y} ${PYR.x},${PYR.y - PYR.h} ${PYR.x + PYR.w / 2},${PYR.y}`}
                  fill="#1b1b20" stroke={COLORS.white} strokeOpacity={0.3} />
                <polygon points={`${PYR.x - PYR.w / 2},${PYR.y} ${PYR.x},${PYR.y - PYR.h} ${PYR.x - 10},${PYR.y}`}
                  fill="url(#reflG)" opacity={refl * 0.7} />
              </g>
            )}
          </g>
        ))}
        {RAYS.map((r, i) => {
          const p1 = ease(local, [10 + i * 4, 30 + i * 4], [0, 1], EASE_IN);
          const p2 = ease(local, [30 + i * 4, 50 + i * 4], [0, 1], (t) => t);
          const a = seg([LIGHT.x, LIGHT.y], r.hit, p1);
          const b = seg(r.hit, r.bounce, p2);
          return (
            <g key={i}>
              {p1 > 0 ? <line x1={LIGHT.x} y1={LIGHT.y} x2={a[0]} y2={a[1]} stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={2} /> : null}
              {p2 > 0 ? <line x1={r.hit[0]} y1={r.hit[1]} x2={b[0]} y2={b[1]} stroke={COLORS.radeon} strokeWidth={2} /> : null}
              {p1 >= 1 ? <circle cx={r.hit[0]} cy={r.hit[1]} r={6} fill={COLORS.white} /> : null}
            </g>
          );
        })}
        <circle cx={LIGHT.x} cy={LIGHT.y} r={34} fill="#FFFFFF" opacity={0.15} />
        <circle cx={LIGHT.x} cy={LIGHT.y} r={12} fill="#FFFFFF" />
      </svg>
      <Kicker text={T.rayTracing} p={labelIn} />
    </AbsoluteFill>
  );
};

// Upscaling: one procedural scene, rendered as vector (sharp) and as sampled blocks (low res).
const IMG = { x: 260, y: 200, w: 1400, h: 700 };
const HORIZON = 0.62;
const SUN = { x: 0.5, y: 0.5, r: 0.14 };
const MOUNT: [number, number][] = [[0, 0.62], [0.12, 0.42], [0.24, 0.55], [0.36, 0.36], [0.5, 0.58], [0.63, 0.4], [0.78, 0.5], [0.9, 0.34], [1, 0.48], [1, 0.62]];
const mountainTop = (x: number) => {
  for (let i = 1; i < MOUNT.length; i++) {
    const [ax, ay] = MOUNT[i - 1];
    const [bx, by] = MOUNT[i];
    if (x >= ax && x <= bx && bx > ax) return ay + ((x - ax) / (bx - ax)) * (by - ay);
  }
  return HORIZON;
};
const skyColor = (v: number) => {
  const t = v / HORIZON;
  const r = Math.round(20 + t * 200);
  const g = Math.round(6 + t * 30);
  const b = Math.round(18 + t * 20);
  return `rgb(${r},${g},${b})`;
};
const sampleColor = (u: number, v: number) => {
  if (v > HORIZON) {
    const gridU = Math.abs(((u - 0.5) / (v - HORIZON + 0.02)) * 0.08 % 0.1);
    const row = ((v - HORIZON) * 30) % 1;
    return gridU < 0.012 || row < 0.12 ? "#5a0d12" : "#0f0a0c";
  }
  if (v > mountainTop(u)) return "#1a0f14";
  if (Math.hypot((u - SUN.x) * 2, v - SUN.y) < SUN.r) return v > 0.5 ? "#ff8a3a" : "#ffb070";
  return skyColor(v);
};

const SharpScene: React.FC = () => {
  const { x, y, w, h } = IMG;
  const X = (u: number) => x + u * w;
  const Y = (v: number) => y + v * h;
  return (
    <g>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skyColor(0)} />
          <stop offset="1" stopColor={skyColor(HORIZON)} />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={w} height={h * HORIZON} fill="url(#sky)" />
      <ellipse cx={X(SUN.x)} cy={Y(SUN.y)} rx={(SUN.r / 2) * w} ry={SUN.r * h} fill="#ffb070" />
      <polygon points={MOUNT.map(([u, v]) => `${X(u)},${Y(v)}`).join(" ")} fill="#1a0f14" stroke={COLORS.radeon} strokeOpacity={0.6} strokeWidth={2} />
      <rect x={x} y={Y(HORIZON)} width={w} height={h * (1 - HORIZON)} fill="#0f0a0c" />
      {Array.from({ length: 9 }).map((_, i) => {
        const v = HORIZON + Math.pow((i + 1) / 9, 1.6) * (1 - HORIZON);
        return <line key={`h${i}`} x1={x} x2={x + w} y1={Y(v)} y2={Y(v)} stroke={COLORS.radeon} strokeOpacity={0.55} strokeWidth={2} />;
      })}
      {Array.from({ length: 15 }).map((_, i) => {
        const u = (i - 7) / 7;
        return <line key={`v${i}`} x1={X(0.5)} y1={Y(HORIZON)} x2={X(0.5 + u * 0.9)} y2={Y(1)} stroke={COLORS.radeon} strokeOpacity={0.55} strokeWidth={2} />;
      })}
    </g>
  );
};

const BlockScene: React.FC = () => {
  const cols = 28;
  const rows = 14;
  const { x, y, w, h } = IMG;
  const bw = w / cols;
  const bh = h / rows;
  return (
    <g>
      {Array.from({ length: cols * rows }).map((_, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        return <rect key={i} x={x + c * bw} y={y + r * bh} width={bw + 0.5} height={bh + 0.5} fill={sampleColor((c + 0.5) / cols, (r + 0.5) / rows)} />;
      })}
    </g>
  );
};

const UpscaleBeat: React.FC<{ f: number; labels: boolean }> = ({ f, labels }) => {
  const local = f - RADEON_BEATS.upscale;
  const inP = enter(local, 0);
  const sweep = ease(local, [15, 100], [0.08, 0.92], (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2));
  const divX = IMG.x + IMG.w * sweep;
  const labelIn = labels ? ease(local, [8, 28]) : 0;
  const tagIn = labels ? ease(local, [20, 40]) : 0;
  const tag: React.CSSProperties = { position: "absolute", top: IMG.y + IMG.h + 24, fontFamily: FONTS.label, fontWeight: 500, fontSize: 26, color: COLORS.gray, opacity: tagIn };
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${1.05 - 0.05 * inP})` }}>
        <svg width="100%" height="100%" viewBox="0 0 1920 1080">
          <defs>
            <clipPath id="leftClip"><rect x={IMG.x} y={IMG.y} width={divX - IMG.x} height={IMG.h} /></clipPath>
            <clipPath id="rightClip"><rect x={divX} y={IMG.y} width={IMG.x + IMG.w - divX} height={IMG.h} /></clipPath>
            <clipPath id="imgClip"><rect x={IMG.x} y={IMG.y} width={IMG.w} height={IMG.h} /></clipPath>
          </defs>
          <g clipPath="url(#imgClip)">
            <g clipPath="url(#leftClip)"><BlockScene /></g>
            <g clipPath="url(#rightClip)"><SharpScene /></g>
          </g>
          <rect x={IMG.x} y={IMG.y} width={IMG.w} height={IMG.h} fill="none" stroke={COLORS.panelEdge} strokeWidth={2} />
          <line x1={divX} x2={divX} y1={IMG.y - 20} y2={IMG.y + IMG.h + 20} stroke={COLORS.white} strokeWidth={3} />
          <circle cx={divX} cy={IMG.y + IMG.h / 2} r={16} fill={COLORS.bg} stroke={COLORS.white} strokeWidth={3} />
        </svg>
      </AbsoluteFill>
      <div style={{ ...tag, left: IMG.x }}>{T.upscaleIn}</div>
      <div style={{ ...tag, right: 1920 - IMG.x - IMG.w, textAlign: "right" }}>{T.upscaleOut}</div>
      <Kicker text={T.upscaling} p={labelIn} />
    </AbsoluteFill>
  );
};

const ArchBeat: React.FC<{ f: number }> = ({ f }) => {
  const local = f - RADEON_BEATS.arch;
  const inP = enter(local, 0);
  const line = ease(local, [5, 35]);
  const kick = ease(local, [10, 30]);
  const drift = 1 + local * 0.0006;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", transform: `scale(${drift})` }}>
      <div style={{ fontFamily: FONTS.label, fontWeight: 500, fontSize: 30, letterSpacing: 10, color: COLORS.gray, textTransform: "uppercase", opacity: kick, marginBottom: 20 }}>
        {T.archKicker}
      </div>
      <div style={{ fontFamily: FONTS.headline, fontWeight: 700, fontSize: 220, color: COLORS.radeon, lineHeight: 1, opacity: 0.35 + 0.65 * inP, transform: `translateY(${(1 - inP) * 40}px)` }}>
        {T.arch}
      </div>
      <div style={{ marginTop: 40, width: 900 * line, height: 2, background: COLORS.white, opacity: 0.4 }} />
    </AbsoluteFill>
  );
};

/** Pure render of the Radeon scene at frame `f`. Beats hard-cut on the grid. */
export const RadeonArt: React.FC<{ f: number; labels?: boolean }> = ({ f, labels = true }) => {
  if (f < RADEON_BEATS.die) return <CardBeat f={f} />;
  if (f < RADEON_BEATS.rays) return <DieBeat f={f} labels={labels} />;
  if (f < RADEON_BEATS.upscale) return <RayBeat f={f} labels={labels} />;
  if (f < RADEON_BEATS.arch) return <UpscaleBeat f={f} labels={labels} />;
  return <ArchBeat f={f} />;
};

export const RadeonDeepDive: React.FC = () => {
  const frame = useCurrentFrame();
  return <RadeonArt f={frame} />;
};
