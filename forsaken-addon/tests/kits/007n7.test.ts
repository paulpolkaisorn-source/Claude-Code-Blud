import { afterEach, describe, expect, it } from "vitest";
import { cellPos, faceTo, place, realMatch, run, type FakeBody } from "../helpers";
import { useAbility, abilityHudText } from "../../src/abilities/engine";
import { meleeTargets } from "../../src/abilities/kits/common";
import { dexSpawn, injectMode } from "../../src/abilities/kits/007n7";
import { resetConfig } from "../../src/core/config";
import { blocksPerSecond, ticks } from "../../src/core/scale";
import { dist2D, flat, type Vec3 } from "../../src/util/vec";
import type { Actor } from "../../src/entities/actor";
import type { Game } from "../../src/core/game";

afterEach(() => resetConfig());

function match() {
  const m = realMatch("slasher", ["007n7", "noob"]);
  place(m.survivors[1], cellPos(14, 72));
  return { ...m, n7: m.survivors[0] };
}

function face(a: Actor, dir: Vec3): void {
  (a.body as FakeBody).face(dir);
  a.state = a.body.read();
}

function furthestSpawn(game: Game, a: Actor): Vec3 {
  let best = game.grid.toWorld(game.layout.survivorSpawns[0]);
  for (const s of game.layout.survivorSpawns) {
    const p = game.grid.toWorld(s);
    if (dist2D(a.pos, p) > dist2D(a.pos, best)) best = p;
  }
  return best;
}

function clones(game: Game): Actor[] {
  return game.actors.filter((a) => a.isMinion && a.character.id === "minion_clone");
}

describe("007n7 — DEX", () => {
  it("tracks the survivor spawn furthest from him, exposes it for the HUD and marks it for him only", () => {
    const { game, n7, killer } = match();
    run(game, 10);
    const exp = furthestSpawn(game, n7);
    expect(dexSpawn(game, n7)).toEqual(exp);
    expect(n7.res.dexX).toBe(exp.x);
    expect(n7.res.dexZ).toBe(exp.z);
    // Moving to the far corner changes it.
    place(n7, cellPos(8, 72));
    run(game, 1);
    expect(dexSpawn(game, n7)).toEqual(furthestSpawn(game, n7));
    game.fx.drain();
    run(game, 10);
    const marks = game.fx.drain().filter((e) => (e.t === "line" || e.t === "ring") && e.viewers?.includes(n7.id));
    expect(marks.length).toBeGreaterThan(0);
    expect(marks.every((e) => (e.t === "line" || e.t === "ring") && e.viewers?.length === 1)).toBe(true);
    expect(killer.res.dexX).toBeUndefined();
  });
});

describe("007n7 — Inject", () => {
  it("cycles Aimless → Pathfind → Cursor with no cooldown; the HUD shows the mode", () => {
    const { game, n7 } = match();
    expect(injectMode(n7)).toBe("aimless");
    const def = n7.ability("inject")!;
    expect(abilityHudText(game, n7, def).label).toContain("Aimless");
    expect(useAbility(game, n7, "inject").ok).toBe(true);
    expect(injectMode(n7)).toBe("pathfind");
    expect(abilityHudText(game, n7, def).label).toContain("Pathfind");
    expect(useAbility(game, n7, "inject").ok).toBe(true);
    expect(injectMode(n7)).toBe("cursor");
    expect(n7.res.injectMode).toBe(2);
    expect(useAbility(game, n7, "inject").ok).toBe(true);
    expect(injectMode(n7)).toBe("aimless");
  });
});

