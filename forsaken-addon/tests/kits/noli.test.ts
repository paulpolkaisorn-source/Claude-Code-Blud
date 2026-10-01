import { afterEach, describe, expect, it } from "vitest";
import { body, cellPos, faceTo, place, realMatch, run } from "../helpers";
import { useAbility } from "../../src/abilities/engine";
import { resetConfig } from "../../src/core/config";
import { studs, ticks } from "../../src/core/scale";
import { observantLevel } from "../../src/abilities/kits/noli";
import { yawToDir } from "../../src/util/vec";
import type { Actor } from "../../src/entities/actor";
import type { Game } from "../../src/core/game";

afterEach(() => resetConfig());

function duel() {
  const m = realMatch("noli", ["noob", "shedletsky", "taph"]);
  m.killer.cooldowns.resetAll();
  faceTo(m.killer, m.survivors[0]);
  return m;
}

function mirageOf(game: Game, victim: Actor): Actor | undefined {
  return game.actors.find((a) => a.character.id === "minion_mirage" && a.alive && a.data("mirage").victimId === victim.id);
}

function face(a: Actor, yaw: number): void {
  body(a).face(yawToDir(yaw));
  a.state = a.body.read();
}

describe("Noli — Stab", () => {
  it("deals 25 after a 0.35 s windup (kind basic) and removes every Hallucination stack and its fakes", () => {
    const { game, killer, survivors } = duel();
    const s = survivors[0];
    game.status(s, "hallucination", 3, 20, killer);
    run(game, 1);
    expect(mirageOf(game, s)).toBeDefined();
    s.res.fakeDamage = 30;
    const kinds: string[] = [];
    s.addHooks("test", { beforeTakeDamage: (_x, ev) => void kinds.push(ev.kind) });
    expect(useAbility(game, killer, "stab").ok).toBe(true);
    run(game, ticks(0.35) + 1);
    expect(s.hp).toBeCloseTo(75);
    expect(kinds).toEqual(["basic"]);
    expect(s.statuses.has("hallucination")).toBe(false);
    expect(s.res.fakeDamage).toBe(0);
    run(game, 1);
    expect(mirageOf(game, s)).toBeUndefined();
    expect(killer.cooldowns.remaining("stab", game.now) / 20).toBeCloseTo(1.8 - 0.4, 0);
  });
});

