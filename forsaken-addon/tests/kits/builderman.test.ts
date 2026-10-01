import { afterEach, describe, expect, it } from "vitest";
import { cellPos, faceTo, place, realMatch, run } from "../helpers";
import { useAbility } from "../../src/abilities/engine";
import { resetConfig } from "../../src/core/config";
import { studs, ticks } from "../../src/core/scale";
import { buildingActive } from "../../src/abilities/kits/builderman";
import type { Game } from "../../src/core/game";
import type { Actor } from "../../src/entities/actor";
import type { WorldObject } from "../../src/abilities/objects";

afterEach(() => resetConfig());

function setup(survivors: string[] = ["builderman", "elliot", "elliot"]) {
  const m = realMatch("slasher", survivors);
  const bm = m.survivors[0];
  place(m.killer, cellPos(70, 10));
  place(bm, cellPos(10, 77));
  faceTo(bm, cellPos(70, 77));
  return { ...m, bm };
}

function build(game: Game, bm: Actor, kind: "sentry" | "dispenser"): WorldObject {
  bm.cooldowns.reset(kind);
  expect(useAbility(game, bm, kind).ok).toBe(true);
  run(game, ticks(6));
  const o = game.objectsOf(kind, bm)[0];
  expect(o).toBeDefined();
  return o;
}

