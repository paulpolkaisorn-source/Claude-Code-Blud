// Bot AI: every character has a profile, hooks only press real abilities, and full bots-only matches
// run to a result back to back (simulated movement, tests/sim.ts).
import { describe, expect, it } from "vitest";
import { botHooks, botProfileIds } from "../src/bots/hooks";
import { CHARACTERS } from "../src/characters/roster";
import { simulateMatch } from "./sim";
import { KillerBrain } from "../src/bots/killer";
import { SurvivorBrain } from "../src/bots/survivor";
import type { Sighting } from "../src/bots/perception";
import { cellPos, place, realMatch, run } from "./helpers";

/** A killer brain with hand-made memories (survivors stand where they were seen); think() is called directly. */
function killerWithMemory(sightings: Array<Omit<Sighting, "tick"> & { hp?: number }>) {
  const m = realMatch("slasher", ["noob", "shedletsky", "taph"]);
  // Survivors that are not remembered stand far away so they do not count as nearby allies.
  m.survivors.forEach((s, i) => place(s, cellPos(4 + i * 3, 76)));
  const brain = new KillerBrain(m.game, m.killer, 0);
  for (const s of sightings) {
    const a = m.game.get(s.id)!;
    place(a, s.pos);
    if (s.hp !== undefined) a.hp = s.hp;
    brain.mem.note({ id: s.id, pos: s.pos, how: s.how, tick: m.game.now });
  }
  (brain as unknown as { think(): void }).think();
  return { ...m, brain, target: (brain as unknown as { targetId: string | null }).targetId };
}

describe("bot profiles", () => {
  it("every killer and survivor has a bot profile", () => {
    const ids = new Set(botProfileIds());
    for (const c of CHARACTERS) expect(ids.has(c.id), c.id).toBe(true);
  });
  it("every ability is pressed by its bot (slot 1 by the shared chase logic, the rest by the character hook)", () => {
    for (const c of CHARACTERS) {
      const h = botHooks(c.id);
      const src = `${h.survivor?.toString() ?? ""}\n${h.killer?.toString() ?? ""}`;
      for (const a of c.abilities) {
        if (a.slot === 1) continue; // KillerBrain.chase() swings the slot-1 basic attack for every killer
        expect(src.includes(`"${a.id}"`), `${c.id} bot never presses ${a.id}`).toBe(true);
      }
    }
  });
  it("hooks only press abilities the character has", () => {
    for (const c of CHARACTERS) {
      const h = botHooks(c.id);
      const src = `${h.survivor?.toString() ?? ""}\n${h.killer?.toString() ?? ""}`;
      const used = [...src.matchAll(/\b(?:use|isActive|canUse)\(\s*"([a-z0-9_]+)"/g), ...src.matchAll(/releaseLater\(\s*\w+,\s*"([a-z0-9_]+)"/g)].map((m) => m[1]);
      expect(used.length, c.id).toBeGreaterThan(0);
      for (const id of used) expect(c.abilities.map((a) => a.id), `${c.id} presses ${id}`).toContain(id);
    }
  });
});

describe("killer target selection", () => {
  it("chases the nearest survivor it can see", () => {
    const { target } = killerWithMemory([
      { id: "s0", pos: cellPos(30, 50), how: "sight" },
      { id: "s1", pos: cellPos(46, 50), how: "sight" },
    ]);
    expect(target).toBe("s1");
  });
  it("prefers a hurt survivor at the same distance", () => {
    const { target } = killerWithMemory([
      { id: "s0", pos: cellPos(34, 50), how: "sight" },
      { id: "s1", pos: cellPos(46, 50), how: "sight", hp: 30 },
    ]);
    expect(target).toBe("s1");
    const other = killerWithMemory([
      { id: "s0", pos: cellPos(34, 50), how: "sight", hp: 30 },
      { id: "s1", pos: cellPos(46, 50), how: "sight" },
    ]);
    expect(other.target).toBe("s0");
  });
  it("prefers a survivor it can see over a slightly closer one it only heard", () => {
    const { target } = killerWithMemory([
      { id: "s0", pos: cellPos(40, 56), how: "sound" },
      { id: "s1", pos: cellPos(40, 58), how: "sight" },
    ]);
    expect(target).toBe("s1");
  });
  it("patrols when it knows nobody", () => {
    const { brain, target } = killerWithMemory([]);
    expect(target).toBeNull();
    expect(brain.state).toBe("PATROL");
    expect(brain.goal).not.toBeNull();
  });
});

describe("survivor decisions", () => {
  it("flees when it sees the killer close and goes back to generators when it is gone", () => {
    // Taph: no hook that answers a close killer with an ability, so the plain state machine decides.
    const m = realMatch("slasher", ["taph", "shedletsky", "noob"]);
    const s = m.survivors[0];
    const brain = new SurvivorBrain(m.game, s, 0);
    brain.mem.note({ id: m.killer.id, pos: { ...m.killer.pos }, tick: m.game.now - 20, how: "sight" });
    const think = () => (brain as unknown as { think(): void }).think();
    think(); // first sighting: reaction time not over yet
    run(m.game, 20);
    brain.mem.note({ id: m.killer.id, pos: { ...m.killer.pos }, tick: m.game.now, how: "sight" });
    think();
    expect(["EVADE", "LOOP"]).toContain(brain.state);
    expect(brain.goal).not.toBeNull();
    // The flee goal is further from the killer than the survivor is now.
    const d = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
    expect(d(brain.goal!, m.killer.pos)).toBeGreaterThan(d(s.pos, m.killer.pos));
    // Killer forgotten (memory expired): back to work.
    run(m.game, 20 * 8);
    think();
    expect(["GO_TO_GENERATOR", "REPAIR", "PICKUP", "HEAL"]).toContain(brain.state);
  });
});

describe("bots-only matches", () => {
  it("three matches in a row each reach a result, with repairs, damage and ability use", () => {
    const runs = [
      { seed: 21, killerId: "slasher" },
      { seed: 22, killerId: "noli" },
      { seed: 23, killerId: "guest_666" },
    ];
    for (const r of runs) {
      const res = simulateMatch({ ...r, maxSeconds: 900 });
      const g = res.game;
      expect(res.winner, `${r.killerId}: ${g.eventLog.slice(-5).join(" | ")}`).not.toBeNull();
      expect(g.phase).toBe("ENDED");
      expect(g.killer!.stats.damageDealt).toBeGreaterThan(0);
      expect(g.killer!.stats.abilitiesUsed).toBeGreaterThan(0);
      expect(g.allSurvivors().reduce((n, s) => n + s.stats.layersRepaired, 0)).toBeGreaterThan(0);
      expect(g.allSurvivors().reduce((n, s) => n + s.stats.abilitiesUsed, 0)).toBeGreaterThan(0);
      // Damage stats never count overkill.
      for (const a of g.actors) expect(a.stats.damageDealt).toBeLessThan(10000);
      // Generous CPU budget for the bot + game logic in V8 (the Bedrock runtime is far slower: see TESTING.md).
      expect(res.msPerTick).toBeLessThan(3);
    }
  }, 120000);
});
