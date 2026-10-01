import { afterEach, describe, expect, it } from "vitest";
import { cellPos, faceTo, place, realMatch, run, type FakeBody } from "../helpers";
import { useAbility, abilityHudText } from "../../src/abilities/engine";
import { meleeTargets } from "../../src/abilities/kits/common";
import { parryReady } from "../../src/abilities/kits/guest_1337";
import { resetConfig } from "../../src/core/config";
import { blocksPerSecond, ticks, toStuds } from "../../src/core/scale";
import { dist2D, type Vec3 } from "../../src/util/vec";
import type { Actor } from "../../src/entities/actor";

afterEach(() => resetConfig());

function gmatch(others = ["noob"]) {
  const m = realMatch("slasher", ["guest_1337", ...others]);
  for (const s of m.survivors.slice(1)) place(s, cellPos(14, 72));
  const guest = m.survivors[0];
  // Punch reach is 7 studs (2.6 blocks): stand 2 blocks from the killer.
  place(guest, { x: 40.5, y: 100, z: 52.5 });
  faceTo(m.killer, guest);
  faceTo(guest, m.killer);
  return { ...m, guest };
}

function face(a: Actor, dir: Vec3): void {
  (a.body as FakeBody).face(dir);
  a.state = a.body.read();
}

/** Block, then let Slasher's Slash land on the block. */
function blockSlash(game: ReturnType<typeof gmatch>["game"], guest: Actor, killer: Actor): void {
  expect(useAbility(game, guest, "block").ok).toBe(true);
  expect(useAbility(game, killer, "slash").ok).toBe(true);
  run(game, ticks(0.2) + 1);
}

describe("Guest 1337 — passives", () => {
  it("Made to Last: 110 HP", () => {
    const { guest } = gmatch();
    expect(guest.maxHp).toBe(110);
    expect(guest.hp).toBe(110);
  });

  it("Self Sacrifice: hit priority 2 (3 while blocking), so stacked single-target hits go to him", () => {
    const { game, guest, killer, survivors } = gmatch();
    const noob = survivors[1];
    expect(guest.hitPriority).toBe(2);
    place(noob, cellPos(40, 52));
    place(guest, { x: 40.9, y: 100, z: 52.6 });
    faceTo(killer, noob);
    expect(meleeTargets(game, killer, { rangeStuds: 8, halfAngle: 60, single: true })[0]).toBe(guest);
    useAbility(game, guest, "block");
    expect(guest.hitPriority).toBe(3);
    run(game, ticks(1) + 1);
    expect(guest.hitPriority).toBe(2);
  });
});

