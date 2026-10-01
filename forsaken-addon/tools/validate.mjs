// npm run validate — static checks over the generated packs, data and sources.
// Exit code 1 on any error. Every check is listed in README.md ("Validation").
import fs from "node:fs";
import path from "node:path";
import { ROOT, BP, RP, walk, rel, readJson } from "./lib/fsutil.mjs";
import { listZip, readZipEntry } from "./lib/zip.mjs";
import { readPngSize } from "./lib/png.mjs";
import { runSchemaChecks } from "./lib/schemas.mjs";

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

// ---------------------------------------------------------------- 1. JSON parses
const jsonCache = new Map();
function loadJson(file) {
  if (jsonCache.has(file)) return jsonCache.get(file);
  let v;
  try {
    v = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    err(`${rel(file)}: invalid JSON (${e.message})`);
    v = undefined;
  }
  jsonCache.set(file, v);
  return v;
}
const jsonFiles = [...walk(BP), ...walk(RP), ...walk(path.join(ROOT, "data"))].filter((f) => f.endsWith(".json"));
for (const f of jsonFiles) loadJson(f);

// ---------------------------------------------------------------- 2. manifests
const pkg = readJson(path.join(ROOT, "package.json"));
const bpm = loadJson(path.join(BP, "manifest.json"));
const rpm = loadJson(path.join(RP, "manifest.json"));
const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function checkManifest(m, name) {
  if (!m) return err(`${name}: manifest missing`);
  if (m.format_version !== 2) err(`${name}: format_version must be 2`);
  const h = m.header ?? {};
  for (const k of ["name", "description", "uuid", "version", "min_engine_version"]) if (h[k] === undefined) err(`${name}: header.${k} missing`);
  if (!uuidRe.test(h.uuid ?? "")) err(`${name}: header.uuid malformed`);
  if (!Array.isArray(h.version) || h.version.length !== 3) err(`${name}: header.version must be [a,b,c]`);
  if (!Array.isArray(h.min_engine_version) || h.min_engine_version.length !== 3) err(`${name}: min_engine_version must be [a,b,c]`);
  if (!/not affiliated/i.test(h.description ?? "")) err(`${name}: description must carry the fan-project disclaimer`);
  for (const mod of m.modules ?? []) {
    if (!uuidRe.test(mod.uuid ?? "")) err(`${name}: module uuid malformed`);
    if (!["data", "resources", "script"].includes(mod.type)) err(`${name}: unexpected module type ${mod.type}`);
  }
}
checkManifest(bpm, "BP manifest");
checkManifest(rpm, "RP manifest");
if (bpm && rpm) {
  const all = [bpm.header.uuid, ...bpm.modules.map((m) => m.uuid), rpm.header.uuid, ...rpm.modules.map((m) => m.uuid)];
  if (new Set(all).size !== all.length) err("manifests: UUIDs are not unique");
  const bpDeps = bpm.dependencies ?? [];
  const rpDeps = rpm.dependencies ?? [];
  if (!bpDeps.some((d) => d.uuid === rpm.header.uuid)) err("BP manifest must depend on the RP uuid");
  if (!rpDeps.some((d) => d.uuid === bpm.header.uuid)) err("RP manifest must depend on the BP uuid");
  const script = bpm.modules.find((m) => m.type === "script");
  if (!script) err("BP manifest: no script module");
  else {
    if (script.language !== "javascript") err("BP script module language must be javascript");
    if (!fs.existsSync(path.join(BP, script.entry ?? ""))) err(`BP script entry ${script.entry} does not exist (run npm run build)`);
  }
  for (const [mod, ver] of [["@minecraft/server", pkg.dependencies["@minecraft/server"]], ["@minecraft/server-ui", pkg.dependencies["@minecraft/server-ui"]]]) {
    const d = bpDeps.find((x) => x.module_name === mod);
    if (!d) err(`BP manifest: missing dependency ${mod}`);
    else if (d.version !== ver) err(`BP manifest: ${mod} ${d.version} != package.json ${ver}`);
  }
}

