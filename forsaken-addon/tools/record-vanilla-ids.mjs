// Verifies every vanilla sound/particle/block id the addon uses against Mojang's bedrock-samples
// (run `npm run fetch-schemas` first, which also fetches the resource pack metadata) and records the
// verified subset in tools/vanilla-ids.json, which `npm run validate` checks against offline.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { ROOT, readJson, writeJson } from "./lib/fsutil.mjs";

const samples = path.join(ROOT, ".cache", "bedrock-samples");
const soundDefs = path.join(samples, "resource_pack", "sounds", "sound_definitions.json");
const particleDir = path.join(samples, "resource_pack", "particles");
if (!fs.existsSync(soundDefs) || !fs.existsSync(particleDir)) {
  try {
    execFileSync("git", ["-C", samples, "sparse-checkout", "add", "resource_pack/sounds", "resource_pack/particles"], { stdio: "inherit" });
  } catch {
    console.error("[record-vanilla-ids] bedrock-samples not available; run npm run fetch-schemas first");
    process.exit(1);
  }
}
const sounds = new Set(Object.keys(readJson(soundDefs).sound_definitions));
const particles = new Set();
for (const f of fs.readdirSync(particleDir)) {
  const text = fs.readFileSync(path.join(particleDir, f), "utf8").replace(/^\s*\/\/.*$/gm, "");
  try {
    particles.add(JSON.parse(text).particle_effect.description.identifier);
  } catch {
    /* non-particle file */
  }
}
const version = readJson(path.join(samples, "version.json")).latest.version;
const config = readJson(path.join(ROOT, "data", "config.json"));
const usedSounds = [...new Set(Object.values(config.sounds).map((s) => s.id))].sort();
const usedParticles = [...new Set(Object.values(config.particles))].sort();
const missing = [...usedSounds.filter((s) => !sounds.has(s)).map((s) => `sound ${s}`), ...usedParticles.filter((p) => !particles.has(p)).map((p) => `particle ${p}`)];
if (missing.length) {
  console.error("[record-vanilla-ids] not found in vanilla:", missing.join(", "));
  process.exit(1);
}
writeJson(path.join(ROOT, "tools", "vanilla-ids.json"), { source: `Mojang/bedrock-samples ${version}`, sounds: usedSounds, particles: usedParticles });
console.log(`[record-vanilla-ids] recorded ${usedSounds.length} sounds and ${usedParticles.length} particles (bedrock-samples ${version})`);