describe("Noli — Hallucinations passive", () => {
  it("Noli sees hallucinating survivors (purple aura) until the status ends", () => {
    const { game, killer, survivors } = duel();
    const far = survivors[1];
    expect(game.isRevealedTo(far, killer)).toBe(false);
    game.status(far, "hallucination", 1, 2, killer);
    run(game, 1);
    expect(game.isRevealedTo(far, killer)).toBe(true);
    expect(game.isRevealedTo(far, survivors[0])).toBe(false);
    run(game, ticks(2.5));
    expect(game.isRevealedTo(far, killer)).toBe(false);
  });
  it("level III spawns a Noli mirage that chases only its victim; its hits are fake (HUD only)", () => {
    const { game, killer, survivors } = duel();
    const s = survivors[1];
    game.status(s, "hallucination", 3, 20, killer);
    run(game, 1);
    const m = mirageOf(game, s)!;
    expect(m).toBeDefined();
    expect(m.isMinion).toBe(true);
    expect(m.ownerId).toBe(killer.id);
    expect(m.flags.has("silent")).toBe(true);
    place(m, cellPos(30, 72));
    run(game, 1);
    expect(m.input.moveDir).not.toBeNull();
    expect(m.input.moveDir!.x).toBeLessThan(0); // walking toward the victim at x=16
    // Contact: a fake 15-damage swing after the stab windup, nothing real.
    const endBefore = s.statuses.get("hallucination")!.endTick;
    place(m, { ...s.pos, x: s.pos.x + 1.5 });
    s.input.repairTarget = "gen0";
    run(game, ticks(0.35) + 2);
    expect(s.res.fakeDamage).toBe(15);
    expect(s.hp).toBe(100);
    expect(s.statuses.has("speed")).toBe(false); // no on-hit speed boost
    expect(s.statuses.get("hallucination")!.endTick).toBeGreaterThan(endBefore); // each hit lengthens it
    // 1.5 s between swings
    run(game, ticks(1.0));
    expect(s.res.fakeDamage).toBe(15);
    run(game, ticks(1.0));
    expect(s.res.fakeDamage).toBe(30);
  });
  it("fake damage never shows below 0 HP, and is reverted when Hallucination ends (mirage despawns)", () => {
    const { game, killer, survivors } = duel();
    const s = survivors[1];
    game.status(s, "hallucination", 3, 3, killer);
    run(game, 1);
    const m = mirageOf(game, s)!;
    s.hp = 20;
    place(m, { ...s.pos, x: s.pos.x + 1.5 });
    run(game, ticks(2));
    expect(s.res.fakeDamage).toBe(15);
    run(game, ticks(1.6));
    expect(s.res.fakeDamage).toBe(20); // clamped at the real HP: "decreases to zero, but you stay alive"
    expect(s.alive).toBe(true);
    place(m, cellPos(30, 76));
    run(game, ticks(4));
    expect(s.statuses.has("hallucination")).toBe(false);
    expect(s.res.fakeDamage).toBe(0);
    expect(m.alive).toBe(false);
    expect(mirageOf(game, s)).toBeUndefined();
    expect(s.hp).toBe(20);
  });
  it("a mirage dies to any survivor attack and that removes the victim's Hallucination", () => {
    const { game, killer, survivors } = duel();
    const s = survivors[1];
    game.status(s, "hallucination", 3, 20, killer);
    run(game, 1);
    const m = mirageOf(game, s)!;
    s.res.fakeDamage = 15;
    game.damage(m, 5, survivors[2], { kind: "ability" });
    expect(m.alive).toBe(false);
    expect(s.statuses.has("hallucination")).toBe(false);
    expect(s.res.fakeDamage).toBe(0);
    run(game, 2);
    expect(mirageOf(game, s)).toBeUndefined();
  });
  it("a mirage is also broken by a survivor stun", () => {
    const { game, killer, survivors } = duel();
    const s = survivors[1];
    game.status(s, "hallucination", 3, 20, killer);
    run(game, 1);
    const m = mirageOf(game, s)!;
    game.stun(m, 2, survivors[2]);
    expect(m.alive).toBe(false);
    expect(s.statuses.has("hallucination")).toBe(false);
  });
  it("level II+ spawns a fake pizza near the victim: it heals nothing, the fake heal is reverted later", () => {
    const { game, killer, survivors } = duel();
    const s = survivors[1];
    s.hp = 60;
    game.status(s, "hallucination", 2, 3, killer);
    run(game, 1);
    const pz = game.objectsOf("fake_pizza")[0];
    expect(pz).toBeDefined();
    expect(pz.prop).not.toBeNull();
    // Other survivors walking over it do nothing.
    place(survivors[2], pz.pos);
    run(game, 2);
    expect(pz.dead).toBe(false);
    place(s, pz.pos);
    run(game, 2);
    expect(pz.dead).toBe(true);
    expect(s.hp).toBe(60);
    expect(s.res.fakeDamage).toBe(-20); // HUD shows 80
    run(game, ticks(3));
    expect(s.res.fakeDamage).toBe(0);
    expect(game.objectsOf("fake_pizza").length).toBe(0);
  });
  it("level I gives no mirage or pizza (timer fakes are HUD-side via the status level)", () => {
    const { game, killer, survivors } = duel();
    game.status(survivors[1], "hallucination", 1, 20, killer);
    run(game, 5);
    expect(mirageOf(game, survivors[1])).toBeUndefined();
    expect(game.objectsOf("fake_pizza").length).toBe(0);
    expect(survivors[1].statuses.level("hallucination")).toBe(1);
  });
});

describe("Noli — Prankster", () => {
  it("fake generator puzzles stack Hallucination, which Noli then sees", () => {
    const { game, killer, survivors } = duel();
    game.setupGenerators([0, 1, 2, 3, 4], [5, 6]);
    const fake = game.generators.find((g) => g.fake)!;
    const s = survivors[1];
    place(s, cellPos(fake.cell.x + 1, fake.cell.z));
    s.input.repairTarget = fake.id;
    run(game, ticks(5.6) + 2);
    expect(s.statuses.level("hallucination")).toBe(1);
    expect(game.isRevealedTo(s, killer)).toBe(true);
  });
});