// ---------------------------------------------------------------- 3. resource references
const itemTextures = loadJson(path.join(RP, "textures", "item_texture.json"))?.texture_data ?? {};
const terrainTextures = loadJson(path.join(RP, "textures", "terrain_texture.json"))?.texture_data ?? {};
function texFileExists(p) {
  return fs.existsSync(path.join(RP, p + ".png")) || fs.existsSync(path.join(RP, p + ".tga"));
}
for (const [key, v] of Object.entries(itemTextures)) {
  const t = typeof v.textures === "string" ? [v.textures] : v.textures;
  for (const p of t ?? []) if (!texFileExists(p)) err(`item_texture.json ${key}: missing file ${p}.png`);
}
for (const [key, v] of Object.entries(terrainTextures)) {
  const t = typeof v.textures === "string" ? [v.textures] : v.textures;
  for (const p of t ?? []) if (!texFileExists(typeof p === "string" ? p : p.path)) err(`terrain_texture.json ${key}: missing file`);
}

// Lang
const langFile = path.join(RP, "texts", "en_US.lang");
const lang = new Map();
if (!fs.existsSync(langFile)) err("RP texts/en_US.lang missing");
else {
  for (const line of fs.readFileSync(langFile, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("##")) continue;
    const i = line.indexOf("=");
    if (i < 0) err(`en_US.lang: malformed line "${line}"`);
    else lang.set(line.slice(0, i), line.slice(i + 1));
  }
  const langs = loadJson(path.join(RP, "texts", "languages.json"));
  if (!Array.isArray(langs) || !langs.includes("en_US")) err("RP texts/languages.json must list en_US");
}
function needLang(key, where) {
  if (!lang.has(key)) err(`${where}: no en_US.lang entry "${key}"`);
}

// Items
const bpItemIds = new Set();
for (const f of walk(path.join(BP, "items")).filter((f) => f.endsWith(".json"))) {
  const j = loadJson(f);
  const it = j?.["minecraft:item"];
  if (!it) {
    err(`${rel(f)}: not a minecraft:item`);
    continue;
  }
  const id = it.description?.identifier;
  if (!id?.startsWith("forsaken:")) err(`${rel(f)}: identifier must use the forsaken: namespace`);
  if (bpItemIds.has(id)) err(`${rel(f)}: duplicate item ${id}`);
  bpItemIds.add(id);
  const c = it.components ?? {};
  const icon = c["minecraft:icon"];
  const iconKey = typeof icon === "string" ? icon : icon?.textures?.default;
  if (!iconKey) err(`${rel(f)}: missing minecraft:icon`);
  else if (!itemTextures[iconKey]) err(`${rel(f)}: icon "${iconKey}" not in item_texture.json`);
  const dn = c["minecraft:display_name"]?.value;
  if (!dn) err(`${rel(f)}: missing minecraft:display_name`);
  else needLang(dn, rel(f));
  const cd = c["minecraft:cooldown"];
  if (cd && (typeof cd.category !== "string" || typeof cd.duration !== "number")) err(`${rel(f)}: bad minecraft:cooldown`);
}

// Blocks
const bpBlockIds = new Set();
for (const f of walk(path.join(BP, "blocks")).filter((f) => f.endsWith(".json"))) {
  const j = loadJson(f);
  const b = j?.["minecraft:block"];
  if (!b) {
    err(`${rel(f)}: not a minecraft:block`);
    continue;
  }
  const id = b.description?.identifier;
  bpBlockIds.add(id);
  const c = b.components ?? {};
  for (const [face, mi] of Object.entries(c["minecraft:material_instances"] ?? {})) {
    if (!terrainTextures[mi.texture]) err(`${rel(f)}: material_instances.${face}.texture "${mi.texture}" not in terrain_texture.json`);
  }
  const dn = c["minecraft:display_name"];
  if (!dn) err(`${rel(f)}: missing minecraft:display_name`);
  else needLang(dn, rel(f));
}

