import { afterEach, describe, expect, it } from "vitest";
import { cellPos, faceTo, place, realMatch, run, type FakeBody } from "../helpers";
import { useAbility, abilityHudText } from "../../src/abilities/engine";
import { resetConfig } from "../../src/core/config";
import { blocksPerSecond, ticks } from "../../src/core/scale";
import type { Actor } from "../../src/entities/actor";
import type { Vec3 } from "../../src/util/vec";

afterEach(() => resetConfig());

function smatch() {
  const m = realMatch("slasher", ["shedletsky", "noob"]);
  place(m.survivors[1], cellPos(14, 72));
  const shed = m.survivors[0];
  place(shed, { x: 40.5, y: 100, z: 52.5 });
  faceTo(shed, m.killer);
  faceTo(m.killer, shed);
  return { ...m, shed };
}

function face(a: Actor, dir: Vec3): void {
  (a.body as FakeBody).face(dir);
  a.state = a.body.read();
}

describe("Shedletsky — Slash", () => {
  it("0.55 s windup with Resistance II, then 30 damage and a 3 s stun; slowed 75% for 1.4 s; 40 s cooldown", () => {
    const { game, shed, killer } = smatch();
    expect(useAbility(game, shed, "slash").ok).toBe(true);
    expect(shed.cooldowns.remaining("slash", game.now)).toBe(ticks(40));
    run(game, 1);
    expect(shed.statuses.level("resistance")).toBe(2);
    expect(shed.walkBps).toBeCloseTo(blocksPerSecond(12) * 0.25, 3);
    expect(game.damage(shed, 10, null).dealt).toBeCloseTo(6);
    run(game, ticks(0.55) - 2);
    expect(killer.hp).toBe(killer.maxHp);
    run(game, 1);
    expect(killer.hp).toBe(killer.maxHp - 30);
    expect(killer.isStunned(game.now)).toBe(true);
    // 3 s + the killer's 0.6 s recovery
    expect((killer.stunnedUntil - game.now) / 20).toBeCloseTo(3.6, 1);
    run(game, 1);
    expect(shed.statuses.has("resistance")).toBe(false);
    run(game, ticks(1.4) - ticks(0.55));
    expect(shed.walkBps).toBeCloseTo(blocksPerSecond(12), 3);
  });

  it("the hitbox lingers 0.4 s: a killer stepping into the arc right after the swing is still hit, once", () => {
    const { game, shed, killer } = smatch();
    place(killer, cellPos(46, 52));
    useAbility(game, shed, "slash");
    run(game, ticks(0.55) + 3);
    expect(killer.hp).toBe(killer.maxHp);
    place(killer, cellPos(40, 50));
    run(game, 2);
    expect(killer.hp).toBe(killer.maxHp - 30);
    expect(killer.isStunned(game.now)).toBe(true);
    run(game, ticks(0.4));
    expect(killer.hp).toBe(killer.maxHp - 30);
  });

  it("nothing after the lingering hitbox ends", () => {
    const { game, shed, killer } = smatch();
    place(killer, cellPos(46, 52));
    useAbility(game, shed, "slash");
    run(game, ticks(0.55) + ticks(0.4) + 2);
    place(killer, cellPos(40, 50));
    run(game, 5);
    expect(killer.hp).toBe(killer.maxHp);
  });

  it("a stun during the windup cancels the swing", () => {
    const { game, shed, killer } = smatch();
    useAbility(game, shed, "slash");
    run(game, 3);
    game.stun(shed, 1, killer);
    run(game, ticks(1));
    expect(killer.hp).toBe(killer.maxHp);
  });

  it("an attack-immune killer takes nothing and is not stunned", () => {
    const { game, shed, killer } = smatch();
    game.status(killer, "invincible", 1, 5, killer);
    useAbility(game, shed, "slash");
    run(game, ticks(0.6));
    expect(killer.hp).toBe(killer.maxHp);
    expect(killer.isStunned(game.now)).toBe(false);
  });

  it("misses when facing away", () => {
    const { game, shed, killer } = smatch();
    face(shed, { x: 0, y: 0, z: 1 });
    useAbility(game, shed, "slash");
    run(game, ticks(1));
    expect(killer.hp).toBe(killer.maxHp);
  });
});

describe("Shedletsky — Fried Chicken", () => {
  it("not usable at full HP", () => {
    const { game, shed } = smatch();
    expect(useAbility(game, shed, "fried_chicken")).toEqual({ ok: false, reason: "full HP" });
    expect(shed.res.chicken).toBe(2);
  });

  it("heals 5 now + 25 over 10 s, slows 75% for 3 s, 70 s cooldown, 2 per round", () => {
    const { game, shed } = smatch();
    place(shed, cellPos(14, 66));
    shed.hp = 40;
    expect(useAbility(game, shed, "fried_chicken").ok).toBe(true);
    expect(shed.hp).toBe(45);
    expect(shed.res.chicken).toBe(1);
    expect(shed.cooldowns.remaining("fried_chicken", game.now)).toBe(ticks(70));
    expect(abilityHudText(game, shed, shed.ability("fried_chicken")!).label).toContain("x1");
    run(game, 1);
    expect(shed.walkBps).toBeCloseTo(blocksPerSecond(12) * 0.25 * 0.9, 3); // limping below 50%
    run(game, ticks(3));
    expect(shed.walkBps).toBeGreaterThan(blocksPerSecond(12) * 0.8);
    run(game, ticks(8));
    expect(shed.hp).toBeCloseTo(70);
    run(game, ticks(2));
    expect(shed.hp).toBeCloseTo(70);
    shed.cooldowns.reset("fried_chicken");
    useAbility(game, shed, "fried_chicken");
    expect(shed.res.chicken).toBe(0);
    shed.cooldowns.reset("fried_chicken");
    expect(useAbility(game, shed, "fried_chicken")).toEqual({ ok: false, reason: "no chicken left" });
  });

  it("5+ damage cancels the healing over time; smaller hits do not", () => {
    const { game, shed, killer } = smatch();
    shed.hp = 60;
    useAbility(game, shed, "fried_chicken");
    run(game, ticks(2));
    const hp1 = shed.hp;
    game.damage(shed, 3, killer);
    run(game, ticks(2));
    expect(shed.hp).toBeGreaterThan(hp1 - 3 + 3);
    game.damage(shed, 6, killer);
    const hp2 = shed.hp;
    expect(shed.statuses.has("regeneration")).toBe(false);
    run(game, ticks(3));
    expect(shed.hp).toBe(hp2);
  });
});
