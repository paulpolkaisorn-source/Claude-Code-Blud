import { afterEach, describe, expect, it } from "vitest";
import { body, cellPos, faceTo, place, realMatch, run } from "../helpers";
import { useAbility } from "../../src/abilities/engine";
import { resetConfig } from "../../src/core/config";
import { blocksPerSecond, ticks } from "../../src/core/scale";
import { flaggedInRange, kill9Target } from "../../src/abilities/kits/daemon";
import type { Game } from "../../src/core/game";
import type { Actor } from "../../src/entities/actor";
import { add, dist2D, flat, scale } from "../../src/util/vec";

afterEach(() => resetConfig());

function duel(survivors = ["elliot", "elliot"]) {
  const m = realMatch("daemon", survivors);
  faceTo(m.killer, m.survivors[0]);
  return m;
}

/** Ticks while moving minions along their input like the adapter does. */
function step(game: Game, n: number): void {
  for (let i = 0; i < n; i++) {
    for (const a of game.actors) {
      if (!a.isMinion || !a.alive || !a.input.moveDir || a.frozen) continue;
      body(a).drive(scale(a.input.moveDir, (a.input.wantSprint ? a.sprintBps : a.walkBps) / 20));
    }
    game.tick();
  }
}

function decoys(game: Game): Actor[] {
  return game.actors.filter((a) => a.isMinion && a.alive && a.flags.has("decoy"));
}

