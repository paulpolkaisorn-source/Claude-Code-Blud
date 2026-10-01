import { afterEach, describe, expect, it } from "vitest";
import { body, cellPos, faceTo, place, realMatch, run } from "../helpers";
import { useAbility } from "../../src/abilities/engine";
import { resetConfig } from "../../src/core/config";
import { blocksPerSecond, studs, ticks } from "../../src/core/scale";
import { diveTossDamage, tugState } from "../../src/abilities/kits/nosferatu";
import type { Actor } from "../../src/entities/actor";
import type { Game } from "../../src/core/game";

afterEach(() => resetConfig());

function duel() {
  const m = realMatch("nosferatu", ["noob", "shedletsky", "taph"]);
  faceTo(m.killer, m.survivors[0]);
  return m;
}

function faceEast(a: Actor): void {
  body(a).face({ x: 1, y: 0, z: 0 });
  a.state = a.body.read();
}

function tickWith(game: Game, n: number, each: () => void): void {
  for (let i = 0; i < n; i++) {
    each();
    game.tick();
  }
}

describe("Nosferatu — Levitation", () => {
  it("is silent (no footsteps)", () => {
    const { killer } = duel();
    expect(killer.flags.has("silent")).toBe(true);
  });
});

describe("Nosferatu — Lacerate", () => {
  it("claw slash: 24 damage (kind basic) after 0.3 s", () => {
    const { game, killer, survivors } = duel();
    const kinds: string[] = [];
    survivors[0].addHooks("test", { beforeTakeDamage: (_s, ev) => void kinds.push(ev.kind) });
    expect(useAbility(game, killer, "lacerate").ok).toBe(true);
    run(game, ticks(0.3) + 1);
    expect(survivors[0].hp).toBeCloseTo(76);
    expect(kinds).toEqual(["basic"]);
    expect(killer.cooldowns.remaining("lacerate", game.now) / 20).toBeCloseTo(1.85 - 0.35, 0);
  });
});

describe("Nosferatu — Bloodhook", () => {
  it("close range (<= 24 studs): 15 damage, drag and kick for +3; then Helpless 2 s + Slowness II 1 s; 24 s cooldown", () => {
    const { game, killer, survivors } = duel();
    const s = survivors[0];
    expect(useAbility(game, killer, "bloodhook").ok).toBe(true);
    run(game, ticks(0.9) + 4);
    expect(s.hp).toBeCloseTo(82);
    expect(game.distance(s, killer)).toBeLessThan(1.5);
    expect(s.flags.has("grabbed")).toBe(false);
    expect(killer.statuses.has("helpless")).toBe(true);
    expect(killer.statuses.remainingTicks("helpless", game.now)).toBeGreaterThan(ticks(1.7));
    expect(killer.statuses.level("slowness")).toBe(2);
    expect(killer.cooldowns.remaining("bloodhook", game.now) / 20).toBeGreaterThan(23);
  });
  it("long range: tug-of-war; with the killer leading the survivor is reeled in for +25 (40 total)", () => {
    const { game, killer, survivors } = duel();
    const s = survivors[0];
    faceEast(killer);
    place(s, cellPos(55, 50));
    useAbility(game, killer, "bloodhook");
    run(game, ticks(0.9) + 10);
    expect(s.hp).toBeCloseTo(85);
    expect(tugState(killer)).not.toBeNull();
    expect(s.flags.has("grabbed")).toBe(true);
    expect(s.flags.has("tugOfWar")).toBe(true);
    expect(killer.flags.has("tugOfWar")).toBe(true);
    const d0 = game.distance(s, killer);
    tickWith(game, ticks(1), () => killer.input.jumpPresses++);
    // Pulls use the speed scale (16 studs/s → blocksPerSecond(16)), like every other forced movement.
    expect(game.distance(s, killer)).toBeLessThan(d0 - blocksPerSecond(16) * 0.9);
    tickWith(game, ticks(2), () => killer.input.jumpPresses++);
    expect(tugState(killer)).toBeNull();
    expect(s.hp).toBeCloseTo(60);
    expect(game.distance(s, killer)).toBeLessThan(2);
    expect(s.flags.has("grabbed")).toBe(false);
    expect(killer.statuses.has("helpless")).toBe(true);
    expect(killer.cooldowns.remaining("bloodhook", game.now) / 20).toBeGreaterThan(20);
  });
  it("long range: a survivor out-pressing the killer stops the pull and escapes; Nosferatu is Helpless 0.75 s", () => {
    const { game, killer, survivors } = duel();
    const s = survivors[0];
    faceEast(killer);
    place(s, cellPos(55, 50));
    useAbility(game, killer, "bloodhook");
    run(game, ticks(0.9) + 10);
    expect(tugState(killer)).not.toBeNull();
    tickWith(game, ticks(1), () => (s.input.jumpPresses += 2));
    const mid = game.distance(s, killer);
    tickWith(game, ticks(1), () => (s.input.jumpPresses += 2));
    expect(game.distance(s, killer)).toBeCloseTo(mid, 1); // no pull while the survivor leads
    tickWith(game, ticks(1.2), () => (s.input.jumpPresses += 2));
    expect(tugState(killer)).toBeNull();
    expect(s.hp).toBeCloseTo(85);
    expect(s.flags.has("grabbed")).toBe(false);
    expect(s.frozen).toBe(false);
    expect(killer.statuses.has("helpless")).toBe(true);
    expect(killer.statuses.remainingTicks("helpless", game.now)).toBeLessThanOrEqual(ticks(0.75));
  });
  it("a stun on Nosferatu during the tug frees the survivor", () => {
    const { game, killer, survivors } = duel();
    const s = survivors[0];
    faceEast(killer);
    place(s, cellPos(55, 50));
    useAbility(game, killer, "bloodhook");
    run(game, ticks(0.9) + 10);
    game.stun(killer, 1, survivors[1]);
    run(game, 1);
    expect(tugState(killer)).toBeNull();
    expect(s.flags.has("grabbed")).toBe(false);
    expect(s.hp).toBeCloseTo(85);
  });
  it("blocked by walls; a miss puts it on a 20 s cooldown", () => {
    const { game, killer } = duel();
    place(killer, cellPos(41, 50));
    body(killer).face({ x: 0, y: 0, z: -1 }); // north, solid wall at (41,48)
    killer.state = killer.body.read();
    useAbility(game, killer, "bloodhook");
    run(game, ticks(0.9) + 4);
    expect(game.objectsOf("bloodhook").length).toBe(0);
    expect(killer.cooldowns.total("bloodhook")).toBe(ticks(20));
  });
});