describe("Guest 1337 — Block", () => {
  it("Resistance V 1 s and -50% speed for 1.75 s", () => {
    const { game, guest } = gmatch();
    useAbility(game, guest, "block");
    expect(guest.cooldowns.remaining("block", game.now)).toBe(ticks(27));
    run(game, 1);
    expect(guest.statuses.level("resistance")).toBe(5);
    expect(guest.walkBps).toBeCloseTo(blocksPerSecond(12) * 0.5, 3);
    run(game, ticks(1));
    expect(guest.statuses.has("resistance")).toBe(false);
    expect(guest.flags.has("blocking")).toBe(false);
    run(game, ticks(0.8));
    expect(guest.walkBps).toBeCloseTo(blocksPerSecond(12), 3);
  });

  it("blocking a basic attack: no damage, +10 overheal, Speed I, Strength I, killer slowed 30%, Punch reset, Parry ready", () => {
    const { game, guest, killer } = gmatch();
    face(guest, { x: 1, y: 0, z: 0 });
    useAbility(game, guest, "punch"); // whiffs, Punch goes on cooldown
    run(game, ticks(1));
    faceTo(guest, killer);
    expect(guest.cooldowns.remaining("punch", game.now)).toBeGreaterThan(0);
    blockSlash(game, guest, killer);
    expect(guest.hp).toBe(110);
    expect(guest.statuses.has("bleeding")).toBe(false);
    expect(guest.shield("block_overheal")?.amount).toBe(10);
    expect(guest.statuses.level("speed")).toBe(1);
    expect(guest.statuses.level("strength")).toBe(1);
    expect(guest.statuses.has("resistance")).toBe(false);
    expect(guest.moveMods.some((m) => m.id === "block_slow")).toBe(false);
    expect(guest.flags.has("blocking")).toBe(false);
    expect(killer.moveMods.find((m) => m.id === "guest_block_slow")?.mul).toBe(0.7);
    expect(guest.cooldowns.remaining("punch", game.now)).toBe(0);
    expect(parryReady(game, guest)).toBe(true);
    expect(abilityHudText(game, guest, guest.ability("punch")!).label).toContain("PARRY");
    run(game, ticks(1) + 1);
    expect(killer.moveMods.some((m) => m.id === "guest_block_slow" && m.endTick > game.now)).toBe(false);
  });

  it("block overheal stacks to 30 and does not decay", () => {
    const { game, guest, killer } = gmatch();
    for (let i = 0; i < 4; i++) {
      guest.cooldowns.reset("block");
      killer.cooldowns.reset("slash");
      blockSlash(game, guest, killer);
      run(game, ticks(1));
    }
    expect(guest.shield("block_overheal")?.amount).toBe(30);
    run(game, ticks(20));
    expect(guest.shield("block_overheal")?.amount).toBe(30);
  });

  it("one block covers one attack", () => {
    const { game, guest, killer } = gmatch();
    useAbility(game, guest, "block");
    expect(game.damage(guest, 20, killer, { kind: "basic" }).cancelled).toBe(true);
    expect(game.damage(guest, 20, killer, { kind: "basic" }).dealt).toBeGreaterThan(0);
  });

  it("blocking a non-basic ability breaks the block: -40% damage, then Resistance II 3 s, abilities locked ~2 s", () => {
    const { game, guest, killer } = gmatch();
    useAbility(game, guest, "block");
    useAbility(game, killer, "behead");
    run(game, ticks(0.45) + 1);
    expect(guest.hp).toBeCloseTo(110 - 25 * 0.6);
    expect(guest.flags.has("blocking")).toBe(false);
    run(game, 1);
    expect(guest.statuses.level("resistance")).toBe(2);
    expect(guest.statuses.remainingTicks("resistance", game.now)).toBeGreaterThan(ticks(2.8));
    // Behead's Helpless is shown; the extra lock is silent ("busy").
    game.removeStatus(guest, "helpless");
    expect(guest.flags.has("locked")).toBe(true);
    expect(useAbility(game, guest, "charge")).toEqual({ ok: false, reason: "busy" });
    run(game, ticks(2));
    expect(guest.flags.has("locked")).toBe(false);
    expect(useAbility(game, guest, "punch").ok).toBe(true);
    expect(parryReady(game, guest)).toBe(false);
  });

  it("after the 1 s window hits land normally", () => {
    const { game, guest, killer } = gmatch();
    useAbility(game, guest, "block");
    run(game, ticks(1) + 1);
    expect(game.damage(guest, 20, killer, { kind: "basic" }).dealt).toBe(20);
  });

  it("an earlier, longer Resistance is not stretched to level V and comes back after the block", () => {
    const { game, guest } = gmatch();
    game.status(guest, "resistance", 2, 5, guest);
    useAbility(game, guest, "block");
    expect(guest.statuses.level("resistance")).toBe(5);
    run(game, ticks(1) + 1);
    expect(guest.statuses.level("resistance")).toBe(2);
    expect(guest.statuses.remainingTicks("resistance", game.now)).toBeGreaterThan(ticks(3.5));
  });
});

describe("Guest 1337 — Punch", () => {
  it("0.6 s windup, single target: 25 damage, Helpless + Slowness I 2 s, knockback; 55 s cooldown", () => {
    const { game, guest, killer, survivors } = gmatch(["noob"]);
    expect(useAbility(game, guest, "punch").ok).toBe(true);
    expect(guest.cooldowns.remaining("punch", game.now)).toBe(ticks(55));
    run(game, ticks(0.6) - 1);
    expect(killer.hp).toBe(killer.maxHp);
    run(game, 2);
    expect(killer.hp).toBe(killer.maxHp - 25);
    expect(killer.statuses.has("helpless")).toBe(true);
    expect(killer.statuses.level("slowness")).toBe(1);
    expect(killer.isStunned(game.now)).toBe(false);
    expect((killer.body as FakeBody).impulses.length).toBe(1);
    expect(survivors[1].hp).toBe(100);
  });

  it("misses when nobody is in front", () => {
    const { game, guest, killer } = gmatch();
    face(guest, { x: 1, y: 0, z: 0 });
    useAbility(game, guest, "punch");
    run(game, ticks(0.7));
    expect(killer.hp).toBe(killer.maxHp);
  });

  it("Parry Punch after a successful block: 0.4 s windup with Resistance II, 42 damage with Strength I, 2 s stun, bigger knockback", () => {
    const { game, guest, killer } = gmatch();
    blockSlash(game, guest, killer);
    const hp = killer.hp;
    expect(useAbility(game, guest, "punch").ok).toBe(true);
    expect(parryReady(game, guest)).toBe(false);
    run(game, 1);
    expect(guest.statuses.level("resistance")).toBe(2);
    run(game, ticks(0.4));
    expect(killer.hp).toBeCloseTo(hp - 42);
    expect(killer.isStunned(game.now)).toBe(true);
    expect(killer.stunnedUntil - game.now).toBeGreaterThan(ticks(2.4));
    const imp = (killer.body as FakeBody).impulses.at(-1)!;
    expect(Math.hypot(imp.x, imp.z)).toBeGreaterThan(1.5);
  });

  it("the Parry Punch expires if not used within the window", () => {
    const { game, guest, killer } = gmatch();
    blockSlash(game, guest, killer);
    run(game, ticks(3.5));
    expect(parryReady(game, guest)).toBe(false);
    useAbility(game, guest, "punch");
    run(game, ticks(0.6) + 1);
    expect(killer.isStunned(game.now)).toBe(false);
  });
});