// Entities: BP <-> RP identifiers, client entity references
const bpEntityIds = new Set();
for (const f of walk(path.join(BP, "entities")).filter((f) => f.endsWith(".json"))) {
  const id = loadJson(f)?.["minecraft:entity"]?.description?.identifier;
  if (!id) err(`${rel(f)}: missing minecraft:entity.description.identifier`);
  else bpEntityIds.add(id);
}
const geometries = new Set();
for (const f of walk(path.join(RP, "models")).filter((f) => f.endsWith(".json"))) {
  for (const g of loadJson(f)?.["minecraft:geometry"] ?? []) geometries.add(g.description?.identifier);
}
const animations = new Set();
for (const f of walk(path.join(RP, "animations")).filter((f) => f.endsWith(".json"))) {
  for (const k of Object.keys(loadJson(f)?.animations ?? {})) animations.add(k);
}
for (const f of walk(path.join(RP, "animation_controllers")).filter((f) => f.endsWith(".json"))) {
  for (const k of Object.keys(loadJson(f)?.animation_controllers ?? {})) animations.add(k);
}
const renderControllers = new Set();
for (const f of walk(path.join(RP, "render_controllers")).filter((f) => f.endsWith(".json"))) {
  for (const k of Object.keys(loadJson(f)?.render_controllers ?? {})) renderControllers.add(k);
}
const KNOWN_MATERIALS = new Set(["entity", "entity_alphatest", "entity_alphablend", "entity_emissive", "entity_emissive_alpha", "entity_nocull"]);
const rpEntityIds = new Set();
for (const f of walk(path.join(RP, "entity")).filter((f) => f.endsWith(".json"))) {
  const d = loadJson(f)?.["minecraft:client_entity"]?.description;
  if (!d) {
    err(`${rel(f)}: not a client entity`);
    continue;
  }
  rpEntityIds.add(d.identifier);
  for (const [k, p] of Object.entries(d.textures ?? {})) if (!texFileExists(p)) err(`${rel(f)}: texture ${k} -> ${p}.png missing`);
  for (const [k, g] of Object.entries(d.geometry ?? {})) if (!geometries.has(g)) err(`${rel(f)}: geometry ${k} -> ${g} not defined in RP models`);
  for (const [k, a] of Object.entries(d.animations ?? {})) if (!animations.has(a)) err(`${rel(f)}: animation ${k} -> ${a} not defined`);
  for (const rc of d.render_controllers ?? []) {
    const name = typeof rc === "string" ? rc : Object.keys(rc)[0];
    if (!renderControllers.has(name)) err(`${rel(f)}: render controller ${name} not defined`);
  }
  for (const m of Object.values(d.materials ?? {})) if (!KNOWN_MATERIALS.has(m)) err(`${rel(f)}: unknown material ${m}`);
  needLang(`entity.${d.identifier}.name`, rel(f));
}
for (const id of bpEntityIds) if (!rpEntityIds.has(id)) err(`entity ${id}: no client entity in RP`);
for (const id of rpEntityIds) if (!bpEntityIds.has(id)) err(`client entity ${id}: no behavior entity in BP`);

// Render controllers: every Array.* texture reference resolves to a declared texture short name.
for (const f of walk(path.join(RP, "render_controllers")).filter((f) => f.endsWith(".json"))) {
  for (const [name, rc] of Object.entries(loadJson(f)?.render_controllers ?? {})) {
    for (const arr of Object.values(rc.arrays?.textures ?? {})) {
      for (const t of arr) if (!/^Texture\.[a-z0-9_]+$/.test(t)) err(`${rel(f)} ${name}: bad texture array entry ${t}`);
    }
  }
}

// Fogs
for (const f of walk(path.join(RP, "fogs")).filter((f) => f.endsWith(".json"))) {
  const id = loadJson(f)?.["minecraft:fog_settings"]?.description?.identifier;
  if (!id) err(`${rel(f)}: missing minecraft:fog_settings.description.identifier`);
}

// Sounds / particles used by scripts must be vanilla ids recorded in tools/vanilla-ids.json
const vanilla = fs.existsSync(path.join(ROOT, "tools", "vanilla-ids.json")) ? readJson(path.join(ROOT, "tools", "vanilla-ids.json")) : { sounds: [], particles: [] };
const config = loadJson(path.join(ROOT, "data", "config.json"));
if (config) {
  for (const [k, s] of Object.entries(config.sounds ?? {})) if (!vanilla.sounds.includes(s.id)) err(`config.sounds.${k}: "${s.id}" is not a recorded vanilla sound id`);
  for (const [k, p] of Object.entries(config.particles ?? {})) if (!vanilla.particles.includes(p)) err(`config.particles.${k}: "${p}" is not a recorded vanilla particle id`);
  if (config.fog) {
    const fogIds = walk(path.join(RP, "fogs")).map((f) => loadJson(f)?.["minecraft:fog_settings"]?.description?.identifier);
    for (const [k, id] of Object.entries(config.fog)) if (!fogIds.includes(id)) err(`config.fog.${k}: fog ${id} not defined in RP/fogs`);
  }
}

