import { afterEach, describe, expect, it } from "vitest";
import { body, cellPos, faceTo, place, realMatch, run } from "../helpers";
import { useAbility } from "../../src/abilities/engine";
import { config, resetConfig } from "../../src/core/config";
import { studs, ticks } from "../../src/core/scale";
import type { Game } from "../../src/core/game";
import type { Actor } from "../../src/entities/actor";
import type { Vec3 } from "../../src/util/vec";

afterEach(() => resetConfig());

function setup(survivors: string[] = ["taph", "elliot", "elliot"]) {
  const m = realMatch("slasher", survivors);
  const taph = m.survivors[0];
  place(m.killer, cellPos(70, 10));
  place(taph, cellPos(10, 77));
  faceTo(taph, cellPos(70, 77));
  return { ...m, taph };
}

function wire(game: Game, taph: Actor) {
  taph.cooldowns.reset("tripwire");
  expect(useAbility(game, taph, "tripwire").ok).toBe(true);
  const all = game.objectsOf("tripwire", taph);
  return all[all.length - 1];
}

function mine(game: Game, taph: Actor) {
  taph.cooldowns.reset("subspace_tripmine");
  expect(useAbility(game, taph, "subspace_tripmine").ok).toBe(true);
  return game.objectsOf("tripmine", taph)[0];
}

describe("Taph — Tripwire", () => {
  it("places an 8-stud wire across his facing, 10 HP, two stakes; 25 s cooldown", () => {
    const { game, taph, ports } = setup();
    const before = ports.props.length;
    const w = wire(game, taph);
    const a = w.data.a as Vec3;
    const b = w.data.b as Vec3;
    expect(w.hp).toBe(10);
    expect(w.targetableBy).toBe("killer");
    expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeCloseTo(studs(8));
    expect(a.x).toBeCloseTo(b.x); // perpendicular to +X facing
    expect(w.pos.x - taph.pos.x).toBeCloseTo(studs(4), 1);
    expect(ports.props.length - before).toBe(2);
    expect(ports.props.slice(-2).every((p) => p.kind === "tripwire_stake")).toBe(true);
    expect(taph.cooldowns.remaining("tripwire", game.now)).toBe(ticks(25));
  });
  it("arms after 1.5 s; then the killer crossing it is revealed to every survivor 8 s and gets Slowness II 4 s; the wire is used up", () => {
    const { game, taph, killer, survivors, ports } = setup();
    const w = wire(game, taph);
    place(killer, w.pos);
    run(game, ticks(1));
    expect(killer.statuses.has("slowness")).toBe(false);
    expect(w.dead).toBe(false);
    place(killer, { x: w.pos.x - 2, y: w.pos.y, z: w.pos.z });
    run(game, ticks(1));
    // Fast crossing between two ticks still counts (body moved by the adapter, read at the next tick).
    body(killer).moveTo({ x: w.pos.x + 2, y: w.pos.y, z: w.pos.z });
    run(game, 1);
    expect(w.dead).toBe(true);
    expect(killer.statuses.level("slowness")).toBe(2);
    expect(killer.statuses.remainingTicks("slowness", game.now)).toBe(ticks(4));
    expect(game.isRevealedTo(killer, survivors[1])).toBe(true);
    expect(game.isRevealedTo(killer, taph)).toBe(true);
    run(game, ticks(8));
    expect(game.isRevealedTo(killer, survivors[1])).toBe(false);
    expect(ports.props.filter((p) => p.kind === "tripwire_stake").every((p) => p.removed)).toBe(true);
  });
  it("max 3 per Taph: a 4th removes the oldest", () => {
    const { game, taph } = setup();
    const first = wire(game, taph);
    place(taph, cellPos(20, 77));
    wire(game, taph);
    place(taph, cellPos(30, 77));
    wire(game, taph);
    place(taph, cellPos(40, 77));
    wire(game, taph);
    expect(first.dead).toBe(true);
    expect(game.objectsOf("tripwire", taph).length).toBe(3);
  });
  it("the killer can break it (10 HP) without triggering it", () => {
    const { game, taph, killer } = setup();
    const w = wire(game, taph);
    run(game, ticks(2));
    place(killer, { x: w.pos.x + 2.2, y: w.pos.y, z: w.pos.z });
    faceTo(killer, w.pos);
    useAbility(game, killer, "slash");
    run(game, ticks(0.2) + 1);
    expect(w.dead).toBe(true);
    expect(killer.statuses.has("slowness")).toBe(false);
  });
  it("each other living Taph shortens the effects by 1.5 s", () => {
    const { game, survivors, killer } = setup(["taph", "taph", "elliot"]);
    const t1 = survivors[0];
    const w = wire(game, t1);
    run(game, ticks(1.5));
    place(killer, w.pos);
    run(game, 1);
    expect(killer.statuses.remainingTicks("slowness", game.now)).toBe(ticks(2.5));
    const rev = game.reveals.find((r) => r.source === "tripwire")!;
    expect(rev.endTick - game.now).toBe(ticks(6.5));
  });
  it("never expires (it only fades)", () => {
    const { game, taph, killer } = setup();
    const w = wire(game, taph);
    run(game, ticks(200));
    expect(w.dead).toBe(false);
    place(killer, w.pos);
    run(game, 1);
    expect(killer.statuses.level("slowness")).toBe(2);
  });
});

