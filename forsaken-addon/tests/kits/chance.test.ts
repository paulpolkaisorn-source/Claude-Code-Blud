import { afterEach, describe, expect, it } from "vitest";
import { cellPos, faceTo, place, realMatch, run } from "../helpers";
import { useAbility } from "../../src/abilities/engine";
import { resetConfig } from "../../src/core/config";
import { ticks, toStuds } from "../../src/core/scale";
import { headsChance, oneShotOdds } from "../../src/abilities/kits/chance";
import type { Game } from "../../src/core/game";
import type { Actor } from "../../src/entities/actor";

afterEach(() => resetConfig());

/** Forces every rng draw to `v` (deterministic coin flips and One Shot outcomes). */
function rigRng(game: Game, v: number): void {
  game.rng.next = () => v;
}

function setup(seed = 7) {
  const m = realMatch("slasher", ["chance", "elliot"], { seed });
  const chance = m.survivors[0];
  faceTo(chance, m.killer);
  return { ...m, chance };
}

function flip(game: Game, chance: Actor): void {
  chance.cooldowns.reset("coin_flip");
  expect(useAbility(game, chance, "coin_flip").ok).toBe(true);
}

describe("Chance — Unpredictable Fate", () => {
  it("rolls max HP between 70 and 90 at round start (current HP = max)", () => {
    const seen = new Set<number>();
    for (let seed = 1; seed <= 12; seed++) {
      const { chance } = setup(seed);
      expect(chance.maxHp).toBeGreaterThanOrEqual(70);
      expect(chance.maxHp).toBeLessThanOrEqual(90);
      expect(chance.hp).toBe(chance.maxHp);
      seen.add(chance.maxHp);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe("Chance — Coin Flip", () => {
  it("heads gives +1 shared charge (max 3) and resets the tails streak", () => {
    const { game, chance } = setup();
    rigRng(game, 0.1);
    for (let i = 0; i < 5; i++) flip(game, chance);
    expect(chance.res.charges).toBe(3);
    expect(chance.statuses.has("vulnerable")).toBe(false);
    expect(chance.cooldowns.remaining("coin_flip", game.now)).toBe(ticks(1.75));
  });
  it("tails adds a Vulnerable tier for 15 s (refreshing) and +2.5% heads chance per tails in a row", () => {
    const { game, chance } = setup();
    rigRng(game, 0.99);
    expect(headsChance(chance)).toBeCloseTo(0.5);
    flip(game, chance);
    expect(chance.statuses.level("vulnerable")).toBe(1);
    expect(chance.statuses.remainingTicks("vulnerable", game.now)).toBe(ticks(15));
    run(game, ticks(5));
    flip(game, chance);
    expect(chance.statuses.level("vulnerable")).toBe(2);
    expect(chance.statuses.remainingTicks("vulnerable", game.now)).toBe(ticks(15));
    expect(headsChance(chance)).toBeCloseTo(0.55);
    // Heads resets the pity bonus; charges unaffected by tails.
    rigRng(game, 0.0);
    flip(game, chance);
    expect(chance.res.charges).toBe(1);
    expect(headsChance(chance)).toBeCloseTo(0.5);
  });
  it("the pity bonus makes heads land at a roll that was tails before", () => {
    const { game, chance } = setup();
    rigRng(game, 0.52);
    flip(game, chance); // 0.52 >= 0.50 -> tails
    expect(chance.res.charges).toBe(0);
    flip(game, chance); // 0.52 < 0.525 -> heads
    expect(chance.res.charges).toBe(1);
  });
  it("the Vulnerable tier persists after the status expires; the next tails comes back one tier higher", () => {
    const { game, chance } = setup();
    rigRng(game, 0.99);
    flip(game, chance);
    flip(game, chance);
    run(game, ticks(15) + 2);
    expect(chance.statuses.has("vulnerable")).toBe(false);
    expect(chance.res.vulnTier).toBe(2);
    flip(game, chance);
    expect(chance.statuses.level("vulnerable")).toBe(3);
  });
  it("Vulnerable makes Chance take +20% damage per tier", () => {
    const { game, chance, killer } = setup();
    rigRng(game, 0.99);
    flip(game, chance);
    flip(game, chance);
    const hp = chance.hp;
    game.damage(chance, 10, killer);
    expect(hp - chance.hp).toBeCloseTo(14);
  });
});

describe("Chance — One Shot", () => {
  it("odds follow the charge count (30/50/70/90% success)", () => {
    const { chance } = setup();
    const expected = [0.3, 0.5, 0.7, 0.9];
    for (let c = 0; c <= 3; c++) {
      chance.res.charges = c;
      expect(oneShotOdds(chance).success).toBeCloseTo(expected[c]);
    }
    chance.res.charges = 1;
    expect(oneShotOdds(chance).misfire).toBeCloseTo(0.25);
  });
  it("success: 1 s windup, 50 damage, ~4 s stun point-blank, knockback; spends all charges; 45 s cooldown", () => {
    const { game, chance, killer } = setup();
    chance.res.charges = 3;
    rigRng(game, 0.01);
    const hp = killer.hp;
    expect(useAbility(game, chance, "one_shot").ok).toBe(true);
    expect(chance.res.charges).toBe(0);
    expect(chance.cooldowns.remaining("one_shot", game.now)).toBe(ticks(45));
    run(game, ticks(1) - 1);
    expect(killer.hp).toBe(hp);
    run(game, 1);
    expect(killer.hp).toBeCloseTo(hp - 50);
    const dStuds = toStuds(Math.hypot(chance.pos.x - killer.pos.x, chance.pos.z - killer.pos.z));
    const stun = 4 - 3 * (dStuds / 90);
    expect((killer.stunnedUntil - game.now) / 20).toBeCloseTo(stun + 0.6, 1);
    expect(killer.body.kind).toBe("fake");
    expect((killer.body as unknown as { impulses: unknown[] }).impulses.length).toBeGreaterThan(0);
    expect(chance.data("one_shot").lastOutcome).toBe("success");
  });
  it("success at long range: the stun shrinks linearly to 1 s at 90 studs", () => {
    const { game, chance, killer } = setup();
    place(chance, cellPos(5, 78));
    place(killer, cellPos(35, 78)); // 30 blocks = 83.3 studs
    faceTo(chance, killer);
    rigRng(game, 0.0);
    useAbility(game, chance, "one_shot");
    run(game, ticks(1));
    expect(killer.hp).toBeCloseTo(2000 - 50);
    const stun = 4 - 3 * (toStuds(30) / 90);
    expect((killer.stunnedUntil - game.now) / 20).toBeCloseTo(stun + 0.6, 1);
  });
  it("success misses a killer beyond 90 studs or not in front", () => {
    const { game, chance, killer } = setup();
    place(chance, cellPos(5, 78));
    place(killer, cellPos(45, 78)); // 40 blocks = 111 studs
    faceTo(chance, killer);
    rigRng(game, 0.0);
    useAbility(game, chance, "one_shot");
    run(game, ticks(1));
    expect(killer.hp).toBe(2000);
    // In range but behind her.
    place(killer, cellPos(15, 78));
    faceTo(chance, cellPos(0, 78));
    chance.cooldowns.reset("one_shot");
    useAbility(game, chance, "one_shot");
    run(game, ticks(1));
    expect(killer.hp).toBe(2000);
    expect(killer.isStunned(game.now)).toBe(false);
  });
  it("misfire: nothing happens but the cooldown and charges are spent", () => {
    const { game, chance, killer } = setup();
    chance.res.charges = 1;
    rigRng(game, 0.999);
    useAbility(game, chance, "one_shot");
    run(game, ticks(1) + 1);
    expect(chance.data("one_shot").lastOutcome).toBe("misfire");
    expect(killer.hp).toBe(2000);
    expect(chance.res.charges).toBe(0);
    expect(chance.res.gunBroken).toBe(0);
    expect(chance.cooldowns.remaining("one_shot", game.now)).toBeGreaterThan(0);
  });
  it("explosion: 25 self-damage, gun broken until Hat Fix, a killer within 6 studs is stunned 5 s", () => {
    const { game, chance, killer } = setup();
    place(killer, { x: chance.pos.x, y: chance.pos.y, z: chance.pos.z - 1.8 });
    rigRng(game, 0.5); // 0 charges: 30% success, 35% explosion
    const hp = chance.hp;
    useAbility(game, chance, "one_shot");
    run(game, ticks(1));
    expect(chance.data("one_shot").lastOutcome).toBe("explode");
    expect(hp - chance.hp).toBeCloseTo(25);
    expect(chance.res.gunBroken).toBe(1);
    expect((killer.stunnedUntil - game.now) / 20).toBeCloseTo(5.6, 1);
    chance.cooldowns.reset("one_shot");
    expect(useAbility(game, chance, "one_shot").reason).toBe("gun broken (Hat Fix)");
  });
  it("explosion does not stun a killer farther than 6 studs", () => {
    const { game, chance, killer } = setup();
    place(killer, { x: chance.pos.x, y: chance.pos.y, z: chance.pos.z - 5 });
    rigRng(game, 0.5);
    useAbility(game, chance, "one_shot");
    run(game, ticks(1));
    expect(killer.isStunned(game.now)).toBe(false);
  });
  it("a stunned Chance loses the shot (windup cancelled)", () => {
    const { game, chance, killer } = setup();
    rigRng(game, 0.0);
    useAbility(game, chance, "one_shot");
    run(game, 5);
    game.stun(chance, 1, killer);
    run(game, ticks(1));
    expect(killer.hp).toBe(2000);
  });
});

describe("Chance — Reroll", () => {
  it("new max HP = 55-120 x charge bonus, keeps the HP percentage, spends charges", () => {
    const { game, chance } = setup();
    chance.baseMaxHp = 80;
    chance.hp = 40;
    chance.res.charges = 3;
    rigRng(game, 0.5); // int(55,120) = 88 -> x1.10 = 96.8 -> 97
    expect(useAbility(game, chance, "reroll").ok).toBe(true);
    expect(chance.maxHp).toBe(97);
    expect(chance.hp).toBeCloseTo(48.5);
    expect(chance.res.charges).toBe(0);
    expect(chance.cooldowns.remaining("reroll", game.now)).toBe(ticks(20));
  });
  it("works with 0-1 charges (no bonus) and caps at 130", () => {
    const { game, chance } = setup();
    chance.res.charges = 0;
    rigRng(game, 0.0);
    useAbility(game, chance, "reroll");
    expect(chance.maxHp).toBe(55);
    chance.cooldowns.reset("reroll");
    chance.res.charges = 3;
    rigRng(game, 0.9999); // 120 x 1.1 = 132 -> 130
    useAbility(game, chance, "reroll");
    expect(chance.maxHp).toBe(130);
    chance.cooldowns.reset("reroll");
    chance.res.charges = 2;
    rigRng(game, 0.9999); // 120 x 1.05 = 126
    useAbility(game, chance, "reroll");
    expect(chance.maxHp).toBe(126);
  });
});

describe("Chance — Hat Fix", () => {
  it("needs 3 charges", () => {
    const { game, chance } = setup();
    chance.res.charges = 2;
    expect(useAbility(game, chance, "hat_fix").reason).toBe("needs 3 charges");
    expect(chance.cooldowns.remaining("hat_fix", game.now)).toBe(0);
  });
  it("resets Vulnerable (tier back to 0), repairs the gun and spends the charges", () => {
    const { game, chance } = setup();
    rigRng(game, 0.99);
    flip(game, chance);
    flip(game, chance);
    chance.res.gunBroken = 1;
    chance.res.charges = 3;
    expect(useAbility(game, chance, "hat_fix").ok).toBe(true);
    expect(chance.statuses.has("vulnerable")).toBe(false);
    expect(chance.res.vulnTier).toBe(0);
    expect(chance.res.gunBroken).toBe(0);
    expect(chance.res.charges).toBe(0);
    expect(chance.cooldowns.remaining("hat_fix", game.now)).toBe(ticks(60));
    // Next tails starts again at Vulnerable I; the gun works again.
    flip(game, chance);
    expect(chance.statuses.level("vulnerable")).toBe(1);
    expect(useAbility(game, chance, "one_shot").ok).toBe(true);
  });
});
