import { afterEach, describe, expect, it } from "vitest";
import { body, cellPos, faceTo, place, realMatch, run } from "../helpers";
import { useAbility } from "../../src/abilities/engine";
import { patchConfig, resetConfig } from "../../src/core/config";
import { blocksPerSecond, ticks } from "../../src/core/scale";
import { ritualOf } from "../../src/abilities/kits/two_time";
import type { Game } from "../../src/core/game";
import type { Actor } from "../../src/entities/actor";

afterEach(() => resetConfig());

function setup(survivors: string[] = ["two_time", "elliot", "elliot"]) {
  const m = realMatch("slasher", survivors);
  const tt = m.survivors[0];
  // Within the dagger's 6-stud reach of the killer (who faces her).
  place(tt, { x: m.killer.pos.x, y: m.killer.pos.y, z: m.killer.pos.z + 2.4 });
  faceTo(tt, m.killer);
  return { ...m, tt };
}

/** Carves the Ritual where Two Time stands (4 s windup). */
function carveRitual(game: Game, tt: Actor): void {
  expect(useAbility(game, tt, "ritual").ok).toBe(true);
  run(game, ticks(4) + 1);
  expect(ritualOf(game, tt)).not.toBeNull();
}

describe("Two Time — Sacrificial Dagger", () => {
  it("front stab: 0.25 s windup, 10 damage, Slowness II + Helpless 1 s, +20% Oblation, Resistance I 0.7 s, no sprint", () => {
    const { game, killer, tt } = setup();
    expect(useAbility(game, tt, "sacrificial_dagger").ok).toBe(true);
    expect(tt.statuses.level("resistance")).toBe(1);
    expect(tt.moveMods.some((m) => m.id === "dagger" && m.noSprint)).toBe(true);
    run(game, ticks(0.25));
    expect(killer.hp).toBe(1990);
    expect(killer.statuses.level("slowness")).toBe(2);
    expect(killer.statuses.has("helpless")).toBe(true);
    expect(killer.statuses.remainingTicks("helpless", game.now)).toBe(ticks(1));
    expect(killer.isStunned(game.now)).toBe(false);
    expect(tt.res.oblation).toBe(20);
    expect(tt.cooldowns.remaining("sacrificial_dagger", game.now) / 20).toBeCloseTo(30 - 0.25, 1);
  });
  it("backstab: 20 damage, 2 s stun, +40% Oblation", () => {
    const { game, killer, tt } = setup();
    faceTo(killer, cellPos(40, 40)); // killer turned away from Two Time
    useAbility(game, tt, "sacrificial_dagger");
    run(game, ticks(0.25));
    expect(killer.hp).toBe(1980);
    expect((killer.stunnedUntil - game.now) / 20).toBeCloseTo(2.6, 1);
    expect(tt.res.oblation).toBe(40);
  });
  it("crouched: a 22-stud lunge that backstabs for a 3.5 s stun and +60% Oblation, ending Crouch", () => {
    const { game, killer, tt } = setup();
    place(tt, cellPos(40, 56)); // 6 blocks behind the killer
    faceTo(killer, cellPos(40, 45));
    faceTo(tt, killer);
    useAbility(game, tt, "crouch");
    expect(tt.flags.has("crouching")).toBe(true);
    useAbility(game, tt, "sacrificial_dagger");
    expect(tt.flags.has("crouching")).toBe(false);
    run(game, ticks(0.25) + ticks(0.35) + 1);
    expect(killer.hp).toBe(1980);
    expect((killer.stunnedUntil - game.now) / 20).toBeGreaterThan(3.5);
    expect(tt.res.oblation).toBe(60);
    expect(Math.abs(tt.pos.z - killer.pos.z)).toBeLessThan(3.5);
  });
  it("a stun-immune killer gives no Oblation (the stab still lands)", () => {
    const { game, killer, tt } = setup();
    killer.stunImmuneUntil = game.now + ticks(20);
    faceTo(killer, cellPos(40, 40));
    useAbility(game, tt, "sacrificial_dagger");
    run(game, ticks(0.25));
    expect(killer.hp).toBe(1980);
    expect(killer.isStunned(game.now)).toBe(false);
    expect(tt.res.oblation).toBe(0);
  });
  it("an invincible killer takes nothing", () => {
    const { game, killer, tt } = setup();
    game.status(killer, "invincible", 1, 5, killer);
    useAbility(game, tt, "sacrificial_dagger");
    run(game, ticks(0.25));
    expect(killer.hp).toBe(2000);
    expect(killer.statuses.has("helpless")).toBe(false);
    expect(tt.res.oblation).toBe(0);
  });
  it("Oblation caps at 100%", () => {
    const { game, killer, tt } = setup();
    tt.res.oblation = 90;
    faceTo(killer, cellPos(40, 40));
    useAbility(game, tt, "sacrificial_dagger");
    run(game, ticks(0.25));
    expect(tt.res.oblation).toBe(100);
  });
});

