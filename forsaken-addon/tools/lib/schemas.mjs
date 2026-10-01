// Optional validation against Mojang's official JSON schemas (Mojang/bedrock-samples, metadata/json_schemas).
// The schemas are "(c) Mojang AB. All rights reserved", so they are not committed; `npm run fetch-schemas`
// downloads them into .cache/bedrock-samples. When absent, these checks are skipped with a notice.
import fs from "node:fs";
import path from "node:path";
import { ROOT, walk as walkAll } from "./fsutil.mjs";

const SCHEMA_ROOT = path.join(ROOT, ".cache", "bedrock-samples", "metadata", "json_schemas");
const DOCS = {
  entity: { id: "/server/entity/1.26.50/ActorDocument.json", components: "/server/entity/1.26.50/Entity%20component%20definitions.json", key: "minecraft:entity", format: "1.26.50" },
  item: { id: "/server/item/1.26.30/ItemDocument.json", components: "/server/item/1.26.30/Item%20Components.json", key: "minecraft:item", format: "1.26.30" },
  block: { id: "/server/block/1.26.20/Blocks.json", components: "/server/block/1.26.20/Components.json", key: "minecraft:block", format: "1.26.20" },
};

export function runSchemaChecks({ BP, loadJson, walk, rel }) {
  const out = { ran: false, checked: 0, errors: [], warnings: [] };
  if (!fs.existsSync(SCHEMA_ROOT)) return out;
  let Ajv;
  try {
    Ajv = requireAjv();
  } catch {
    out.warnings.push("ajv not installed; skipping official schema checks");
    return out;
  }
  const ajv = new Ajv({ strict: false, allErrors: true, validateSchema: false });
  for (const f of walkAll(SCHEMA_ROOT).filter((f) => f.endsWith(".json"))) {
    try {
      ajv.addSchema(JSON.parse(fs.readFileSync(f, "utf8")));
    } catch (e) {
      out.warnings.push(`schema ${f}: ${e.message}`);
    }
  }
  out.ran = true;
  const kinds = [
    ["entity", path.join(BP, "entities")],
    ["item", path.join(BP, "items")],
    ["block", path.join(BP, "blocks")],
  ];
  for (const [kind, dir] of kinds) {
    const d = DOCS[kind];
    const validate = ajv.getSchema(d.id);
    const compSchema = resolveRef(ajv, d.components);
    const known = new Set(Object.keys(compSchema?.properties ?? {}));
    for (const f of walk(dir).filter((f) => f.endsWith(".json"))) {
      const j = loadJson(f);
      if (!j) continue;
      out.checked++;
      if (j.format_version !== d.format) out.errors.push(`${rel(f)}: format_version ${j.format_version} (expected ${d.format} to match the schema set)`);
      const doc = j[d.key];
      if (!validate(doc)) {
        for (const e of validate.errors.slice(0, 8)) out.errors.push(`${rel(f)}: schema ${e.instancePath || "/"} ${e.message}`);
      }
      const groups = [doc?.components ?? {}, ...Object.values(doc?.component_groups ?? {}), ...(doc?.permutations ?? []).map((p) => p.components ?? {})];
      for (const g of groups) {
        for (const name of Object.keys(g)) {
          if (name.startsWith("minecraft:") && known.size && !known.has(name)) out.errors.push(`${rel(f)}: unknown component ${name} for ${kind} format ${d.format}`);
        }
      }
    }
  }
  return out;
}

function resolveRef(ajv, id) {
  const s = ajv.getSchema(id) ?? ajv.getSchema(decodeURIComponent(id));
  return s?.schema;
}

function requireAjv() {
  const p = path.join(ROOT, "node_modules", "ajv", "dist", "ajv.js");
  if (!fs.existsSync(p)) throw new Error("ajv missing");
  // ajv ships CommonJS; load it through createRequire.
  return globalThis.__ajv ?? (globalThis.__ajv = loadCjs(p));
}

import { createRequire } from "node:module";
function loadCjs(p) {
  const req = createRequire(import.meta.url);
  const m = req(p);
  return m.default ?? m;
}
