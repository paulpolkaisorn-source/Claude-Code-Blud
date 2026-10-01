import { afterEach, describe, expect, it } from "vitest";
import { cellPos, faceTo, place, realMatch, run } from "../helpers";
import { useAbility } from "../../src/abilities/engine";
import { meleeTargets } from "../../src/abilities/kits/common";
import { resetConfig } from "../../src/core/config";
import { blocksPerSecond, ticks } from "../../src/core/scale";

afterEach(() => resetConfig());

const WALK = blocksPerSecond(12);

function noobMatch() {
  const m = realMatch("slasher", ["noob", "elliot"]);
  const noob = m.survivors[0];
  // Keep Elliot away from the duel spot.
  place(m.survivors[1], cellPos(14, 72));
  return { ...m, noob };
}

describe("Noob — Bloxy Cola", () => {
  it("2.5 s drink at -10% speed without sprint, then Speed I 10 s and Slowness removed; 50 s cooldown", () => {
    const { game, killer, noob } = noobMatch();
    game.status(noob, "slowness", 2, 30, killer);
    expect(useAbility(game, noob, "bloxy_cola").ok).toBe(true);
    expect(noob.cooldowns.remaining("bloxy_cola", game.now)).toBe(ticks(50));
    run(game, 2);
    expect(noob.canSprint).toBe(false);
    // 0.9 drink multiplier on top of Slowness II (0.8)
    expect(noob.walkBps).toBeCloseTo(WALK * 0.9 * 0.8, 3);
    run(game, ticks(2.5) - 3);
    expect(noob.statuses.has("speed")).toBe(false);
    run(game, 2);
    expect(noob.statuses.has("slowness")).toBe(false);
    expect(noob.statuses.level("speed")).toBe(1);
    expect(noob.statuses.remainingTicks("speed", game.now)).toBeGreaterThan(ticks(9.8));
    expect(noob.canSprint).toBe(true);
    expect(noob.res.lastColaTick).toBeGreaterThan(0);
    run(game, ticks(10));
    expect(noob.statuses.has("speed")).toBe(false);
  });

  it("while the cola speed lasts, a Slowness hit cancels the speed instead of slowing Noob", () => {
    const { game, killer, noob } = noobMatch();
    useAbility(game, noob, "bloxy_cola");
    run(game, ticks(2.5) + 1);
    expect(noob.statuses.level("speed")).toBe(1);
    expect(game.status(noob, "slowness", 2, 3, killer)).toBe(false);
    expect(noob.statuses.has("slowness")).toBe(false);
    expect(noob.statuses.has("speed")).toBe(false);
    // Only once: the next Slowness lands normally.
    expect(game.status(noob, "slowness", 1, 3, killer)).toBe(true);
  });

  it("does nothing but play a sound while Slateskin is active (cooldown is still used)", () => {
    const { game, noob } = noobMatch();
    useAbility(game, noob, "slateskin_potion");
    run(game, ticks(1.5) + 1);
    expect(noob.statuses.has("slateskin")).toBe(true);
    game.fx.drain();
    expect(useAbility(game, noob, "bloxy_cola").ok).toBe(true);
    expect(noob.channel).toBeNull();
    expect(game.fx.drain().some((e) => e.t === "flash" && e.text.includes("boowomp"))).toBe(true);
    expect(noob.cooldowns.remaining("bloxy_cola", game.now)).toBe(ticks(50));
    run(game, ticks(3));
    expect(noob.statuses.has("speed")).toBe(false);
  });

  it("a stun cancels the drink (no speed)", () => {
    const { game, killer, noob } = noobMatch();
    useAbility(game, noob, "bloxy_cola");
    run(game, 10);
    game.stun(noob, 1, killer);
    run(game, ticks(3));
    expect(noob.statuses.has("speed")).toBe(false);
  });

  it("cannot be drunk while another drink/eat is in progress", () => {
    const { game, noob } = noobMatch();
    useAbility(game, noob, "ghostburger");
    expect(useAbility(game, noob, "bloxy_cola")).toEqual({ ok: false, reason: "busy" });
    expect(useAbility(game, noob, "slateskin_potion")).toEqual({ ok: false, reason: "busy" });
  });
});