describe("Noli — Void Rush", () => {
  it("starts the round on a 10 s cooldown", () => {
    const { game, killer } = realMatch("noli", ["noob"]);
    expect(killer.cooldowns.remaining("void_rush", game.now) / 20).toBeGreaterThan(9.5);
    expect(killer.cooldowns.remaining("observant", game.now) / 20).toBeGreaterThan(24.5);
  });
  it("prepare 1 s, rush: first hit 10 + Hallucination II, then re-rush (after 0.85 s) slams for 43.5", () => {
    const { game, killer, survivors } = duel();
    const s = survivors[0];
    expect(useAbility(game, killer, "void_rush").ok).toBe(true);
    run(game, ticks(0.5));
    expect(killer.forced).toBeNull();
    expect(s.hp).toBe(100);
    run(game, ticks(0.5) + 2);
    expect(s.hp).toBeCloseTo(90);
    expect(s.statuses.level("hallucination")).toBe(2);
    expect(killer.forced).toBeNull(); // stops on the first hit
    expect(killer.data("void_rush").phase).toBe("wait");
    // Too early: the press does nothing.
    useAbility(game, killer, "void_rush");
    expect(killer.forced).toBeNull();
    run(game, ticks(0.85));
    expect(useAbility(game, killer, "void_rush").ok).toBe(true);
    expect(killer.forced?.id).toBe("void_rush");
    run(game, 2);
    expect(s.hp).toBeCloseTo(90 - 43.5);
    expect(s.statuses.has("hallucination")).toBe(false); // the slam clears it
    expect(killer.data("void_rush").active).toBe(false);
    expect(killer.cooldowns.remaining("void_rush", game.now) / 20).toBeCloseTo(20, 0);
  });
  it("hitting several survivors: all take 10, only the closest gets Hallucination II, and each extra target adds 3.5 to the slam", () => {
    const { game, killer, survivors } = duel();
    const [a, b] = survivors;
    place(b, { x: 41.3, y: 100, z: 53.5 });
    useAbility(game, killer, "void_rush");
    run(game, ticks(1) + 2);
    expect(a.hp).toBeCloseTo(90);
    expect(b.hp).toBeCloseTo(90);
    expect(a.statuses.level("hallucination")).toBe(2);
    expect(b.statuses.has("hallucination")).toBe(false);
    run(game, ticks(0.85));
    useAbility(game, killer, "void_rush");
    run(game, 2);
    // amplifier = 1 extra target + 1 re-rush: 10 + 30 + 2 x 3.5; everyone in the hitbox is slammed
    expect(a.hp).toBeCloseTo(90 - 47);
    expect(b.hp).toBeCloseTo(90 - 47);
  });
  it("a survivor already at Hallucination II is slammed on the first contact (10 + 30)", () => {
    const { game, killer, survivors } = duel();
    game.status(survivors[0], "hallucination", 2, 20, killer);
    useAbility(game, killer, "void_rush");
    run(game, ticks(1) + 2);
    expect(survivors[0].hp).toBeCloseTo(60);
  });
  it("without a re-rush the window times out after 2 s and the cooldown starts", () => {
    const { game, killer, survivors } = duel();
    useAbility(game, killer, "void_rush");
    run(game, ticks(1) + 2);
    expect(survivors[0].hp).toBeCloseTo(90);
    run(game, ticks(2) + 1);
    expect(killer.data("void_rush").active).toBe(false);
    expect(killer.cooldowns.remaining("void_rush", game.now) / 20).toBeGreaterThan(19);
  });
  it("survivors at 10 HP or less are killed outright and Noli keeps rushing", () => {
    const { game, killer, survivors } = duel();
    survivors[0].hp = 8;
    useAbility(game, killer, "void_rush");
    run(game, ticks(1) + 2);
    expect(survivors[0].alive).toBe(false);
    expect(killer.forced?.id).toBe("void_rush");
  });
  it("crashing into a wall heavily slows Noli for 1.5 s; full cooldown", () => {
    const { game, killer, survivors } = duel();
    place(survivors[0], cellPos(70, 12));
    face(killer, 0); // south, wall at z=58
    useAbility(game, killer, "void_rush");
    run(game, ticks(1) + 2);
    expect(killer.forced?.id).toBe("void_rush");
    // Rush until the wall stops it (well before the 3.5 s rush would time out).
    let rushed = 0;
    while (killer.forced && rushed < ticks(3.5)) {
      run(game, 1);
      rushed++;
    }
    expect(killer.forced).toBeNull();
    expect(rushed).toBeLessThan(ticks(3));
    expect(killer.statuses.level("slowness")).toBe(5);
    expect(killer.cooldowns.remaining("void_rush", game.now) / 20).toBeGreaterThan(19);
  });
  it("pressing again during the prepare cancels it: 1.2 s cooldown, no rush", () => {
    const { game, killer } = duel();
    useAbility(game, killer, "void_rush");
    run(game, 5);
    expect(useAbility(game, killer, "void_rush").ok).toBe(true);
    expect(killer.channel).toBeNull();
    run(game, ticks(1));
    expect(killer.forced).toBeNull();
    expect(killer.cooldowns.remaining("void_rush", game.now)).toBeLessThanOrEqual(ticks(1.2));
    expect(killer.cooldowns.remaining("void_rush", game.now)).toBeGreaterThan(0);
  });
  it("a stun during the prepare cancels it with the 1.2 s cooldown", () => {
    const { game, killer, survivors } = duel();
    useAbility(game, killer, "void_rush");
    run(game, 3);
    game.stun(killer, 1, survivors[0]);
    run(game, ticks(1));
    expect(killer.forced).toBeNull();
    expect(killer.cooldowns.total("void_rush")).toBe(ticks(1.2));
  });
  it("stopping mid-rush also slows Noli", () => {
    const { game, killer, survivors } = duel();
    place(survivors[0], cellPos(70, 12));
    face(killer, -90); // east, open floor
    useAbility(game, killer, "void_rush");
    run(game, ticks(1) + 3);
    expect(killer.forced?.id).toBe("void_rush");
    useAbility(game, killer, "void_rush");
    expect(killer.forced).toBeNull();
    expect(killer.statuses.level("slowness")).toBe(5);
    expect(killer.cooldowns.remaining("void_rush", game.now) / 20).toBeCloseTo(20, 0);
  });
  it("steers: 6x turn rate for the first 1.12 s, then 3°/tick; no stamina regen while rushing", () => {
    const { game, killer, survivors } = duel();
    place(survivors[0], cellPos(70, 12));
    face(killer, -90);
    useAbility(game, killer, "void_rush");
    run(game, ticks(1) + 1);
    killer.stamina = 50;
    const fm = killer.forced!;
    expect(fm.turnRate).toBe(18);
    face(killer, -45);
    run(game, 3);
    expect(fm.dir.x).toBeCloseTo(yawToDir(-45).x, 2);
    expect(fm.dir.z).toBeCloseTo(yawToDir(-45).z, 2);
    run(game, ticks(1.12));
    expect(killer.forced?.turnRate).toBe(3);
    expect(killer.stamina).toBeLessThanOrEqual(50);
  });
});

