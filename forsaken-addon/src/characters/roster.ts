// Loads and validates data/killers.json + data/survivors.json, and defines minion pseudo-characters.
import killersRaw from "../../data/killers.json";
import survivorsRaw from "../../data/survivors.json";
import type { CharacterDef, RosterFile } from "./types";

export const KILLERS: readonly CharacterDef[] = (killersRaw as unknown as RosterFile).characters;
export const SURVIVORS: readonly CharacterDef[] = (survivorsRaw as unknown as RosterFile).characters;
export const CHARACTERS: readonly CharacterDef[] = [...KILLERS, ...SURVIVORS];

const BY_ID = new Map(CHARACTERS.map((c) => [c.id, c]));

export function character(id: string): CharacterDef {
  const c = BY_ID.get(id) ?? MINIONS.get(id);
  if (!c) throw new Error(`unknown character ${id}`);
  return c;
}

export function hasCharacter(id: string): boolean {
  return BY_ID.has(id);
}

/** Skin indices used by minions (property forsaken:character on forsaken:bot). */
export const MINION_SKINS = { pizzaBot: 20, zombie: 21 } as const;
export const SKIN_COUNT = 22;

function minion(id: string, name: string, team: "killer" | "survivor", skinIndex: number, walk: number, sprint: number): CharacterDef {
  return {
    id,
    name,
    team,
    role: team === "killer" ? "killer" : "survivalist",
    playstyle: "minion",
    summary: name,
    difficulty: 1,
    stats: { hp: 20, walk, sprint, stamina: 1e9, staminaDrain: 0, staminaRegen: 0, limps: false },
    passives: [],
    abilities: [],
    bot: { aggression: 1, notes: "minion" },
    skinIndex,
    origin: "wiki",
    assumed: [],
    undocumented: [],
    changes: [],
  };
}

/** Pseudo-characters for minions (speeds in studs/s). */
export const MINIONS: ReadonlyMap<string, CharacterDef> = new Map([
  ["minion_pizza_bot", minion("minion_pizza_bot", "Pizza Delivery Bot", "killer", MINION_SKINS.pizzaBot, 14, 19.5)],
  ["minion_zombie", minion("minion_zombie", "Rotten Zombie", "killer", MINION_SKINS.zombie, 14, 14)],
  ["minion_mirage", minion("minion_mirage", "Noli", "killer", 4, 22, 22)],
  ["minion_decoy", minion("minion_decoy", "Daemon", "killer", 7, 27.5, 27.5)],
  ["minion_clone", minion("minion_clone", "007n7", "survivor", 9, 26, 26)],
]);

export interface RosterIssue {
  character: string;
  problem: string;
}

/** Structural checks used by tests and by `npm run validate`. */
export function validateRoster(): RosterIssue[] {
  const out: RosterIssue[] = [];
  const skins = new Set<number>();
  for (const c of CHARACTERS) {
    const bad = (problem: string) => out.push({ character: c.id, problem });
    if (!/^[a-z0-9_]+$/.test(c.id)) bad("id must be lowercase snake_case");
    if (skins.has(c.skinIndex)) bad(`duplicate skinIndex ${c.skinIndex}`);
    skins.add(c.skinIndex);
    if (c.skinIndex < 0 || c.skinIndex >= SKIN_COUNT) bad("skinIndex out of range");
    if (c.stats.hp <= 0 || c.stats.sprint <= 0 || c.stats.walk <= 0) bad("stats must be positive");
    if (c.team === "killer" && c.stats.terrorRadius === undefined) bad("killer without terrorRadius");
    const slots = new Set<number>();
    for (const a of c.abilities) {
      if (!a.name) bad(`ability ${a.id} has no name`);
      if (a.slot < 1 || a.slot > 5) bad(`ability ${a.id} slot ${a.slot} outside 1-5`);
      if (c.team === "survivor" && a.slot === 1) bad(`survivor ability ${a.id} in slot 1 (reserved for killer basic attacks)`);
      if (slots.has(a.slot)) bad(`duplicate slot ${a.slot}`);
      slots.add(a.slot);
      if (a.cooldown === null && !a.cooldownNote) bad(`ability ${a.id} has cooldown null without cooldownNote`);
      if (a.cooldown !== null && (typeof a.cooldown !== "number" || a.cooldown < 0)) bad(`ability ${a.id} cooldown invalid`);
      if (!["tap", "charge", "toggle"].includes(a.input)) bad(`ability ${a.id} input invalid`);
      if (!a.description) bad(`ability ${a.id} has no description`);
    }
    if (c.team === "killer" && !c.abilities.some((a) => a.slot === 1)) bad("killer has no slot-1 basic attack");
    for (const p of [...c.assumed, ...c.undocumented]) {
      if (resolvePath(c, p) === undefined) bad(`flag path ${p} does not resolve`);
    }
  }
  if (KILLERS.length !== 8) out.push({ character: "*", problem: `expected 8 killers, found ${KILLERS.length}` });
  if (SURVIVORS.length !== 12) out.push({ character: "*", problem: `expected 12 survivors, found ${SURVIVORS.length}` });
  return out;
}

/** Resolves "abilities.slash.halfAngle" / "passives.x.y" / "stats.hp" against a character. */
export function resolvePath(c: CharacterDef, path: string): unknown {
  const [head, ...rest] = path.split(".");
  let cur: unknown;
  if (head === "abilities" || head === "passives") {
    const list = head === "abilities" ? c.abilities : c.passives;
    const item = list.find((x) => x.id === rest[0]);
    if (!item) return undefined;
    if (rest.length === 1) return item;
    const key = rest[1];
    if (key === "cooldown" || key === "startCooldown") return (item as unknown as Record<string, unknown>)[key];
    cur = (item.params as Record<string, unknown>)[key];
    return cur;
  }
  cur = c as unknown;
  for (const k of [head, ...rest]) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur;
}

/** Item identifier for an ability (hotbar item). */
export function abilityItemId(characterId: string, abilityId: string): string {
  return `forsaken:ab_${characterId}_${abilityId}`;
}