describe("Nosferatu — Cataclysm", () => {
  it("invisible dash drawing blood puddles, snaps back after 2 s and explodes for 10", () => {
    const { game, killer, survivors } = duel();
    faceEast(killer);
    const start = { ...killer.pos };
    expect(useAbility(game, killer, "cataclysm").ok).toBe(true);
    expect(killer.statuses.level("invisibility")).toBe(4);
    run(game, ticks(1.25) + 1);
    expect(killer.pos.x).toBeGreaterThan(start.x + blocksPerSecond(45) * 1.25 * 0.85);
    expect(game.objectsOf("blood_puddle").length).toBeGreaterThanOrEqual(8); // a trail roughly every puddle radius
    run(game, ticks(0.75) + 1);
    expect(game.distance3(killer.pos, start)).toBeLessThan(0.6);
    expect(survivors[0].hp).toBeCloseTo(90);
    expect(killer.statuses.has("invisibility")).toBe(false);
    expect(killer.statuses.has("stun_immune")).toBe(true);
  });
  it("puddles (12 s): Bleeding II 5 s + Slowness I 6 s + highlight 6 s on touch", () => {
    const { game, killer, survivors } = duel();
    faceEast(killer);
    useAbility(game, killer, "cataclysm");
    run(game, ticks(2.2));
    const s = survivors[1];
    place(s, cellPos(50, 50));
    run(game, 1);
    expect(s.statuses.level("bleeding")).toBe(2);
    expect(s.statuses.level("slowness")).toBe(1);
    expect(s.statuses.remainingTicks("slowness", game.now)).toBeGreaterThan(ticks(5.8));
    expect(game.isRevealedTo(s, killer)).toBe(true);
    run(game, ticks(11.5));
    expect(game.objectsOf("blood_puddle").length).toBe(0);
  });
});