describe("007n7 — Clone", () => {
  it("spawns a hittable survivor-team clone with his HP for 10 s; he gets Invisibility IV + Undetectable 5 s and a hidden 3 s Helpless", () => {
    const { game, n7, killer } = match();
    n7.hp = 64;
    expect(useAbility(game, n7, "clone").ok).toBe(true);
    expect(n7.cooldowns.remaining("clone", game.now)).toBe(ticks(27));
    const [c] = clones(game);
    expect(c).toBeDefined();
    expect(c.team).toBe("survivor");
    expect(c.hp).toBe(64);
    expect(c.displayName).toBe(n7.displayName);
    expect(c.flags.has("hittableMinion")).toBe(true);
    expect(game.enemiesOf(killer)).toContain(c);
    expect(game.isRevealedTo(c, n7)).toBe(true);
    expect(n7.statuses.level("invisibility")).toBe(4);
    expect(n7.statuses.has("undetectable")).toBe(true);
    const helpless = n7.statuses.get("helpless");
    expect(helpless?.data.hidden).toBe(1);
    // Inject and c00lgui are usable again 3 s after cloning.
    expect(useAbility(game, n7, "inject").reason).toBe("helpless");
    run(game, ticks(3) + 1);
    expect(useAbility(game, n7, "inject").ok).toBe(true);
    run(game, ticks(2));
    expect(n7.statuses.has("invisibility")).toBe(false);
    expect(n7.statuses.has("undetectable")).toBe(false);
    run(game, ticks(5));
    expect(clones(game).length).toBe(0);
    expect(c.alive).toBe(false);
  });

  it("runs 0.5 s in his facing direction at 26 studs/s, with infinite stamina", () => {
    const { game, n7 } = match();
    face(n7, { x: 1, y: 0, z: 0 });
    useAbility(game, n7, "clone");
    const [c] = clones(game);
    run(game, 2);
    expect(c.input.moveDir).toEqual(flat({ x: 1, y: 0, z: 0 }));
    expect(c.input.wantSprint).toBe(true);
    expect(c.sprintBps).toBeCloseTo(blocksPerSecond(26), 3);
    expect(c.stamina).toBeGreaterThan(1e8);
  });

  it("Pathfind clones walk to the DEX spawn and stop there", () => {
    const { game, n7 } = match();
    useAbility(game, n7, "inject"); // pathfind
    const goal = dexSpawn(game, n7);
    useAbility(game, n7, "clone");
    const [c] = clones(game);
    run(game, ticks(0.5) + 2);
    const dir = c.input.moveDir!;
    expect(dir).not.toBeNull();
    expect(dir).toEqual(game.navDirection(c, goal));
    place(c, goal);
    run(game, 1);
    expect(c.input.moveDir).toBeNull();
  });

  it("Cursor clones run straight in his facing direction until the wall in front", () => {
    const { game, n7 } = match();
    useAbility(game, n7, "inject");
    useAbility(game, n7, "inject"); // cursor
    place(n7, cellPos(40, 52));
    face(n7, { x: 0, y: 0, z: -1 }); // ruin wall at z = 48
    useAbility(game, n7, "clone");
    const [c] = clones(game);
    run(game, ticks(0.5) + 2);
    expect(c.input.moveDir).toEqual(flat({ x: 0, y: 0, z: -1 }));
    // A clone keeps the mode it spawned with even if Inject changes.
    useAbility(game, n7, "inject");
    place(c, { x: 40.5, y: 100, z: 49.4 });
    run(game, 1);
    expect(c.input.moveDir).toBeNull();
  });

  it("Aimless clones pick a new direction every 2-4 s", () => {
    const { game, n7 } = match();
    face(n7, { x: 0, y: 0, z: 1 });
    useAbility(game, n7, "clone");
    const [c] = clones(game);
    const dirs = new Set<string>();
    for (let i = 0; i < ticks(9); i++) {
      run(game, 1);
      if (c.input.moveDir) dirs.add(`${c.input.moveDir.x.toFixed(3)},${c.input.moveDir.z.toFixed(3)}`);
    }
    // initial run + at least two wander changes in ~8.5 s
    expect(dirs.size).toBeGreaterThanOrEqual(3);
  });

  it("the killer can kill the clone, which despawns", () => {
    const { game, n7, killer } = match();
    n7.hp = 15;
    useAbility(game, n7, "clone");
    const [c] = clones(game);
    place(n7, cellPos(14, 66));
    faceTo(killer, c);
    useAbility(game, killer, "slash");
    run(game, ticks(0.2) + 1);
    expect(c.alive).toBe(false);
    expect(game.actors.includes(c)).toBe(false);
    expect(n7.alive).toBe(true);
  });

  it("hit priority: the clone takes the hit before a stacked survivor with no more HP than it, after one with more", () => {
    const { game, n7, killer, survivors } = match();
    const noob = survivors[1];
    useAbility(game, n7, "clone");
    const [c] = clones(game);
    place(n7, cellPos(14, 66));
    place(noob, { x: 40.5, y: 100, z: 52.3 });
    place(c, { x: 40.9, y: 100, z: 53 });
    faceTo(killer, noob);
    run(game, 1);
    place(c, { x: 40.9, y: 100, z: 53 });
    const opts = { rangeStuds: 8, halfAngle: 60, single: true };
    expect(c.hitPriority).toBe(1.5);
    expect(meleeTargets(game, killer, opts)[0]).toBe(c);
    c.hp = 40;
    run(game, 1);
    place(c, { x: 40.9, y: 100, z: 53 });
    expect(c.hitPriority).toBe(0.5);
    expect(meleeTargets(game, killer, opts)[0]).toBe(noob);
  });

  it("clones expire even if 007n7 is eliminated first", () => {
    const { game, n7, killer } = match();
    useAbility(game, n7, "clone");
    const [c] = clones(game);
    game.damage(n7, 500, killer);
    expect(n7.alive).toBe(false);
    run(game, ticks(10) + 1);
    expect(c.alive).toBe(false);
  });
});

