import { afterEach, describe, expect, it } from "vitest";
import { body, cellPos, faceTo, place, realMatch, run } from "../helpers";
import { useAbility } from "../../src/abilities/engine";
import { resetConfig } from "../../src/core/config";
import { studs, ticks } from "../../src/core/scale";
import { dropBloodOrb } from "../../src/abilities/kits/guest_666";
import type { Actor } from "../../src/entities/actor";
import type { Game } from "../../src/core/game";

afterEach(() => resetConfig());

/** Guest 666 at (40,50) facing south; survivor 0 2.2 blocks in front (Carving Slash reach is 7.25 studs). */
function duel() {
  const m = realMatch("guest_666", ["noob", "shedletsky", "taph"]);
  place(m.survivors[0], { x: 40.5, y: 100, z: 52.7 });
  faceTo(m.killer, m.survivors[0]);
  return m;
}

function far(a: Actor): void {
  place(a, cellPos(70, 12));
}

function startHunt(game: Game, killer: Actor): void {
  killer.res.blood = killer.res.maxBlood;
  expect(useAbility(game, killer, "blood_rush").ok).toBe(true);
  run(game, ticks(3) + 1);
  expect(killer.flags.has("bloodHunt")).toBe(true);
}

function huntLeft(k: Actor): number {
  return k.data("blood_rush").huntLeft as number;
}

describe("Guest 666 — Blood resource", () => {
  it("starts with 0 / 200 Blood", () => {
    const { killer } = duel();
    expect(killer.res.blood).toBe(0);
    expect(killer.res.maxBlood).toBe(200);
  });
});

describe("Guest 666 — Carving Slash", () => {
  it("20 damage (kind basic) to every survivor in reach, +10 Blood per hit, Hemorrhage", () => {
    const { game, killer, survivors } = duel();
    place(survivors[1], { x: 41.3, y: 100, z: 52.7 });
    const kinds: string[] = [];
    survivors[0].addHooks("test", { beforeTakeDamage: (_s, ev) => void kinds.push(ev.kind) });
    expect(useAbility(game, killer, "carving_slash").ok).toBe(true);
    run(game, ticks(0.3) + 1);
    expect(survivors[0].hp).toBeCloseTo(80);
    expect(survivors[1].hp).toBeCloseTo(80);
    expect(kinds).toEqual(["basic"]);
    expect(killer.res.blood).toBe(20);
    expect(survivors[0].statuses.level("hemorrhage")).toBe(1);
    expect(survivors[1].statuses.level("hemorrhage")).toBe(1);
    expect(killer.cooldowns.remaining("carving_slash", game.now) / 20).toBeCloseTo(2 - 0.35, 0);
  });
});

