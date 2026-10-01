import { afterEach, describe, expect, it } from "vitest";
import { blocksPerSecond, meleeReach, movementAttribute, speedMultiple, studs, ticks } from "../src/core/scale";
import { config, patchConfig, resetConfig } from "../src/core/config";
import { CooldownManager } from "../src/abilities/cooldowns";
import { incomingDamageMultiplier, outgoingDamageMultiplier, speedStatusMultiplier, StatusSet, STATUS_DEFS } from "../src/entities/statuses";
import { MatchMachine, allowedTransitions, type MatchPhase } from "../src/core/match";
import { evaluate, maybeStartLms, newRound, onElimination, onLayerCompleted, tickClock } from "../src/core/round";
import { Scheduler } from "../src/core/scheduler";
import { Rng } from "../src/util/rng";
import { angleBetween2D, dirToYaw, rotateY, yawToDir } from "../src/util/vec";
import { arrowFor, clock, roman } from "../src/util/format";

afterEach(() => resetConfig());

describe("scale conversion (brief §3.10)", () => {
  it("converts studs to blocks with STUD_TO_BLOCK = 0.36", () => {
    expect(studs(100)).toBeCloseTo(36);
    expect(studs(19)).toBeCloseTo(6.84);
  });
  it("expresses speeds as multiples of survivor sprint (26 studs/s = 1.0)", () => {
    expect(speedMultiple(26)).toBeCloseTo(1);
    expect(speedMultiple(28)).toBeCloseTo(1.077, 3);
    expect(speedMultiple(27.5)).toBeCloseTo(1.058, 3);
    expect(speedMultiple(27.25)).toBeCloseTo(1.048, 3);
    expect(speedMultiple(27)).toBeCloseTo(1.038, 3);
    expect(speedMultiple(19)).toBeCloseTo(0.731, 3);
  });
  it("anchors survivor sprint on vanilla sprint speed", () => {
    expect(blocksPerSecond(26)).toBeCloseTo(config().scale.vanillaSprintBlocksPerSecond);
  });
  it("computes the player movement attribute for walking and sprinting states", () => {
    // Vanilla walk = attribute 0.1 → 4.317 b/s; vanilla sprint = 0.1 * 1.3.
    expect(movementAttribute(5.612 / 1.3, false)).toBeCloseTo(0.1, 4);
    expect(movementAttribute(5.612, true)).toBeCloseTo(0.1, 4);
    // Survivor walk (12 studs/s) is slower than vanilla walk.
    expect(movementAttribute(blocksPerSecond(12), false)).toBeLessThan(0.1);
  });
  it("keeps melee reach usable", () => {
    expect(meleeReach(5)).toBe(config().scale.minMeleeReachBlocks);
    expect(meleeReach(20)).toBeCloseTo(7.2);
  });
  it("uses seconds 1:1 at 20 ticks/s", () => {
    expect(ticks(1.9)).toBe(38);
  });
  it("honours config overrides in exactly one place", () => {
    patchConfig({ scale: { studToBlock: 0.5 } });
    expect(studs(10)).toBe(5);
  });
});

describe("cooldown manager", () => {
  it("starts, counts down and reports readiness", () => {
    const c = new CooldownManager();
    c.start("slash", 38, 100);
    expect(c.remaining("slash", 100)).toBe(38);
    expect(c.ready("slash", 137)).toBe(false);
    expect(c.ready("slash", 138)).toBe(true);
    expect(c.fraction("slash", 119)).toBeCloseTo(0.5, 1);
  });
  it("reduces one and all cooldowns (Blood Orbs: -3 s to all)", () => {
    const c = new CooldownManager();
    c.start("a", 200, 0);
    c.start("b", 40, 0);
    c.reduceAll(60, 0);
    expect(c.remaining("a", 0)).toBe(140);
    expect(c.remaining("b", 0)).toBe(0);
  });
  it("scales the remaining time (Eviscerate halves its cooldown on hit)", () => {
    const c = new CooldownManager();
    c.start("ev", 160, 0);
    c.scaleRemaining("ev", 0.5, 0);
    expect(c.remaining("ev", 0)).toBe(80);
  });
  it("supports ENRAGED-style variants by restarting with a different length", () => {
    const c = new CooldownManager();
    c.start("behead", ticks(18), 0);
    c.start("behead", ticks(12), 0);
    expect(c.remaining("behead", 0)).toBe(240);
  });
  it("pauses (Slateskin Potion cooldown starts after the effect)", () => {
    const c = new CooldownManager();
    c.pause("slate");
    expect(c.remaining("slate", 0)).toBe(Infinity);
    c.unpause("slate");
    c.start("slate", 20, 0);
    expect(c.remaining("slate", 5)).toBe(15);
  });
  it("resets", () => {
    const c = new CooldownManager();
    c.start("x", 100, 0);
    c.resetAll();
    expect(c.ready("x", 0)).toBe(true);
  });
});

