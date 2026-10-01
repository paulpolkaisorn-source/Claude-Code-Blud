import { afterEach, describe, expect, it } from "vitest";
import { body, cellPos, FakeBody, makeGame, populate, run, startRound, testCharacter } from "./helpers";
import { resetConfig } from "../src/core/config";
import { useAbility, type Kit } from "../src/abilities/engine";
import { ticks } from "../src/core/scale";

afterEach(() => resetConfig());

const K = testCharacter({ id: "k", team: "killer" });
const S = testCharacter({ id: "s", team: "survivor" });
const SENT = testCharacter({ id: "sent", team: "survivor", role: "sentinel" });

function setup(survivors = [S, S]) {
  const { game, ports } = makeGame();
  const { killer, survivors: ss } = populate(game, K, survivors);
  startRound(game);
  return { game, ports, killer, ss };
}

describe("damage pipeline", () => {
  it("applies raw damage and records stats", () => {
    const { game, killer, ss } = setup();
    const ev = game.damage(ss[0], 20, killer, { kind: "basic" });
    expect(ev.dealt).toBe(20);
    expect(ss[0].hp).toBe(80);
    expect(killer.stats.damageDealt).toBe(20);
    expect(ss[0].stats.damageTaken).toBe(20);
  });
  it("Resistance/Vulnerable/Creatures and Strength/Weakness multiply", () => {
    const { game, killer, ss } = setup();
    game.status(ss[0], "resistance", 2, 5, null);
    game.damage(ss[0], 50, killer);
    expect(ss[0].hp).toBeCloseTo(70);
    game.status(killer, "strength", 1, 5, null);
    game.status(killer, "weakness", 5, 5, null);
    game.damage(ss[1], 50, killer); // 50 * 1.2 * 0.5
    expect(ss[1].hp).toBeCloseTo(70);
  });
  it("Resistance V blocks everything", () => {
    const { game, killer, ss } = setup();
    game.status(ss[0], "resistance", 5, 5, null);
    const ev = game.damage(ss[0], 100, killer);
    expect(ev.dealt).toBe(0);
    expect(ss[0].hp).toBe(100);
  });
  it("overheal layers are consumed before HP", () => {
    const { game, killer, ss } = setup();
    game.shield(ss[0], "slateskin", 120);
    game.damage(ss[0], 100, killer);
    expect(ss[0].hp).toBe(100);
    expect(ss[0].shieldTotal()).toBeCloseTo(20);
    game.damage(ss[0], 30, killer);
    expect(ss[0].hp).toBeCloseTo(90);
    expect(ss[0].shields.length).toBe(0);
  });
  it("Shatterpoint-style layers reduce absorbed damage by 40% (damage over time skips it)", () => {
    const { game, killer, ss } = setup();
    game.shield(ss[0], "shatterpoint", 20, { max: 30, reduction: 0.4, dotSkipsReduction: true });
    game.damage(ss[0], 10, killer);
    expect(ss[0].shield("shatterpoint")?.amount).toBeCloseTo(14);
    expect(ss[0].hp).toBe(100);
    // 30 incoming: the layer (14) soaks 14/0.6 = 23.33 raw, 6.67 hits HP
    game.damage(ss[0], 30, killer);
    expect(ss[0].shield("shatterpoint")).toBeUndefined();
    expect(ss[0].hp).toBeCloseTo(100 - (30 - 14 / 0.6), 4);
  });
  it("floors: Bleeding cannot go below 10, Poison cannot kill", () => {
    const { game, killer, ss } = setup();
    ss[0].hp = 12;
    game.damage(ss[0], 8, killer, { kind: "dot", floor: 10 });
    expect(ss[0].hp).toBe(10);
    ss[1].hp = 3;
    game.damage(ss[1], 50, killer, { kind: "dot", canKill: false });
    expect(ss[1].hp).toBe(1);
    expect(ss[1].alive).toBe(true);
  });
  it("lethal hooks can prevent a death (Spawn Protection, Two Time)", () => {
    const { game, killer, ss } = setup();
    ss[0].addHooks("test", { lethal: (self) => ((self.hp = 50), true) });
    const ev = game.damage(ss[0], 500, killer);
    expect(ev.prevented).toBe(true);
    expect(ss[0].alive).toBe(true);
    expect(ss[0].hp).toBe(50);
  });
  it("kills survivors, credits the killer and adds 40 s to the clock", () => {
    const { game, killer, ss } = setup([S, S, S]);
    const t0 = game.round.timeLeft;
    game.damage(ss[0], 200, killer);
    expect(ss[0].alive).toBe(false);
    expect(killer.stats.kills).toBe(1);
    expect(game.round.timeLeft).toBeCloseTo(t0 + 40);
  });
  it("invulnerable targets take no damage (except bypassing sources)", () => {
    const { game, killer, ss } = setup();
    game.invulnerable(killer, 2);
    expect(game.damage(killer, 50, ss[0]).dealt).toBe(0);
    expect(game.damage(killer, 50, ss[0], { bypassInvincible: true }).dealt).toBe(50);
  });
  it("Purified reduces one hit by 20% per 20 missing HP", () => {
    const { game, killer, ss } = setup();
    ss[0].hp = 55; // 45 missing -> 40%
    game.status(ss[0], "purified", 1, 3, null);
    game.damage(ss[0], 10, killer);
    expect(ss[0].hp).toBeCloseTo(49);
    expect(ss[0].statuses.has("purified")).toBe(false);
  });
  it("survivors hit by the killer get the on-hit speed boost", () => {
    const { game, killer, ss } = setup();
    game.damage(ss[0], 10, killer, { kind: "basic" });
    expect(ss[0].statuses.level("speed")).toBeGreaterThan(0);
  });
  it("healing is capped at max HP and can be blocked by hooks (Metal Frame)", () => {
    const { game, ss } = setup();
    ss[0].hp = 50;
    expect(game.heal(ss[0], 80, null)).toBe(50);
    ss[1].hp = 50;
    ss[1].addHooks("metal", { modifyHeal: () => 0 });
    expect(game.heal(ss[1], 30, null)).toBe(0);
  });
});

