// Writes both pack manifests from tools/uuids.json (UUIDs are fixed forever so worlds keep their pack references).
import path from "node:path";
import { ROOT, BP, RP, readJson, writeJson } from "./lib/fsutil.mjs";

export const VERSIONS = {
  packVersion: [1, 0, 0],
  minEngine: [1, 26, 50],
  server: "2.10.0",
  serverUi: "2.2.0",
};

const DISCLAIMER = "Unofficial fan project. Not affiliated with or endorsed by the FORSAKEN developers or Roblox.";

export function generateManifests() {
  const u = readJson(path.join(ROOT, "tools", "uuids.json"));
  writeJson(path.join(BP, "manifest.json"), {
    format_version: 2,
    header: {
      name: "FORSAKEN: Bedrock Edition (Behavior)",
      description: `Asymmetric horror match: 1 killer vs 8 survivors. ${DISCLAIMER}`,
      uuid: u.bp_header,
      version: VERSIONS.packVersion,
      min_engine_version: VERSIONS.minEngine,
    },
    modules: [
      { description: "Forsaken data", type: "data", uuid: u.bp_data, version: VERSIONS.packVersion },
      {
        description: "Forsaken game logic",
        type: "script",
        language: "javascript",
        uuid: u.bp_script,
        version: VERSIONS.packVersion,
        entry: "scripts/main.js",
      },
    ],
    dependencies: [
      { uuid: u.rp_header, version: VERSIONS.packVersion },
      { module_name: "@minecraft/server", version: VERSIONS.server },
      { module_name: "@minecraft/server-ui", version: VERSIONS.serverUi },
    ],
    metadata: { authors: ["FORSAKEN Bedrock fan project"], license: "MIT", product_type: "addon" },
  });
  writeJson(path.join(RP, "manifest.json"), {
    format_version: 2,
    header: {
      name: "FORSAKEN: Bedrock Edition (Resources)",
      description: `Skins, icons and visuals for FORSAKEN: Bedrock Edition. ${DISCLAIMER}`,
      uuid: u.rp_header,
      version: VERSIONS.packVersion,
      min_engine_version: VERSIONS.minEngine,
    },
    modules: [{ description: "Forsaken resources", type: "resources", uuid: u.rp_resources, version: VERSIONS.packVersion }],
    dependencies: [{ uuid: u.bp_header, version: VERSIONS.packVersion }],
    metadata: { authors: ["FORSAKEN Bedrock fan project"], license: "MIT", product_type: "addon" },
  });
}
