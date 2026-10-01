import { describe, expect, it } from "vitest";
import { callout, composeHud, sidebarRows } from "../src/ui/hud";
import { characterCard, controlsText, resultsBody } from "../src/ui/text";
import { character } from "../src/characters/roster";
import { cellPos, faceTo, place, realMatch } from "./helpers";

function hudText(lines: string[]): string {
  // Strip Minecraft colour codes for assertions.
  return lines.join("\n").replace(/§./g, "");
}

describe("composeHud", () => {
  it("shows clock, generators, survivors alive, HP, stamina and abilities", () => {
    const { game, survivors } = realMatch("slasher", ["noob", "shedletsky", "taph"], { humanSurvivor: 0 });
    const t = hudText(composeHud(game, survivors[0]).lines);
    expect(t).toMatch(/⏱ \d:\d\d/);
    expect(t).toContain("⚡ 0/5");
    expect(t).toContain("3 alive");
    expect(t).toContain(`HP ${Math.ceil(survivors[0].hp)}/${survivors[0].maxHp}`);
    expect(t).toContain("STA");
    for (const a of survivors[0].character.abilities) expect(t).toContain(a.name);
  });
  it("shows Noli's fake damage and fake heals but never above max HP or below 0", () => {
    const { game, survivors } = realMatch("noli", ["noob", "shedletsky"], { humanSurvivor: 0 });
    const s = survivors[0];
    s.res.fakeDamage = 30;
    expect(hudText(composeHud(game, s).lines)).toContain(`HP ${Math.ceil(s.hp - 30)}/`);
    s.hp = 60;
    s.res.fakeDamage = -80;
    expect(hudText(composeHud(game, s).lines)).toContain(`HP ${s.maxHp}/${s.maxHp}`);
    s.res.fakeDamage = 500;
    expect(hudText(composeHud(game, s).lines)).toContain(`HP 0/`);
  });
  it("lists visible statuses but hides statuses flagged hidden", () => {
    const { game, survivors } = realMatch("slasher", ["noob", "shedletsky"], { humanSurvivor: 0 });
    const s = survivors[0];
    game.status(s, "helpless", 1, 3, null, { data: { hidden: 1 } });
    expect(hudText(composeHud(game, s).lines)).not.toContain("HELPLESS");
    const other = survivors[1];
    game.status(other, "helpless", 1, 3, null);
    expect(hudText(composeHud(game, other).lines)).toContain("HELPLESS");
  });
  it("shows the terror cue only to survivors inside the killer's terror radius", () => {
    const { game, killer, survivors } = realMatch("slasher", ["noob", "shedletsky"], { humanSurvivor: 0 });
    const near = composeHud(game, survivors[0]);
    expect(near.terror).toBeGreaterThan(0);
    expect(hudText(near.lines)).toContain("TERROR");
    place(survivors[1], cellPos(killer.pos.x > 40 ? 2 : 78, 78));
    expect(composeHud(game, survivors[1]).terror).toBe(0);
    expect(composeHud(game, killer).terror).toBe(0);
  });
  it("lists Flagged survivors in range on Daemon's HUD (Uptime)", () => {
    const { game, killer, survivors } = realMatch("daemon", ["noob", "shedletsky"]);
    expect(hudText(composeHud(game, killer).lines)).not.toContain("⚑");
    game.status(survivors[0], "flagged", 1, 20, killer);
    const t = hudText(composeHud(game, killer).lines);
    expect(t).toContain("⚑ Noob");
    expect(t).not.toContain("⚑ Shedletsky");
  });
  it("shows aura callouts with direction and distance", () => {
    const { game, killer, survivors } = realMatch("slasher", ["noob", "shedletsky"]);
    faceTo(killer, survivors[0]);
    game.reveal(survivors[0], [killer.id], 5, { color: "red", source: "test" });
    const t = hudText(composeHud(game, killer).lines);
    expect(t).toContain("◆ Noob");
    expect(t).toContain(callout(killer, survivors[0].pos).replace(/§./g, ""));
    expect(callout(killer, survivors[0].pos)).toMatch(/^▲ \d+m$/);
  });
  it("tells an eliminated player they are spectating", () => {
    const { game, killer, survivors } = realMatch("slasher", ["noob", "shedletsky"], { humanSurvivor: 0 });
    game.damage(survivors[0], 1000, killer);
    expect(hudText(composeHud(game, survivors[0]).lines)).toContain("Spectating");
  });
});

describe("sidebarRows", () => {
  it("lists the killer first, then every survivor with its HP (0 when eliminated)", () => {
    const { game, killer, survivors } = realMatch("slasher", ["noob", "shedletsky"]);
    game.damage(survivors[1], 1000, killer);
    const rows = sidebarRows(game);
    expect(rows[0].label).toContain("Slasher");
    expect(rows[0].score).toBe(Math.ceil(killer.hp));
    expect(rows).toHaveLength(3);
    expect(rows[1].score).toBe(Math.ceil(survivors[0].hp));
    expect(rows[2].score).toBe(0);
  });
});

describe("menu and results text", () => {
  it("character cards show stats, passives and every ability with its cooldown", () => {
    for (const id of ["slasher", "daemon", "noob", "builderman"]) {
      const c = character(id);
      const card = characterCard(c).replace(/§./g, "");
      expect(card).toContain(`HP ${c.stats.hp}`);
      for (const p of c.passives) expect(card).toContain(p.name);
      for (const a of c.abilities) expect(card).toContain(`[${a.slot}] ${a.name}`);
    }
    expect(characterCard(character("daemon"))).toContain("Original character");
  });
  it("controls text explains repairing, hotbar and commands", () => {
    const t = controlsText();
    expect(t).toContain("SNEAK");
    expect(t).toContain("Slot 1");
    expect(t).toContain("forsaken:menu");
  });
  it("results list every participant and mark the human", () => {
    const { game, killer, survivors } = realMatch("slasher", ["noob", "shedletsky"], { humanSurvivor: 0 });
    game.damage(survivors[1], 1000, killer);
    const body = resultsBody("killer", "Every survivor was eliminated.", game.results(), survivors[0].id).replace(/§./g, "");
    expect(body).toContain("Every survivor was eliminated.");
    expect(body).toContain("Slasher");
    expect(body).toContain("Noob (you)");
    expect(body).toContain("Shedletsky [BOT]");
    expect(body).toContain("ELIMINATED");
  });
});
