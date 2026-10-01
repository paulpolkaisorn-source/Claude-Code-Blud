import type { AbilityDef, CharacterDef, Role, Team } from "../characters/types";
import { CooldownManager } from "../abilities/cooldowns";
import { StatusSet } from "./statuses";
import type { Vec3 } from "../util/vec";
import type { Hooks } from "./hooks";

/** What the adapter reads from the Minecraft entity every tick. */
export interface BodyState {
  pos: Vec3;
  /** Unit view direction (includes pitch). */
  facing: Vec3;
  yaw: number;
  pitch: number;
  sprintInput: boolean;
  sneaking: boolean;
  /** Horizontal speed in blocks/tick. */
  speed: number;
  onGround: boolean;
  jumping: boolean;
  valid: boolean;
}

/** Commands the game model can give to a body. Implemented by the Minecraft adapter and by test fakes. */
export interface Body {
  readonly kind: "player" | "bot" | "fake";
  read(): BodyState;
  teleport(pos: Vec3, facing?: Vec3): void;
  /** Adds velocity (blocks/tick). For players this becomes knockback. */
  impulse(vel: Vec3): void;
  /** Sets the horizontal velocity for this tick (dashes, bots). */
  drive(velPerTick: Vec3): void;
  setFacing(dir: Vec3): void;
  isValid(): boolean;
}

/** Overheal / shield layer consumed before HP. */
export interface ShieldLayer {
  id: string;
  amount: number;
  max: number;
  /** Fraction of damage reduction applied to damage this layer absorbs (Shatterpoint 0.4). */
  reduction: number;
  /** HP lost per second (Plasma Beam / Slateskin overheal decay); 0 = no decay. */
  decayPerSecond: number;
  /** Absolute tick when the layer disappears (Infinity = never). */
  endTick: number;
  /** Damage over time skips the reduction (Shatterpoint rule). */
  dotSkipsReduction: boolean;
}

/** Movement rule contributed by an ability/passive. */
export interface MoveMod {
  id: string;
  endTick: number;
  /** Multiplies both walk and sprint. */
  mul?: number;
  /** Replaces walk speed (studs/s) before multipliers. */
  walkStuds?: number;
  /** Replaces sprint speed (studs/s) before multipliers. */
  sprintStuds?: number;
  noSprint?: boolean;
  /** Completely immobile (stun-like locks: Gashing Wound endlag, repairing). */
  frozen?: boolean;
  /** Ignore status speed multipliers (Walkspeed Override dash speed is fixed). */
  ignoreStatuses?: boolean;
}

/** A dash / lunge / forced travel driven by the game model every tick. */
export interface ForcedMove {
  id: string;
  dir: Vec3;
  /** Blocks per tick. */
  speed: number;
  endTick: number;
  /** Degrees per tick the direction may turn toward the actor's facing (0 = locked). */
  turnRate: number;
  /** Tick timestamps for hit-once bookkeeping. */
  hit: Set<string>;
  /** Called each tick after moving; return false to stop. */
  onTick?: () => boolean | void;
  /** Called when the next step would enter a wall. */
  onWall?: () => void;
  onEnd?: (reason: "time" | "wall" | "stun" | "cancel") => void;
  /** Stamina regeneration paused while this runs. */
  noStaminaRegen?: boolean;
  stopOnStun: boolean;
}

export interface Channel {
  id: string;
  abilityId: string | null;
  label: string;
  startTick: number;
  endTick: number;
  /** Cancelled by stun. */
  stunCancels: boolean;
  /** Cancelled by HP damage. */
  damageCancels: boolean;
  /** Cancelled when the actor moves (c00lgui). */
  moveCancels: boolean;
  onCancel?: (reason: string) => void;
}

export interface ActorStats {
  damageDealt: number;
  damageTaken: number;
  layersRepaired: number;
  generatorsCompleted: number;
  kills: number;
  healingDone: number;
  stunsLanded: number;
  abilitiesUsed: number;
}

export interface ActorInput {
  /** Generator the player is sneaking at / the bot wants to repair. */
  repairTarget: string | null;
  /** Bots: desired movement direction (unit, horizontal) and whether to sprint. */
  moveDir: Vec3 | null;
  wantSprint: boolean;
  /** Bots: point to look at. */
  lookAt: Vec3 | null;
}

export interface ActorInit {
  id: string;
  displayName: string;
  character: CharacterDef;
  body: Body;
  isBot: boolean;
  isMinion?: boolean;
  ownerId?: string;
  hp?: number;
}

let nextHookId = 1;

export class Actor {
  readonly id: string;
  displayName: string;
  readonly character: CharacterDef;
  readonly team: Team;
  readonly role: Role;
  readonly isBot: boolean;
  readonly isMinion: boolean;
  readonly ownerId: string | null;
  body: Body;

