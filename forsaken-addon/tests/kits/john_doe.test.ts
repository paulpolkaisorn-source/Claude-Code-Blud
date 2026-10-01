import { afterEach, describe, expect, it } from "vitest";
import { cellPos, faceTo, place, realMatch, run } from "../helpers";
import { useAbility } from "../../src/abilities/engine";
import { resetConfig } from "../../src/core/config";
import { studs, ticks } from "../../src/core/scale";
import type { Game } from "../../src/core/game";
import type { Actor } from "../../src/entities/actor";
import { dist2D } from "../../src/util/vec";

afterEach(() => resetConfig());

function duel(survivors = ["elliot", "noob"]) {
  const m = realMatch("john_doe", survivors);
  faceTo(m.killer, m.survivors[0]);
  return m;
}

/** Walks an actor in a straight line, one tick per step. */
function walk(game: Game, a: Actor, dx: number, dz: number, steps: number): void {
  for (let i = 0; i < steps; i++) {
    place(a, { x: a.pos.x + dx, y: a.pos.y, z: a.pos.z + dz });
    game.tick();
  }
}

function walkable(game: Game, p: { x: number; z: number }): boolean {
  const g = game.grid.toGrid({ x: p.x, y: 0, z: p.z });
  return game.grid.walkable(g.x, g.z);
}

