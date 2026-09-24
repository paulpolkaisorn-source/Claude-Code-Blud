import { getStaticFiles, staticFile } from "remotion";

/**
 * Returns a src for an optional file in public/, or null when it isn't there.
 * Lets the video fall back to text when no official logos / music are provided.
 */
export const optionalAsset = (name: string): string | null => {
  const found = getStaticFiles().some((f) => f.name === name);
  return found ? staticFile(name) : null;
};

export const brandLogo = (which: "amd" | "ryzen" | "radeon") =>
  optionalAsset(`brand/${which}.svg`);
