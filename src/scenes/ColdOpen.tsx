import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { ChipDie } from "../components/ChipDie";
import { Pt } from "../components/paths";
import { TracePath } from "../components/TracePath";
import { COLORS, ease, EASE_IN, EASE_IN_OUT } from "../theme";

export const DIE = { cx: 960, cy: 540, size: 360 };

const MAIN: Pt[] = [[-20, 540], [300, 540], [300, 420], [560, 420], [560, 540], [780, 540]];
const BRANCHES: Pt[][] = [
  [[300, 420], [300, 160], [960, 160], [960, 360]],
  [[560, 540], [560, 860], [960, 860], [960, 720]],
  [[560, 420], [560, 300], [1500, 300], [1500, 540], [1140, 540]],
];
const DECOR: Pt[][] = [
  [[300, 160], [140, 160], [140, 90]],
  [[560, 860], [360, 860], [360, 980]],
  [[1500, 300], [1720, 300], [1720, 200]],
  [[1500, 540], [1500, 780], [1760, 780]],
  [[960, 860], [1260, 860], [1260, 960]],
];

/** Pure render of the cold open at frame `f` (reused by the montage). */
export const ColdOpenArt: React.FC<{ f: number }> = ({ f }) => {
  const main = ease(f, [8, 95], [0, 1], EASE_IN_OUT);
  const pathFade = ease(f, [205, 236], [1, 0.3]);
  const dieDraw = ease(f, [150, 196], [0, 1], Easing.in(Easing.quad));
  const flash = interpolate(f, [196, 200, 228], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lit = ease(f, [198, 222], [0, 1]);
  return (
    <AbsoluteFill>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080">
        <g style={{ filter: `drop-shadow(0 0 8px ${COLORS.ryzen})` }}>
          <TracePath pts={MAIN} progress={main} color={COLORS.ryzen} width={3} opacity={pathFade} />
          {BRANCHES.map((b, i) => (
            <TracePath
              key={i}
              pts={b}
              progress={ease(f, [88 + i * 8, 150 + i * 3], [0, 1], EASE_IN)}
              color={COLORS.ryzen}
              width={2.5}
              opacity={pathFade}
            />
          ))}
          {DECOR.map((b, i) => (
            <TracePath
              key={i}
              pts={b}
              progress={ease(f, [110 + i * 7, 150 + i * 6], [0, 1], EASE_IN)}
              color={COLORS.ryzen}
              width={1.5}
              opacity={pathFade * 0.55}
            />
          ))}
          <ChipDie
            cx={DIE.cx}
            cy={DIE.cy}
            size={DIE.size}
            draw={dieDraw}
            detail={lit}
            fill={dieDraw * 0.04 + flash * 0.7 + lit * 0.08}
            strokeWidth={4}
          />
        </g>
      </svg>
      <AbsoluteFill style={{ backgroundColor: "#FFFFFF", opacity: flash * 0.28 }} />
    </AbsoluteFill>
  );
};

export const ColdOpen: React.FC = () => {
  const frame = useCurrentFrame();
  return <ColdOpenArt f={frame} />;
};
