// Map items (wiki "Items"): Medkit and Bloxy Cola spawn at fixed spots (2-5 per round).
// Survivors pick them up by walking over them and use them from hotbar slot 6.
import type { Game } from "../core/game";
import type { Actor } from "../entities/actor";
import { config } from "../core/config";
import { ticks } from "../core/scale";
import { dist2D } from "../util/vec";

export type MapItem = "medkit" | "cola";

export function heldItem(a: Actor): MapItem | null {
  return (a.data("map_item").held as MapItem | undefined) ?? null;
}

export function spawnMapItems(game: Game): void {
  const c = config().match;
  const spots = game.rng.shuffle([...game.layout.itemSpots]);
  const n = game.rng.int(c.itemSpawnMin, Math.min(c.itemSpawnMax, spots.length));
  for (let i = 0; i < n; i++) {
    // Brandon's Place pool: 4 Medkit spots and 5 Bloxy Cola spots → ~44% medkits.
    const kind: MapItem = game.rng.chance(4 / 9) ? "medkit" : "cola";
    const pos = game.grid.toWorld(spots[i]);
    game.spawnObject({
      kind: "map_item",
      owner: null,
      pos,
      radius: 0.9,
      prop: kind === "medkit" ? "medkit" : "cola",
      propName: kind === "medkit" ? "§fMedkit" : "§cBloxy Cola",
      data: { item: kind },
      update(o, g) {
        for (const s of g.aliveSurvivors()) {
          if (heldItem(s) || dist2D(s.pos, o.pos) > o.radius + 0.3) continue;
          s.data("map_item").held = kind;
          g.fx.sound("pickup", s.pos);
          g.fx.flash([s.id], `§aPicked up ${kind === "medkit" ? "a Medkit" : "a Bloxy Cola"} §7(slot 6)`);
          g.log(`${s.displayName} picked up ${kind}`);
          g.removeObject(o, "consumed");
          return;
        }
      },
    });
  }
}

/** Why the held item cannot be used now (null = usable). */
export function itemBlockReason(game: Game, a: Actor): string | null {
  const it = heldItem(a);
  if (!it) return "no item";
  if (!a.alive || game.phase !== "ROUND") return "not now";
  if (a.isStunned(game.now)) return "stunned";
  if (a.channel) return "busy";
  if (it === "medkit") {
    if (a.character.id === "veeronica") return "Metal Frame: Veeronica cannot use Medkits";
    if (a.hp >= a.maxHp && !a.statuses.has("hemorrhage")) return "Sharing is caring... (full HP)";
  }
  return null;
}

/** Starts using the held item (windup; taking damage cancels). Returns the failure reason or null. */
export function useHeldItem(game: Game, a: Actor): string | null {
  const reason = itemBlockReason(game, a);
  if (reason) return reason;
  const it = heldItem(a) as MapItem;
  const c = config().combat;
  if (it === "medkit") {
    game.windup(
      a,
      c.medkitUseSeconds,
      () => {
        a.data("map_item").held = undefined;
        game.heal(a, c.medkitHeal, a);
        game.removeStatus(a, "hemorrhage");
        game.fx.sound("heal", a.pos);
      },
      { label: "Using Medkit", moveMul: 0.6, noSprint: true, damageCancels: true },
    );
  } else {
    game.windup(
      a,
      c.colaUseSeconds,
      () => {
        a.data("map_item").held = undefined;
        const last = a.res.lastColaTick ?? -1e9;
        const recent = game.now - last < ticks(c.colaRepeatWindowSeconds);
        const level = game.round.lms || recent ? 1 : c.colaSpeedLevel;
        a.res.lastColaTick = game.now;
        game.status(a, "speed", level, c.colaSpeedSeconds, a);
        game.fx.sound("drink", a.pos);
      },
      { label: "Drinking Bloxy Cola", moveMul: 0.8, noSprint: true, damageCancels: true },
    );
  }
  return null;
}