describe("Noli — Nova", () => {
  it("0.7 s windup, implodes on a survivor: 15 damage, pull, decaying slow; 12 s cooldown after the implosion", () => {
    const { game, killer, survivors } = duel();
    const s = survivors[0];
    expect(useAbility(game, killer, "nova").ok).toBe(true);
    expect(useAbility(game, killer, "nova").ok).toBe(false); // busy during the windup
    run(game, ticks(0.7) + 4);
    expect(s.hp).toBeCloseTo(85);
    expect(s.statuses.level("slowness")).toBeGreaterThanOrEqual(2);
    expect(body(s).impulses.length).toBeGreaterThan(0);
    expect(killer.data("nova").active).toBe(false);
    expect(killer.cooldowns.remaining("nova", game.now) / 20).toBeGreaterThan(11.5);
  });
  it("hitting a wall implodes with the large radius", () => {
    const { game, killer, survivors } = duel();
    place(killer, cellPos(41, 50));
    face(killer, 180); // north, solid wall at (41,48)
    place(survivors[0], cellPos(44, 50));
    useAbility(game, killer, "nova");
    run(game, ticks(0.7) + 6);
    expect(survivors[0].hp).toBeCloseTo(85);
    expect(killer.cooldowns.remaining("nova", game.now) / 20).toBeGreaterThan(11.5);
  });
  it("pressing again detonates early with the smaller radius", () => {
    const { game, killer, survivors } = duel();
    face(killer, -90); // east
    place(survivors[0], cellPos(70, 12));
    useAbility(game, killer, "nova");
    run(game, ticks(0.7) + 10);
    const orb = game.objectsOf("nova")[0];
    expect(orb).toBeDefined();
    expect(killer.data("nova").active).toBe(true);
    // One survivor 2 blocks beside the Voidstar (inside 13 studs), one 6.5 blocks away (outside 13, inside 26).
    place(survivors[0], { x: orb.pos.x, y: 100, z: orb.pos.z + 2 });
    place(survivors[1], { x: orb.pos.x, y: 100, z: orb.pos.z - 6.5 });
    expect(useAbility(game, killer, "nova").ok).toBe(true);
    expect(orb.dead).toBe(true);
    expect(survivors[0].hp).toBeCloseTo(85);
    expect(survivors[1].hp).toBe(100);
    expect(killer.cooldowns.remaining("nova", game.now) / 20).toBeCloseTo(12, 1);
  });
  it("stunned during the windup: no throw, 0.3 s cooldown", () => {
    const { game, killer, survivors } = duel();
    useAbility(game, killer, "nova");
    run(game, 3);
    game.stun(killer, 1, survivors[0]);
    run(game, ticks(1));
    expect(game.objectsOf("nova").length).toBe(0);
    expect(killer.cooldowns.total("nova")).toBe(ticks(0.3));
  });
});