// Skin / icon overrides must be PNG with the right size
for (const [dir, w, h] of [["assets/skin_overrides", 64, 64], ["assets/icon_overrides", 16, 16]]) {
  for (const f of walk(path.join(ROOT, dir)).filter((f) => f.endsWith(".png"))) {
    try {
      const s = readPngSize(fs.readFileSync(f));
      if (s.width !== w || s.height !== h) err(`${rel(f)}: must be ${w}x${h} (is ${s.width}x${s.height})`);
    } catch (e) {
      err(`${rel(f)}: ${e.message}`);
    }
  }
}

// ---------------------------------------------------------------- 4. source rules
const srcFiles = walk(path.join(ROOT, "src")).filter((f) => f.endsWith(".ts"));
for (const f of srcFiles) {
  const t = fs.readFileSync(f, "utf8");
  const isMc = f.endsWith(".mc.ts") || path.basename(f) === "main.ts";
  if (!isMc && /from\s+["']@minecraft\//.test(t)) err(`${rel(f)}: imports @minecraft/* but is not a *.mc.ts file`);
}
for (const f of walk(path.join(ROOT, "tests")).filter((f) => f.endsWith(".ts"))) {
  const t = fs.readFileSync(f, "utf8");
  if (/\.mc(\.ts)?["']/.test(t)) err(`${rel(f)}: tests must not import *.mc.ts modules`);
  if (/from\s+["']@minecraft\//.test(t)) err(`${rel(f)}: tests must not import @minecraft/*`);
}

// ---------------------------------------------------------------- 5. no TODO/FIXME in shipped files
const marker = new RegExp(["TO", "DO|FIX", "ME"].join(""));
for (const f of [...walk(BP), ...walk(RP), ...srcFiles, ...walk(path.join(ROOT, "data"))]) {
  if (/\.(png|tga)$/.test(f)) continue;
  const t = fs.readFileSync(f, "utf8");
  if (marker.test(t)) err(`${rel(f)}: contains a ${["TO", "DO"].join("")}/${["FIX", "ME"].join("")} marker`);
}

// ---------------------------------------------------------------- 6. the built .mcaddon
const addon = path.join(ROOT, "dist", "Forsaken.mcaddon");
if (!fs.existsSync(addon)) err("dist/Forsaken.mcaddon missing (run npm run build)");
else {
  const buf = fs.readFileSync(addon);
  const entries = listZip(buf);
  const names = new Set(entries.map((e) => e.name));
  for (const need of ["Forsaken_BP/manifest.json", "Forsaken_RP/manifest.json", "Forsaken_BP/scripts/main.js"]) if (!names.has(need)) err(`Forsaken.mcaddon: missing ${need}`);
  for (const e of entries) {
    if (!e.name.startsWith("Forsaken_BP/") && !e.name.startsWith("Forsaken_RP/")) err(`Forsaken.mcaddon: unexpected top-level entry ${e.name}`);
  }
  for (const [zipName, local] of [["Forsaken_BP/manifest.json", path.join(BP, "manifest.json")], ["Forsaken_RP/manifest.json", path.join(RP, "manifest.json")]]) {
    const e = entries.find((x) => x.name === zipName);
    if (e && readZipEntry(buf, e).toString("utf8") !== fs.readFileSync(local, "utf8")) err(`Forsaken.mcaddon: ${zipName} is stale (rebuild)`);
  }
}

// ---------------------------------------------------------------- 7. official JSON schemas (optional)
const schemaResult = runSchemaChecks({ BP, loadJson, walk, rel });
for (const e of schemaResult.errors) err(e);
for (const w of schemaResult.warnings) warn(w);

// ---------------------------------------------------------------- report
for (const w of warnings) console.warn(`[validate] warning: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`[validate] ERROR: ${e}`);
  console.error(`[validate] ${errors.length} error(s)`);
  process.exit(1);
}
console.log(`[validate] OK (${jsonFiles.length} JSON files, ${bpItemIds.size} items, ${bpBlockIds.size} blocks, ${bpEntityIds.size} entities, ${lang.size} lang keys${schemaResult.ran ? `, ${schemaResult.checked} files schema-checked` : ", official schemas not present: run npm run fetch-schemas"})`);