describe("Guest 666 — Bloodhound", () => {
  it("any damage he deals applies Hemorrhage (120 s), which lowers max HP over time", () => {
    const { game, killer, survivors } = duel();
    game.damage(survivors[1], 5, killer);
    expect(survivors[1].statuses.level("hemorrhage")).toBe(1);
    expect(survivors[1].statuses.remainingTicks("hemorrhage", game.now)).toBe(ticks(120));
    run(game, ticks(10));
    expect(survivors[1].maxHp).toBeLessThan(100);
  });
  it("hemorrhaged survivors drop a Blood Orb every 10 s while sprinting (out of chase)", () => {
    const { game, killer, survivors } = duel();
    const s = survivors[0];
    far(s);
    game.status(s, "hemorrhage", 1, 120, killer);
    s.input.moveDir = { x: 1, y: 0, z: 0 };
    s.input.wantSprint = true;
    s.staminaDrain = 0;
    run(game, ticks(9.5));
    expect(game.objectsOf("blood_orb").length).toBe(0);
    run(game, ticks(0.6));
    expect(game.objectsOf("blood_orb").length).toBe(1);
    expect(game.objectsOf("blood_orb")[0].prop).not.toBeNull();
  });
  it("in chase: one orb per 35 s walking, one per 25 s sprinting", () => {
    const { game, killer, survivors } = duel();
    const [walker, sprinter] = survivors;
    place(sprinter, { x: 38.5, y: 100, z: 54.5 });
    game.status(walker, "hemorrhage", 1, 120, killer);
    game.status(sprinter, "hemorrhage", 1, 120, killer);
    sprinter.input.moveDir = { x: 1, y: 0, z: 0 };
    sprinter.input.wantSprint = true;
    sprinter.staminaDrain = 0;
    run(game, ticks(24.5));
    expect(game.objectsOf("blood_orb").length).toBe(0);
    run(game, ticks(0.6));
    expect(game.objectsOf("blood_orb").length).toBe(1);
    run(game, ticks(10));
    expect(game.objectsOf("blood_orb").length).toBe(2);
  });
  it("touching an orb: +15 Blood and -3 s on all his cooldowns; orbs expire after 30 s", () => {
    const { game, killer, survivors } = duel();
    game.startCooldown(killer, "infernal_cry", 10);
    game.startCooldown(killer, "blood_rush", 20);
    dropBloodOrb(game, killer, killer.pos);
    run(game, 1);
    expect(killer.res.blood).toBe(15);
    expect(killer.cooldowns.remaining("infernal_cry", game.now) / 20).toBeCloseTo(7, 0);
    expect(killer.cooldowns.remaining("blood_rush", game.now) / 20).toBeCloseTo(17, 0);
    expect(game.objectsOf("blood_orb").length).toBe(0);
    const o = dropBloodOrb(game, killer, survivors[1].pos);
    run(game, ticks(30) + 1);
    expect(o.dead).toBe(true);
    expect(killer.res.blood).toBe(15);
  });
  it("kills give +30 Blood", () => {
    const { game, killer, survivors } = duel();
    game.damage(survivors[1], 500, killer);
    expect(survivors[1].alive).toBe(false);
    expect(killer.res.blood).toBe(30);
  });
});

describe("Guest 666 — Eviscerate", () => {
  it("needs 10 Blood", () => {
    const { game, killer } = duel();
    expect(useAbility(game, killer, "eviscerate").reason).toContain("Blood");
  });
  it("costs 10: lunging bite (kind basic), 10 damage + a Hemorrhage stack, +15 Blood, cooldown halved, short Slowness I", () => {
    const { game, killer, survivors } = duel();
    place(survivors[0], cellPos(40, 53));
    faceTo(killer, survivors[0]);
    killer.res.blood = 20;
    game.status(survivors[0], "hemorrhage", 1, 120, killer);
    const kinds: string[] = [];
    survivors[0].addHooks("test", { beforeTakeDamage: (_s, ev) => void kinds.push(ev.kind) });
    expect(useAbility(game, killer, "eviscerate").ok).toBe(true);
    expect(killer.res.blood).toBe(10);
    run(game, ticks(0.4) + 1);
    expect(survivors[0].hp).toBeCloseTo(90, 0); // (Hemorrhage is already eating max HP)
    expect(kinds).toEqual(["basic"]);
    expect(survivors[0].statuses.level("hemorrhage")).toBe(2);
    expect(killer.res.blood).toBe(25);
    expect(killer.cooldowns.remaining("eviscerate", game.now) / 20).toBeCloseTo((8 - 0.4) / 2, 0);
    expect(killer.statuses.level("slowness")).toBe(1);
    expect(killer.statuses.remainingTicks("slowness", game.now)).toBeLessThanOrEqual(ticks(1));
  });
  it("a miss: Slowness I for 2 s and the full cooldown", () => {
    const { game, killer, survivors } = duel();
    far(survivors[0]);
    killer.res.blood = 10;
    useAbility(game, killer, "eviscerate");
    run(game, ticks(0.4) + 1);
    expect(killer.res.blood).toBe(0);
    expect(killer.statuses.level("slowness")).toBe(1);
    expect(killer.statuses.remainingTicks("slowness", game.now)).toBeGreaterThan(ticks(1.8));
    expect(killer.cooldowns.remaining("eviscerate", game.now) / 20).toBeCloseTo(7.6, 0);
  });
});

