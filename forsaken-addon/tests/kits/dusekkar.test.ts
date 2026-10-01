import { afterEach, describe, expect, it } from "vitest";
import { cellPos, faceTo, place, realMatch, run } from "../helpers";
import { useAbility } from "../../src/abilities/engine";
import { resetConfig } from "../../src/core/config";
import { studs, ticks } from "../../src/core/scale";
import { shieldedAlly } from "../../src/abilities/kits/dusekkar";
import { ritualOf } from "../../src/abilities/kits/two_time";

afterEach(() => resetConfig());

function setup(survivors: string[] = ["dusekkar", "elliot", "elliot"]) {
  const m = realMatch("slasher", survivors);
  const dus = m.survivors[0];
  place(m.killer, cellPos(70, 10));
  place(dus, cellPos(10, 77));
  faceTo(dus, cellPos(70, 77));
  return { ...m, dus };
}

describe("Dusekkar — Levitation", () => {
  it("silent footsteps; flagged for John Doe's trail", () => {
    const { dus } = setup();
    expect(dus.flags.has("silent")).toBe(true);
    expect(dus.flags.has("levitating")).toBe(true);
  });
});

describe("Dusekkar — Spawn Protection", () => {
  it("channels Resistance IV on the aimed ally while Dusekkar is slowed 30%", () => {
    const { game, dus, survivors } = setup();
    const ally = survivors[1];
    place(ally, cellPos(30, 77));
    expect(useAbility(game, dus, "spawn_protection").ok).toBe(true);
    expect(shieldedAlly(game, dus)).toBe(ally);
    expect(ally.statuses.level("resistance")).toBe(4);
    expect(dus.moveMods.find((m) => m.id === "spawn_protection")?.mul).toBe(0.7);
    expect(dus.cooldowns.remaining("spawn_protection", game.now)).toBe(0);
    const hp = ally.hp;
    game.damage(ally, 20, game.killer);
    expect(hp - ally.hp).toBeCloseTo(4);
  });
  it("nullifies one lethal hit completely, then breaks and starts the 35 s cooldown", () => {
    const { game, dus, survivors, killer } = setup();
    const ally = survivors[1];
    place(ally, cellPos(30, 77));
    ally.hp = 15;
    useAbility(game, dus, "spawn_protection");
    const ev = game.damage(ally, 500, killer);
    expect(ev.killed).toBe(false);
    expect(ally.alive).toBe(true);
    expect(ally.hp).toBe(15);
    expect(shieldedAlly(game, dus)).toBeNull();
    expect(ally.statuses.has("resistance")).toBe(false);
    expect(dus.cooldowns.remaining("spawn_protection", game.now)).toBe(ticks(35));
    game.damage(ally, 500, killer);
    expect(ally.alive).toBe(false);
  });
  it("is spent before Two Time's second life", () => {
    const { game, dus, survivors, killer } = setup(["dusekkar", "two_time", "elliot"]);
    const tt = survivors[1];
    place(tt, cellPos(30, 77));
    useAbility(game, tt, "ritual");
    run(game, ticks(4) + 1);
    tt.res.oblation = 100;
    useAbility(game, dus, "spawn_protection");
    game.damage(tt, 500, killer);
    expect(tt.alive).toBe(true);
    expect(tt.res.secondLifeUsed).toBe(0);
    expect(ritualOf(game, tt)).not.toBeNull();
  });
  it("lasts up to 3.5 s; pressing again ends it early and restores the ally's own Resistance", () => {
    const { game, dus, survivors } = setup();
    const ally = survivors[1];
    place(ally, cellPos(30, 77));
    useAbility(game, dus, "spawn_protection");
    run(game, ticks(3.5) + 1);
    expect(shieldedAlly(game, dus)).toBeNull();
    expect(ally.statuses.has("resistance")).toBe(false);
    expect(dus.moveMods.some((m) => m.id === "spawn_protection")).toBe(false);
    expect(dus.cooldowns.remaining("spawn_protection", game.now) / 20).toBeCloseTo(35, 0);
    // Early release.
    const other = survivors[2];
    place(other, cellPos(30, 78));
    dus.cooldowns.reset("spawn_protection");
    faceTo(dus, other);
    game.status(other, "resistance", 1, 10, other);
    useAbility(game, dus, "spawn_protection");
    expect(shieldedAlly(game, dus)).toBe(other);
    expect(other.statuses.level("resistance")).toBe(4);
    run(game, 10);
    expect(useAbility(game, dus, "spawn_protection").ok).toBe(true);
    expect(shieldedAlly(game, dus)).toBeNull();
    expect(other.statuses.level("resistance")).toBe(1);
  });
  it("no valid ally = failed cast without cooldown; the same ally is locked out for 30 s", () => {
    const { game, dus, survivors } = setup();
    faceTo(dus, cellPos(10, 60));
    expect(useAbility(game, dus, "spawn_protection").ok).toBe(false);
    expect(dus.cooldowns.remaining("spawn_protection", game.now)).toBe(0);
    const ally = survivors[1];
    place(ally, cellPos(30, 77));
    faceTo(dus, ally);
    useAbility(game, dus, "spawn_protection");
    useAbility(game, dus, "spawn_protection"); // release
    dus.cooldowns.reset("spawn_protection");
    expect(useAbility(game, dus, "spawn_protection").ok).toBe(false);
    run(game, ticks(30));
    dus.cooldowns.reset("spawn_protection");
    expect(useAbility(game, dus, "spawn_protection").ok).toBe(true);
  });
  it("targets through walls (95 studs) but collapses after 2 s without line of sight", () => {
    const { game, dus, survivors } = setup();
    const ally = survivors[1];
    place(dus, cellPos(42, 56));
    place(ally, cellPos(42, 61)); // wall row z = 58
    faceTo(dus, ally);
    expect(useAbility(game, dus, "spawn_protection").ok).toBe(true);
    run(game, ticks(2) - 1);
    expect(shieldedAlly(game, dus)).toBe(ally);
    run(game, 3);
    expect(shieldedAlly(game, dus)).toBeNull();
    expect(dus.data("spawn_protection").lastResult).toBe("line of sight");
  });
  it("collapses when the ally leaves the 95-stud range, or when Dusekkar dies", () => {
    const { game, dus, survivors, killer } = setup();
    const ally = survivors[1];
    place(ally, cellPos(30, 77));
    useAbility(game, dus, "spawn_protection");
    place(ally, { x: dus.pos.x + studs(100), y: dus.pos.y, z: dus.pos.z });
    run(game, 1);
    expect(dus.data("spawn_protection").lastResult).toBe("out of range");
    expect(ally.statuses.has("resistance")).toBe(false);
    // Dusekkar dying ends the shield at once.
    dus.cooldowns.reset("spawn_protection");
    const other = survivors[2];
    place(other, cellPos(30, 78));
    faceTo(dus, other);
    useAbility(game, dus, "spawn_protection");
    expect(other.statuses.level("resistance")).toBe(4);
    game.damage(dus, 500, killer);
    expect(dus.alive).toBe(false);
    expect(other.statuses.has("resistance")).toBe(false);
    expect(other.hooks.some((h) => h.owner.startsWith("spawn_protection"))).toBe(false);
  });
  it("3+ Dusekkars channelling at once: every shield shatters, Blindness III + Slowness III 6 s each", () => {
    const { game, survivors } = setup(["dusekkar", "dusekkar", "dusekkar", "elliot"]);
    const [d1, d2, d3, ally] = survivors;
    place(ally, cellPos(40, 77));
    [d1, d2, d3].forEach((d, i) => {
      place(d, cellPos(30, 75 + i * 2));
      faceTo(d, ally);
    });
    useAbility(game, d1, "spawn_protection");
    useAbility(game, d2, "spawn_protection");
    expect(shieldedAlly(game, d1)).toBe(ally);
    useAbility(game, d3, "spawn_protection");
    for (const d of [d1, d2, d3]) {
      expect(shieldedAlly(game, d)).toBeNull();
      expect(d.statuses.level("blindness")).toBe(3);
      expect(d.statuses.level("slowness")).toBe(3);
    }
    expect(ally.statuses.has("resistance")).toBe(false);
  });
});

