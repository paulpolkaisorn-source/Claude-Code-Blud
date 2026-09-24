import React from "react";
import { AbsoluteFill, Img, useCurrentFrame } from "remotion";
import { brandLogo } from "../brand";
import { content } from "../data/content";
import { COLORS, FONTS, ease, enter } from "../theme";

export const EndCard: React.FC = () => {
  const f = useCurrentFrame();
  const a = 0.3 + 0.7 * enter(f, 0);
  const b = enter(f, 8);
  const logoIn = ease(f, [10, 30]);
  const fadeOut = 1 - ease(f, [140, 149], [0, 1], (t) => t);
  const amd = brandLogo("amd");
  const ryzen = brandLogo("ryzen");
  const radeon = brandLogo("radeon");
  const word: React.CSSProperties = { fontFamily: FONTS.headline, fontWeight: 700, fontSize: 120, letterSpacing: 6, lineHeight: 1.15 };
  const logo: React.CSSProperties = { height: 64, objectFit: "contain", marginBottom: 12, opacity: logoIn };
  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column", opacity: fadeOut }}>
        {amd ? <Img src={amd} style={{ ...logo, height: 72, marginBottom: 40 }} /> : null}
        {ryzen ? <Img src={ryzen} style={logo} /> : null}
        <div style={{ ...word, color: COLORS.ryzen, opacity: a, transform: `translateY(${(1 - a) * 30}px)` }}>{content.endCard.ryzen}</div>
        {radeon ? <Img src={radeon} style={{ ...logo, marginTop: 32 }} /> : null}
        <div style={{ ...word, color: COLORS.radeon, opacity: b, transform: `translateY(${(1 - b) * 30}px)` }}>{content.endCard.radeon}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