describe("Guest 666 — Demonic Pursuit", () => {
  it("charge (crouched, transparent, stamina frozen), leap, pin: 5 slashes for 40 at full charge, Hemorrhage, +20 Blood, throw", () => {
    const { game, killer, survivors } = duel();
    const s = survivors[0];
    expect(useAbility(game, killer, "demonic_pursuit").ok).toBe(true);
    expect(killer.flags.has("crouching")).toBe(true);
    expect(killer.staminaFrozen).toBe(true);
    expect(killer.statuses.has("invisibility")).toBe(true);
    run(game, ticks(1.5));
    expect(useAbility(game, killer, "demonic_pursuit").ok).toBe(true); // release
    run(game, 2);
    expect(s.flags.has("grabbed")).toBe(true);
    expect(s.frozen).toBe(true);
    expect(killer.statuses.has("invincible")).toBe(true);
    expect(killer.res.blood).toBe(20);
    expect(s.statuses.level("hemorrhage")).toBe(1);
    run(game, ticks(2) + 1);
    expect(s.hp).toBeCloseTo(60, 0);
    expect(s.flags.has("grabbed")).toBe(false);
    const imp = body(s).impulses[body(s).impulses.length - 1];
    expect(imp.x).toBeGreaterThan(0); // thrown to his left (east when facing south)
    expect(killer.cooldowns.remaining("demonic_pursuit", game.now) / 20).toBeGreaterThan(27);
    expect(killer.staminaFrozen).toBe(false);
    // He pauses ~3 s after the throw.
    run(game, ticks(2.5));
    expect(killer.frozen).toBe(true);
    run(game, ticks(0.7));
    expect(killer.frozen).toBe(false);
  });
  it("a short charge deals 26; a medium one 33", () => {
    for (const [secs, dmg] of [
      [0.2, 26],
      [1.0, 33],
    ] as const) {
      const { game, killer, survivors } = duel();
      useAbility(game, killer, "demonic_pursuit");
      run(game, ticks(secs));
      useAbility(game, killer, "demonic_pursuit");
      run(game, ticks(2.2) + 3);
      expect(survivors[0].hp).toBeCloseTo(100 - dmg, 0);
    }
  });
  it("auto-releases at the 2 s maximum charge", () => {
    const { game, killer, survivors } = duel();
    useAbility(game, killer, "demonic_pursuit");
    run(game, ticks(2) + 2);
    expect(survivors[0].flags.has("grabbed")).toBe(true);
    run(game, ticks(2.2));
    expect(survivors[0].hp).toBeCloseTo(60, 0);
  });
  it("a miss (time out, or hitting an object) puts it on the 15 s cooldown", () => {
    const { game, killer, survivors } = duel();
    far(survivors[0]);
    body(killer).face({ x: 1, y: 0, z: 0 }); // east: open floor
    useAbility(game, killer, "demonic_pursuit");
    run(game, 3);
    useAbility(game, killer, "demonic_pursuit");
    run(game, ticks(0.8) + 2);
    expect(killer.data("demonic_pursuit").active).toBe(false);
    expect(killer.cooldowns.total("demonic_pursuit")).toBe(ticks(15));
    expect(killer.staminaFrozen).toBe(false);
  });
  it("a stun while charging cancels it (15 s cooldown)", () => {
    const { game, killer, survivors } = duel();
    useAbility(game, killer, "demonic_pursuit");
    run(game, 5);
    game.stun(killer, 1, survivors[0]);
    run(game, 1);
    expect(killer.data("demonic_pursuit").active).toBe(false);
    expect(killer.flags.has("crouching")).toBe(false);
    expect(killer.cooldowns.total("demonic_pursuit")).toBe(ticks(15));
  });
  it("a kill with it gives +50 Blood (on top of +20 for landing)", () => {
    const { game, killer, survivors } = duel();
    survivors[0].hp = 10;
    useAbility(game, killer, "demonic_pursuit");
    run(game, 2);
    useAbility(game, killer, "demonic_pursuit");
    run(game, ticks(2.2));
    expect(survivors[0].alive).toBe(false);
    expect(killer.res.blood).toBe(70);
  });
  it("Blood Hunt: +0.4 damage per max-HP point lost to Hemorrhage", () => {
    const { game, killer, survivors } = duel();
    startHunt(game, killer);
    survivors[0].maxHpPenalty = 30;
    survivors[0].hp = 70;
    useAbility(game, killer, "demonic_pursuit");
    run(game, 2);
    useAbility(game, killer, "demonic_pursuit");
    run(game, ticks(2.2));
    expect(survivors[0].hp).toBeCloseTo(70 - (26 + 0.4 * 30), 0);
  });
});