describe("damage over time", () => {
  it("Bleeding I for 5 s deals 8 damage (no tick on the final second)", () => {
    const { game, killer, ss } = setup();
    game.status(ss[0], "bleeding", 1, 5, killer);
    run(game, 120);
    expect(ss[0].hp).toBeCloseTo(92);
  });
  it("Burning can kill and is nullified by Resistance", () => {
    const { game, killer, ss } = setup();
    ss[0].hp = 2;
    game.status(ss[0], "burning", 1, 10, killer);
    run(game, 40);
    expect(ss[0].alive).toBe(false);
    game.status(ss[1], "resistance", 1, 10, null);
    game.status(ss[1], "burning", 5, 5, killer);
    run(game, 40);
    expect(ss[1].hp).toBe(100);
  });
  it("Poisoned stops at 1 HP", () => {
    const { game, killer, ss } = setup();
    ss[0].hp = 3;
    game.status(ss[0], "poisoned", 5, 10, killer);
    run(game, 200);
    expect(ss[0].hp).toBe(1);
    expect(ss[0].alive).toBe(true);
  });
  it("Hemorrhage lowers max HP and recovers afterwards", () => {
    const { game, killer, ss } = setup();
    game.status(ss[0], "hemorrhage", 1, 10, killer);
    run(game, 200);
    expect(ss[0].maxHp).toBeLessThan(100);
    const low = ss[0].maxHp;
    run(game, 200);
    expect(ss[0].maxHp).toBeGreaterThan(low);
  });
  it("Slateskin grants status immunities", () => {
    const { game, killer, ss } = setup();
    game.status(ss[0], "slateskin", 3, 6, ss[0]);
    expect(game.status(ss[0], "bleeding", 1, 5, killer)).toBe(false);
    expect(game.status(ss[0], "slowness", 1, 5, killer)).toBe(true);
  });
  it("Subspaced cannot be reapplied while active", () => {
    const { game, ss } = setup();
    expect(game.status(ss[0], "subspaced", 1, 5, null)).toBe(true);
    expect(game.status(ss[0], "subspaced", 3, 5, null)).toBe(false);
  });
});