describe("Nosferatu — Hunter's Feast", () => {
  it("bat orb: 5 damage, Oblivious + Creatures 10 s, highlight; Nosferatu Invisibility V + Undetectable until he uses an ability", () => {
    const { game, killer, survivors } = duel();
    const s = survivors[0];
    expect(useAbility(game, killer, "hunters_feast").ok).toBe(true);
    run(game, ticks(0.23) + 6);
    expect(s.hp).toBeCloseTo(95);
    expect(s.statuses.has("oblivious")).toBe(true);
    expect(s.statuses.has("creatures")).toBe(true);
    expect(s.statuses.remainingTicks("creatures", game.now)).toBeGreaterThan(ticks(9.5));
    expect(game.isRevealedTo(s, killer)).toBe(true);
    expect(killer.statuses.level("invisibility")).toBe(5);
    expect(killer.statuses.has("undetectable")).toBe(true);
    expect(killer.cooldowns.remaining("hunters_feast", game.now) / 20).toBeGreaterThan(15.5);
    // Creatures: +25% damage taken; using Lacerate removes his stealth.
    useAbility(game, killer, "lacerate");
    expect(killer.statuses.has("invisibility")).toBe(false);
    expect(killer.statuses.has("undetectable")).toBe(false);
    run(game, ticks(0.3) + 1);
    expect(s.hp).toBeCloseTo(95 - 30);
  });
  it("Cataclysm's own invisibility survives the stealth break that using it causes", () => {
    const { game, killer, survivors } = duel();
    useAbility(game, killer, "hunters_feast");
    run(game, ticks(0.23) + 6);
    expect(killer.statuses.has("undetectable")).toBe(true);
    place(survivors[0], cellPos(70, 12));
    faceEast(killer);
    expect(useAbility(game, killer, "cataclysm").ok).toBe(true);
    expect(killer.statuses.has("undetectable")).toBe(false);
    expect(killer.statuses.level("invisibility")).toBe(4);
    expect(killer.flags.has("feastInvis")).toBe(false);
  });
  it("pressing again redirects it once toward his facing at 3x speed and starts the cooldown", () => {
    const { game, killer, survivors } = duel();
    faceEast(killer);
    place(survivors[0], cellPos(70, 12));
    useAbility(game, killer, "hunters_feast");
    run(game, ticks(0.23) + 5);
    const orb = game.objectsOf("bat_orb")[0];
    const v0 = orb.data.vel as { x: number; y: number; z: number };
    expect(v0.x).toBeGreaterThan(0);
    expect(killer.cooldowns.remaining("hunters_feast", game.now)).toBe(0);
    body(killer).face({ x: 0, y: 0, z: 1 });
    run(game, 1);
    expect(useAbility(game, killer, "hunters_feast").ok).toBe(true);
    const v1 = orb.data.vel as { x: number; y: number; z: number };
    expect(v1.z).toBeCloseTo(v0.x * 3, 5);
    expect(v1.x).toBeCloseTo(0, 5);
    expect(killer.cooldowns.remaining("hunters_feast", game.now) / 20).toBeCloseTo(16, 1);
    expect(useAbility(game, killer, "hunters_feast").ok).toBe(false); // only once
  });
  it("the cooldown starts when it hits a wall", () => {
    const { game, killer, survivors } = duel();
    place(killer, cellPos(41, 50));
    body(killer).face({ x: 0, y: 0, z: -1 });
    killer.state = killer.body.read();
    place(survivors[0], cellPos(70, 12));
    useAbility(game, killer, "hunters_feast");
    run(game, 2);
    expect(killer.cooldowns.remaining("hunters_feast", game.now)).toBe(0); // not during the windup
    run(game, ticks(0.23) + 4);
    expect(game.objectsOf("bat_orb").length).toBe(0);
    expect(killer.cooldowns.remaining("hunters_feast", game.now) / 20).toBeGreaterThan(15.5);
    expect(killer.statuses.has("undetectable")).toBe(false);
  });
});

