// Runs every generator. Each generator is idempotent and only rewrites changed files.
import { generateManifests } from "./gen-manifests.mjs";

generateManifests();
await import("./gen-content.mjs");
await import("./gen-characters-doc.mjs");
console.log("[generate] done");
