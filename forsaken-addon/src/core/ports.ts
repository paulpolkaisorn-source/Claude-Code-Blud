// Interfaces the pure game model uses to create things in the world. Implemented in mc/*.mc.ts and in tests.
import type { Body } from "../entities/actor";
import type { Vec3 } from "../util/vec";

/** Visual-only props rendered by the forsaken:prop entity (variant selects the model texture). */
export type PropKind =
  | "pizza"
  | "fake_pizza"
  | "sentry"
  | "dispenser"
  | "tripwire_stake"
  | "tripmine"
  | "blood_orb"
  | "medkit"
  | "cola"
  | "ritual"
  | "graffiti"
  | "shadow_trap"
  | "spike"
  | "nova"
  | "crystal"
  | "bat_orb"
  | "corrupt_cube"
  | "marker";

export const PROP_VARIANTS: Record<PropKind, number> = {
  pizza: 0,
  fake_pizza: 0,
  sentry: 1,
  dispenser: 2,
  tripwire_stake: 3,
  tripmine: 4,
  blood_orb: 5,
  medkit: 6,
  cola: 7,
  ritual: 8,
  graffiti: 9,
  shadow_trap: 10,
  spike: 11,
  nova: 12,
  crystal: 13,
  bat_orb: 14,
  corrupt_cube: 15,
  marker: 16,
};

export interface PropHandle {
  readonly id: string;
  move(pos: Vec3, yaw?: number): void;
  setNameTag(text: string): void;
  remove(): void;
  isValid(): boolean;
}

export interface BotBodyOptions {
  characterId: string;
  skinIndex: number;
  pos: Vec3;
  nameTag: string;
  /** Visual scale (Daemon 1.15). */
  scale?: number;
  /** Bots that are not real participants (minions, clones, mirages). */
  minion?: boolean;
}

export interface WorldPorts {
  createBotBody(opts: BotBodyOptions): Body;
  createProp(kind: PropKind, pos: Vec3, opts?: { yaw?: number; nameTag?: string }): PropHandle;
  /** Swaps a generator block between unlit / lit (and fake look). */
  setGeneratorBlock(pos: Vec3, lit: boolean): void;
  /** Opens a door at a grid cell (bots walking through). */
  openDoor(cellX: number, cellZ: number): void;
}