describe("Noli — Observant", () => {
  it("teleports next to the generator closest to his view (>= 50 studs) after 1.45 s; Hallucination by distance; stun immunity", () => {
    const { game, killer, survivors } = duel();
    const gen = game.generators[3]; // (66,66)
    faceTo(killer, { x: gen.block.x + 0.5, y: 100, z: gen.block.z + 0.5 });
    place(survivors[2], cellPos(63, 65)); // will be within 19 studs of the arrival point
    expect(useAbility(game, killer, "observant").ok).toBe(true);
    run(game, ticks(1));
    expect(killer.frozen).toBe(true); // stance
    expect(game.distance3(killer.pos, { x: 40.5, y: 100, z: 50.5 })).toBeLessThan(0.01);
    run(game, ticks(0.45) + 2);
    const genC = { x: gen.block.x + 0.5, y: 100, z: gen.block.z + 0.5 };
    expect(game.distance3(killer.pos, genC)).toBeLessThan(2.5);
    expect(survivors[0].statuses.level("hallucination")).toBe(2); // ~75 studs away
    expect(survivors[1].statuses.level("hallucination")).toBe(3); // >100 studs away
    expect(survivors[2].statuses.has("hallucination")).toBe(false); // within 19 studs
    expect(killer.statuses.has("stun_immune")).toBe(true);
    expect(killer.cooldowns.remaining("observant", game.now) / 20).toBeCloseTo(30, 0);
  });
  it("hallucination level thresholds: none <=19/20 studs, I >20, II >50, III >100", () => {
    const p = { safeStuds: 19, level1Studs: 20, level2Studs: 50, level3Studs: 100 };
    expect(observantLevel(studs(10), p)).toBe(0);
    expect(observantLevel(studs(19.5), p)).toBe(0);
    expect(observantLevel(studs(25), p)).toBe(1);
    expect(observantLevel(studs(60), p)).toBe(2);
    expect(observantLevel(studs(120), p)).toBe(3);
  });
  it("cannot pick generators within 50 studs (fails without cooldown)", () => {
    const { game, killer } = duel();
    game.setupGenerators([4]); // (36,45): 6 blocks away
    expect(useAbility(game, killer, "observant").ok).toBe(false);
    expect(killer.cooldowns.remaining("observant", game.now)).toBe(0);
  });
  it("can target Prankster's fake generators", () => {
    const { game, killer } = duel();
    game.setupGenerators([4], [3]);
    const fake = game.generators.find((g) => g.fake)!;
    expect(useAbility(game, killer, "observant").ok).toBe(true);
    run(game, ticks(1.45) + 2);
    expect(game.distance3(killer.pos, { x: fake.block.x + 0.5, y: 100, z: fake.block.z + 0.5 })).toBeLessThan(2.5);
  });
  it("a stun during the windup cancels it: 15 s cooldown, no teleport", () => {
    const { game, killer, survivors } = duel();
    useAbility(game, killer, "observant");
    run(game, 5);
    game.stun(killer, 1, survivors[0]);
    run(game, ticks(1.5));
    expect(game.distance3(killer.pos, { x: 40.5, y: 100, z: 50.5 })).toBeLessThan(0.01);
    expect(killer.cooldowns.total("observant")).toBe(ticks(15));
  });
  it("recasting during the stance cancels it with the 15 s cooldown", () => {
    const { game, killer } = duel();
    useAbility(game, killer, "observant");
    run(game, 5);
    expect(useAbility(game, killer, "observant").ok).toBe(true);
    expect(killer.channel).toBeNull();
    run(game, ticks(1.5));
    expect(game.distance3(killer.pos, { x: 40.5, y: 100, z: 50.5 })).toBeLessThan(0.01);
    expect(killer.cooldowns.total("observant")).toBe(ticks(15));
  });
});