describe("Two Time — Crouch", () => {
  it("Undetectable + Invisibility III, walk 10 / run 20; hidden from the killer, shown to nearby allies", () => {
    const { game, killer, tt, survivors } = setup();
    const noob = survivors[1];
    place(noob, cellPos(40, 60));
    useAbility(game, tt, "crouch");
    run(game, 10);
    expect(tt.statuses.has("undetectable")).toBe(true);
    expect(tt.statuses.level("invisibility")).toBe(3);
    expect(tt.walkBps).toBeCloseTo(blocksPerSecond(10));
    game.reveal(tt, "killer", 5, { source: "test" });
    expect(game.isRevealedTo(tt, killer)).toBe(false);
    expect(game.isRevealedTo(tt, noob)).toBe(true);
    // An ally beyond 100 studs does not see her.
    place(noob, cellPos(40, 1));
    run(game, 30);
    expect(game.isRevealedTo(tt, noob)).toBe(false);
  });
  it("leaving manually within 30 studs of the killer gives Speed II 1 s; the 35 s cooldown starts when it ends", () => {
    const { game, tt } = setup();
    useAbility(game, tt, "crouch");
    expect(tt.cooldowns.remaining("crouch", game.now)).toBe(0);
    run(game, 20);
    expect(useAbility(game, tt, "crouch").ok).toBe(true); // second press = leave
    expect(tt.flags.has("crouching")).toBe(false);
    expect(tt.statuses.has("undetectable")).toBe(false);
    expect(tt.statuses.level("speed")).toBe(2);
    expect(tt.statuses.remainingTicks("speed", game.now)).toBe(ticks(1));
    expect(tt.cooldowns.remaining("crouch", game.now)).toBe(ticks(35));
  });
  it("ends by itself after 15 s without the exit Speed", () => {
    const { game, tt } = setup();
    useAbility(game, tt, "crouch");
    run(game, ticks(15) + 1);
    expect(tt.flags.has("crouching")).toBe(false);
    expect(tt.statuses.has("speed")).toBe(false);
    expect(tt.cooldowns.remaining("crouch", game.now)).toBeGreaterThan(ticks(34));
  });
  it("no exit Speed when the killer is far", () => {
    const { game, tt, killer } = setup();
    place(killer, cellPos(40, 10));
    useAbility(game, tt, "crouch");
    run(game, 5);
    useAbility(game, tt, "crouch");
    expect(tt.statuses.has("speed")).toBe(false);
  });
  it("running at the killer builds up to +40% speed over 4 s; damage or turning away resets it", () => {
    const { game, killer, tt } = setup();
    place(tt, cellPos(40, 57));
    place(killer, cellPos(40, 50));
    faceTo(tt, killer);
    body(tt).physics = false;
    body(tt).st.speed = 0.3;
    tt.input.wantSprint = true;
    tt.input.moveDir = { x: 0, y: 0, z: -1 };
    useAbility(game, tt, "crouch");
    run(game, ticks(2));
    const half = tt.moveMods.find((m) => m.id === "crouch_ramp")?.mul ?? 1;
    expect(half).toBeGreaterThan(1.15);
    expect(half).toBeLessThan(1.25);
    run(game, ticks(3));
    expect(tt.moveMods.find((m) => m.id === "crouch_ramp")?.mul).toBeCloseTo(1.4, 2);
    game.damage(tt, 1, killer);
    run(game, 2);
    expect(tt.moveMods.find((m) => m.id === "crouch_ramp")?.mul ?? 1).toBeLessThan(1.05);
    run(game, ticks(1));
    faceTo(tt, cellPos(40, 70));
    run(game, 2);
    expect(tt.moveMods.some((m) => m.id === "crouch_ramp")).toBe(false);
  });
});

