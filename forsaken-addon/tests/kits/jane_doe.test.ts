import { afterEach, describe, expect, it } from "vitest";
import { cellPos, faceTo, makeGame, place, populate, realMatch, run, startRound, testCharacter } from "../helpers";
import { useAbility } from "../../src/abilities/engine";
import { config, resetConfig } from "../../src/core/config";
import { ticks } from "../../src/core/scale";
import { character } from "../../src/characters/roster";
import { addShatterpoint, footprintLook, janeDoeKit, shatterpoint, shatterpointLocked } from "../../src/abilities/kits/jane_doe";
import type { Game } from "../../src/core/game";
import type { Actor } from "../../src/entities/actor";

afterEach(() => resetConfig());

function setup(survivors: string[] = ["jane_doe", "elliot", "elliot"]) {
  const m = realMatch("slasher", survivors);
  const jane = m.survivors[0];
  faceTo(jane, m.killer);
  return { ...m, jane };
}

/** Quick tap: throws an uncharged crystal. */
function pitch(game: Game, jane: Actor): void {
  jane.cooldowns.reset("crystal_pitch");
  expect(useAbility(game, jane, "crystal_pitch").ok).toBe(true);
  expect(useAbility(game, jane, "crystal_pitch").ok).toBe(true);
}

/** Runs until no crystal is in flight (max 7 s). */
function settle(game: Game): void {
  for (let i = 0; i < ticks(7) && game.objectsOf("crystal").length > 0; i++) run(game, 1);
}

describe("Jane Doe — Shatterpoint", () => {
  it("starts at 20 (max 30) and absorbs hits with 40% reduction", () => {
    const { game, killer, jane } = setup();
    expect(shatterpoint(jane)).toBe(20);
    expect(jane.shield("shatterpoint")!.max).toBe(30);
    game.damage(jane, 20, killer);
    expect(shatterpoint(jane)).toBeCloseTo(8);
    expect(jane.hp).toBe(60);
  });
  it("damage over time skips the reduction", () => {
    const { game, killer, jane } = setup();
    game.damage(jane, 4, killer, { kind: "dot", abilityId: "status:bleeding" });
    expect(shatterpoint(jane)).toBeCloseTo(16);
  });
  it("outside healing does not restore it; overheal is spent before it", () => {
    const { game, killer, jane } = setup();
    game.damage(jane, 10, killer);
    const shp = shatterpoint(jane);
    jane.hp = 30;
    game.heal(jane, 20, null);
    expect(shatterpoint(jane)).toBeCloseTo(shp);
    game.shield(jane, "plasma_overheal", 10);
    run(game, 1);
    game.damage(jane, 10, killer);
    expect(jane.shield("plasma_overheal")).toBeUndefined();
    expect(shatterpoint(jane)).toBeCloseTo(shp);
  });
  it("breaking it locks it for 40 s (abilities restore nothing), then it returns with 5", () => {
    const { game, killer, jane } = setup();
    game.damage(jane, 50, killer);
    expect(jane.hp).toBeCloseTo(60 - (50 - 20 / 0.6), 1);
    expect(shatterpointLocked(jane)).toBe(true);
    expect(addShatterpoint(game, jane, 10)).toBe(0);
    run(game, ticks(40) - 2);
    expect(shatterpoint(jane)).toBe(0);
    run(game, 3);
    expect(shatterpointLocked(jane)).toBe(false);
    expect(shatterpoint(jane)).toBe(5);
    expect(addShatterpoint(game, jane, 3)).toBe(3);
  });
  it("gains cap at 30 and each other living Jane cuts them by 10%", () => {
    const solo = setup();
    expect(addShatterpoint(solo.game, solo.jane, 50)).toBe(10);
    const duo = setup(["jane_doe", "jane_doe", "elliot"]);
    duo.game.damage(duo.jane, 20 / 0.6 - 10 / 0.6, duo.killer); // SHP 20 -> 10
    expect(shatterpoint(duo.jane)).toBeCloseTo(10);
    expect(addShatterpoint(duo.game, duo.jane, 10)).toBeCloseTo(9);
  });
});

describe("Jane Doe — Digital Footprint", () => {
  it("footprints fade red -> yellow -> grey over their life", () => {
    expect(footprintLook(0, 120).key).toBe("blood");
    expect(footprintLook(0, 120).color[1]).toBeLessThan(0.3);
    expect(footprintLook(60, 120).key).toBe("dust");
    expect(footprintLook(60, 120).color).toEqual([1, 0.9, 0.2]);
    expect(footprintLook(100, 120).color[0]).toBeCloseTo(0.55);
  });
  it("only Jane sees the killer's footprints, and they disappear after 6 s", () => {
    const { game, killer, jane } = setup();
    const red = config().particles.blood;
    game.fx.drain();
    for (let i = 0; i < 6; i++) {
      place(killer, cellPos(30 + i, 45));
      run(game, 10);
    }
    const prints = game.fx.drain().filter((e) => e.t === "particle" && e.id === red && e.to);
    expect(prints.length).toBeGreaterThan(5);
    expect(prints.every((e) => e.t === "particle" && e.to!.length === 1 && e.to![0] === jane.id)).toBe(true);
    expect(prints.some((e) => e.t === "particle" && Math.abs(e.pos.x - 30.5) < 0.01 && Math.abs(e.pos.z - 45.5) < 0.01)).toBe(true);
    run(game, ticks(6) + 10);
    game.fx.drain();
    run(game, 20);
    expect(game.fx.drain().filter((e) => e.t === "particle" && e.to?.[0] === jane.id).length).toBe(0);
  });
});