describe("Builderman — Sentry", () => {
  it("6 s build, then a 30 HP Sentry in front; the 45 s cooldown starts when it is finished", () => {
    const { game, bm } = setup();
    useAbility(game, bm, "sentry");
    expect(bm.cooldowns.remaining("sentry", game.now)).toBe(0);
    run(game, ticks(6) - 1);
    expect(game.objectsOf("sentry").length).toBe(0);
    run(game, 1);
    const s = game.objectsOf("sentry", bm)[0];
    expect(s.hp).toBe(30);
    expect(s.targetableBy).toBe("killer");
    expect(s.pos.x - bm.pos.x).toBeCloseTo(studs(4), 0);
    expect(s.blockCells.length).toBe(1);
    expect(game.grid.isDynamicBlocked(s.blockCells[0].x, s.blockCells[0].z)).toBe(true);
    expect(bm.cooldowns.remaining("sentry", game.now)).toBe(ticks(45));
  });
  it("taking damage during the build cancels it (no building, no cooldown)", () => {
    const { game, bm, killer } = setup();
    useAbility(game, bm, "sentry");
    run(game, ticks(3));
    game.damage(bm, 5, killer);
    run(game, ticks(4));
    expect(game.objectsOf("sentry").length).toBe(0);
    expect(bm.cooldowns.remaining("sentry", game.now)).toBe(0);
  });
  it("shoots the killer within 65 studs every second: Slowness II 1 s, Bleeding II 2 s, 0.65 damage", () => {
    const { game, bm, killer } = setup();
    const s = build(game, bm, "sentry");
    place(killer, { x: s.pos.x + studs(60), y: s.pos.y, z: s.pos.z });
    run(game, 1);
    expect(killer.statuses.level("slowness")).toBe(2);
    expect(killer.statuses.level("bleeding")).toBe(2);
    expect(killer.hp).toBeCloseTo(2000 - 0.65);
    expect(game.fx.events.some((e) => e.t === "line")).toBe(true);
    run(game, ticks(1));
    expect(killer.hp).toBeLessThan(2000 - 1.3 - 3.9);
    expect(killer.statuses.level("bleeding")).toBe(2);
  });
  it("its shots ignore invincibility (ENRAGED Slasher)", () => {
    const { game, bm, killer } = setup();
    const s = build(game, bm, "sentry");
    place(killer, { x: s.pos.x + studs(30), y: s.pos.y, z: s.pos.z });
    game.status(killer, "invincible", 1, 10, killer);
    run(game, 1);
    expect(killer.statuses.level("slowness")).toBe(2);
    expect(killer.hp).toBeCloseTo(2000 - 0.65);
  });
  it("does not shoot beyond 65 studs, through walls, or through a survivor standing in the line", () => {
    const { game, bm, killer, survivors } = setup();
    const s = build(game, bm, "sentry");
    place(killer, { x: s.pos.x + studs(70), y: s.pos.y, z: s.pos.z });
    run(game, ticks(1.5));
    expect(killer.hp).toBe(2000);
    place(killer, { x: s.pos.x + studs(30), y: s.pos.y, z: s.pos.z });
    place(survivors[1], { x: s.pos.x + studs(15), y: s.pos.y, z: s.pos.z });
    run(game, ticks(1.5));
    expect(killer.hp).toBe(2000);
    expect(killer.statuses.has("slowness")).toBe(false);
    // Behind the wall south of row 72 (cells x 46-52).
    place(survivors[1], cellPos(70, 10));
    place(killer, cellPos(70, 10));
    place(bm, cellPos(49, 74));
    faceTo(bm, cellPos(49, 79));
    const s2 = build(game, bm, "sentry");
    expect(game.objectsOf("sentry").length).toBe(1);
    place(killer, cellPos(49, 70));
    run(game, ticks(1.5));
    expect(s2.dead).toBe(false);
    expect(killer.hp).toBe(2000);
  });
  it("range shrinks 16% per other active Sentry", () => {
    const { game, killer, survivors } = setup(["builderman", "builderman", "elliot"]);
    const [b1, b2] = survivors;
    place(b1, cellPos(5, 77));
    faceTo(b1, cellPos(70, 77));
    place(b2, cellPos(70, 77));
    faceTo(b2, cellPos(79, 77));
    const s1 = build(game, b1, "sentry");
    place(killer, { x: s1.pos.x + studs(58), y: s1.pos.y, z: s1.pos.z });
    run(game, 1);
    expect(killer.hp).toBeCloseTo(2000 - 0.65);
    place(killer, cellPos(70, 10));
    killer.statuses.clear();
    killer.hp = 2000;
    build(game, b2, "sentry");
    place(killer, { x: s1.pos.x + studs(58), y: s1.pos.y, z: s1.pos.z }); // > 65 x 0.84 = 54.6 studs
    run(game, ticks(1.5));
    expect(killer.hp).toBe(2000);
    place(killer, { x: s1.pos.x + studs(50), y: s1.pos.y, z: s1.pos.z });
    run(game, ticks(1));
    expect(killer.hp).toBeLessThan(2000);
  });
  it("one per Builderman: a new Sentry replaces the old one", () => {
    const { game, bm } = setup();
    const first = build(game, bm, "sentry");
    place(bm, cellPos(30, 77));
    const second = build(game, bm, "sentry");
    expect(first.dead).toBe(true);
    expect(second.dead).toBe(false);
    expect(game.objectsOf("sentry", bm).length).toBe(1);
  });
  it("no other building within 125 studs of a Sentry", () => {
    const { game, bm } = setup();
    build(game, bm, "sentry");
    place(bm, cellPos(10, 75));
    expect(useAbility(game, bm, "dispenser").reason).toBe("too close to a Sentry (125 studs)");
    place(bm, cellPos(40, 75)); // ~28 blocks = 79 studs: still too close
    expect(useAbility(game, bm, "dispenser").reason).toBe("too close to a Sentry (125 studs)");
    place(bm, cellPos(65, 77));
    expect(useAbility(game, bm, "dispenser").ok).toBe(true);
  });
  it("the killer's attacks destroy it (30 HP)", () => {
    const { game, bm, killer } = setup();
    const s = build(game, bm, "sentry");
    place(killer, { x: s.pos.x + 2, y: s.pos.y, z: s.pos.z });
    place(bm, cellPos(10, 70));
    faceTo(killer, s.pos);
    useAbility(game, killer, "slash");
    run(game, ticks(0.2) + 1);
    expect(s.hp).toBe(10);
    killer.cooldowns.reset("slash");
    killer.stunnedUntil = 0;
    useAbility(game, killer, "slash");
    run(game, ticks(0.2) + 1);
    expect(s.dead).toBe(true);
    expect(game.grid.isDynamicBlocked(s.blockCells[0].x, s.blockCells[0].z)).toBe(false);
  });
});