describe("Two Time — Ritual and Pray", () => {
  it("Ritual: 4 s rooted windup, then a ritual at her feet; once per round", () => {
    const { game, tt } = setup();
    const at = { ...tt.pos };
    useAbility(game, tt, "ritual");
    run(game, 2);
    expect(tt.frozen).toBe(true);
    run(game, ticks(4) - 3);
    expect(ritualOf(game, tt)).toBeNull();
    run(game, 2);
    const r = ritualOf(game, tt)!;
    expect(r.pos.x).toBeCloseTo(at.x);
    expect(r.pos.z).toBeCloseTo(at.z);
    expect(useAbility(game, tt, "ritual").reason).toBe("once per round");
  });
  it("Pray converts Oblation to HP at the Ritual (1 HP per 2%), rooted; stops on damage", () => {
    const { game, killer, tt } = setup();
    carveRitual(game, tt);
    tt.hp = 30;
    tt.res.oblation = 60;
    expect(useAbility(game, tt, "pray").ok).toBe(true);
    run(game, ticks(1));
    expect(tt.hp).toBeCloseTo(40, 0);
    expect(tt.res.oblation).toBeCloseTo(40, 0);
    expect(tt.frozen).toBe(true);
    game.damage(tt, 5, killer);
    const hp = tt.hp;
    run(game, 10);
    expect(tt.hp).toBe(hp);
    expect(tt.data("pray").active).toBe(false);
  });
  it("Pray stops when Oblation runs out or HP is full, and can be stopped by pressing again", () => {
    const { game, tt } = setup();
    carveRitual(game, tt);
    tt.hp = 70;
    tt.res.oblation = 100;
    useAbility(game, tt, "pray");
    run(game, ticks(2));
    expect(tt.hp).toBeCloseTo(80);
    expect(tt.res.oblation).toBeCloseTo(80, 0);
    expect(tt.data("pray").active).toBe(false);
    tt.hp = 50;
    useAbility(game, tt, "pray");
    run(game, 5);
    useAbility(game, tt, "pray");
    expect(tt.data("pray").active).toBe(false);
    expect(tt.frozen).toBe(true); // speeds update next tick
    run(game, 1);
    expect(tt.frozen).toBe(false);
  });
  it("Pray needs a Ritual, Oblation and missing HP; far from the Ritual it shows its location instead", () => {
    const { game, tt } = setup();
    tt.hp = 50;
    tt.res.oblation = 50;
    expect(useAbility(game, tt, "pray").reason).toBe("needs a Ritual");
    carveRitual(game, tt);
    place(tt, cellPos(40, 1));
    const r = useAbility(game, tt, "pray");
    expect(r.ok).toBe(false);
    expect(ritualOf(game, tt)!.data.showUntil).toBe(game.now + ticks(4));
    expect(game.fx.events.some((e) => e.t === "line" && e.viewers?.includes(tt.id))).toBe(true);
    tt.res.oblation = 0;
    expect(useAbility(game, tt, "pray").reason).toBe("no Oblation");
    tt.res.oblation = 10;
    tt.hp = tt.maxHp;
    expect(useAbility(game, tt, "pray").reason).toBe("full HP");
  });
});