describe("Jane Doe — Crystal Pitch", () => {
  it("charging slows her 30%; the throw starts the 16 s cooldown; full charge auto-throws at 2 s", () => {
    const { game, jane } = setup();
    faceTo(jane, cellPos(40, 75));
    expect(useAbility(game, jane, "crystal_pitch").ok).toBe(true);
    expect(jane.data("crystal_pitch").active).toBe(true);
    expect(jane.moveMods.find((m) => m.id === "crystal_charge")?.mul).toBe(0.7);
    expect(jane.cooldowns.remaining("crystal_pitch", game.now)).toBe(0);
    run(game, ticks(2) - 1);
    expect(game.objectsOf("crystal").length).toBe(0);
    run(game, 1);
    expect(game.objectsOf("crystal").length).toBe(1);
    expect(jane.data("crystal_pitch").active).toBe(false);
    expect(jane.moveMods.some((m) => m.id === "crystal_charge")).toBe(false);
    expect(jane.cooldowns.remaining("crystal_pitch", game.now)).toBe(ticks(16));
  });
  it("a longer charge throws farther", () => {
    const far = (chargeTicks: number): number => {
      const { game, jane } = setup();
      place(jane, cellPos(5, 78));
      faceTo(jane, cellPos(70, 78));
      useAbility(game, jane, "crystal_pitch");
      run(game, chargeTicks);
      if (jane.data("crystal_pitch").active) useAbility(game, jane, "crystal_pitch");
      let x = 0;
      for (let i = 0; i < ticks(7); i++) {
        const c = game.objectsOf("crystal")[0];
        if (!c) break;
        x = c.pos.x;
        run(game, 1);
      }
      return x;
    };
    expect(far(ticks(2))).toBeGreaterThan(far(1) + 5);
  });
  it("hitting the killer: Resonance I for 30 s, +3 SHP, Jane revealed to the killer for 3 s", () => {
    const { game, killer, jane } = setup();
    pitch(game, jane);
    settle(game);
    expect(killer.statuses.level("resonance")).toBe(1);
    expect(killer.statuses.remainingTicks("resonance", game.now)).toBeGreaterThan(ticks(29));
    expect(shatterpoint(jane)).toBe(23);
    expect(game.isRevealedTo(jane, killer)).toBe(true);
    run(game, ticks(3) + 1);
    expect(game.isRevealedTo(jane, killer)).toBe(false);
  });
  it("Resonance stacks to III while active (each hit refreshes it)", () => {
    const { game, killer, jane } = setup();
    for (let i = 0; i < 4; i++) {
      pitch(game, jane);
      settle(game);
    }
    expect(killer.statuses.level("resonance")).toBe(3);
    expect(shatterpoint(jane)).toBe(30);
  });
  it("a direct hit from 110+ studs gives Resonance II", () => {
    const { game, killer, jane } = setup();
    place(jane, cellPos(5, 78));
    place(killer, cellPos(46, 78)); // 41 blocks = 114 studs
    faceTo(jane, killer);
    pitch(game, jane);
    const c = game.objectsOf("crystal")[0];
    c.pos = { x: killer.pos.x - 1.2, y: killer.pos.y + 1, z: killer.pos.z };
    (c.data.vel as { x: number; y: number; z: number }).y = 0;
    run(game, 3);
    expect(killer.statuses.level("resonance")).toBe(2);
  });
  it("splash (not direct) from far only gives Resonance I", () => {
    const { game, killer, jane } = setup();
    place(jane, cellPos(5, 78));
    place(killer, cellPos(46, 78));
    faceTo(jane, killer);
    pitch(game, jane);
    const c = game.objectsOf("crystal")[0];
    // Lands on the floor 2 blocks short of the killer (inside the 5-stud radius? no: 1.8 blocks + capsule).
    c.pos = { x: killer.pos.x - 1.5, y: killer.pos.y + 0.1, z: killer.pos.z + 0.9 };
    c.data.vel = { x: 0, y: -0.2, z: 0 };
    run(game, 2);
    expect(killer.statuses.level("resonance")).toBe(1);
  });
  it("no Resonance if the killer was stunned (or had Resonance) in the last 10 s — the SHP is still gained", () => {
    const { game, killer, jane } = setup();
    game.stun(killer, 1, jane);
    run(game, ticks(2));
    pitch(game, jane);
    settle(game);
    expect(killer.statuses.has("resonance")).toBe(false);
    expect(shatterpoint(jane)).toBe(23);
    run(game, ticks(10));
    pitch(game, jane);
    settle(game);
    expect(killer.statuses.level("resonance")).toBe(1);
  });
  it("hitting survivors: Purified I 3 s on each in the blast, +2 SHP once", () => {
    const { game, killer, jane, survivors } = setup();
    const [, e1, e2] = survivors;
    place(killer, cellPos(40, 10));
    place(e1, cellPos(40, 56));
    place(e2, cellPos(41, 56));
    faceTo(jane, e1);
    pitch(game, jane);
    settle(game);
    expect(e1.statuses.has("purified")).toBe(true);
    expect(e2.statuses.has("purified")).toBe(true);
    expect(e1.statuses.remainingTicks("purified", game.now)).toBeLessThanOrEqual(ticks(3));
    expect(jane.statuses.has("purified")).toBe(false);
    expect(shatterpoint(jane)).toBe(22);
    expect(killer.statuses.has("resonance")).toBe(false);
  });
  it("explodes on walls / floor too", () => {
    const { game, jane, survivors } = setup();
    const e1 = survivors[1];
    place(jane, cellPos(40, 55));
    faceTo(jane, cellPos(40, 70)); // wall row at z = 58
    place(e1, cellPos(39, 57));
    pitch(game, jane);
    settle(game);
    expect(e1.statuses.has("purified")).toBe(true);
  });
});

