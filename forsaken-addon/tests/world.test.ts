import { afterEach, describe, expect, it } from "vitest";
import { buildHollowHamlet, ARENA_SIZE } from "../src/world/layout";
import { Cell } from "../src/world/nav";
import { advanceGenerator, createGenerators } from "../src/world/generators";
import { resetConfig } from "../src/core/config";
import { body, cellPos, makeGame, populate, run, startRound, testCharacter } from "./helpers";
import { ticks } from "../src/core/scale";

afterEach(() => resetConfig());

const { layout, grid } = buildHollowHamlet({ x: 0, y: 100, z: 0 });

describe("arena layout", () => {
  it("is enclosed by walls", () => {
    for (let i = 0; i < ARENA_SIZE; i++) {
      expect(grid.walkable(i, 0)).toBe(false);
      expect(grid.walkable(0, i)).toBe(false);
      expect(grid.walkable(i, ARENA_SIZE - 1)).toBe(false);
      expect(grid.walkable(ARENA_SIZE - 1, i)).toBe(false);
    }
  });
  it("has 10 generator spots, 8 survivor spawns, 1 killer spawn and 9 item spots", () => {
    expect(layout.generatorSpots.length).toBe(10);
    expect(layout.survivorSpawns.length).toBe(8);
    expect(layout.itemSpots.length).toBe(9);
  });
  it("places spawns and items on walkable cells", () => {
    for (const s of [...layout.survivorSpawns, layout.killerSpawn, ...layout.itemSpots]) expect(grid.walkable(s.x, s.z), JSON.stringify(s)).toBe(true);
  });
  it("can reach every generator, item and the killer spawn from the survivor spawn area", () => {
    const field = grid.distanceField([layout.survivorSpawns[0]]);
    for (const g of layout.generatorSpots) {
      // a generator cell is solid; one neighbour must be reachable
      const reach = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(([dx, dz]) => field[grid.idx(g.x + dx, g.z + dz)] < Infinity);
      expect(reach, `generator ${g.x},${g.z}`).toBe(true);
    }
    for (const i of layout.itemSpots) expect(field[grid.idx(i.x, i.z)]).toBeLessThan(Infinity);
    expect(field[grid.idx(layout.killerSpawn.x, layout.killerSpawn.z)]).toBeLessThan(Infinity);
  });
  it("puts the killer spawn far from every survivor spawn", () => {
    for (const s of layout.survivorSpawns) expect(Math.hypot(s.x - layout.killerSpawn.x, s.z - layout.killerSpawn.z)).toBeGreaterThan(60);
  });
  it("has doors, windows and loop walls", () => {
    expect(layout.doors.length).toBeGreaterThan(8);
    let windows = 0;
    for (let i = 0; i < grid.cells.length; i++) if (grid.cells[i] === Cell.Window) windows++;
    expect(windows).toBeGreaterThan(10);
  });
  it("only uses block ops inside the arena volume", () => {
    for (const op of layout.ops) {
      for (const v of [op.from, op.to]) {
        expect(v[0]).toBeGreaterThanOrEqual(0);
        expect(v[2]).toBeGreaterThanOrEqual(0);
        expect(v[0]).toBeLessThan(ARENA_SIZE);
        expect(v[2]).toBeLessThan(ARENA_SIZE);
        expect(v[1]).toBeGreaterThanOrEqual(-4);
        expect(v[1]).toBeLessThanOrEqual(layout.ceiling + 1);
      }
    }
  });
});