describe("Two Time — Oblation second life", () => {
  it("full meter + Ritual: a lethal hit revives her at the Ritual (50 HP, statuses cleared, buffs, Vulnerable V, +20 s)", () => {
    const { game, killer, tt } = setup();
    const spot = { ...tt.pos };
    carveRitual(game, tt);
    place(tt, cellPos(40, 56));
    tt.res.oblation = 100;
    tt.stamina = 10;
    game.status(tt, "bleeding", 2, 10, killer);
    game.status(tt, "slowness", 3, 10, killer);
    const clock = game.round.timeLeft;
    const ev = game.damage(tt, 500, killer);
    expect(ev.killed).toBe(false);
    expect(tt.alive).toBe(true);
    expect(tt.maxHp).toBe(50);
    expect(tt.hp).toBe(50);
    expect(tt.pos.x).toBeCloseTo(spot.x, 0);
    expect(tt.pos.z).toBeCloseTo(spot.z, 0);
    expect(tt.statuses.has("bleeding")).toBe(false);
    expect(tt.statuses.has("slowness")).toBe(false);
    expect(tt.statuses.level("speed")).toBe(2);
    expect(tt.statuses.level("vulnerable")).toBe(5);
    expect(tt.statuses.remainingTicks("vulnerable", game.now)).toBe(ticks(12));
    expect(tt.stamina).toBeCloseTo(50);
    expect(tt.res.oblation).toBe(0);
    expect(ritualOf(game, tt)).toBeNull();
    expect(game.round.timeLeft).toBeCloseTo(clock + 20);
    // 2 s invincible.
    expect(game.damage(tt, 10, killer).cancelled).toBe(true);
    run(game, ticks(2) + 1);
    // Second death is final; it adds only the other half of the elimination bonus.
    const before = game.round.timeLeft;
    game.damage(tt, 500, killer);
    expect(tt.alive).toBe(false);
    expect(game.round.timeLeft).toBeCloseTo(before + 20);
  });
  it("no revive without a Ritual, or with a meter below 100% outside LMS", () => {
    const a = setup();
    a.tt.res.oblation = 100;
    a.game.damage(a.tt, 500, a.killer);
    expect(a.tt.alive).toBe(false);
    const b = setup();
    carveRitual(b.game, b.tt);
    b.tt.res.oblation = 80;
    b.game.damage(b.tt, 500, b.killer);
    expect(b.tt.alive).toBe(false);
  });
  it("LMS + Ritual: revives in place even with an empty meter (max HP 110, 50 HP, no Vulnerable, Ritual destroyed)", () => {
    const { game, killer, tt } = setup();
    carveRitual(game, tt);
    place(tt, cellPos(40, 56));
    game.round.lms = true;
    game.round.timeLeft = 75;
    tt.res.oblation = 0;
    game.damage(tt, 500, killer);
    expect(tt.alive).toBe(true);
    expect(tt.pos.z).toBeCloseTo(56.5);
    expect(tt.maxHp).toBe(110);
    expect(tt.hp).toBe(50);
    expect(tt.statuses.has("vulnerable")).toBe(false);
    expect(tt.statuses.level("speed")).toBe(2);
    expect(ritualOf(game, tt)).toBeNull();
    expect(game.round.timeLeft).toBe(75);
  });
});

describe("Two Time — Undying Devotion variant", () => {
  it("abilities are not usable", () => {
    patchConfig({ twoTimeVariant: "undying_devotion" });
    const { game, tt } = setup();
    for (const id of ["sacrificial_dagger", "crouch", "pray", "ritual"]) expect(useAbility(game, tt, id).reason).toBe("Undying Devotion variant");
  });
  it("revives once in place at 40 HP: cleansed, +40% stamina, Speed II 6 s, 1.5 s invincible, Vulnerable V 12 s", () => {
    patchConfig({ twoTimeVariant: "undying_devotion" });
    const { game, killer, tt } = setup();
    const at = { ...tt.pos };
    tt.stamina = 0;
    game.status(tt, "bleeding", 1, 10, killer);
    game.damage(tt, 500, killer);
    expect(tt.alive).toBe(true);
    expect(tt.hp).toBe(40);
    expect(tt.maxHp).toBe(80);
    expect(tt.pos.z).toBeCloseTo(at.z);
    expect(tt.statuses.has("bleeding")).toBe(false);
    expect(tt.stamina).toBeCloseTo(40);
    expect(tt.statuses.level("speed")).toBe(2);
    expect(tt.statuses.level("vulnerable")).toBe(5);
    expect(tt.invulnerableUntil - game.now).toBe(ticks(1.5));
    run(game, ticks(1.5) + 1);
    game.damage(tt, 500, killer);
    expect(tt.alive).toBe(false);
  });
  it("in LMS it raises max HP to 110 and heals 50", () => {
    patchConfig({ twoTimeVariant: "undying_devotion" });
    const { game, killer, tt } = setup();
    game.round.lms = true;
    game.damage(tt, 500, killer);
    expect(tt.maxHp).toBe(110);
    expect(tt.hp).toBe(50);
  });
});