describe("Guest 666 — Infernal Cry", () => {
  it("aimed roar: forces survivors to face him, Blindness II 4 s, Marked 12 s; Hemorrhaged ones drop 2 orbs", () => {
    const { game, killer, survivors } = duel();
    const s = survivors[0];
    body(s).face({ x: 1, y: 0, z: 0 });
    game.status(s, "hemorrhage", 1, 120, killer);
    expect(useAbility(game, killer, "infernal_cry").ok).toBe(true);
    expect(killer.statuses.has("invisibility")).toBe(true); // transparent during the windup
    run(game, ticks(0.7) + 1);
    expect(s.facing.z).toBeCloseTo(-1, 3);
    expect(s.statuses.level("blindness")).toBe(2);
    expect(s.statuses.remainingTicks("blindness", game.now)).toBeGreaterThan(ticks(3.8));
    expect(s.statuses.has("marked")).toBe(true);
    expect(game.isRevealedTo(s, killer)).toBe(true);
    expect(game.objectsOf("blood_orb").length).toBe(2);
    expect(s.stats.damageTaken).toBe(0); // no damage outside Blood Hunt
    // Survivors outside the cone are untouched.
    expect(survivors[1].statuses.has("blindness")).toBe(false);
    expect(killer.cooldowns.remaining("infernal_cry", game.now) / 20).toBeGreaterThan(18.5);
  });
  it("Marked reveals bypass Undetectable", () => {
    const { game, killer, survivors } = duel();
    game.status(survivors[0], "undetectable", 1, 30, survivors[0]);
    useAbility(game, killer, "infernal_cry");
    run(game, ticks(0.7) + 1);
    expect(game.isRevealedTo(survivors[0], killer)).toBe(true);
  });
  it("during Blood Hunt: 10 damage, Blindness 6 s, Speed I 3 s + Strength I 8 s for him", () => {
    const { game, killer, survivors } = duel();
    startHunt(game, killer);
    const hp = survivors[0].hp;
    useAbility(game, killer, "infernal_cry");
    run(game, ticks(0.7) + 1);
    expect(survivors[0].hp).toBeCloseTo(hp - 10);
    expect(survivors[0].statuses.remainingTicks("blindness", game.now)).toBeGreaterThan(ticks(5.8));
    expect(killer.statuses.level("speed")).toBe(1);
    expect(killer.statuses.level("strength")).toBe(1);
  });
});