describe("Daemon", () => {
  it("Ping: 22 damage and Flagged for 20 s (Uptime)", () => {
    const { game, killer, survivors } = duel();
    const s = survivors[0];
    useAbility(game, killer, "ping");
    run(game, ticks(0.25) + 1);
    expect(s.hp).toBe(58);
    expect(s.statuses.has("flagged")).toBe(true);
    expect(s.statuses.remainingTicks("flagged", game.now)).toBeGreaterThan(ticks(19.8));
    expect(flaggedInRange(game, killer)).toEqual([s]);
    place(s, cellPos(75, 5)); // > 40 blocks away
    expect(flaggedInRange(game, killer)).toEqual([]);
  });

  it("Uptime: any damage he deals flags the survivor; damage over time does not", () => {
    const { game, killer, survivors } = duel();
    const [a, b] = survivors;
    game.damage(a, 5, killer, { kind: "ability" });
    expect(a.statuses.has("flagged")).toBe(true);
    game.damage(b, 5, killer, { kind: "dot" });
    expect(b.statuses.has("flagged")).toBe(false);
  });

  it("Uptime: +5% speed while moving toward the nearest Flagged survivor", () => {
    const { game, killer, survivors } = duel();
    const s = survivors[0];
    place(s, cellPos(40, 56));
    run(game, 1);
    const base = killer.walkBps;
    game.status(s, "flagged", 1, 20, killer);
    // The body moves (like a player walking); the model sees it on the next tick.
    const walkBy = (dz: number) => {
      body(killer).moveTo({ ...killer.pos, z: killer.pos.z + dz });
      run(game, 1);
    };
    walkBy(0.2); // toward (south)
    expect(killer.walkBps).toBeCloseTo(base * 1.05);
    walkBy(-0.2); // away (north)
    expect(killer.walkBps).toBeCloseTo(base);
    // Not Flagged: no bonus.
    game.removeStatus(s, "flagged");
    walkBy(0.2);
    expect(killer.walkBps).toBeCloseTo(base);
  });

  it("Fork: 2 decoys with Daemon's name tag sprint in straight lines ±25°; touch = 10 damage + Flagged, then they vanish", () => {
    const { game, ports, killer, survivors } = duel();
    const s = survivors[0];
    place(s, cellPos(10, 70));
    expect(useAbility(game, killer, "fork").ok).toBe(true);
    const ds = decoys(game);
    expect(ds).toHaveLength(2);
    expect(ds.every((d) => d.displayName === killer.displayName)).toBe(true);
    expect(ports.bodies.filter((b) => b.opts.minion).every((b) => b.opts.nameTag === killer.displayName)).toBe(true);
    const f = flat(killer.facing);
    const angles = ds.map((d) => (Math.acos(Math.max(-1, Math.min(1, d.input.moveDir!.x * f.x + d.input.moveDir!.z * f.z))) * 180) / Math.PI);
    for (const a of angles) expect(a).toBeCloseTo(25, 0);
    // Put the survivor on one decoy's path.
    const d0 = ds[0];
    place(s, add(d0.pos, scale(d0.input.moveDir!, 3)));
    step(game, ticks(1));
    expect(s.hp).toBe(70);
    expect(s.statuses.has("flagged")).toBe(true);
    expect(d0.alive).toBe(false);
    expect(decoys(game)).toHaveLength(1);
    // The other one runs out after 6 s.
    step(game, ticks(5.1));
    expect(decoys(game)).toHaveLength(0);
  });

  it("Fork: decoys turn instead of running into walls", () => {
    const { game, killer, survivors } = duel();
    place(survivors[0], cellPos(10, 70));
    faceTo(killer, cellPos(40, 70)); // south, toward the wall at z = 58
    useAbility(game, killer, "fork");
    step(game, ticks(3));
    for (const d of decoys(game)) expect(d.pos.z).toBeLessThan(58);
    const moved = decoys(game).map((d) => dist2D(d.pos, killer.pos));
    expect(Math.max(...moved)).toBeGreaterThan(8);
  });

  it("Segfault: 0.4 s windup, 8-block slam: 18 damage, Slowness II 3 s, Helpless 2 s (+ Flagged)", () => {
    const { game, killer, survivors } = duel();
    const [near, far] = survivors;
    place(near, cellPos(46, 50));
    place(far, cellPos(40, 40));
    useAbility(game, killer, "segfault");
    run(game, ticks(0.4) - 1);
    expect(near.hp).toBe(80);
    run(game, 2);
    expect(near.hp).toBe(62);
    expect(near.statuses.level("slowness")).toBe(2);
    expect(near.statuses.remainingTicks("slowness", game.now)).toBeLessThanOrEqual(ticks(3));
    expect(near.statuses.has("helpless")).toBe(true);
    expect(near.statuses.remainingTicks("helpless", game.now)).toBeLessThanOrEqual(ticks(2));
    expect(near.statuses.has("flagged")).toBe(true);
    expect(far.hp).toBe(80);
  });

  describe("Kill -9", () => {
    it("needs a Flagged survivor within 6 blocks at <= 35% HP", () => {
      const { game, killer, survivors } = duel();
      const s = survivors[0];
      expect(useAbility(game, killer, "kill_9").reason).toBe("no target");
      game.status(s, "flagged", 1, 20, killer);
      expect(useAbility(game, killer, "kill_9").reason).toBe("no target");
      s.hp = 29; // 36%
      expect(kill9Target(game, killer)).toBeNull();
      s.hp = 28; // 35%
      expect(kill9Target(game, killer)).toBe(s);
      place(s, cellPos(40, 57)); // 7 blocks
      expect(useAbility(game, killer, "kill_9").reason).toBe("no target");
    });

    it("1.2 s channel (both held), then instant elimination; 60 s cooldown", () => {
      const { game, killer, survivors } = duel();
      const s = survivors[0];
      game.status(s, "flagged", 1, 20, killer);
      s.hp = 20;
      expect(useAbility(game, killer, "kill_9").ok).toBe(true);
      run(game, 2);
      expect(killer.frozen).toBe(true);
      expect(s.frozen).toBe(true);
      run(game, ticks(1.2) - 3);
      expect(s.alive).toBe(true);
      run(game, 2);
      expect(s.alive).toBe(false);
      expect(killer.stats.kills).toBe(1);
      expect(killer.cooldowns.remaining("kill_9", game.now) / 20).toBeGreaterThan(58);
    });

    it("a stun cancels it: the survivor lives and the cooldown is only 20 s", () => {
      const { game, killer, survivors } = duel();
      const [s, ally] = survivors;
      game.status(s, "flagged", 1, 20, killer);
      s.hp = 20;
      useAbility(game, killer, "kill_9");
      run(game, 10);
      game.stun(killer, 2, ally);
      run(game, ticks(2));
      expect(s.alive).toBe(true);
      expect(s.frozen).toBe(false);
      expect(killer.cooldowns.remaining("kill_9", game.now) / 20).toBeCloseTo(18, 0);
    });

    it("does not bypass invincibility", () => {
      const { game, killer, survivors } = duel();
      const s = survivors[0];
      game.status(s, "flagged", 1, 20, killer);
      s.hp = 20;
      useAbility(game, killer, "kill_9");
      game.status(s, "invincible", 1, 5, s);
      run(game, ticks(1.5));
      expect(s.alive).toBe(true);
      expect(s.hp).toBe(20);
    });
  });

  it("is tall; decoys run at his base sprint speed (27.5 studs/s)", () => {
    const { game, killer, survivors } = duel();
    place(survivors[0], cellPos(10, 70));
    expect(killer.flags.has("tall")).toBe(true);
    useAbility(game, killer, "fork");
    run(game, 1);
    for (const d of decoys(game)) expect(d.sprintBps).toBeCloseTo(blocksPerSecond(27.5));
  });
});
