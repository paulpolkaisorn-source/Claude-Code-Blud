import { afterEach, describe, expect, it } from "vitest";
import { faceTo, realMatch, run } from "../helpers";
import { useAbility } from "../../src/abilities/engine";
import { resetConfig } from "../../src/core/config";
import { ticks } from "../../src/core/scale";

afterEach(() => resetConfig());

function duel() {
  const m = realMatch("slasher", ["noob", "elliot", "taph"]);
  faceTo(m.killer, m.survivors[0]);
  return m;
}

describe("Slasher", () => {
  it("Slash: 20 damage + Bleeding I after a 0.2 s windup", () => {
    const { game, killer, survivors } = duel();
    expect(useAbility(game, killer, "slash").ok).toBe(true);
    run(game, ticks(0.2) + 1);
    expect(survivors[0].hp).toBeCloseTo(80);
    expect(survivors[0].statuses.level("bleeding")).toBe(1);
    expect(killer.cooldowns.remaining("slash", game.now)).toBeGreaterThan(30);
  });
  it("Slash again on a bleeding survivor raises Bleeding to II without resetting its timer", () => {
    const { game, killer, survivors } = duel();
    useAbility(game, killer, "slash");
    run(game, ticks(2));
    const before = survivors[0].statuses.remainingTicks("bleeding", game.now);
    useAbility(game, killer, "slash");
    run(game, ticks(0.2) + 1);
    expect(survivors[0].statuses.level("bleeding")).toBe(2);
    expect(survivors[0].statuses.remainingTicks("bleeding", game.now)).toBeLessThanOrEqual(before);
  });
  it("Behead: 25 damage + Helpless 8 s; Slasher gets Slowness I", () => {
    const { game, killer, survivors } = duel();
    useAbility(game, killer, "behead");
    run(game, ticks(0.45) + 1);
    expect(survivors[0].hp).toBeCloseTo(75);
    expect(survivors[0].statuses.has("helpless")).toBe(true);
    expect(killer.statuses.level("slowness")).toBe(1);
    expect(killer.cooldowns.remaining("behead", game.now) / 20).toBeCloseTo(18 - 0.5, 0);
  });
  it("Raging Pace: ENRAGED, walk 19 / no sprint, reveal, unstunnable, ignores attacks, ENRAGED cooldowns", () => {
    const { game, killer, survivors } = duel();
    useAbility(game, killer, "raging_pace");
    run(game, ticks(0.4));
    expect(killer.flags.has("enraged")).toBe(true);
    expect(killer.canSprint).toBe(false);
    expect(game.isRevealedTo(survivors[0], killer)).toBe(true);
    expect(game.stun(killer, 3, survivors[0])).toBe(false);
    expect(game.damage(killer, 30, survivors[0]).dealt).toBe(0);
    expect(game.damage(killer, 30, survivors[0], { bypassInvincible: true, tags: ["tripmine"] }).dealt).toBe(30);
    // Using Slash while ENRAGED: lunge, 25 damage, 0.8 s cooldown, ENRAGED ends.
    useAbility(game, killer, "slash");
    expect(killer.flags.has("enraged")).toBe(false);
    expect(killer.cooldowns.remaining("slash", game.now)).toBe(ticks(0.8));
    run(game, ticks(0.3));
    expect(survivors[0].hp).toBeLessThanOrEqual(75);
  });
  it("Raging Pace caps stamina at 70 over 6.5 s and ends after 14 s", () => {
    const { game, killer } = duel();
    useAbility(game, killer, "raging_pace");
    run(game, ticks(7));
    expect(killer.stamina).toBeLessThanOrEqual(70.1);
    run(game, ticks(8));
    expect(killer.flags.has("enraged")).toBe(false);
    expect(killer.staminaCap).toBeNull();
  });
  it("Gashing Wound: grabs one survivor for 50 total and immobilises Slasher", () => {
    const { game, killer, survivors } = duel();
    useAbility(game, killer, "gashing_wound");
    run(game, ticks(4));
    expect(survivors[0].hp).toBeCloseTo(50, 0);
    expect(killer.frozen).toBe(true);
    run(game, ticks(1.5));
    expect(killer.frozen).toBe(false);
  });
  it("Final Chapter: Resistance IV for 10 s after being stunned", () => {
    const { game, killer, survivors } = duel();
    game.stun(killer, 1, survivors[0]);
    run(game, 3);
    expect(killer.statuses.level("resistance")).toBe(4);
  });
});