describe("status set (stacking rules)", () => {
  it("max: keeps the higher level and the longer duration", () => {
    const s = new StatusSet();
    s.apply("slowness", 1, 100, 0);
    s.apply("slowness", 2, 20, 0);
    expect(s.level("slowness")).toBe(2);
    expect(s.remainingTicks("slowness", 0)).toBe(100);
  });
  it("add: adds levels and refreshes (Vulnerable from Chance's tails)", () => {
    const s = new StatusSet();
    s.apply("vulnerable", 1, 300, 0);
    s.apply("vulnerable", 1, 300, 100);
    expect(s.level("vulnerable")).toBe(2);
    expect(s.remainingTicks("vulnerable", 100)).toBe(300);
  });
  it("add_keep: Bleeding I -> II without resetting the timer (Slasher)", () => {
    const s = new StatusSet();
    s.apply("bleeding", 1, 100, 0);
    s.apply("bleeding", 1, 100, 50);
    expect(s.level("bleeding")).toBe(2);
    expect(s.remainingTicks("bleeding", 50)).toBe(50);
  });
  it("caps at maxLevel", () => {
    const s = new StatusSet();
    for (let i = 0; i < 10; i++) s.apply("hallucination", 1, 400, 0, { mode: "add" });
    expect(s.level("hallucination")).toBe(3);
  });
  it("expires and cleanses by tag", () => {
    const s = new StatusSet();
    s.apply("slowness", 1, 10, 0);
    s.apply("speed", 1, 100, 0);
    s.apply("poisoned", 1, 100, 0);
    expect(s.expire(10).map((x) => x.id)).toEqual(["slowness"]);
    expect(s.cleanse("dot")).toEqual(["poisoned"]);
    expect(s.has("speed")).toBe(true);
  });
  it("Speed and Slowness cancel level for level at ±10%", () => {
    const s = new StatusSet();
    s.apply("speed", 2, 100, 0);
    s.apply("slowness", 1, 100, 0);
    expect(speedStatusMultiplier(s)).toBeCloseTo(1.1);
    s.apply("slowness", 4, 100, 0);
    expect(speedStatusMultiplier(s)).toBeCloseTo(0.8);
  });
  it("Resistance -20%/level, V = immune, Vulnerable cancels Resistance, Creatures +25%", () => {
    const s = new StatusSet();
    s.apply("resistance", 2, 100, 0);
    expect(incomingDamageMultiplier(s)).toBeCloseTo(0.6);
    s.apply("resistance", 5, 100, 0);
    expect(incomingDamageMultiplier(s)).toBe(0);
    s.apply("vulnerable", 1, 100, 0);
    expect(incomingDamageMultiplier(s)).toBeCloseTo(0.2);
    const t = new StatusSet();
    t.apply("vulnerable", 2, 100, 0);
    t.apply("creatures", 1, 100, 0);
    expect(incomingDamageMultiplier(t)).toBeCloseTo(1.4 * 1.25);
  });
  it("Strength +20%/level and Weakness -10%/level on damage dealt", () => {
    const s = new StatusSet();
    s.apply("strength", 1, 100, 0);
    expect(outgoingDamageMultiplier(s)).toBeCloseTo(1.2);
    s.apply("weakness", 5, 100, 0);
    expect(outgoingDamageMultiplier(s)).toBeCloseTo(0.6);
  });
  it("defines every status referenced by the roster", () => {
    for (const id of ["bleeding", "helpless", "glitched", "hallucination", "hemorrhage", "subspaced", "resonance", "purified", "slateskin", "creatures", "oblivious", "undetectable", "invisibility", "burning", "poisoned", "flagged", "marked", "exhausted", "corrupted"]) {
      expect(STATUS_DEFS.has(id as never), id).toBe(true);
    }
  });
});

