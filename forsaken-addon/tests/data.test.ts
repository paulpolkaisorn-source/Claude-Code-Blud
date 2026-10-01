// Data completeness (brief §8.4): every character has data, a kit, a handler per ability,
// an item + icon + lang name (checked in tests/packs.test.ts) and a bot profile (tests/bots.test.ts).
import { describe, expect, it } from "vitest";
import { CHARACTERS, KILLERS, SURVIVORS, validateRoster, resolvePath } from "../src/characters/roster";
import { KITS } from "../src/abilities/kits";
import { makeCtx } from "../src/abilities/engine";

const BRIEF_KILLERS = ["slasher", "c00lkidd", "john_doe", "1x1x1x1", "noli", "guest_666", "nosferatu", "daemon"];
const BRIEF_SURVIVORS = ["noob", "007n7", "veeronica", "guest_1337", "shedletsky", "chance", "two_time", "jane_doe", "elliot", "builderman", "dusekkar", "taph"];

describe("roster data", () => {
  it("passes structural validation", () => {
    expect(validateRoster()).toEqual([]);
  });
  it("contains every character from the brief (§4)", () => {
    expect(KILLERS.map((k) => k.id).sort()).toEqual([...BRIEF_KILLERS].sort());
    expect(SURVIVORS.map((s) => s.id).sort()).toEqual([...BRIEF_SURVIVORS].sort());
  });
  it("every ability has a name, a slot, a cooldown or an explicit 'none' note, and a description", () => {
    for (const c of CHARACTERS) {
      for (const a of c.abilities) {
        expect(a.name, `${c.id}.${a.id}`).toBeTruthy();
        expect(a.slot, `${c.id}.${a.id}`).toBeGreaterThanOrEqual(1);
        expect(a.cooldown !== null || !!a.cooldownNote, `${c.id}.${a.id}`).toBe(true);
      }
    }
  });
  it("resolves every [assumed] / [undocumented] flag path", () => {
    for (const c of CHARACTERS) for (const p of [...c.assumed, ...c.undocumented]) expect(resolvePath(c, p), `${c.id}: ${p}`).not.toBeUndefined();
  });
});

describe("kits", () => {
  it("has exactly one kit per character", () => {
    expect([...KITS.keys()].sort()).toEqual(CHARACTERS.map((c) => c.id).sort());
  });
  it("has a handler for every ability", () => {
    for (const c of CHARACTERS) {
      const kit = KITS.get(c.id)!;
      for (const a of c.abilities) expect(typeof kit.abilities[a.id]?.use, `${c.id}.${a.id}`).toBe("function");
      expect(Object.keys(kit.abilities).sort(), c.id).toEqual(c.abilities.map((a) => a.id).sort());
    }
  });
  it("charge/toggle abilities define release()", () => {
    for (const c of CHARACTERS) {
      const kit = KITS.get(c.id)!;
      for (const a of c.abilities) if (a.input === "charge") expect(typeof kit.abilities[a.id]?.release, `${c.id}.${a.id}`).toBe("function");
    }
  });
  it("ability params referenced via ctx.n() exist (smoke: makeCtx works for all)", () => {
    for (const c of CHARACTERS) for (const a of c.abilities) expect(() => makeCtx({} as never, { data: () => ({}) } as never, a)).not.toThrow();
  });
});