describe("007n7 — c00lgui", () => {
  it("5.5 s channel at -85% speed, then teleports to the DEX spawn", () => {
    const { game, n7 } = match();
    run(game, 1);
    expect(useAbility(game, n7, "c00lgui").ok).toBe(true);
    expect(n7.cooldowns.remaining("c00lgui", game.now)).toBe(ticks(50));
    run(game, 2);
    expect(n7.walkBps).toBeCloseTo(blocksPerSecond(12) * 0.15, 3);
    const goal = dexSpawn(game, n7);
    run(game, ticks(5.5));
    expect(n7.channel).toBeNull();
    expect(dist2D(n7.pos, goal)).toBeLessThan(0.01);
  });

  it("damage cancels it", () => {
    const { game, n7, killer } = match();
    const start = { ...n7.pos };
    useAbility(game, n7, "c00lgui");
    run(game, ticks(3));
    game.damage(n7, 10, killer);
    expect(n7.channel).toBeNull();
    run(game, ticks(3));
    expect(dist2D(n7.pos, start)).toBeLessThan(0.01);
  });

  it("a hit in the last 0.5 s no longer cancels the teleport", () => {
    const { game, n7, killer } = match();
    useAbility(game, n7, "c00lgui");
    run(game, ticks(5.2));
    const goal = dexSpawn(game, n7);
    game.damage(n7, 10, killer);
    expect(n7.channel).not.toBeNull();
    run(game, ticks(0.4));
    expect(dist2D(n7.pos, goal)).toBeLessThan(0.01);
    // After the teleport DEX points at the spawn furthest from his new position.
    expect(dexSpawn(game, n7)).not.toEqual(goal);
  });

  it("starting a generator cancels it", () => {
    const { game, n7 } = match();
    const gen = game.generators[0];
    place(n7, { x: gen.block.x + 0.5, y: 100, z: gen.block.z + 1.5 });
    const start = { ...n7.pos };
    useAbility(game, n7, "c00lgui");
    run(game, ticks(1));
    n7.input.repairTarget = gen.id;
    run(game, 2);
    expect(n7.channel).toBeNull();
    expect(n7.repairing).toBe(gen.id);
    run(game, ticks(6));
    expect(dist2D(n7.pos, start)).toBeLessThan(0.01);
  });

  it("a stun cancels it", () => {
    const { game, n7, killer } = match();
    const start = { ...n7.pos };
    useAbility(game, n7, "c00lgui");
    run(game, ticks(2));
    game.stun(n7, 1, killer);
    run(game, ticks(5));
    expect(dist2D(n7.pos, start)).toBeLessThan(0.01);
  });
});