describe("navigation", () => {
  it("finds paths around buildings and smooths them", () => {
    const path = grid.findPath(layout.survivorSpawns[0], layout.killerSpawn);
    expect(path).not.toBeNull();
    const pts = grid.smooth(path!);
    expect(pts.length).toBeLessThan(path!.length);
    for (let i = 1; i < pts.length; i++) expect(grid.walkLine(pts[i - 1], pts[i])).toBe(true);
  });
  it("walls block line of sight; windows do not", () => {
    // chapel north wall at z=6 has windows at x=34,38,42,46; solid at x=35
    expect(grid.lineOfSight(cellPos(34, 3), cellPos(34, 9))).toBe(true);
    expect(grid.lineOfSight(cellPos(35, 3), cellPos(35, 9))).toBe(false);
  });
  it("dynamic blockers change walkability", () => {
    const c = { x: 40, z: 40 };
    expect(grid.walkable(c.x, c.z)).toBe(true);
    grid.addDynamic(c.x, c.z);
    expect(grid.walkable(c.x, c.z)).toBe(false);
    grid.removeDynamic(c.x, c.z);
    expect(grid.walkable(c.x, c.z)).toBe(true);
  });
});

describe("generators", () => {
  it("one survivor finishes a generator in 25 s (5 layers x 5 s); three work 3x as fast", () => {
    const [g1] = createGenerators([{ cell: { x: 1, z: 1 }, block: { x: 1, y: 0, z: 1 } }]);
    let layers = 0;
    let done = false;
    for (let t = 0; t < ticks(25) + 1 && !done; t++) {
      const s = advanceGenerator(g1, 1 / 20, [1]);
      layers += s.layersFinished;
      done = s.completedNow;
    }
    expect(layers).toBe(5);
    expect(done).toBe(true);
    const [g3] = createGenerators([{ cell: { x: 1, z: 1 }, block: { x: 1, y: 0, z: 1 } }]);
    let t3 = 0;
    while (!g3.completed) {
      advanceGenerator(g3, 1 / 20, [1, 1, 1]);
      t3++;
    }
    expect(t3 / 20).toBeCloseTo(25 / 3, 0);
  });

  const S = testCharacter({ id: "s", team: "survivor" });
  const K = testCharacter({ id: "k", team: "killer" });

  it("repairing in the game lowers the clock 3 s per layer and lights the block", () => {
    const { game, ports } = makeGame();
    const { survivors } = populate(game, K, [S], 0);
    game.setupGenerators([0, 1, 2, 3, 4]);
    startRound(game);
    const g = game.generators[0];
    body(survivors[0]).moveTo(cellPos(g.cell.x - 1, g.cell.z));
    survivors[0].input.repairTarget = g.id;
    const t0 = game.round.timeLeft;
    run(game, ticks(25) + 2);
    expect(g.completed).toBe(true);
    expect(t0 - game.round.timeLeft).toBeCloseTo(25 + 15, 0);
    expect(ports.litGenerators.length).toBe(1);
    expect(game.round.generatorsDone).toBe(1);
    expect(survivors[0].stats.layersRepaired).toBe(5);
  });
  it("damage and moving away interrupt repair; progress is kept", () => {
    const { game } = makeGame();
    const { killer, survivors } = populate(game, K, [S], 0);
    game.setupGenerators([0, 1, 2, 3, 4]);
    startRound(game);
    const g = game.generators[0];
    body(survivors[0]).moveTo(cellPos(g.cell.x - 1, g.cell.z));
    survivors[0].input.repairTarget = g.id;
    run(game, 60);
    const p = g.progress;
    expect(p).toBeGreaterThan(0.5);
    game.damage(survivors[0], 5, killer);
    expect(survivors[0].repairing).toBeNull();
    survivors[0].input.repairTarget = null;
    run(game, 60);
    expect(g.progress).toBeCloseTo(p, 1);
    body(survivors[0]).moveTo(cellPos(g.cell.x - 8, g.cell.z));
    survivors[0].input.repairTarget = g.id;
    run(game, 5);
    expect(survivors[0].repairing).toBeNull();
  });
  it("bots repair at their difficulty multiplier", () => {
    const { game } = makeGame();
    const { survivors } = populate(game, K, [S]);
    game.setupGenerators([0, 1, 2, 3, 4]);
    startRound(game);
    const g = game.generators[0];
    body(survivors[0]).moveTo(cellPos(g.cell.x - 1, g.cell.z));
    survivors[0].input.repairTarget = g.id;
    run(game, ticks(10));
    expect(g.progress).toBeCloseTo(2 * 0.9, 1);
  });
  it("killers cannot repair and max 3 repairers per generator", () => {
    const { game } = makeGame();
    const { killer, survivors } = populate(game, K, [S, S, S, S]);
    game.setupGenerators([0, 1, 2, 3, 4]);
    startRound(game);
    const g = game.generators[0];
    for (const s of survivors) {
      body(s).moveTo(cellPos(g.cell.x - 1, g.cell.z));
      s.input.repairTarget = g.id;
    }
    body(killer).moveTo(cellPos(g.cell.x + 1, g.cell.z));
    killer.input.repairTarget = g.id;
    run(game, 2);
    expect(g.repairers.size).toBe(3);
    expect(killer.repairing).toBeNull();
  });
  it("fake generators give Hallucination instead of progress, then reset", () => {
    const { game } = makeGame();
    const { survivors } = populate(game, K, [S], 0);
    game.setupGenerators([0, 1, 2, 3, 4], [5]);
    startRound(game);
    const fake = game.generators.find((g) => g.fake)!;
    body(survivors[0]).moveTo(cellPos(fake.cell.x + 1, fake.cell.z));
    survivors[0].input.repairTarget = fake.id;
    const t0 = game.round.timeLeft;
    run(game, ticks(10) + 1);
    expect(survivors[0].statuses.level("hallucination")).toBe(2);
    expect(game.round.timeLeft).toBeCloseTo(t0 - 10, 0);
    run(game, ticks(15) + 2);
    expect(survivors[0].statuses.level("hallucination")).toBe(3);
    expect(fake.progress).toBeLessThan(1);
    expect(game.round.generatorsDone).toBe(0);
  });
});

