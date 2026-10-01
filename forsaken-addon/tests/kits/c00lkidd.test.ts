import { afterEach, describe, expect, it } from "vitest";
import { body, cellPos, faceTo, place, realMatch, run } from "../helpers";
import { useAbility } from "../../src/abilities/engine";
import { resetConfig } from "../../src/core/config";
import { blocksPerSecond, perTick, studs, ticks } from "../../src/core/scale";
import type { Game } from "../../src/core/game";
import type { Actor } from "../../src/entities/actor";
import { dist2D, scale } from "../../src/util/vec";

afterEach(() => resetConfig());

function duel(survivors = ["elliot", "noob"]) {
  const m = realMatch("c00lkidd", survivors);
  faceTo(m.killer, m.survivors[0]);
  return m;
}

/** Ticks the game while moving minions along their input like the adapter does. */
function step(game: Game, n: number): void {
  for (let i = 0; i < n; i++) {
    for (const a of game.actors) {
      if (!a.isMinion || !a.alive || !a.input.moveDir || a.frozen) continue;
      const bps = a.input.wantSprint && a.canSprint ? a.sprintBps : a.walkBps;
      body(a).drive(scale(a.input.moveDir, bps / 20));
    }
    game.tick();
  }
}

function pizzaBots(game: Game): Actor[] {
  return game.actors.filter((a) => a.isMinion && a.alive && a.flags.has("pizzaBot"));
}

