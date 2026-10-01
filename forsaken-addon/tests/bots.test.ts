// Bot AI: every character has a profile, hooks only press real abilities, and full bots-only matches
// run to a result back to back (simulated movement, tests/sim.ts).
import { describe, expect, it } from "vitest";
import { botHooks, botProfileIds } from "../src/bots/hooks";
import { CHARACTERS } from "../src/characters/roster";
import { simulateMatch } from "./sim";

describe("bot profiles", () => {
  it("every killer and survivor has a bot profile", () => {
    const ids = new Set(botProfileIds());
    for (const c of CHARACTERS) expect(ids.has(c.id), c.id).toBe(true);
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
