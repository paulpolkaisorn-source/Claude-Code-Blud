// Pure text for menus and results (unit-tested).
import type { CharacterDef } from "../characters/types";
import type { ResultRow, Winner } from "../core/game";

export function characterCard(c: CharacterDef): string {
  const s = c.stats;
  const lines: string[] = [];
  if (c.origin === "original") lines.push("§dOriginal character for this addon (not from FORSAKEN).");
  lines.push(`§f${c.summary}`, "");
  lines.push(`§cHP ${s.hp}  §bWalk ${s.walk} / Sprint ${s.sprint}  §aStamina ${s.stamina}${s.terrorRadius !== undefined ? `  §4Terror ${s.terrorRadius}` : ""}`);
  lines.push(`§7Difficulty ${c.difficulty}/5`, "");
  for (const p of c.passives) lines.push(`§6Passive — ${p.name}: §7${p.description}`);
  for (const a of c.abilities) {
    const cd = a.cooldown === null ? a.cooldownNote ?? "no cooldown" : `${a.cooldown}s`;
    lines.push(`§e[${a.slot}] ${a.name} §8(${cd})§7: ${a.description}`);
  }
  if (c.assumed.length) lines.push("", `§8${c.assumed.length} value(s) have no FORSAKEN source and are marked [assumed] in the data.`);
  return lines.join("\n");
}

export function controlsText(): string {
  return [
    "§eHotbar = abilities (FORSAKEN keybinds):",
    "§f Slot 1: killer basic attack — left-click (or use) while holding it",
    "§f Slots 2-5: abilities in order (Q/E/R/T in FORSAKEN) — right-click / use",
    "§f Charge abilities: use once to start, use again to release",
    "§f Slot 6: picked-up Medkit / Bloxy Cola    Slot 9: Forsaken Menu",
    "",
    "§eSurvivors: §fhold SNEAK while looking at a generator (within 3 blocks) to repair it. Moving, getting hit or stunned stops you. Each finished layer takes 3 s off the clock.",
    "§eKiller: §feliminate all eight survivors before the clock reaches 0. Kills add 40 s.",
    "§eStamina: §fshown on the hunger bar. At 0 you cannot sprint for a moment.",
    "§eHealth: §fhearts show your FORSAKEN HP as a fraction; there is no natural regeneration.",
    "§eAuras: §frevealed players get a marker above their head and a ◆ arrow on your HUD.",
    "",
    "§7Commands: /scriptevent forsaken:menu | forsaken:stop | forsaken:give_menu | forsaken:debug",
  ].join("\n");
}

export function resultsBody(winner: Winner, reason: string, rows: ResultRow[], humanId: string | null): string {
  const lines = [`§f${reason}`, ""];
  const sorted = [...rows].sort((a, b) => (a.team === b.team ? Number(b.alive) - Number(a.alive) || b.damageDealt - a.damageDealt : a.team === "killer" ? -1 : 1));
  for (const r of sorted) {
    const you = r.id === humanId ? " §e(you)" : r.isBot ? " §8[BOT]" : "";
    const status = r.team === "killer" ? (r.alive ? "§cKILLER" : "§8KILLED") : r.alive ? "§aALIVE" : "§8ELIMINATED";
    lines.push(`${status} §f${r.character}${you}`);
    if (r.team === "killer") lines.push(`  §7kills ${r.kills}  dmg dealt ${r.damageDealt}  dmg taken ${r.damageTaken}`);
    else lines.push(`  §7gens ${r.generators} (layers ${r.layers})  dmg dealt ${r.damageDealt}  taken ${r.damageTaken}  stuns ${r.stuns}  healing ${r.healing}`);
  }
  void winner;
  return lines.join("\n");
}