describe("Guest 1337 — Charge", () => {
  it("hitting the killer: 5 damage, knockback, Resistance III 0.5 s; stamina regen paused while charging", () => {
    const { game, guest, killer } = gmatch();
    place(guest, cellPos(40, 55));
    faceTo(guest, killer);
    guest.stamina = 50;
    expect(useAbility(game, guest, "charge").ok).toBe(true);
    expect(guest.cooldowns.remaining("charge", game.now)).toBe(ticks(40));
    expect(guest.forced?.id).toBe("charge");
    run(game, 1);
    expect(guest.stamina).toBe(50);
    let guard = 0;
    while (guest.forced && guard++ < 40) run(game, 1);
    expect(killer.hp).toBe(killer.maxHp - 5);
    expect(guest.statuses.level("resistance")).toBe(3);
    expect((killer.body as FakeBody).impulses.length).toBe(1);
    expect(guest.statuses.has("slowness")).toBe(false);
  });

  it("knockback grows with how long he charged (6 → 11 studs over 0.5 s)", () => {
    const near = gmatch();
    useAbility(near.game, near.guest, "charge");
    run(near.game, 10);
    const short = (near.killer.body as FakeBody).impulses[0];
    const far = gmatch();
    place(far.killer, cellPos(40, 43));
    place(far.guest, cellPos(40, 53));
    faceTo(far.guest, far.killer);
    // Ruin wall in between: move to an open lane.
    place(far.killer, cellPos(46, 44));
    place(far.guest, cellPos(46, 54));
    faceTo(far.guest, far.killer);
    useAbility(far.game, far.guest, "charge");
    run(far.game, 30);
    const long = (far.killer.body as FakeBody).impulses[0];
    expect(short).toBeDefined();
    expect(long).toBeDefined();
    expect(Math.hypot(long.x, long.z)).toBeGreaterThan(Math.hypot(short.x, short.z) * 1.4);
  });

  it("a killer charged within 20 s is unaffected (and there is no miss penalty)", () => {
    const { game, guest, killer } = gmatch();
    useAbility(game, guest, "charge");
    run(game, 10);
    expect(killer.hp).toBe(killer.maxHp - 5);
    run(game, ticks(3));
    place(guest, cellPos(40, 53));
    place(killer, cellPos(40, 50));
    faceTo(guest, killer);
    guest.cooldowns.reset("charge");
    useAbility(game, guest, "charge");
    run(game, 10);
    expect(killer.hp).toBe(killer.maxHp - 5);
    expect(guest.forced).toBeNull();
    expect(guest.statuses.has("slowness")).toBe(false);
    expect(abilityHudText(game, guest, guest.ability("charge")!).label).toMatch(/§c\d+s/);
  });

  it("missing (wall or time out): Slowness II for 3×distance/13 s (3-15 s)", () => {
    const { game, guest, killer } = gmatch();
    face(guest, { x: 0, y: 0, z: 1 }); // away from the killer, toward the gym wall at z = 58
    useAbility(game, guest, "charge");
    let guard = 0;
    while (guest.forced && guard++ < 40) run(game, 1);
    const dStuds = toStuds(dist2D(guest.pos, killer.pos));
    expect(guest.statuses.level("slowness")).toBe(2);
    const expected = Math.max(3, Math.min(15, (3 * dStuds) / 13));
    expect(guest.statuses.remainingTicks("slowness", game.now) / 20).toBeCloseTo(expected, 0);
    expect(killer.hp).toBe(killer.maxHp);
  });

  it("starting a generator cancels it without a penalty", () => {
    const { game, guest } = gmatch();
    const gen = game.generators[4]; // ruins (36,45)
    place(guest, { x: gen.block.x + 2.5, y: 100, z: gen.block.z + 0.5 });
    face(guest, { x: 1, y: 0, z: 0 });
    useAbility(game, guest, "charge");
    run(game, 1);
    guest.input.repairTarget = gen.id;
    run(game, 2);
    expect(guest.forced).toBeNull();
    expect(guest.statuses.has("slowness")).toBe(false);
  });
});
