// Downloads the exact Google Fonts files listed by @remotion/google-fonts into public/fonts,
// so renders never depend on the network (and every render uses identical font bytes).
// Space Grotesk and JetBrains Mono are SIL Open Font License fonts.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getInfo as spaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { getInfo as jetbrainsMono } from "@remotion/google-fonts/JetBrainsMono";

const WANT = [
  { info: spaceGrotesk(), slug: "SpaceGrotesk", weights: ["500", "700"] },
  { info: jetbrainsMono(), slug: "JetBrainsMono", weights: ["400", "500"] },
];
const dir = path.resolve("public/fonts");
fs.mkdirSync(dir, { recursive: true });
for (const { info, slug, weights } of WANT) {
  // Both families ship as variable fonts: every weight points at the same file.
  const urls = [...new Set(weights.map((w) => info.fonts.normal[w].latin))];
  if (urls.length !== 1) throw new Error(`${slug}: expected one variable file, got ${urls.length}`);
  {
    const url = urls[0];
    const out = path.join(dir, `${slug}-latin.woff2`);
    if (fs.existsSync(out) && fs.statSync(out).size > 1000) {
      console.log(`have ${out}`);
      continue;
    }
    execFileSync("curl", ["-sSfL", "-o", out, url], { stdio: "inherit" });
    console.log(`got  ${out} (${fs.statSync(out).size} bytes) <- ${url}`);
  }
}