describe("Nosferatu — Ascension", () => {
  it("bat form: flight flags, ~2.1x speed, invincible, unstunnable, stamina frozen, smaller terror radius, all survivors highlighted", () => {
    const { game, killer, survivors } = duel();
    run(game, 1);
    const baseWalk = killer.walkBps;
    expect(useAbility(game, killer, "ascension").ok).toBe(true);
    run(game, 1);
    expect(killer.flags.has("batForm")).toBe(true);
    expect(killer.flags.has("flying")).toBe(true);
    expect(killer.walkBps).toBeCloseTo(baseWalk * 2.1, 3);
    expect(killer.staminaFrozen).toBe(true);
    expect(game.terrorRadius(killer)).toBeCloseTo(studs(75) * 0.5);
    for (const s of survivors) expect(game.isRevealedTo(s, killer)).toBe(true);
    expect(game.damage(killer, 100, survivors[0]).cancelled).toBe(true);
    expect(game.stun(killer, 2, survivors[0])).toBe(false);
    expect(useAbility(game, killer, "bloodhook").reason).toBe("bat form");
    expect(useAbility(game, killer, "cataclysm").reason).toBe("bat form");
    expect(useAbility(game, killer, "hunters_feast").reason).toBe("bat form");
  });
  it("pressing again dismounts: Slowness III + Helpless 4 s, 32 s cooldown, stamina regenerates again", () => {
    const { game, killer } = duel();
    useAbility(game, killer, "ascension");
    run(game, ticks(2));
    expect(useAbility(game, killer, "ascension").ok).toBe(true);
    expect(killer.flags.has("batForm")).toBe(false);
    expect(killer.flags.has("flying")).toBe(false);
    expect(killer.statuses.level("slowness")).toBe(3);
    expect(killer.statuses.remainingTicks("helpless", game.now)).toBe(ticks(4));
    expect(killer.statuses.has("invincible")).toBe(false);
    expect(killer.staminaFrozen).toBe(false);
    expect(killer.res.terrorMul).toBeUndefined();
    expect(killer.cooldowns.remaining("ascension", game.now) / 20).toBeCloseTo(32, 1);
  });
  it("times out after 10 s with the same penalty", () => {
    const { game, killer } = duel();
    useAbility(game, killer, "ascension");
    run(game, ticks(9.9));
    expect(killer.flags.has("batForm")).toBe(true);
    run(game, ticks(0.2));
    expect(killer.flags.has("batForm")).toBe(false);
    expect(killer.statuses.has("helpless")).toBe(true);
    expect(killer.statuses.level("slowness")).toBe(3);
  });
  it("Dive (Lacerate in bat form): an immediate hit bites 5 + tosses 5, ends the form without penalty", () => {
    const { game, killer, survivors } = duel();
    const s = survivors[0];
    place(s, cellPos(40, 51)); // inside the dive's hit radius from the start: dive time 0
    useAbility(game, killer, "ascension");
    run(game, 2);
    game.startCooldown(killer, "lacerate", 0);
    expect(useAbility(game, killer, "lacerate").ok).toBe(true);
    expect(useAbility(game, killer, "ascension").ok).toBe(true); // dismount ignored while diving
    expect(killer.flags.has("batForm")).toBe(true);
    run(game, ticks(0.6) + 1);
    expect(killer.flags.has("batForm")).toBe(false);
    expect(s.hp).toBeCloseTo(95);
    expect(s.flags.has("grabbed")).toBe(true);
    run(game, ticks(0.8) + 1);
    expect(s.hp).toBeCloseTo(90);
    expect(s.flags.has("grabbed")).toBe(false);
    expect(killer.statuses.has("helpless")).toBe(false);
    expect(killer.cooldowns.remaining("ascension", game.now) / 20).toBeGreaterThan(30);
  });
  it("Dive toss damage scales with dive time (max 30 from 0.55 s)", () => {
    const p = { tossBase: 5, tossMax: 30, tossMaxAt: 0.55 };
    expect(diveTossDamage(p, 0)).toBe(5);
    expect(diveTossDamage(p, 0.275)).toBeCloseTo(17.5);
    expect(diveTossDamage(p, 1)).toBe(30);
    const { game, killer, survivors } = duel();
    const s = survivors[0];
    faceEast(killer);
    place(s, cellPos(47, 50)); // 7 blocks: contact after about 0.4 s of diving at blocksPerSecond(60)
    useAbility(game, killer, "ascension");
    run(game, 2);
    useAbility(game, killer, "lacerate");
    run(game, ticks(0.6) + ticks(0.5) + ticks(0.8) + 2);
    const total = 100 - s.hp;
    expect(total).toBeGreaterThan(5 + 20);
    expect(total).toBeLessThanOrEqual(35);
  });
  it("a missed Dive: 20 self-damage, Slowness III + Helpless 3 s (not the 4 s dismount penalty)", () => {
    const { game, killer, survivors } = duel();
    faceEast(killer);
    place(survivors[0], cellPos(70, 12));
    useAbility(game, killer, "ascension");
    run(game, 2);
    useAbility(game, killer, "lacerate");
    run(game, ticks(0.6) + ticks(1.5) + 2);
    expect(killer.flags.has("batForm")).toBe(false);
    expect(killer.hp).toBe(1750 - 20);
    expect(killer.statuses.level("slowness")).toBe(3);
    expect(killer.statuses.remainingTicks("helpless", game.now)).toBeLessThanOrEqual(ticks(3));
    expect(killer.statuses.remainingTicks("helpless", game.now)).toBeGreaterThan(ticks(2.8));
  });
});
