// Runs every generator. Each generator is idempotent and only rewrites changed files.
import { generateManifests } from "./gen-manifests.mjs";

generateManifests();
console.log("[generate] done");