describe("Noob — Slateskin Potion", () => {
  it("1.5 s drink (-20%, no sprint), then Slateskin III 6 s with 120 overheal, extra hit priority; cooldown waits", () => {
    const { game, noob } = noobMatch();
    expect(useAbility(game, noob, "slateskin_potion").ok).toBe(true);
    expect(noob.cooldowns.remaining("slateskin_potion", game.now)).toBe(Infinity);
    run(game, 2);
    expect(noob.canSprint).toBe(false);
    expect(noob.walkBps).toBeCloseTo(WALK * 0.8, 3);
    // Pressing again while drinking does nothing.
    expect(useAbility(game, noob, "slateskin_potion").ok).toBe(false);
    run(game, ticks(1.5) - 1);
    expect(noob.statuses.level("slateskin")).toBe(3);
    expect(noob.shield("slateskin")?.amount).toBeCloseTo(120, 0);
    expect(noob.hitPriority).toBe(2);
    // -45% speed while stoned
    run(game, 1);
    expect(noob.walkBps).toBeCloseTo(WALK * 0.55, 3);
    expect(noob.cooldowns.remaining("slateskin_potion", game.now)).toBe(Infinity);
  });

  it("absorbs hits with the overheal and grants status immunities", () => {
    const { game, killer, noob } = noobMatch();
    faceTo(killer, noob);
    useAbility(game, noob, "slateskin_potion");
    run(game, ticks(1.5) + 1);
    useAbility(game, killer, "slash");
    run(game, ticks(0.2) + 1);
    expect(noob.hp).toBe(100);
    expect(noob.statuses.has("bleeding")).toBe(false);
    expect(noob.shield("slateskin")!.amount).toBeLessThan(101);
    expect(game.status(noob, "poisoned", 1, 5, killer)).toBe(false);
    expect(game.status(noob, "speed", 1, 5, noob)).toBe(false);
  });

  it("the overheal decays (1 HP per 0.5 s) and ends with the effect", () => {
    const { game, noob } = noobMatch();
    useAbility(game, noob, "slateskin_potion");
    run(game, ticks(1.5) + ticks(3));
    expect(noob.shield("slateskin")!.amount).toBeCloseTo(114, 0);
    run(game, ticks(3) + 1);
    expect(noob.shield("slateskin")).toBeUndefined();
  });

  it("natural expiry: Speed II 2 s, cooldown 46 s starts, hit priority back to normal", () => {
    const { game, noob } = noobMatch();
    useAbility(game, noob, "slateskin_potion");
    run(game, ticks(1.5) + ticks(6) + 1);
    expect(noob.statuses.has("slateskin")).toBe(false);
    expect(noob.shields.length).toBe(0);
    expect(noob.statuses.level("speed")).toBe(2);
    expect(noob.statuses.remainingTicks("speed", game.now)).toBeGreaterThan(ticks(1.8));
    expect(noob.hitPriority).toBe(1);
    const cd = noob.cooldowns.remaining("slateskin_potion", game.now);
    expect(cd).toBeGreaterThan(ticks(45.8));
    expect(cd).toBeLessThanOrEqual(ticks(46));
  });

  it("recast ends it early only after 2.5 s: Speed I 2 s and the cooldown starts", () => {
    const { game, noob } = noobMatch();
    useAbility(game, noob, "slateskin_potion");
    run(game, ticks(1.5) + ticks(1));
    expect(useAbility(game, noob, "slateskin_potion").ok).toBe(true); // too early: ignored
    expect(noob.statuses.has("slateskin")).toBe(true);
    run(game, ticks(1.6));
    useAbility(game, noob, "slateskin_potion");
    expect(noob.statuses.has("slateskin")).toBe(false);
    expect(noob.shield("slateskin")).toBeUndefined();
    expect(noob.statuses.level("speed")).toBe(1);
    expect(noob.cooldowns.remaining("slateskin_potion", game.now)).toBe(ticks(46));
  });

  it("recast works while Helpless", () => {
    const { game, killer, noob } = noobMatch();
    useAbility(game, noob, "slateskin_potion");
    run(game, ticks(1.5) + ticks(3));
    game.status(noob, "helpless", 1, 5, killer);
    expect(useAbility(game, noob, "slateskin_potion").ok).toBe(true);
    expect(noob.statuses.has("slateskin")).toBe(false);
  });

  it("a stun during the drink loses the potion: no Slateskin, cooldown starts", () => {
    const { game, killer, noob } = noobMatch();
    useAbility(game, noob, "slateskin_potion");
    run(game, 10);
    game.stun(noob, 1, killer);
    run(game, 2);
    expect(noob.statuses.has("slateskin")).toBe(false);
    expect(noob.cooldowns.remaining("slateskin_potion", game.now)).toBeGreaterThan(ticks(45));
    run(game, ticks(3));
    expect(noob.statuses.has("slateskin")).toBe(false);
  });

  it("extra hit priority: single-target attacks pick Slateskin Noob over a stacked survivor", () => {
    const { game, killer, noob, survivors } = noobMatch();
    const elliot = survivors[1];
    place(elliot, cellPos(40, 52));
    place(noob, { x: 40.9, y: 100, z: 52.5 });
    faceTo(killer, elliot);
    const opts = { rangeStuds: 8, halfAngle: 60, single: true };
    expect(meleeTargets(game, killer, opts)[0]).toBe(elliot);
    useAbility(game, noob, "slateskin_potion");
    run(game, ticks(1.5) + 1);
    expect(meleeTargets(game, killer, opts)[0]).toBe(noob);
  });
});

describe("Noob — Ghostburger", () => {
  it("2 s eat (-20%, no sprint), then Undetectable + Invisibility IV 10 s that hide auras", () => {
    const { game, killer, noob } = noobMatch();
    expect(useAbility(game, noob, "ghostburger").ok).toBe(true);
    expect(noob.cooldowns.remaining("ghostburger", game.now)).toBe(ticks(40));
    run(game, 2);
    expect(noob.canSprint).toBe(false);
    expect(noob.walkBps).toBeCloseTo(WALK * 0.8, 3);
    run(game, ticks(2) - 1);
    expect(noob.statuses.has("undetectable")).toBe(true);
    expect(noob.statuses.level("invisibility")).toBe(4);
    game.reveal(noob, "killer", 5, { source: "test" });
    expect(game.isRevealedTo(noob, killer)).toBe(false);
    run(game, ticks(10));
    expect(noob.statuses.has("undetectable")).toBe(false);
    expect(noob.statuses.has("invisibility")).toBe(false);
  });
});