describe("John Doe", () => {
  it("Slash: 28 damage after a 0.4 s windup, 1.7 s cooldown", () => {
    const { game, killer, survivors } = duel();
    useAbility(game, killer, "slash");
    run(game, ticks(0.4) - 1);
    expect(survivors[0].hp).toBe(80);
    run(game, 2);
    expect(survivors[0].hp).toBeCloseTo(52);
    expect(killer.cooldowns.remaining("slash", game.now)).toBe(ticks(1.7) - ticks(0.4) - 1);
  });

  describe("Natural Malevolence", () => {
    it("leaves a trail behind him that gives Corrupted II 3 s; it closes in after 48 studs", () => {
      const { game, killer, survivors } = duel();
      const s = survivors[0];
      place(s, cellPos(10, 70));
      place(killer, cellPos(48, 51));
      walk(game, killer, -0.3, 0, 20);
      const trail = game.objectsOf("jd_trail", killer);
      expect(trail.length).toBeGreaterThan(5);
      // Step on the oldest part of the trail.
      place(s, trail[0].pos);
      run(game, 1);
      expect(s.statuses.level("corrupted")).toBe(2);
      expect(s.statuses.remainingTicks("corrupted", game.now)).toBeLessThanOrEqual(ticks(3));
      // Walking far: the trail never exceeds 48 studs.
      place(s, cellPos(10, 70));
      walk(game, killer, -0.4, 0, 50);
      const segs = game.objectsOf("jd_trail", killer);
      const maxSegs = Math.round(studs(48) / 0.6);
      expect(segs.length).toBeLessThanOrEqual(maxSegs);
      expect(dist2D(segs[0].pos, killer.pos)).toBeLessThanOrEqual(studs(48) + 1);
      // Standing still, the trail closes in.
      run(game, ticks(6) + 1);
      expect(game.objectsOf("jd_trail", killer)).toHaveLength(0);
    });

    it("Dusekkar levitates over the trail", () => {
      const { game, killer, survivors } = realMatch("john_doe", ["dusekkar"]);
      const s = survivors[0];
      place(s, cellPos(10, 70));
      place(killer, cellPos(48, 51));
      walk(game, killer, -0.3, 0, 20);
      place(s, game.objectsOf("jd_trail", killer)[0].pos);
      run(game, 5);
      expect(s.statuses.has("corrupted")).toBe(false);
    });

    it("touching John hurts: 5 damage at most once per second", () => {
      const { game, killer, survivors } = duel();
      const s = survivors[0];
      place(s, { ...killer.pos, x: killer.pos.x + 0.6 });
      run(game, 1);
      expect(s.hp).toBe(75);
      run(game, ticks(0.5));
      expect(s.hp).toBe(75);
      run(game, ticks(0.5) + 1);
      expect(s.hp).toBe(70);
    });
  });

  describe("Corrupt Energy", () => {
    it("raises 31 spikes along his facing: 11 damage (max 2 hits), Speed I 7 s, Corrupted II 5 s, bots path around", () => {
      const { game, killer, survivors } = duel();
      const s = survivors[0];
      // Face west: open floor for the whole 36-stud wall.
      faceTo(killer, cellPos(20, 50));
      place(s, cellPos(35, 50));
      let spikeDamage = 0;
      s.addHooks("test", { afterTakeDamage: (_self, ev) => void (ev.abilityId === "corrupt_energy" && (spikeDamage += ev.dealt)) });
      expect(useAbility(game, killer, "corrupt_energy").ok).toBe(true);
      run(game, ticks(0.3) + 8);
      expect(spikeDamage).toBe(11);
      expect(killer.statuses.level("speed")).toBe(1);
      expect(killer.statuses.remainingTicks("speed", game.now)).toBeGreaterThan(ticks(6.5));
      run(game, ticks(1));
      const spikes = game.objectsOf("jd_spike", killer);
      expect(spikes).toHaveLength(31);
      const far = spikes.reduce((m, o) => Math.max(m, dist2D(o.pos, killer.pos)), 0);
      expect(far).toBeCloseTo(1 + (studs(36) / 31) * 30, 1);
      expect(walkable(game, spikes[10].pos)).toBe(false);
      // Standing in the wall: a second hit 0.5 s later, then no more; Corrupted II.
      expect(spikeDamage).toBe(22);
      run(game, ticks(3));
      expect(spikeDamage).toBe(22);
      expect(s.statuses.level("corrupted")).toBe(2);
      expect(s.statuses.remainingTicks("corrupted", game.now)).toBeGreaterThan(ticks(4.5));
      // Spikes sink after 14 s.
      run(game, ticks(11));
      expect(game.objectsOf("jd_spike", killer)).toHaveLength(0);
      expect(walkable(game, spikes[10].pos)).toBe(true);
    });

    it("the wall follows his camera while it rises", () => {
      const { game, killer, survivors } = duel();
      place(survivors[0], cellPos(10, 70));
      faceTo(killer, cellPos(20, 50));
      useAbility(game, killer, "corrupt_energy");
      run(game, ticks(0.3) + 4);
      faceTo(killer, cellPos(40, 56)); // turn south
      run(game, ticks(1));
      const spikes = game.objectsOf("jd_spike", killer);
      expect(spikes.length).toBeGreaterThan(10);
      expect(spikes.at(-1)!.pos.z).toBeGreaterThan(spikes[0].pos.z + 2);
    });

    it("second press retracts the spikes (from 4.5 s after they rose)", () => {
      const { game, killer, survivors } = duel();
      place(survivors[0], cellPos(10, 70));
      faceTo(killer, cellPos(20, 50));
      useAbility(game, killer, "corrupt_energy");
      run(game, ticks(1.5));
      expect(useAbility(game, killer, "corrupt_energy").ok).toBe(false);
      expect(game.objectsOf("jd_spike", killer)).toHaveLength(31);
      run(game, ticks(4.5));
      const cell = game.objectsOf("jd_spike", killer)[5].pos;
      expect(useAbility(game, killer, "corrupt_energy").ok).toBe(true);
      expect(game.objectsOf("jd_spike", killer)).toHaveLength(0);
      expect(walkable(game, cell)).toBe(true);
    });

    it("the wall stops at real walls", () => {
      const { game, killer, survivors } = duel();
      place(survivors[0], cellPos(10, 70));
      // South: the wall at z = 58 cuts it short.
      faceTo(killer, cellPos(40, 70));
      useAbility(game, killer, "corrupt_energy");
      run(game, ticks(2));
      const spikes = game.objectsOf("jd_spike", killer);
      expect(spikes.length).toBeGreaterThan(5);
      expect(spikes.length).toBeLessThan(31);
      expect(spikes.every((o) => o.pos.z < 58)).toBe(true);
    });
  });

  describe("Unstoppable", () => {
    it("stunned while casting 404 Error: stun capped at 2 s, cooldown halved, then Speed I 3 s and halved debuffs", () => {
      const { game, killer, survivors } = duel();
      useAbility(game, killer, "error_404");
      run(game, 5);
      expect(game.stun(killer, 3, survivors[0])).toBe(true);
      expect(killer.stunnedUntil - game.now).toBe(ticks(2 + 0.6));
      expect(killer.cooldowns.remaining("error_404", game.now)).toBe(ticks(10));
      run(game, ticks(1));
      expect(game.isRevealedTo(survivors[0], killer)).toBe(false);
      run(game, ticks(1.6) + 1);
      expect(killer.statuses.level("speed")).toBe(1);
      expect(killer.statuses.remainingTicks("speed", game.now)).toBeGreaterThan(ticks(2.8));
      expect(killer.statuses.remainingTicks("speed", game.now)).toBeLessThanOrEqual(ticks(3));
      // (Killers stay invulnerable to enemy debuffs for 1 s after a stun.)
      run(game, ticks(1) + 1);
      game.status(killer, "slowness", 1, 4, survivors[0]);
      expect(killer.statuses.remainingTicks("slowness", game.now)).toBe(ticks(2));
      run(game, ticks(2.5));
      game.status(killer, "slowness", 1, 4, survivors[0]);
      expect(killer.statuses.remainingTicks("slowness", game.now)).toBe(ticks(4));
    });

    it("+1 s of Speed per living Sentinel", () => {
      const { game, killer, survivors } = realMatch("john_doe", ["shedletsky", "guest_1337"]);
      faceTo(killer, survivors[0]);
      useAbility(game, killer, "error_404");
      run(game, 5);
      game.stun(killer, 3, survivors[0]);
      run(game, ticks(2.6) + 1);
      expect(killer.statuses.remainingTicks("speed", game.now)).toBeGreaterThan(ticks(4.8));
    });

    it("stunned while Corrupt Energy rises: the wall stops, cooldown halved", () => {
      const { game, killer, survivors } = duel();
      place(survivors[0], cellPos(10, 70));
      faceTo(killer, cellPos(20, 50));
      useAbility(game, killer, "corrupt_energy");
      run(game, ticks(0.3) + 3);
      const before = game.objectsOf("jd_spike", killer).length;
      expect(before).toBeGreaterThan(0);
      game.stun(killer, 3, survivors[0]);
      expect(killer.stunnedUntil - game.now).toBe(ticks(2.6));
      expect(killer.cooldowns.remaining("corrupt_energy", game.now)).toBe(ticks(6));
      run(game, ticks(1));
      expect(game.objectsOf("jd_spike", killer).length).toBe(before);
    });

    it("does not trigger outside those casts (Digital Footprint, idle)", () => {
      const { game, killer, survivors } = duel();
      useAbility(game, killer, "digital_footprint");
      run(game, 3);
      game.stun(killer, 3, survivors[0]);
      expect(killer.stunnedUntil - game.now).toBe(ticks(3.6));
      run(game, ticks(4));
      expect(killer.statuses.has("speed")).toBe(false);
      expect(game.objectsOf("shadow_trap", killer)).toHaveLength(0);
    });
  });

  describe("Digital Footprint", () => {
    it("three stomps (1.2 s, rooted) make a shadow trap only John can see", () => {
      const { game, ports, killer, survivors } = duel();
      place(survivors[0], cellPos(10, 70));
      useAbility(game, killer, "digital_footprint");
      run(game, 2);
      expect(killer.frozen).toBe(true);
      run(game, ticks(1.2));
      const traps = game.objectsOf("shadow_trap", killer);
      expect(traps).toHaveLength(1);
      expect(ports.props).toHaveLength(0);
      run(game, 10);
      const rings = game.fx.events.filter((e) => e.t === "ring" && e.id.includes("sculk"));
      expect(rings.length).toBeGreaterThan(0);
      expect(rings.every((e) => e.t === "ring" && JSON.stringify(e.viewers) === JSON.stringify([killer.id]))).toBe(true);
    });

    it("trigger: Speed I 10 s for John; Slowness II + Corrupted I 10 s for the survivor; mutual aura", () => {
      const { game, killer, survivors } = duel();
      const s = survivors[0];
      place(s, cellPos(10, 70));
      useAbility(game, killer, "digital_footprint");
      run(game, ticks(1.2) + 1);
      const trap = game.objectsOf("shadow_trap", killer)[0];
      place(killer, cellPos(30, 50));
      run(game, ticks(5));
      expect(game.objectsOf("shadow_trap", killer)).toHaveLength(1);
      place(s, { ...trap.pos, x: trap.pos.x + 1 });
      run(game, 1);
      expect(game.objectsOf("shadow_trap", killer)).toHaveLength(0);
      expect(killer.statuses.level("speed")).toBe(1);
      expect(killer.statuses.remainingTicks("speed", game.now)).toBeGreaterThan(ticks(9.8));
      expect(s.statuses.level("slowness")).toBe(2);
      expect(s.statuses.level("corrupted")).toBe(1);
      expect(s.statuses.remainingTicks("corrupted", game.now)).toBeGreaterThan(ticks(9.8));
      expect(game.isRevealedTo(s, killer)).toBe(true);
      expect(game.isRevealedTo(killer, s)).toBe(true);
    });

    it("max 3 traps: a fourth replaces the oldest; the stomp is heard within 90 studs", () => {
      const { game, killer, survivors } = duel(["elliot", "noob"]);
      place(survivors[0], cellPos(10, 70));
      const spots = [cellPos(30, 50), cellPos(33, 50), cellPos(36, 50), cellPos(39, 50)];
      for (const p of spots) {
        place(killer, p);
        expect(useAbility(game, killer, "digital_footprint").ok).toBe(true);
        run(game, ticks(3) + 1);
      }
      const traps = game.objectsOf("shadow_trap", killer);
      expect(traps).toHaveLength(3);
      expect(traps.some((o) => dist2D(o.pos, spots[0]) < 0.5)).toBe(false);
      const trapSounds = game.fx.events.filter((e) => e.t === "sound" && e.to !== undefined && e.id === "random.click");
      const heardBy = trapSounds.at(-1)!;
      expect(heardBy.t === "sound" && heardBy.to!.includes(killer.id)).toBe(true);
      // noob stands ~31 blocks away (within 90 studs = 32.4 blocks), elliot is at (10, 70).
      expect(heardBy.t === "sound" && heardBy.to!.includes(survivors[0].id)).toBe(false);
    });
  });

  it("404 Error: slowed with no sprint for 1 s, then every survivor's aura for 6 s", () => {
    const { game, killer, survivors } = duel();
    run(game, 1);
    const walk = killer.walkBps;
    useAbility(game, killer, "error_404");
    run(game, 2);
    expect(killer.walkBps).toBeCloseTo(walk * 0.3);
    expect(killer.canSprint).toBe(false);
    run(game, ticks(1));
    for (const s of survivors) expect(game.isRevealedTo(s, killer)).toBe(true);
    expect(killer.canSprint).toBe(true);
    run(game, ticks(6));
    for (const s of survivors) expect(game.isRevealedTo(s, killer)).toBe(false);
  });
});