describe("match state machine (§3.1)", () => {
  it("walks the happy path", () => {
    const m = new MatchMachine();
    const path: MatchPhase[] = ["ROLE_SELECT", "LOADING", "HEAD_START", "ROUND", "ENDING", "RESULTS", "LOBBY"];
    for (const p of path) m.go(p);
    expect(m.phase).toBe("LOBBY");
    expect(m.history.length).toBe(7);
  });
  it("rejects illegal transitions", () => {
    const m = new MatchMachine();
    expect(() => m.go("ROUND")).toThrow();
    m.go("ROLE_SELECT");
    expect(() => m.go("RESULTS")).toThrow();
  });
  it("aborts from any in-match phase back to the lobby", () => {
    for (const p of ["ROLE_SELECT", "LOADING", "HEAD_START", "ROUND", "ENDING"] as MatchPhase[]) {
      expect(allowedTransitions(p)).toContain("LOBBY");
    }
    const m = new MatchMachine();
    m.go("ROLE_SELECT");
    m.go("LOADING");
    m.abort("stop");
    expect(m.phase).toBe("LOBBY");
  });
  it("supports back-to-back matches", () => {
    const m = new MatchMachine();
    for (let i = 0; i < 3; i++) for (const p of ["ROLE_SELECT", "LOADING", "HEAD_START", "ROUND", "ENDING", "RESULTS", "LOBBY"] as MatchPhase[]) m.go(p);
    expect(m.history.length).toBe(21);
  });
});

describe("round clock and win conditions (§3.3, wiki 3.6.2/5.1.0)", () => {
  it("starts at the wiki value for 6+ players and moves with layers and eliminations", () => {
    const r = newRound();
    expect(r.timeLeft).toBe(240);
    for (let i = 0; i < 5; i++) onLayerCompleted(r);
    expect(r.timeLeft).toBe(225); // one generator = -15 s
    onElimination(r);
    expect(r.timeLeft).toBe(265);
  });
  it("killer wins when every survivor is eliminated", () => {
    const r = newRound();
    expect(evaluate(r, { aliveSurvivors: 0, killerAlive: true, timerBlocked: false })).toBe("killer");
  });
  it("survivors win at 0 with someone alive, unless Blood Hunt blocks the timer", () => {
    const r = newRound();
    tickClock(r, 999);
    expect(evaluate(r, { aliveSurvivors: 1, killerAlive: true, timerBlocked: true })).toBeNull();
    expect(evaluate(r, { aliveSurvivors: 1, killerAlive: true, timerBlocked: false })).toBe("survivors");
  });
  it("survivors win if the killer dies; simultaneous deaths = nobody", () => {
    expect(evaluate(newRound(), { aliveSurvivors: 3, killerAlive: false, timerBlocked: false })).toBe("survivors");
    expect(evaluate(newRound(), { aliveSurvivors: 0, killerAlive: false, timerBlocked: false })).toBe("nobody");
  });
  it("Last Man Standing fixes the clock to 75 s and stops elimination bonuses", () => {
    const r = newRound();
    tickClock(r, 30);
    expect(maybeStartLms(r, 2)).toBe(false);
    expect(maybeStartLms(r, 1)).toBe(true);
    expect(r.timeLeft).toBe(75);
    onElimination(r);
    expect(r.timeLeft).toBe(75);
  });
  it("can disable LMS from config", () => {
    patchConfig({ match: { lastManStanding: false } });
    expect(maybeStartLms(newRound(), 1)).toBe(false);
  });
});

describe("scheduler", () => {
  it("runs due tasks in order and cancels stun-cancellable windups", () => {
    const s = new Scheduler();
    const out: string[] = [];
    s.schedule(5, () => out.push("b"), { ownerId: "k" });
    s.schedule(3, () => out.push("a"), { ownerId: "k", stunCancels: true });
    s.schedule(4, () => out.push("c"), { ownerId: "k", stunCancels: true });
    s.run(3);
    expect(out).toEqual(["a"]);
    expect(s.cancelOwner("k", { stunOnly: true })).toBe(1);
    s.run(10);
    expect(out).toEqual(["a", "b"]);
  });
});

describe("utils", () => {
  it("rng is deterministic", () => {
    const a = new Rng(42);
    const b = new Rng(42);
    expect([a.next(), a.int(1, 6)]).toEqual([b.next(), b.int(1, 6)]);
  });
  it("yaw helpers round-trip and rotateY increases yaw", () => {
    for (const y of [0, 45, 90, -90, 170]) expect(dirToYaw(yawToDir(y))).toBeCloseTo(y);
    expect(dirToYaw(rotateY(yawToDir(10), 30))).toBeCloseTo(40);
    expect(angleBetween2D(yawToDir(10), yawToDir(40))).toBeCloseTo(30);
  });
  it("formats", () => {
    expect(roman(3)).toBe("III");
    expect(clock(125.2)).toBe("2:06");
    expect(arrowFor(0)).toBe("▲");
    expect(arrowFor(180)).toBe("▼");
  });
});
