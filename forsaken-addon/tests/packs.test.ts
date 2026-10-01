// Generated packs vs. roster data: every ability has a hotbar item with an icon and a name, every
// character / minion has a skin, every prop kind has a texture. Run `npm run build` after data changes.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { abilityItemId, CHARACTERS, MINIONS, SKIN_COUNT } from "../src/characters/roster";
import { PROP_VARIANTS } from "../src/core/ports";

const ROOT = path.resolve(__dirname, "..");
const BP = path.join(ROOT, "packs/Forsaken_BP");
const RP = path.join(ROOT, "packs/Forsaken_RP");
const readJson = (p: string) => JSON.parse(fs.readFileSync(p, "utf8"));
const lang = fs.readFileSync(path.join(RP, "texts/en_US.lang"), "utf8");
const itemTextures = readJson(path.join(RP, "textures/item_texture.json")).texture_data as Record<string, { textures: string }>;
const pngExists = (texPath: string) => fs.existsSync(path.join(RP, `${texPath}.png`));

function checkItem(file: string, identifier: string): void {
  const p = path.join(BP, "items", file);
  expect(fs.existsSync(p), file).toBe(true);
  const item = readJson(p)["minecraft:item"];
  expect(item.description.identifier).toBe(identifier);
  const icon = item.components["minecraft:icon"] as string;
  expect(itemTextures[icon], `icon ${icon}`).toBeDefined();
  expect(pngExists(itemTextures[icon].textures), `texture for ${icon}`).toBe(true);
  const nameKey = item.components["minecraft:display_name"].value as string;
  expect(lang).toContain(`${nameKey}=`);
}

describe("generated packs", () => {
  it("every ability has a hotbar item with an icon texture, a name and a cooldown category", () => {
    let n = 0;
    for (const c of CHARACTERS) {
      for (const a of c.abilities) {
        const id = abilityItemId(c.id, a.id);
        checkItem(`${id.replace("forsaken:", "")}.json`, id);
        const item = readJson(path.join(BP, "items", `${id.replace("forsaken:", "")}.json`))["minecraft:item"];
        expect(item.components["minecraft:cooldown"].category).toBe(id);
        n++;
      }
    }
    expect(n).toBe(fs.readdirSync(path.join(BP, "items")).filter((f) => f.startsWith("ab_")).length);
  });
  it("has the menu and map items", () => {
    checkItem("menu.json", "forsaken:menu");
    checkItem("item_medkit.json", "forsaken:item_medkit");
    checkItem("item_cola.json", "forsaken:item_cola");
  });
  it("ability slots are unique per character and inside the hotbar mapping (1-5)", () => {
    for (const c of CHARACTERS) {
      const slots = c.abilities.map((a) => a.slot);
      expect(new Set(slots).size, c.id).toBe(slots.length);
      for (const s of slots) {
        expect(s).toBeGreaterThanOrEqual(1);
        expect(s).toBeLessThanOrEqual(5);
      }
      // Slot 1 is the killer basic attack; survivors start at slot 2.
      if (c.team === "survivor") expect(slots).not.toContain(1);
    }
  });
  it("every character and minion has a skin texture on the bot entity", () => {
    const bot = readJson(path.join(RP, "entity/bot.entity.json"))["minecraft:client_entity"].description;
    const used = [...CHARACTERS, ...MINIONS.values()].map((c) => c.skinIndex);
    for (const i of used) {
      expect(i).toBeLessThan(SKIN_COUNT);
      const tex = bot.textures[`skin_${i}`] as string;
      expect(tex, `skin_${i}`).toBeDefined();
      expect(pngExists(tex), tex).toBe(true);
    }
    for (let i = 0; i < SKIN_COUNT; i++) expect(bot.textures[`skin_${i}`]).toBeDefined();
  });
  it("every prop kind has a texture variant on the prop entity", () => {
    const prop = readJson(path.join(RP, "entity/prop.entity.json"))["minecraft:client_entity"].description;
    for (const [kind, v] of Object.entries(PROP_VARIANTS)) {
      const tex = prop.textures[`p${v}`] as string;
      expect(tex, kind).toBeDefined();
      expect(pngExists(tex), tex).toBe(true);
    }
  });
});