describe("Guest 666 — Blood Rush", () => {
  it("4 s windup, then marks every survivor for 5-20 s by distance (Marked, bypasses Undetectable)", () => {
    const { game, killer, survivors } = duel();
    game.status(survivors[1], "undetectable", 1, 60, survivors[1]);
    expect(useAbility(game, killer, "blood_rush").ok).toBe(true);
    run(game, ticks(3.9));
    expect(game.isRevealedTo(survivors[1], killer)).toBe(false);
    run(game, ticks(0.1) + 1);
    const maxD = studs(200);
    for (const s of survivors) {
      expect(game.isRevealedTo(s, killer)).toBe(true);
      expect(s.statuses.has("marked")).toBe(true);
      const r = game.reveals.find((x) => x.targetId === s.id && x.source === "blood_rush")!;
      const expected = 5 + 15 * Math.min(1, game.distance(s, killer) / maxD);
      expect((r.endTick - game.now) / 20).toBeCloseTo(expected, 0);
    }
    expect(killer.cooldowns.remaining("blood_rush", game.now) / 20).toBeGreaterThan(25);
  });
});

describe("Guest 666 — Blood Hunt", () => {
  it("at full Blood: 3 s windup, then 25 s hunt: cooldowns reset, +4% speed, terror radius halved, fog, timer blocked, Blood Rush disabled", () => {
    const { game, killer, survivors } = duel();
    game.startCooldown(killer, "infernal_cry", 15);
    killer.res.blood = 200;
    useAbility(game, killer, "blood_rush");
    expect(killer.channel?.label).toBe("Blood Hunt");
    run(game, ticks(3) + 1);
    expect(killer.flags.has("bloodHunt")).toBe(true);
    expect(killer.cooldowns.remaining("infernal_cry", game.now)).toBe(0);
    expect(killer.moveMods.find((m) => m.id === "blood_hunt")?.mul).toBeCloseTo(1.04);
    expect(game.terrorRadius(killer)).toBeCloseTo(studs(112.5) * 0.5);
    expect(game.fx.events.some((e) => e.t === "fog" && e.on && e.actorId === survivors[0].id)).toBe(true);
    expect(useAbility(game, killer, "blood_rush").reason).toBe("Blood Hunt active");
    game.round.timeLeft = 0;
    run(game, 2);
    expect(game.phase).toBe("ROUND");
  });
  it("ends after 25 s (out of chase): Blood emptied, max Blood +50, fog off, Blood Rush back on cooldown", () => {
    const { game, killer, survivors } = duel();
    far(survivors[0]);
    startHunt(game, killer);
    run(game, ticks(24.5));
    expect(killer.flags.has("bloodHunt")).toBe(true);
    run(game, ticks(1));
    expect(killer.flags.has("bloodHunt")).toBe(false);
    expect(killer.res.blood).toBe(0);
    expect(killer.res.maxBlood).toBe(250);
    expect(killer.res.terrorMul).toBeUndefined();
    expect(killer.moveMods.some((m) => m.id === "blood_hunt")).toBe(false);
    expect(game.fx.events.some((e) => e.t === "fog" && !e.on && e.actorId === survivors[0].id)).toBe(true);
    expect(killer.cooldowns.remaining("blood_rush", game.now) / 20).toBeGreaterThan(29);
  });
  it("the timer drains at half speed while a survivor is in chase", () => {
    const { game, killer } = duel();
    startHunt(game, killer);
    run(game, ticks(10));
    expect(huntLeft(killer)).toBeCloseTo(25 - 5 - 0.025, 0);
  });
  it("kills extend it by 15 s (then 2 s less per kill) and reset cooldowns", () => {
    const { game, killer, survivors } = duel();
    far(survivors[0]);
    startHunt(game, killer);
    game.startCooldown(killer, "infernal_cry", 15);
    const before = huntLeft(killer);
    game.damage(survivors[1], 500, killer);
    expect(huntLeft(killer)).toBeCloseTo(before + 15);
    expect(killer.cooldowns.remaining("infernal_cry", game.now)).toBe(0);
    game.damage(survivors[2], 500, killer);
    expect(huntLeft(killer)).toBeCloseTo(before + 15 + 13);
  });
  it("survivors flash (Marked) every 5 s", () => {
    const { game, killer, survivors } = duel();
    far(survivors[0]);
    startHunt(game, killer);
    run(game, 1);
    expect(game.isRevealedTo(survivors[1], killer)).toBe(true);
    run(game, ticks(1.5));
    expect(game.isRevealedTo(survivors[1], killer)).toBe(false);
    run(game, ticks(3.6));
    expect(game.isRevealedTo(survivors[1], killer)).toBe(true);
  });
  it("is usable the moment Blood is full (Blood Rush cooldown cleared), but not in Last Man Standing", () => {
    const { game, killer } = duel();
    game.startCooldown(killer, "blood_rush", 30);
    killer.res.blood = 200;
    run(game, 1);
    expect(killer.cooldowns.remaining("blood_rush", game.now)).toBe(0);
    game.round.lms = true;
    useAbility(game, killer, "blood_rush");
    expect(killer.channel?.label).toBe("Blood Rush");
  });
  it("Last Man Standing cuts an active Blood Hunt to 6 s", () => {
    const { game, killer } = duel();
    startHunt(game, killer);
    game.round.lms = true;
    run(game, 1);
    expect(huntLeft(killer)).toBeLessThanOrEqual(6);
  });
});

