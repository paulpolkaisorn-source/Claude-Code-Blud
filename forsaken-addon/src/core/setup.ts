// Match setup choices (pure, unit-tested): characters for bots and generator spots.
import type { CharacterDef, Role } from "../characters/types";
import type { Rng } from "../util/rng";

export interface PickOptions {
  /** The human's role, or null for a bots-only match. */
  humanRole: "killer" | "survivor" | null;
  /** The human's chosen character (null = Random). */
  humanCharacter: CharacterDef | null;
  killers: readonly CharacterDef[];
  survivors: readonly CharacterDef[];
  survivorCount: number;
  allowDuplicates: boolean;
  /** Bots-only: force a killer. */
  forcedKiller?: CharacterDef | null;
}

export interface Picked {
  killer: CharacterDef;
  /** survivors[0] is the human's character when the human is a survivor. */
  survivors: CharacterDef[];
}

/**
 * Brief §3.2: one killer + eight survivors, distinct survivors by default, the player's character
 * always included, bots pick random available characters while avoiding a single-role team.
 */
export function pickBotCharacters(rng: Rng, o: PickOptions): Picked {
  const killer =
    o.humanRole === "killer" ? (o.humanCharacter ?? rng.pick(o.killers)) : (o.forcedKiller ?? rng.pick(o.killers));
  const survivors: CharacterDef[] = [];
  if (o.humanRole === "survivor") survivors.push(o.humanCharacter ?? rng.pick(o.survivors));
  const roleCount = new Map<Role, number>();
  const count = (c: CharacterDef) => roleCount.set(c.role, (roleCount.get(c.role) ?? 0) + 1);
  survivors.forEach(count);
  const roles: Role[] = ["survivalist", "sentinel", "support"];
  while (survivors.length < o.survivorCount) {
    let pool = o.allowDuplicates ? [...o.survivors] : o.survivors.filter((c) => !survivors.includes(c));
    if (pool.length === 0) pool = [...o.survivors];
    // Prefer a role nobody has yet; never let one role exceed half the team.
    const missing = roles.filter((r) => !roleCount.get(r));
    const capped = pool.filter((c) => (roleCount.get(c.role) ?? 0) < Math.ceil(o.survivorCount / 2));
    const preferred = capped.filter((c) => missing.includes(c.role));
    const choice = rng.pick(preferred.length ? preferred : capped.length ? capped : pool);
    survivors.push(choice);
    count(choice);
  }
  return { killer, survivors };
}

/** Picks `count` real generator spots and `fakes` fake ones (Noli) from `total` spots. */
export function pickGeneratorSpots(rng: Rng, total: number, count: number, fakes: number): { real: number[]; fake: number[] } {
  const idx = rng.shuffle(Array.from({ length: total }, (_, i) => i));
  const real = idx.slice(0, Math.min(count, total)).sort((a, b) => a - b);
  const fake = idx.slice(real.length, Math.min(total, real.length + fakes)).sort((a, b) => a - b);
  return { real, fake };
}