describe("Builderman — Dispenser", () => {
  it("heals survivors within 16 studs by 1 HP/s (not Undetectable ones), Builderman included", () => {
    const { game, bm, survivors } = setup();
    const [, e1, e2] = survivors;
    const d = build(game, bm, "dispenser");
    expect(d.hp).toBe(15);
    place(e1, { x: d.pos.x + studs(10), y: d.pos.y, z: d.pos.z });
    place(e2, { x: d.pos.x, y: d.pos.y, z: d.pos.z + studs(20) });
    e1.hp = 50;
    e2.hp = 50;
    bm.hp = 50;
    run(game, ticks(4));
    expect(e1.hp).toBeCloseTo(54, 0);
    expect(bm.hp).toBeCloseTo(54, 0);
    expect(e2.hp).toBe(50);
    game.status(e1, "undetectable", 1, 10, e1);
    run(game, ticks(2));
    expect(e1.hp).toBeCloseTo(54, 0);
  });
  it("heal rate drops 8% per other active Dispenser", () => {
    const { game, survivors } = setup(["builderman", "builderman", "elliot"]);
    const [b1, b2, e1] = survivors;
    place(b1, cellPos(5, 77));
    faceTo(b1, cellPos(70, 77));
    place(b2, cellPos(40, 77));
    faceTo(b2, cellPos(79, 77));
    const d1 = build(game, b1, "dispenser");
    build(game, b2, "dispenser");
    place(e1, { x: d1.pos.x, y: d1.pos.y, z: d1.pos.z + 1 });
    place(b1, cellPos(5, 70));
    place(b2, cellPos(60, 70));
    e1.hp = 40;
    run(game, ticks(10));
    expect(e1.hp).toBeCloseTo(40 + 9.2, 0);
  });
});

describe("Builderman — Carry / Place", () => {
  it("picks up the nearest own building: inactive, -10% speed, no sprint; places it in front and it reactivates after 1 s", () => {
    const { game, bm, killer } = setup();
    const s = build(game, bm, "sentry");
    expect(useAbility(game, bm, "carry").ok).toBe(true);
    expect(s.data.carried).toBe(1);
    expect(s.targetableBy).toBeNull();
    expect(bm.moveMods.find((m) => m.id === "carry")).toMatchObject({ mul: 0.9, noSprint: true });
    run(game, 1);
    expect(bm.canSprint).toBe(false);
    // Carried: does not shoot.
    place(killer, { x: bm.pos.x + studs(20), y: bm.pos.y, z: bm.pos.z });
    run(game, ticks(1.5));
    expect(killer.hp).toBe(2000);
    // Place it again.
    place(killer, cellPos(70, 10));
    place(bm, cellPos(20, 77));
    faceTo(bm, cellPos(70, 77));
    expect(useAbility(game, bm, "carry").ok).toBe(true);
    expect(s.data.carried).toBe(0);
    expect(s.pos.x).toBeCloseTo(bm.pos.x + studs(4), 0);
    expect(bm.moveMods.some((m) => m.id === "carry")).toBe(false);
    expect(buildingActive(s, game)).toBe(false);
    run(game, ticks(1));
    expect(buildingActive(s, game)).toBe(true);
  });
  it("10+ damage while carrying destroys the building", () => {
    const { game, bm, killer } = setup();
    const s = build(game, bm, "dispenser");
    useAbility(game, bm, "carry");
    game.damage(bm, 5, killer);
    expect(s.dead).toBe(false);
    game.damage(bm, 12, killer);
    expect(s.dead).toBe(true);
    expect(bm.data("carry").active).toBe(false);
    expect(bm.moveMods.some((m) => m.id === "carry")).toBe(false);
  });
  it("fails with nothing nearby; cannot build while carrying", () => {
    const { game, bm } = setup();
    expect(useAbility(game, bm, "carry").reason).toBe("no building nearby");
    build(game, bm, "sentry");
    place(bm, cellPos(17, 77)); // > 10 studs from the Sentry
    expect(useAbility(game, bm, "carry").reason).toBe("no building nearby");
    place(bm, cellPos(10, 77));
    useAbility(game, bm, "carry");
    expect(useAbility(game, bm, "dispenser").reason).toBe("carrying a building");
  });
});