describe("full round (simulated, no Minecraft)", () => {
  const S = testCharacter({ id: "s", team: "survivor" });
  const K = testCharacter({ id: "k", team: "killer" });
  it("survivors win when the clock runs out; killer wins when everyone is eliminated; 3 matches back to back", () => {
    for (let m = 0; m < 3; m++) {
      const { game } = makeGame(undefined, 100 + m);
      const { killer, survivors } = populate(game, K, Array.from({ length: 8 }, () => S));
      game.setupGenerators([0, 1, 2, 3, 4]);
      startRound(game);
      if (m === 1) {
        for (const s of survivors) game.damage(s, 1000, killer);
        game.tick();
        expect(game.round.winner).toBe("killer");
      } else {
        run(game, ticks(241));
        expect(game.round.winner).toBe("survivors");
      }
      expect(game.phase).toBe("ENDED");
      const rows = game.results();
      expect(rows.length).toBe(9);
    }
  });
  it("LMS starts when one survivor is left and reveals both sides every 10 s", () => {
    const { game } = makeGame();
    const { killer, survivors } = populate(game, K, [S, S]);
    game.setupGenerators([0, 1, 2, 3, 4]);
    startRound(game);
    game.damage(survivors[0], 500, killer);
    expect(game.round.lms).toBe(true);
    expect(game.round.timeLeft).toBe(75);
    run(game, 2);
    expect(game.isRevealedTo(survivors[1], killer)).toBe(true);
    expect(game.isRevealedTo(killer, survivors[1])).toBe(true);
    run(game, ticks(4));
    expect(game.isRevealedTo(survivors[1], killer)).toBe(false);
  });
  it("a dead killer means the survivors win", () => {
    const { game } = makeGame();
    const { killer, survivors } = populate(game, K, [S]);
    startRound(game);
    game.damage(killer, 5000, survivors[0], { bypassInvincible: true });
    game.tick();
    expect(game.round.winner).toBe("survivors");
  });
});