describe("Guest 666 — Hellforged Will", () => {
  it("enemy debuffs and stuns last 25% less; self-inflicted ones and buffs are untouched", () => {
    const { game, killer, survivors } = duel();
    game.status(killer, "slowness", 1, 4, survivors[0]);
    expect(killer.statuses.remainingTicks("slowness", game.now)).toBe(ticks(3));
    game.status(killer, "weakness", 1, 4, killer);
    expect(killer.statuses.remainingTicks("weakness", game.now)).toBe(ticks(4));
    game.status(killer, "speed", 1, 4, survivors[0]);
    expect(killer.statuses.remainingTicks("speed", game.now)).toBe(ticks(4));
    game.stun(killer, 2, survivors[0]);
    expect(killer.stunnedUntil - game.now).toBe(ticks(2 * 0.75 + 0.6));
  });
  it("50% during Blood Hunt", () => {
    const { game, killer, survivors } = duel();
    startHunt(game, killer);
    game.status(killer, "blindness", 1, 4, survivors[0]);
    expect(killer.statuses.remainingTicks("blindness", game.now)).toBe(ticks(2));
  });
});

describe("Guest 666 — Manic Fixation", () => {
  it("no bonus without a highlighted survivor", () => {
    const { game, killer } = duel();
    run(game, ticks(4));
    expect(killer.moveMods.some((m) => m.id === "manic_fixation")).toBe(false);
  });
  it("ramps up to +10% within 30 studs of a highlighted survivor in chase", () => {
    const { game, killer } = duel();
    useAbility(game, killer, "blood_rush");
    run(game, ticks(4) + 1);
    run(game, ticks(1.5));
    const mid = killer.moveMods.find((m) => m.id === "manic_fixation")!.mul!;
    expect(mid).toBeGreaterThan(1.03);
    expect(mid).toBeLessThan(1.08);
    run(game, ticks(2));
    expect(killer.moveMods.find((m) => m.id === "manic_fixation")!.mul).toBeCloseTo(1.1, 3);
  });
  it("+15% while running toward a highlighted survivor who is not in chase", () => {
    const { game, killer, survivors } = duel();
    far(survivors[0]);
    useAbility(game, killer, "blood_rush");
    run(game, ticks(4) + 1);
    const target = survivors[1];
    killer.input.moveDir = game.dirTo(killer.pos, target.pos);
    run(game, ticks(3.2));
    expect(killer.moveMods.find((m) => m.id === "manic_fixation")!.mul).toBeCloseTo(1.15, 3);
    // Turning away (no highlighted survivor ahead or within 30 studs) loses it.
    killer.input.moveDir = { x: 1, y: 0, z: 0 };
    run(game, 1);
    expect(killer.moveMods.some((m) => m.id === "manic_fixation")).toBe(false);
  });
});