  alive = true;
  eliminatedTick = -1;
  hp: number;
  baseMaxHp: number;
  /** Max-HP reduction from Hemorrhage. */
  maxHpPenalty = 0;
  shields: ShieldLayer[] = [];

  stamina: number;
  staminaMax: number;
  staminaDrain: number;
  staminaRegen: number;
  exhausted = false;
  regenDelayTicks = 0;
  sprintTicks = 0;
  /** Stamina cannot exceed this (Raging Pace); null = no cap. */
  staminaCap: number | null = null;
  staminaFrozen = false;
  /** Whether the actor actually sprinted this tick (after gating). */
  sprinting = false;

  readonly statuses = new StatusSet();
  readonly cooldowns = new CooldownManager();
  /** Per-ability runtime data (charges, modes, timestamps). */
  readonly abilityData: Record<string, Record<string, unknown>> = {};
  /** Numeric resources: blood, battery, oblation, shatterpoint, ... */
  readonly res: Record<string, number> = {};
  /** Generic boolean flags: enraged, bloodHunt, batForm, crouching, blocking, ... */
  readonly flags = new Set<string>();
  hooks: Array<{ id: number; owner: string; endTick: number; hooks: Partial<Hooks> }> = [];
  moveMods: MoveMod[] = [];
  forced: ForcedMove | null = null;
  channel: Channel | null = null;

  stunnedUntil = 0;
  stunImmuneUntil = 0;
  invulnerableUntil = 0;
  /** Higher = picked first by single-target attacks (Guest 1337 = 2, blocking = 3). */
  hitPriority = 1;
  repairing: string | null = null;
  lastDamagedTick = -1000;
  lastHitBy: string | null = null;
  lastPos: Vec3;

  readonly stats: ActorStats = {
    damageDealt: 0,
    damageTaken: 0,
    layersRepaired: 0,
    generatorsCompleted: 0,
    kills: 0,
    healingDone: 0,
    stunsLanded: 0,
    abilitiesUsed: 0,
  };

  readonly input: ActorInput = { repairTarget: null, moveDir: null, wantSprint: false, lookAt: null };
  state: BodyState;

  /** Cached speeds computed each tick (blocks/s). */
  walkBps = 0;
  sprintBps = 0;
  canSprint = true;
  frozen = false;

  constructor(init: ActorInit) {
    this.id = init.id;
    this.displayName = init.displayName;
    this.character = init.character;
    this.team = init.character.team;
    this.role = init.character.role;
    this.isBot = init.isBot;
    this.isMinion = init.isMinion ?? false;
    this.ownerId = init.ownerId ?? null;
    this.body = init.body;
    this.baseMaxHp = init.hp ?? init.character.stats.hp;
    this.hp = this.baseMaxHp;
    this.staminaMax = init.character.stats.stamina;
    this.stamina = this.staminaMax;
    this.staminaDrain = init.character.stats.staminaDrain;
    this.staminaRegen = init.character.stats.staminaRegen;
    this.state = this.body.read();
    this.lastPos = { ...this.state.pos };
  }

  get maxHp(): number {
    return Math.max(1, this.baseMaxHp - this.maxHpPenalty);
  }

  get pos(): Vec3 {
    return this.state.pos;
  }

  get facing(): Vec3 {
    return this.state.facing;
  }

  get isKiller(): boolean {
    return this.team === "killer" && !this.isMinion;
  }

  get isSurvivor(): boolean {
    return this.team === "survivor" && !this.isMinion;
  }

  shieldTotal(): number {
    return this.shields.reduce((n, s) => n + s.amount, 0);
  }

  shield(id: string): ShieldLayer | undefined {
    return this.shields.find((s) => s.id === id);
  }

  ability(id: string): AbilityDef | undefined {
    return this.character.abilities.find((a) => a.id === id);
  }

  data<T extends Record<string, unknown>>(abilityId: string): T {
    let d = this.abilityData[abilityId];
    if (!d) {
      d = {};
      this.abilityData[abilityId] = d;
    }
    return d as T;
  }

  isStunned(now: number): boolean {
    return now < this.stunnedUntil;
  }

  addHooks(owner: string, hooks: Partial<Hooks>, endTick = Infinity): number {
    const id = nextHookId++;
    this.hooks.push({ id, owner, endTick, hooks });
    return id;
  }

  removeHooks(idOrOwner: number | string): void {
    this.hooks = this.hooks.filter((h) => (typeof idOrOwner === "number" ? h.id !== idOrOwner : h.owner !== idOrOwner));
  }

  addMoveMod(mod: MoveMod): void {
    this.moveMods = this.moveMods.filter((m) => m.id !== mod.id);
    this.moveMods.push(mod);
  }

  removeMoveMod(id: string): void {
    this.moveMods = this.moveMods.filter((m) => m.id !== id);
  }
}