describe("c00lkidd", () => {
  it("Tag: 26.5 damage after a 0.1 s windup, 2 s cooldown", () => {
    const { game, killer, survivors } = duel();
    // Tag is the shortest M1 (5 studs → minimum reach 2.6 blocks).
    place(survivors[0], cellPos(40, 52));
    expect(useAbility(game, killer, "tag").ok).toBe(true);
    run(game, ticks(0.1) + 1);
    expect(survivors[0].hp).toBeCloseTo(80 - 26.5);
    expect(killer.cooldowns.remaining("tag", game.now) / 20).toBeCloseTo(2 - 0.15, 1);
  });

  it("Corrupt Nature passes through survivors and walls: 15 damage, Slowness I 4 s, aura 10 s to each", () => {
    const { game, killer, survivors } = duel();
    const [a, b] = survivors;
    // b stands behind the wall at z = 58 (x 40..44), straight down the throw line.
    place(b, cellPos(40, 61));
    expect(useAbility(game, killer, "corrupt_nature").ok).toBe(true);
    run(game, ticks(2));
    expect(a.hp).toBeCloseTo(65);
    expect(b.hp).toBeCloseTo(85);
    for (const s of [a, b]) {
      expect(s.statuses.level("slowness")).toBe(1);
      expect(game.isRevealedTo(s, killer)).toBe(true);
    }
    expect(a.statuses.remainingTicks("slowness", game.now)).toBeLessThanOrEqual(ticks(4));
    run(game, ticks(10));
    expect(game.isRevealedTo(a, killer)).toBe(false);
    expect(killer.cooldowns.remaining("corrupt_nature", game.now)).toBe(0);
  });

  it("Walkspeed Override: stands still 0.5 s, then dashes into the survivor: 32 damage, Burning I 8 s, knockback, aura, 3 s i-frames", () => {
    const { game, killer, survivors } = duel();
    const s = survivors[0];
    expect(useAbility(game, killer, "walkspeed_override").ok).toBe(true);
    run(game, 2);
    expect(killer.frozen).toBe(true);
    expect(useAbility(game, killer, "tag").reason).toBe("busy");
    run(game, ticks(0.5));
    expect(s.hp).toBeCloseTo(80 - 32);
    expect(s.statuses.level("burning")).toBe(1);
    expect(s.statuses.remainingTicks("burning", game.now)).toBeGreaterThan(ticks(7.5));
    expect(game.isRevealedTo(s, killer)).toBe(true);
    // Knocked back along c00lkidd's facing (+z).
    const kb = body(s).impulses.at(-1)!;
    expect(kb.z).toBeGreaterThan(1);
    // Halts on hit and gets i-frames.
    expect(killer.forced).toBeNull();
    expect(game.damage(killer, 50, s).dealt).toBe(0);
    run(game, ticks(3) + 1);
    expect(game.damage(killer, 50, s).dealt).toBe(50);
    expect(killer.cooldowns.remaining("walkspeed_override", game.now)).toBeGreaterThan(0);
  });

  it("Walkspeed Override dash speed is fixed (statuses ignored) and steering is limited to 4°/tick", () => {
    const { game, killer, survivors } = duel();
    place(survivors[0], cellPos(10, 70));
    game.status(killer, "slowness", 5, 10, null);
    useAbility(game, killer, "walkspeed_override");
    run(game, ticks(0.5) + 1);
    const fm = killer.forced!;
    expect(fm).not.toBeNull();
    expect(fm.speed).toBeCloseTo(perTick(blocksPerSecond(90)));
    // Look 90° to the east: the dash only turns 4° per tick.
    body(killer).face({ x: -1, y: 0, z: 0 });
    run(game, 1);
    const turned = (Math.acos(Math.max(-1, Math.min(1, killer.forced!.dir.z))) * 180) / Math.PI;
    expect(turned).toBeGreaterThan(3);
    expect(turned).toBeLessThan(9);
  });

  it("Walkspeed Override: a stun while standing still cancels the dash", () => {
    const { game, killer, survivors } = duel();
    useAbility(game, killer, "walkspeed_override");
    run(game, 3);
    game.stun(killer, 1, survivors[0]);
    run(game, ticks(2));
    expect(survivors[0].hp).toBe(80);
    expect(killer.forced).toBeNull();
    expect(killer.data("walkspeed_override").phase).toBeNull();
  });

  it("Walkspeed Override: crashing into a wall slows him for 1.5 s", () => {
    const { game, killer, survivors } = duel();
    place(survivors[0], cellPos(10, 70));
    // Straight south into the wall at z = 58.
    useAbility(game, killer, "walkspeed_override");
    run(game, ticks(0.5) + 8);
    expect(killer.forced).toBeNull();
    expect(killer.pos.z).toBeLessThan(58);
    expect(killer.moveMods.some((m) => m.id === "wso_crash")).toBe(true);
    const crashedWalk = killer.walkBps;
    run(game, ticks(1.6));
    expect(killer.moveMods.some((m) => m.id === "wso_crash" && m.endTick > game.now)).toBe(false);
    expect(killer.walkBps).toBeGreaterThan(crashedWalk);
  });

  it("Pizza Delivery: 2.5 s windup, then 2 bots (20 HP) that hunt and explode: 15 + Burning I, Slowness II 3 s, aura 15 s", () => {
    const { game, killer, survivors } = duel();
    const s = survivors[0];
    // Off to one side, so one bot arrives first.
    place(s, cellPos(44, 55));
    useAbility(game, killer, "pizza_delivery");
    run(game, ticks(2.5) - 2);
    expect(pizzaBots(game)).toHaveLength(0);
    run(game, 3);
    const bots = pizzaBots(game);
    expect(bots).toHaveLength(2);
    expect(bots.every((b) => b.hp === 20 && b.team === "killer")).toBe(true);
    let t = 0;
    while (s.hp === 80 && t++ < ticks(5)) step(game, 1);
    // The first bot to arrive: 15 damage (+ statuses), then it vanishes.
    expect(s.hp).toBeCloseTo(80 - 15);
    expect(s.statuses.level("burning")).toBe(1);
    expect(s.statuses.level("slowness")).toBe(2);
    expect(s.statuses.remainingTicks("slowness", game.now)).toBe(ticks(3));
    expect(game.isRevealedTo(s, killer)).toBe(true);
    expect(pizzaBots(game)).toHaveLength(1);
    // The second one keeps hunting and explodes too.
    step(game, ticks(2));
    expect(s.hp).toBeLessThan(80 - 29);
    expect(pizzaBots(game)).toHaveLength(0);
  });

  it("Pizza bots walk at 14 and speed up to 19.5 when the nearest survivor is beyond 70 studs", () => {
    const { game, killer, survivors } = duel();
    place(survivors[0], cellPos(40, 78));
    place(survivors[1], cellPos(75, 78));
    useAbility(game, killer, "pizza_delivery");
    run(game, ticks(2.5) + 2);
    const bot = pizzaBots(game)[0];
    expect(dist2D(bot.pos, survivors[0].pos)).toBeGreaterThan(studs(70));
    expect(bot.input.wantSprint).toBe(true);
    expect(bot.sprintBps / bot.walkBps).toBeCloseTo(19.5 / 14);
    place(survivors[0], { ...bot.pos, z: bot.pos.z + 5 });
    run(game, 2);
    expect(bot.input.wantSprint).toBe(false);
  });

  it("Pizza bots ignore Undetectable survivors and expire after 35 s", () => {
    const { game, killer, survivors } = duel(["elliot"]);
    const s = survivors[0];
    game.status(s, "undetectable", 1, 60, s);
    useAbility(game, killer, "pizza_delivery");
    run(game, ticks(2.5) + 1);
    expect(pizzaBots(game)).toHaveLength(2);
    step(game, ticks(5));
    expect(s.hp).toBe(80);
    expect(pizzaBots(game).every((b) => b.input.moveDir === null)).toBe(true);
    run(game, ticks(30));
    expect(pizzaBots(game)).toHaveLength(0);
  });

  it("Survivors can destroy pizza bots (20 HP)", () => {
    const { game, killer, survivors } = duel();
    place(survivors[0], cellPos(10, 70));
    useAbility(game, killer, "pizza_delivery");
    run(game, ticks(2.5) + 1);
    const bot = pizzaBots(game)[0];
    expect(game.enemiesOf(survivors[0]).includes(bot)).toBe(true);
    game.damage(bot, 20, survivors[0]);
    expect(bot.alive).toBe(false);
    run(game, 1);
    expect(pizzaBots(game)).toHaveLength(1);
  });
});
