import raw from "../../data/config.json";

export type Difficulty = "easy" | "normal" | "hard";

export interface DifficultyTuning {
  reactionSeconds: number;
  accuracy: number;
  repairMultiplier: number;
  escapeQuality: number;
  chaseGiveUpSeconds: number;
  abilityUseChance: number;
  /** Killer bots: how long a lost survivor's last position stays useful. */
  killerMemorySeconds: number;
  /** Killer bots: chance per think (every thinkIntervalTicks) to swing the basic attack when in reach. */
  swingChance: number;
}

export interface SoundDef {
  id: string;
  volume: number;
  pitch: number;
}

export interface Config {
  scale: {
    studToBlock: number;
    survivorSprintStuds: number;
    vanillaSprintBlocksPerSecond: number;
    vanillaWalkAttribute: number;
    vanillaSprintMultiplier: number;
    minMeleeReachBlocks: number;
  };
  match: {
    survivorCount: number;
    headStartSeconds: number;
    baseRoundSeconds: number;
    secondsRemovedPerGenerator: number;
    secondsAddedPerElimination: number;
    generatorCount: number;
    generatorLayers: number;
    layerSecondsSolo: number;
    maxRepairersPerGenerator: number;
    repairRangeBlocks: number;
    lastManStanding: boolean;
    lmsSeconds: number;
    lmsRevealEverySeconds: number;
    lmsRevealSeconds: number;
    allowDuplicateSurvivors: boolean;
    killerCanDie: boolean;
    itemSpawnMin: number;
    itemSpawnMax: number;
    endingSeconds: number;
    noliFakeGenerators: number;
  };
  combat: {
    stunImmunityBaseSeconds: number;
    stunImmunityPerExtraSentinelSeconds: number;
    killerStunInvulnerableExtraSeconds: number;
    killerStunRecoverySeconds: number;
    onHitSpeedLevel: number;
    onHitSpeedSeconds: number;
    limpHpFraction: number;
    limpSpeedMultiplier: number;
    killerFarSpeedBonus: number;
    killerFarRangeStuds: number;
    killerStaminaDrainRangeStuds: number;
    medkitHeal: number;
    medkitUseSeconds: number;
    colaUseSeconds: number;
    colaSpeedLevel: number;
    colaSpeedSeconds: number;
    colaRepeatWindowSeconds: number;
  };
  stamina: {
    survivor: { max: number; drain: number; regen: number };
    exhaustSeconds: number;
    sprintUnlockAt: number;
    regenDelayPerSprintSecond: number;
    regenDelayMax: number;
  };
  statusTuning: {
    bleedingDpsPerLevel: number;
    bleedingFloorHp: number;
    burningDps: number[];
    corruptedDps: number[];
    poisonDps: number[];
    dotFloorHp: number;
    hemorrhageMaxHpLossPerSecondPerLevel: number;
    hemorrhageMaxLossPerLevel: number;
    hemorrhageRecoveryPerSecond: number;
    overhealDecayPerSecond: number;
    glitchedHudScramble: boolean;
  };
  terror: { defaultRadiusStuds: number; heartbeatFarTicks: number; heartbeatNearTicks: number };
  bots: {
    thinkIntervalTicks: number;
    impulseGain: number;
    visionDegrees: number;
    visionBlocks: number;
    hearingBlocks: number;
    memorySeconds: number;
    stuckRepathSeconds: number;
    stuckWaypointSeconds: number;
    stuckSafeSeconds: number;
    difficulty: Record<Difficulty, DifficultyTuning>;
  };
  arena: { originX: number; originY: number; originZ: number; layoutVersion: number };
  hud: { intervalTicks: number; sidebar: boolean };
  playerSpeedMode: "attribute" | "effects";
  useTextPrimitives: boolean;
  oneXOneHpOverride: number | null;
  twoTimeVariant: "oblation" | "undying_devotion";
  sounds: Record<string, SoundDef>;
  particles: Record<string, string>;
  fog: Record<string, string>;
}

const base = raw as unknown as Config;

/** Mutable copy so tests and the debug menu can tweak values without touching the JSON. */
let current: Config = deepClone(base);

export function config(): Config {
  return current;
}

export function resetConfig(): void {
  current = deepClone(base);
}

/** Shallow-merge overrides per section (tests). */
export function patchConfig(p: DeepPartial<Config>): void {
  current = merge(current, p) as Config;
}

export type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

function deepClone<T>(o: T): T {
  return JSON.parse(JSON.stringify(o)) as T;
}

function merge(a: unknown, b: unknown): unknown {
  if (b === undefined) return a;
  if (a === null || typeof a !== "object" || Array.isArray(a) || b === null || typeof b !== "object" || Array.isArray(b)) return b;
  const out: Record<string, unknown> = { ...(a as Record<string, unknown>) };
  for (const [k, v] of Object.entries(b as Record<string, unknown>)) out[k] = merge(out[k], v);
  return out;
}
