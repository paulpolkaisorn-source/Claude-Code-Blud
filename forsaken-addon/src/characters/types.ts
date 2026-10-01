// Shapes of data/killers.json and data/survivors.json.

export type Team = "killer" | "survivor";
export type Role = "killer" | "survivalist" | "sentinel" | "support";
export type InputKind = "tap" | "charge" | "toggle";

export interface CharacterStats {
  hp: number;
  walk: number;
  sprint: number;
  stamina: number;
  staminaDrain: number;
  staminaRegen: number;
  /** Studs; killers only. */
  terrorRadius?: number;
  limps: boolean;
}

export interface PassiveDef {
  id: string;
  name: string;
  description: string;
  params: Record<string, unknown>;
}

export interface AbilityDef {
  id: string;
  name: string;
  /** Hotbar slot 1-5 (slot 1 = main attack). */
  slot: number;
  input: InputKind;
  /** Seconds, or null when the ability has no cooldown (then cooldownNote explains). */
  cooldown: number | null;
  cooldownNote?: string;
  /** Seconds of cooldown already running when the round starts. */
  startCooldown?: number;
  description: string;
  params: Record<string, unknown>;
}

export interface BotProfileDef {
  /** 0..1, how eagerly the bot engages / uses offensive abilities. */
  aggression: number;
  notes: string;
}

export interface CharacterDef {
  id: string;
  name: string;
  team: Team;
  role: Role;
  /** Optional second role shown in the menu (e.g. Jane Doe Sentinel/Support). */
  altRole?: Role;
  playstyle: string;
  summary: string;
  difficulty: number;
  stats: CharacterStats;
  passives: PassiveDef[];
  abilities: AbilityDef[];
  bot: BotProfileDef;
  /** Index used for the entity property forsaken:character (skin). */
  skinIndex: number;
  /** "wiki" | "original" (Daemon). */
  origin: "wiki" | "original";
  /** Dot paths (e.g. "abilities.void_rush.cooldown") of values with no source. */
  assumed: string[];
  /** Dot paths of values the wiki marks as player-observed ("Undocumented"). */
  undocumented: string[];
  /** Differences between the brief's §4 and the wiki, one sentence each. */
  changes: string[];
}

export interface RosterFile {
  _about: string;
  characters: CharacterDef[];
}
