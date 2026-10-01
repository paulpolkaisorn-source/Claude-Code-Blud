// Downloads Mojang's official JSON schemas (sparse git clone of Mojang/bedrock-samples, metadata/ only)
// into .cache/bedrock-samples so `npm run validate` can check entity/item/block files against them,
// plus the vanilla sound definitions and particles used by tools/record-vanilla-ids.mjs.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/fsutil.mjs";

const dest = path.join(ROOT, ".cache", "bedrock-samples");
if (fs.existsSync(path.join(dest, "metadata", "json_schemas"))) {
  console.log("[fetch-schemas] already present:", dest);
  process.exit(0);
}
fs.mkdirSync(path.dirname(dest), { recursive: true });
const git = (...args) => execFileSync("git", args, { stdio: "inherit" });
git("clone", "--depth", "1", "--filter=blob:none", "--no-checkout", "https://github.com/Mojang/bedrock-samples.git", dest);
git("-C", dest, "sparse-checkout", "set", "--no-cone", "/version.json", "/metadata/json_schemas/", "/resource_pack/sounds/", "/resource_pack/particles/");
git("-C", dest, "checkout");
console.log("[fetch-schemas] done. These files are (c) Mojang AB and are only used locally for validation.");