describe("stuns (wiki stun rules)", () => {
  it("killers get +0.6 s recovery, invulnerability for stun + 1 s, and stun immunity afterwards", () => {
    const { game, killer, ss } = setup([SENT, S]);
    expect(game.stun(killer, 2, ss[0])).toBe(true);
    expect(killer.stunnedUntil - game.now).toBe(ticks(2.6));
    expect(killer.invulnerableUntil - game.now).toBe(ticks(3.6));
    // one sentinel alive → no extra immunity: 4 s after the stun
    expect(killer.stunImmuneUntil - killer.stunnedUntil).toBe(ticks(4));
    expect(game.stun(killer, 2, ss[0])).toBe(false);
  });
  it("each additional living Sentinel adds 3 s of stun immunity", () => {
    const { game, killer, ss } = setup([SENT, SENT, SENT]);
    game.stun(killer, 1, ss[0]);
    expect(killer.stunImmuneUntil - killer.stunnedUntil).toBe(ticks(4 + 6));
  });
  it("stuns cancel windups and channels", () => {
    const { game, killer } = setup();
    let fired = false;
    game.windup(killer, 1, () => (fired = true), { abilityId: "x" });
    run(game, 5);
    game.stun(killer, 1, null);
    run(game, 40);
    expect(fired).toBe(false);
    expect(killer.channel).toBeNull();
  });
  it("stunned actors cannot move or use abilities", () => {
    const kit: Kit = { id: "k", abilities: { slash: { use: () => undefined } } };
    const killerDef = testCharacter({ id: "k", team: "killer", abilities: [{ id: "slash", name: "Slash", slot: 1, input: "tap", cooldown: 1, description: "", params: {} }] });
    const { game } = makeGame(new Map([["k", kit]]));
    const { killer } = populate(game, killerDef, [S]);
    startRound(game);
    game.stun(killer, 1, null);
    run(game, 1);
    expect(killer.frozen).toBe(true);
    expect(useAbility(game, killer, "slash")).toEqual({ ok: false, reason: "stunned" });
  });
});

describe("stamina (wiki Statistics/Stamina)", () => {
  it("drains 10/s while sprinting, exhausts at 0 for 2 s, then regenerates 20/s", () => {
    const { game, ss } = setup();
    const b = body(ss[0]);
    b.st.sprintInput = true;
    b.st.speed = 0.25;
    ss[0].input.wantSprint = true;
    run(game, 20);
    expect(ss[0].stamina).toBeCloseTo(90, 0);
    run(game, 180);
    expect(ss[0].stamina).toBe(0);
    expect(ss[0].exhausted).toBe(true);
    run(game, 1);
    expect(ss[0].canSprint).toBe(false);
    b.st.sprintInput = false;
    b.st.speed = 0;
    ss[0].input.wantSprint = false;
    run(game, 37); // 2 s exhaust: no regen
    expect(ss[0].stamina).toBeLessThan(1);
    run(game, 22);
    expect(ss[0].stamina).toBeGreaterThan(15);
    expect(ss[0].exhausted).toBe(false);
  });
  it("killers do not drain stamina when no survivor is within 85 studs", () => {
    const { game, killer, ss } = setup();
    for (const s of ss) body(s).moveTo(cellPos(5, 75));
    const b = body(killer);
    b.st.sprintInput = true;
    b.st.speed = 0.25;
    killer.input.wantSprint = true;
    run(game, 40);
    expect(killer.stamina).toBe(110);
    body(ss[0]).moveTo({ ...killer.pos, x: killer.pos.x + 3 });
    run(game, 40);
    expect(killer.stamina).toBeLessThan(110);
  });
  it("killers get +10% speed when no survivor is within 85 studs", () => {
    const { game, killer, ss } = setup();
    for (const s of ss) body(s).moveTo(cellPos(5, 75));
    run(game, 1);
    const far = killer.walkBps;
    body(ss[0]).moveTo({ ...killer.pos, x: killer.pos.x + 3 });
    run(game, 1);
    expect(far / killer.walkBps).toBeCloseTo(1.1);
  });
  it("survivors limp at <= 50% HP", () => {
    const { game, ss } = setup();
    run(game, 1);
    const full = ss[0].walkBps;
    ss[0].hp = 50;
    run(game, 1);
    expect(ss[0].walkBps).toBeLessThan(full);
  });
});

