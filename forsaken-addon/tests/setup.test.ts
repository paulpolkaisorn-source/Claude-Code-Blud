import { describe, expect, it } from "vitest";
import { pickBotCharacters, pickGeneratorSpots } from "../src/core/setup";
import { character, KILLERS, SURVIVORS } from "../src/characters/roster";
import { Rng } from "../src/util/rng";

const base = { killers: KILLERS, survivors: SURVIVORS, survivorCount: 8, allowDuplicates: false };

describe("pickBotCharacters", () => {
  it("always gives one killer and eight distinct survivors", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const p = pickBotCharacters(new Rng(seed), { ...base, humanRole: null, humanCharacter: null });
      expect(KILLERS).toContain(p.killer);
      expect(p.survivors).toHaveLength(8);
      expect(new Set(p.survivors.map((c) => c.id)).size).toBe(8);
      for (const s of p.survivors) expect(s.team).toBe("survivor");
    }
  });
  it("puts the human's survivor first and never duplicates it", () => {
    const me = character("noob");
    for (let seed = 1; seed <= 100; seed++) {
      const p = pickBotCharacters(new Rng(seed), { ...base, humanRole: "survivor", humanCharacter: me });
      expect(p.survivors[0]).toBe(me);
      expect(p.survivors.filter((c) => c === me)).toHaveLength(1);
    }
  });
  it("uses the human's killer, or a random one for Random", () => {
    const me = character("noli");
    expect(pickBotCharacters(new Rng(3), { ...base, humanRole: "killer", humanCharacter: me }).killer).toBe(me);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) seen.add(pickBotCharacters(new Rng(seed), { ...base, humanRole: "killer", humanCharacter: null }).killer.id);
    expect(seen.size).toBe(KILLERS.length);
  });
  it("respects a forced killer in bots-only matches", () => {
    const k = character("daemon");
    expect(pickBotCharacters(new Rng(9), { ...base, humanRole: null, humanCharacter: null, forcedKiller: k }).killer).toBe(k);
  });
  it("covers all three survivor roles and never lets one role take more than half the team", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const p = pickBotCharacters(new Rng(seed), { ...base, humanRole: null, humanCharacter: null });
      const roles = new Map<string, number>();
      for (const s of p.survivors) roles.set(s.role, (roles.get(s.role) ?? 0) + 1);
      expect(roles.size).toBe(3);
      for (const n of roles.values()) expect(n).toBeLessThanOrEqual(4);
    }
  });
  it("allows repeats only when duplicates are enabled or the roster runs out", () => {
    const few = SURVIVORS.slice(0, 3);
    const p = pickBotCharacters(new Rng(5), { ...base, survivors: few, humanRole: null, humanCharacter: null });
    expect(p.survivors).toHaveLength(8);
    for (const s of p.survivors) expect(few).toContain(s);
    const dup = pickBotCharacters(new Rng(5), { ...base, allowDuplicates: true, humanRole: null, humanCharacter: null });
    expect(dup.survivors).toHaveLength(8);
  });
});

describe("pickGeneratorSpots", () => {
  it("picks distinct, sorted real spots and disjoint fake spots", () => {
    for (let seed = 1; seed <= 100; seed++) {
      const g = pickGeneratorSpots(new Rng(seed), 10, 5, 2);
      expect(g.real).toHaveLength(5);
      expect(g.fake).toHaveLength(2);
      expect([...g.real].sort((a, b) => a - b)).toEqual(g.real);
      const all = [...g.real, ...g.fake];
      expect(new Set(all).size).toBe(7);
      for (const i of all) {
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(10);
      }
    }
  });
  it("never asks for more spots than exist", () => {
    const g = pickGeneratorSpots(new Rng(1), 6, 5, 4);
    expect(g.real).toHaveLength(5);
    expect(g.fake).toHaveLength(1);
    expect(pickGeneratorSpots(new Rng(1), 3, 5, 0).real).toHaveLength(3);
  });
});