describe("Jane Doe — Hatchet", () => {
  it("no Resonance: 0.75 s windup + lunge, 25 damage, Helpless I + Slowness II 2 s, +5 SHP, Resistance I", () => {
    const { game, killer, jane } = setup();
    place(jane, cellPos(40, 54.2)); // 3.7 blocks: needs the lunge
    faceTo(jane, killer);
    expect(useAbility(game, jane, "hatchet").ok).toBe(true);
    expect(jane.statuses.level("resistance")).toBe(1);
    run(game, ticks(0.75) - 1);
    expect(killer.hp).toBe(2000);
    run(game, ticks(0.3) + 2);
    expect(killer.hp).toBe(1975);
    expect(killer.statuses.has("helpless")).toBe(true);
    expect(killer.statuses.level("slowness")).toBe(2);
    expect(killer.isStunned(game.now)).toBe(false);
    expect(shatterpoint(jane)).toBe(25);
    expect(jane.cooldowns.remaining("hatchet", game.now)).toBeGreaterThan(ticks(33));
  });
  it("Resonance I/II/III: stun 2.5/3.5/4.5 s and +10/20/30 SHP; Resonance is consumed", () => {
    const expected = [2.5, 3.5, 4.5];
    const shp = [10, 20, 30];
    for (let lvl = 1; lvl <= 3; lvl++) {
      const { game, killer, jane } = setup();
      jane.shield("shatterpoint")!.amount = 0.01; // nearly empty, not broken
      game.status(killer, "resonance", lvl, 30, jane);
      useAbility(game, jane, "hatchet");
      run(game, ticks(0.75) + 2);
      expect((killer.stunnedUntil - game.now) / 20).toBeGreaterThan(expected[lvl - 1] + 0.4);
      expect((killer.stunnedUntil - game.now) / 20).toBeLessThan(expected[lvl - 1] + 0.7);
      expect(killer.statuses.has("resonance")).toBe(false);
      expect(shatterpoint(jane)).toBeCloseTo(Math.min(30, shp[lvl - 1]), 1);
    }
  });
  it("no SHP and Resonance kept when the stun fails (stun immunity)", () => {
    const { game, killer, jane } = setup();
    game.status(killer, "resonance", 2, 30, jane);
    killer.stunImmuneUntil = game.now + ticks(30);
    useAbility(game, jane, "hatchet");
    run(game, ticks(0.75) + 2);
    expect(killer.hp).toBe(1975);
    expect(killer.isStunned(game.now)).toBe(false);
    expect(killer.statuses.level("resonance")).toBe(2);
    expect(shatterpoint(jane)).toBe(20);
  });
  it("whiffs when nobody is in reach", () => {
    const { game, killer, jane } = setup();
    faceTo(jane, cellPos(40, 75));
    useAbility(game, jane, "hatchet");
    run(game, ticks(1.2));
    expect(killer.hp).toBe(2000);
    expect(shatterpoint(jane)).toBe(20);
  });
  it("deals only 10 damage to John Doe", () => {
    const { game } = makeGame(new Map([["jane_doe", janeDoeKit]]));
    const { killer, survivors } = populate(game, testCharacter({ id: "john_doe", team: "killer" }), [character("jane_doe")]);
    const jane = survivors[0];
    game.setupGenerators([0, 1, 2, 3, 4]);
    startRound(game);
    place(killer, cellPos(40, 50));
    place(jane, cellPos(40, 52.5));
    faceTo(jane, killer);
    useAbility(game, jane, "hatchet");
    run(game, ticks(0.75) + 2);
    expect(killer.hp).toBe(990);
  });
});