describe("ability engine", () => {
  const abil = (id: string, slot: number, cooldown: number | null, input: "tap" | "charge" = "tap") => ({ id, name: id, slot, input, cooldown, description: "", params: { dmg: 10 } });
  function kitGame(kit: Kit, abilities = [abil("a", 2, 5), abil("b", 3, 3, "charge")]) {
    const def = testCharacter({ id: "t", team: "survivor", abilities });
    const { game } = makeGame(new Map([["t", kit]]));
    const { killer, survivors } = populate(game, K, [def]);
    startRound(game);
    return { game, actor: survivors[0], killer };
  }
  it("starts the cooldown from data and blocks reuse", () => {
    let uses = 0;
    const { game, actor } = kitGame({ id: "t", abilities: { a: { use: () => void uses++ }, b: { use: () => undefined } } });
    expect(useAbility(game, actor, "a").ok).toBe(true);
    expect(useAbility(game, actor, "a").ok).toBe(false);
    run(game, ticks(5));
    expect(useAbility(game, actor, "a").ok).toBe(true);
    expect(uses).toBe(2);
  });
  it("Helpless blocks abilities", () => {
    const { game, actor } = kitGame({ id: "t", abilities: { a: { use: () => undefined }, b: { use: () => undefined } } });
    game.status(actor, "helpless", 1, 3, null);
    expect(useAbility(game, actor, "a")).toEqual({ ok: false, reason: "helpless" });
  });
  it("charge abilities: first press starts, second press releases", () => {
    const log: string[] = [];
    const { game, actor } = kitGame({
      id: "t",
      abilities: {
        a: { use: () => undefined },
        b: {
          use: (c) => {
            c.data.active = true;
            log.push("start");
            return { noCooldown: true };
          },
          release: (c) => {
            c.data.active = false;
            log.push("release");
            c.game.startCooldown(c.actor, "b", 3);
          },
        },
      },
    });
    useAbility(game, actor, "b");
    useAbility(game, actor, "b");
    expect(log).toEqual(["start", "release"]);
    expect(useAbility(game, actor, "b").ok).toBe(false);
  });
  it("failed casts do not start the cooldown", () => {
    const { game, actor } = kitGame({ id: "t", abilities: { a: { use: () => false }, b: { use: () => undefined } } });
    expect(useAbility(game, actor, "a").ok).toBe(false);
    expect(actor.cooldowns.ready("a", game.now)).toBe(true);
  });
  it("killers cannot act during the head start", () => {
    const kdef = testCharacter({ id: "kk", team: "killer", abilities: [abil("m1", 1, 1)] });
    const { game } = makeGame(new Map([["kk", { id: "kk", abilities: { m1: { use: () => undefined } } }]]));
    const { killer } = populate(game, kdef, [S]);
    game.startHeadStart();
    game.tick();
    expect(useAbility(game, killer, "m1").reason).toBe("head start");
    expect(killer.frozen).toBe(true);
  });
});

describe("reveals (auras)", () => {
  it("Undetectable hides non-Marked reveals; Marked bypasses; Subspaced viewers see nothing", () => {
    const { game, killer, ss } = setup();
    game.reveal(ss[0], "killer", 5);
    expect(game.isRevealedTo(ss[0], killer)).toBe(true);
    game.status(ss[0], "undetectable", 1, 5, null);
    expect(game.isRevealedTo(ss[0], killer)).toBe(false);
    game.reveal(ss[0], "killer", 5, { marked: true, source: "cry" });
    expect(game.isRevealedTo(ss[0], killer)).toBe(true);
    game.status(killer, "subspaced", 1, 5, null);
    expect(game.isRevealedTo(ss[0], killer)).toBe(false);
  });
  it("expires", () => {
    const { game, killer, ss } = setup();
    game.reveal(ss[0], "killer", 1);
    run(game, 21);
    expect(game.isRevealedTo(ss[0], killer)).toBe(false);
  });
});

describe("dashes", () => {
  it("move the body each tick and stop at walls", () => {
    const { game, killer } = setup();
    const b = killer.body as FakeBody;
    b.moveTo(cellPos(35, 30));
    b.face({ x: 0, y: 0, z: -1 }); // toward the chapel's south wall at z = 22
    game.syncBodies();
    let wall = false;
    game.dash(killer, { id: "t", blocksPerTick: 0.5, seconds: 5, onWall: () => (wall = true) });
    run(game, 40);
    expect(wall).toBe(true);
    expect(killer.forced).toBeNull();
    expect(killer.pos.z).toBeGreaterThan(22);
  });
});