describe("Taph — Subspace Tripmine", () => {
  it("is thrown 12 studs ahead and cannot pass walls", () => {
    const { game, taph } = setup();
    const m = mine(game, taph);
    expect(m.pos.x - taph.pos.x).toBeCloseTo(studs(12), 0);
    expect(taph.cooldowns.remaining("subspace_tripmine", game.now)).toBe(ticks(40));
    m.dead = true;
    game.objects = game.objects.filter((o) => !o.dead);
    place(taph, cellPos(42, 56));
    faceTo(taph, cellPos(42, 70)); // wall row z = 58
    const m2 = mine(game, taph);
    expect(m2.pos.z).toBeLessThan(58);
  });
  it("killer within 19 studs: 0.5 s later Helpless I 3 s, Subspaced III 6 s, Weakness V 6 s; Taph's cooldown -10 s", () => {
    const { game, taph, killer } = setup();
    place(taph, cellPos(10, 74));
    faceTo(taph, cellPos(70, 74));
    const m = mine(game, taph);
    place(taph, cellPos(10, 60)); // out of the blast
    run(game, ticks(5));
    const cdBefore = taph.cooldowns.remaining("subspace_tripmine", game.now);
    place(killer, { x: m.pos.x + studs(17), y: m.pos.y, z: m.pos.z });
    run(game, 1);
    expect(m.dead).toBe(false);
    run(game, ticks(0.5));
    expect(m.dead).toBe(true);
    expect(killer.statuses.has("helpless")).toBe(true);
    expect(killer.statuses.remainingTicks("helpless", game.now)).toBeGreaterThan(ticks(2.9));
    expect(killer.statuses.level("subspaced")).toBe(3);
    expect(killer.statuses.level("weakness")).toBe(5);
    expect(killer.statuses.remainingTicks("weakness", game.now)).toBeGreaterThan(ticks(5.9));
    expect(taph.statuses.has("subspaced")).toBe(false);
    const cdAfter = taph.cooldowns.remaining("subspace_tripmine", game.now);
    expect(cdBefore - cdAfter).toBeGreaterThan(ticks(10));
  });
  it("Taph inside the blast gets the same effects", () => {
    const { game, taph, killer } = setup();
    const m = mine(game, taph);
    place(killer, { x: m.pos.x + studs(15), y: m.pos.y, z: m.pos.z });
    run(game, ticks(0.6));
    expect(m.dead).toBe(true);
    expect(taph.statuses.level("subspaced")).toBe(3);
    expect(taph.statuses.has("helpless")).toBe(true);
    expect(taph.statuses.level("weakness")).toBe(5);
  });
  it("affects an invincible (ENRAGED) killer", () => {
    const { game, taph, killer } = setup();
    const m = mine(game, taph);
    place(taph, cellPos(10, 60));
    game.status(killer, "invincible", 1, 10, killer);
    place(killer, { x: m.pos.x + studs(10), y: m.pos.y, z: m.pos.z });
    run(game, ticks(0.6));
    expect(killer.statuses.level("subspaced")).toBe(3);
    expect(killer.statuses.has("helpless")).toBe(true);
  });
  it("a killer who leaves the blast before it goes off is spared", () => {
    const { game, taph, killer } = setup();
    const m = mine(game, taph);
    place(taph, cellPos(10, 60));
    place(killer, { x: m.pos.x + studs(18), y: m.pos.y, z: m.pos.z });
    run(game, 2);
    place(killer, cellPos(70, 10));
    run(game, ticks(0.5));
    expect(m.dead).toBe(true);
    expect(killer.statuses.has("subspaced")).toBe(false);
  });
  it("attacked before it goes off: only Subspaced I", () => {
    const { game, taph, killer } = setup();
    const m = mine(game, taph);
    place(taph, cellPos(10, 60));
    place(killer, { x: m.pos.x + 2, y: m.pos.y, z: m.pos.z });
    faceTo(killer, m.pos);
    useAbility(game, killer, "slash");
    run(game, ticks(0.2) + 1);
    expect(m.dead).toBe(true);
    expect(killer.statuses.level("subspaced")).toBe(1);
    expect(killer.statuses.has("helpless")).toBe(false);
    expect(killer.statuses.has("weakness")).toBe(false);
  });
  it("pulses every 13 s and explodes on its own after 50 s", () => {
    const { game, taph, killer } = setup();
    const m = mine(game, taph);
    place(taph, cellPos(10, 60));
    const voidId = config().particles.void;
    game.fx.drain();
    run(game, ticks(13));
    expect(game.fx.drain().some((e) => e.t === "particle" && e.id === voidId && !e.to)).toBe(true);
    run(game, ticks(37) - 1);
    expect(m.dead).toBe(false);
    run(game, 1);
    expect(m.dead).toBe(true);
    expect(killer.statuses.has("subspaced")).toBe(false);
  });
  it("each other living Taph shortens the effects by 2 s", () => {
    const { game, survivors, killer } = setup(["taph", "taph", "elliot"]);
    const t1 = survivors[0];
    const m = mine(game, t1);
    place(t1, cellPos(10, 60));
    place(killer, { x: m.pos.x + studs(10), y: m.pos.y, z: m.pos.z });
    run(game, ticks(0.5) + 1);
    expect(m.dead).toBe(true);
    expect(killer.statuses.remainingTicks("helpless", game.now)).toBeLessThanOrEqual(ticks(1));
    expect(killer.statuses.remainingTicks("subspaced", game.now)).toBeLessThanOrEqual(ticks(4));
  });
});

describe("Taph — death", () => {
  it("his traps vanish when he dies", () => {
    const { game, taph, killer } = setup();
    wire(game, taph);
    place(taph, cellPos(20, 77));
    wire(game, taph);
    mine(game, taph);
    expect(game.objectsOf("tripwire", taph).length).toBe(2);
    game.damage(taph, 500, killer);
    expect(taph.alive).toBe(false);
    expect(game.objectsOf("tripwire", taph).length).toBe(0);
    expect(game.objectsOf("tripmine", taph).length).toBe(0);
  });
});
