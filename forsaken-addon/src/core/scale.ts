// The one place where Roblox units become Minecraft units (brief §3.10).
import { config } from "./config";

export const TICKS_PER_SECOND = 20;

/** Roblox studs -> Minecraft blocks. */
export function studs(s: number): number {
  return s * config().scale.studToBlock;
}

/** Minecraft blocks -> Roblox studs (HUD, debugging). */
export function toStuds(blocks: number): number {
  return blocks / config().scale.studToBlock;
}

/** Melee reach: converted range, but never below a usable Minecraft reach. */
export function meleeReach(stud: number): number {
  return Math.max(studs(stud), config().scale.minMeleeReachBlocks);
}

/** FORSAKEN speed (studs/s) -> multiple of survivor sprint speed (26 -> 1.0). */
export function speedMultiple(studsPerSecond: number): number {
  return studsPerSecond / config().scale.survivorSprintStuds;
}

/** FORSAKEN speed (studs/s) -> Minecraft blocks per second, anchored on vanilla sprint speed. */
export function blocksPerSecond(studsPerSecond: number): number {
  return speedMultiple(studsPerSecond) * config().scale.vanillaSprintBlocksPerSecond;
}

/** Blocks per second -> blocks per tick. */
export function perTick(bps: number): number {
  return bps / TICKS_PER_SECOND;
}

export function ticks(seconds: number): number {
  return Math.round(seconds * TICKS_PER_SECOND);
}

export function seconds(tickCount: number): number {
  return tickCount / TICKS_PER_SECOND;
}

/**
 * Player `minecraft:movement` attribute that produces `bps` blocks/s.
 * Vanilla: attribute 0.1 walking = sprint speed / 1.3; sprinting multiplies the attribute by 1.3.
 */
export function movementAttribute(bps: number, sprinting: boolean): number {
  const c = config().scale;
  const walkBpsAtBase = c.vanillaSprintBlocksPerSecond / c.vanillaSprintMultiplier; // bps for attribute 0.1
  const attr = (bps / walkBpsAtBase) * c.vanillaWalkAttribute;
  return sprinting ? attr / c.vanillaSprintMultiplier : attr;
}