describe("Dusekkar — Plasma Beam", () => {
  it("2 s windup at -25% speed, then a 75-stud beam: killer Slowness I 4 s, first survivor Speed I 3 s + 25 decaying overheal", () => {
    const { game, dus, survivors, killer } = setup();
    const [, e1, e2] = survivors;
    place(dus, cellPos(5, 77));
    faceTo(dus, cellPos(70, 77));
    place(e1, cellPos(12, 77));
    place(e2, cellPos(16, 77));
    place(killer, cellPos(30, 77)); // 25 blocks = 69 studs
    expect(useAbility(game, dus, "plasma_beam").ok).toBe(true);
    expect(dus.moveMods.some((m) => m.mul === 0.75)).toBe(true);
    run(game, ticks(2) - 1);
    expect(killer.statuses.has("slowness")).toBe(false);
    run(game, 1);
    expect(killer.statuses.level("slowness")).toBe(1);
    expect(killer.statuses.remainingTicks("slowness", game.now)).toBe(ticks(4));
    expect(e1.statuses.level("speed")).toBe(1);
    expect(e1.statuses.remainingTicks("speed", game.now)).toBe(ticks(3));
    expect(e1.shield("plasma_overheal")!.amount).toBeCloseTo(25, 0);
    expect(e2.statuses.has("speed")).toBe(false);
    expect(e2.shield("plasma_overheal")).toBeUndefined();
    run(game, ticks(5));
    expect(e1.shield("plasma_overheal")!.amount).toBeCloseTo(15, 0);
    expect(dus.cooldowns.remaining("plasma_beam", game.now) / 20).toBeCloseTo(28 - 7, 0);
  });
  it("passes through walls but not beyond 75 studs or off-axis", () => {
    const { game, dus, killer } = setup();
    place(dus, cellPos(42, 56));
    faceTo(dus, cellPos(42, 70));
    place(killer, cellPos(42, 63)); // behind the wall at z = 58
    useAbility(game, dus, "plasma_beam");
    run(game, ticks(2));
    expect(killer.statuses.level("slowness")).toBe(1);
    const b = setup();
    place(b.dus, cellPos(5, 77));
    faceTo(b.dus, cellPos(70, 77));
    place(b.killer, cellPos(35, 77)); // 30 blocks = 83 studs
    useAbility(b.game, b.dus, "plasma_beam");
    run(b.game, ticks(2));
    expect(b.killer.statuses.has("slowness")).toBe(false);
    place(b.killer, cellPos(20, 74));
    b.dus.cooldowns.reset("plasma_beam");
    useAbility(b.game, b.dus, "plasma_beam");
    run(b.game, ticks(2));
    expect(b.killer.statuses.has("slowness")).toBe(false);
  });
  it("each extra Dusekkar: -0.5 s Slowness and -2.5 overheal", () => {
    const { game, survivors, killer } = setup(["dusekkar", "dusekkar", "elliot"]);
    const [d1, , e1] = survivors;
    place(d1, cellPos(5, 77));
    faceTo(d1, cellPos(70, 77));
    place(e1, cellPos(12, 77));
    place(killer, cellPos(25, 77));
    useAbility(game, d1, "plasma_beam");
    run(game, ticks(2));
    expect(killer.statuses.remainingTicks("slowness", game.now)).toBe(ticks(3.5));
    expect(e1.shield("plasma_overheal")!.amount).toBeCloseTo(22.5, 0);
  });
});
