// Writes docs/CHARACTERS.md from data/*.json so the document never drifts from the data the game uses.
// Run by `npm run generate` (and therefore `npm run build`).
import fs from "node:fs";
import path from "node:path";
import { ROOT, readJson } from "./lib/fsutil.mjs";

const killers = readJson(path.join(ROOT, "data/killers.json"));
const survivors = readJson(path.join(ROOT, "data/survivors.json"));
const config = readJson(path.join(ROOT, "data/config.json"));
const statuses = readJson(path.join(ROOT, "data/statuses.json"));
const all = [...killers.characters, ...survivors.characters];

/** Same rules as resolvePath() in src/characters/roster.ts. */
function resolve(c, p) {
  const [head, ...rest] = p.split(".");
  if (head === "abilities" || head === "passives") {
    const item = (head === "abilities" ? c.abilities : c.passives).find((x) => x.id === rest[0]);
    if (!item) return undefined;
    if (rest.length === 1) return "(whole entry)";
    if (rest[1] === "cooldown" || rest[1] === "startCooldown") return item[rest[1]];
    return item.params?.[rest[1]];
  }
  let cur = c;
  for (const k of [head, ...rest]) cur = cur?.[k];
  return cur;
}

const fmt = (v) => (v === undefined ? "?" : v === null ? "none" : Array.isArray(v) ? `[${v.join(", ")}]` : typeof v === "object" ? JSON.stringify(v) : String(v));
const cd = (a) => (a.cooldown === null ? (a.cooldownNote ?? "none") : `${a.cooldown} s`);
const esc = (s) => String(s).replace(/\|/g, "\\|");
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const roleOf = (c) => (c.team === "killer" ? "Killer" : `${cap(c.role)}${c.altRole ? ` / ${cap(c.altRole)}` : ""}`);

const out = [];
out.push("# Characters");
out.push("");
out.push("_Generated from `data/killers.json` and `data/survivors.json` by `tools/gen-characters-doc.mjs`; edit the data, not this file._");
out.push("");
out.push("Unofficial fan project. Not affiliated with or endorsed by the FORSAKEN developers or Roblox.");
out.push("");
out.push("## Sources and conventions");
out.push("");
out.push("- Values come from the FORSAKEN wiki (forsaken2024.fandom.com), character pages and the Status Effects page, read on 2026-10-01 through the public MediaWiki API (the HTML pages answer 403 to automated clients).");
out.push("- Where the wiki differs from the task brief, the wiki wins (DECISIONS.md D20). Each difference is listed under **Changes from the brief** for that character.");
out.push("- **[assumed]**: no FORSAKEN source; chosen by us and tunable in the data files. **[undocumented]**: the wiki marks the value as player-observed rather than official.");
out.push("- Units: distances in studs × 0.36 = blocks; speeds in studs/s relative to the survivor sprint of 26 studs/s (= vanilla sprint, 5.612 blocks/s); seconds, HP, damage and stamina 1:1 (DECISIONS.md D21, D22).");
out.push("- Daemon is an original killer designed for this addon (no FORSAKEN source).");
out.push("");
out.push("## Roster");
out.push("");
out.push("| Character | Team / role | HP | Walk / sprint (studs/s) | Stamina | Terror radius | [assumed] | [undocumented] |");
out.push("|---|---|---|---|---|---|---|---|");
for (const c of all) {
  const s = c.stats;
  out.push(`| ${c.name}${c.origin === "original" ? " (original)" : ""} | ${roleOf(c)} | ${s.hp} | ${s.walk} / ${s.sprint} | ${s.stamina} (−${s.staminaDrain}/s, +${s.staminaRegen}/s) | ${s.terrorRadius ?? "—"} | ${c.assumed?.length ?? 0} | ${c.undocumented?.length ?? 0} |`);
}
out.push("");
out.push("## Global switches (data/config.json)");
out.push("");
out.push(`- \`oneXOneHpOverride\` = ${fmt(config.oneXOneHpOverride)}: the wiki gives 1x1x1x1 ${killers.characters.find((c) => c.id === "1x1x1x1")?.stats.hp} HP; set a number (the brief's fallback was 2500) to override it.`);
out.push(`- \`twoTimeVariant\` = "${config.twoTimeVariant}": "oblation" is Two Time's current wiki kit (Oblation / Ritual / Pray); "undying_devotion" switches to the oldest kit (one passive revive, no usable abilities).`);
out.push(`- Match, combat, stamina and status tuning without a FORSAKEN source (all [assumed]): ${config.assumed.map((p) => `\`${p}\``).join(", ")}.`);
out.push(`- Status effects: ${statuses.statuses.length} definitions from the wiki's Status Effects page; ${statuses.statuses.filter((s) => s.source !== "wiki").map((s) => `\`${s.id}\``).join(", ")} is original (Daemon).`);
out.push("");

for (const [title, list] of [
  ["Killers", killers.characters],
  ["Survivors", survivors.characters],
]) {
  out.push(`## ${title}`);
  out.push("");
  for (const c of list) {
    const s = c.stats;
    out.push(`### ${c.name}`);
    out.push("");
    out.push(`${c.summary}${c.origin === "original" ? " **Original character for this addon.**" : ""}`);
    out.push("");
    out.push(`- ${roleOf(c)} · ${c.playstyle} · difficulty ${c.difficulty}/5`);
    out.push(`- HP ${s.hp} · walk ${s.walk} · sprint ${s.sprint} · stamina ${s.stamina} (−${s.staminaDrain}/s, +${s.staminaRegen}/s)${s.terrorRadius !== undefined ? ` · terror radius ${s.terrorRadius} studs` : ""}${s.limps ? " · limps when hurt" : ""}`);
    out.push("");
    if (c.passives.length) {
      out.push("**Passives**");
      out.push("");
      for (const p of c.passives) out.push(`- **${p.name}**: ${p.description}`);
      out.push("");
    }
    out.push("**Abilities** (hotbar slot = FORSAKEN key order; slot 1 is the killer basic attack)");
    out.push("");
    out.push("| Slot | Ability | Input | Cooldown | What it does |");
    out.push("|---|---|---|---|---|");
    for (const a of c.abilities) out.push(`| ${a.slot} | ${esc(a.name)} | ${a.input} | ${esc(cd(a))} | ${esc(a.description)} |`);
    out.push("");
    if (c.changes?.length) {
      out.push("**Changes from the brief (wiki wins)**");
      out.push("");
      for (const ch of c.changes) out.push(`- ${ch}`);
      out.push("");
    }
    if (c.assumed?.length) {
      out.push("**[assumed] values**: " + c.assumed.map((p) => `\`${p}\` = ${fmt(resolve(c, p))}`).join("; "));
      out.push("");
    }
    if (c.undocumented?.length) {
      out.push("**[undocumented] values** (player-observed on the wiki): " + c.undocumented.map((p) => `\`${p}\` = ${fmt(resolve(c, p))}`).join("; "));
      out.push("");
    }
    if (c.bot?.notes) {
      out.push(`**Bot behaviour**: ${c.bot.notes}`);
      out.push("");
    }
  }
}

const file = path.join(ROOT, "docs/CHARACTERS.md");
const text = out.join("\n");
if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== text) {
  fs.writeFileSync(file, text);
  console.log("[gen-characters-doc] wrote docs/CHARACTERS.md");
}
