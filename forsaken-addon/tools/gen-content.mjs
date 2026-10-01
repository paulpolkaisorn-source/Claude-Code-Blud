// Generates every pack file that derives from data/: items, blocks, entities, client entities,
// geometry, animations, render controllers, fogs, lang, texture atlases and placeholder PNGs.
// Placeholder art is original and procedural (golden-angle hues). Drop 64x64 PNGs into
// assets/skin_overrides/<character_id>.png or 16x16 PNGs into assets/icon_overrides/<item_name>.png
// and rebuild to replace them.
import fs from "node:fs";
import path from "node:path";
import { ROOT, BP, RP, readJson, writeJson, writeText, writeBuffer, pruneDir } from "./lib/fsutil.mjs";
import { createImage, encodePng, fillRect, noiseRect, strokeRect, drawText, drawGlyph, hsl, shade, setPixel, readPngSize } from "./lib/png.mjs";

const ENTITY_FORMAT = "1.26.50";
const ITEM_FORMAT = "1.26.30";
const BLOCK_FORMAT = "1.26.20";

const killers = readJson(path.join(ROOT, "data", "killers.json")).characters;
const survivors = readJson(path.join(ROOT, "data", "survivors.json")).characters;
const characters = [...killers, ...survivors];
const config = readJson(path.join(ROOT, "data", "config.json"));

// Minion skins share the bot entity (indices from src/characters/roster.ts MINION_SKINS).
const MINION_SKINS = [
  { skinIndex: 20, id: "minion_pizza_bot", name: "Pizza Delivery Bot", team: "killer" },
  { skinIndex: 21, id: "minion_zombie", name: "Rotten Zombie", team: "killer" },
];
const SKIN_COUNT = 22;

// Prop variants (src/core/ports.ts PROP_VARIANTS) and their shape masks: cube 1, flat 2, pole 4, small 8, tall 16, panel 32.
const PROPS = [
  { id: "pizza", mask: 2, color: [214, 140, 40] },
  { id: "sentry", mask: 5, color: [120, 130, 140] },
  { id: "dispenser", mask: 1, color: [200, 60, 60] },
  { id: "tripwire_stake", mask: 4, color: [150, 110, 70] },
  { id: "tripmine", mask: 2, color: [190, 90, 230] },
  { id: "blood_orb", mask: 8, color: [170, 0, 20] },
  { id: "medkit", mask: 8, color: [235, 235, 235] },
  { id: "cola", mask: 8, color: [150, 30, 30] },
  { id: "ritual", mask: 2, color: [110, 0, 30] },
  { id: "graffiti", mask: 32, color: [60, 220, 200] },
  { id: "shadow_trap", mask: 2, color: [25, 10, 30] },
  { id: "spike", mask: 16, color: [140, 0, 30] },
  { id: "nova", mask: 8, color: [60, 0, 90] },
  { id: "crystal", mask: 8, color: [120, 220, 255] },
  { id: "bat_orb", mask: 8, color: [40, 20, 40] },
  { id: "corrupt_cube", mask: 1, color: [110, 110, 110] },
  { id: "marker", mask: 8, color: [255, 230, 80] },
];

const generatedBP = new Set();
const generatedRP = new Set();
function bpJson(rel, obj) {
  generatedBP.add(rel);
  writeJson(path.join(BP, rel), obj);
}
function rpJson(rel, obj) {
  generatedRP.add(rel);
  writeJson(path.join(RP, rel), obj);
}
function rpPng(rel, img, overrideFile) {
  generatedRP.add(rel);
  if (overrideFile && fs.existsSync(overrideFile)) {
    const buf = fs.readFileSync(overrideFile);
    readPngSize(buf); // throws for non-PNG
    writeBuffer(path.join(RP, rel), buf);
  } else {
    writeBuffer(path.join(RP, rel), encodePng(img));
  }
}

const lang = new Map();
const itemTextures = {};
const terrainTextures = {};

// ------------------------------------------------------------------ colours
const GOLDEN = 137.50776405;
function charColors(c) {
  const hue = (c.skinIndex * GOLDEN) % 360;
  if (c.team === "killer") {
    return { primary: hsl(hue, 0.45, 0.24), secondary: hsl(hue + 25, 0.35, 0.14), trim: [210, 20, 30, 255], skin: hsl(hue, 0.15, 0.32), eye: [255, 40, 40, 255] };
  }
  return { primary: hsl(hue, 0.65, 0.55), secondary: hsl(hue + 30, 0.45, 0.35), trim: hsl(hue + 180, 0.7, 0.75), skin: [228, 184, 150, 255], eye: [30, 30, 40, 255] };
}

// ------------------------------------------------------------------ skins (64x64, standard layout)
function paintBox(img, u, v, w, h, d, color, seed, noise = 0.18) {
  // Box UV layout: top (u+d, v) w×d, bottom (u+d+w, v) w×d, sides row at v+d with heights h.
  noiseRect(img, u + d, v, w, d, color, noise, seed);
  noiseRect(img, u + d + w, v, w, d, shade(color, 0.85), noise, seed + 1);
  noiseRect(img, u, v + d, d, h, shade(color, 0.9), noise, seed + 2);
  noiseRect(img, u + d, v + d, w, h, color, noise, seed + 3);
  noiseRect(img, u + d + w, v + d, d, h, shade(color, 0.9), noise, seed + 4);
  noiseRect(img, u + 2 * d + w, v + d, w, h, shade(color, 0.8), noise, seed + 5);
}

function makeSkin(c, variant = 0) {
  const img = createImage(64, 64, [0, 0, 0, 0]);
  const col = charColors(c);
  const s = c.skinIndex * 31 + 7;
  // head + face
  paintBox(img, 0, 0, 8, 8, 8, col.skin, s);
  // body, arms, legs
  paintBox(img, 16, 16, 8, 12, 4, col.primary, s + 10);
  paintBox(img, 40, 16, 4, 12, 4, col.primary, s + 20);
  paintBox(img, 32, 48, 4, 12, 4, col.primary, s + 30);
  paintBox(img, 0, 16, 4, 12, 4, col.secondary, s + 40);
  paintBox(img, 16, 48, 4, 12, 4, col.secondary, s + 50);
  // hands
  fillRect(img, 44, 28, 4, 4, col.skin);
  fillRect(img, 36, 60, 4, 4, col.skin);
  // shoes
  fillRect(img, 4, 28, 4, 4, shade(col.secondary, 0.5));
  fillRect(img, 20, 60, 4, 4, shade(col.secondary, 0.5));
  // face
  const face = { x: 8, y: 8 };
  fillRect(img, face.x + 1, face.y + 3, 2, 1, col.eye);
  fillRect(img, face.x + 5, face.y + 3, 2, 1, col.eye);
  fillRect(img, face.x + 3, face.y + 6, 2, 1, shade(col.skin, 0.6));
  // hair / hood on the hat layer
  const hair = c.team === "killer" ? shade(col.secondary, 0.7) : shade(col.secondary, 1.1);
  noiseRect(img, 40, 0, 8, 8, hair, 0.2, s + 60); // hat top
  noiseRect(img, 32, 8, 8, 3, hair, 0.2, s + 61);
  noiseRect(img, 40, 8, 8, 2, hair, 0.2, s + 62);
  noiseRect(img, 48, 8, 8, 3, hair, 0.2, s + 63);
  noiseRect(img, 56, 8, 8, 8, hair, 0.2, s + 64);
  // chest glyph: the character's initial
  const initial = (c.name.match(/[A-Za-z0-9]/) || ["?"])[0];
  drawGlyph(img, initial, 21, 22, c.team === "killer" ? col.trim : shade(col.primary, 0.35));
  // killer red glow trim on the jacket layer edges
  if (c.team === "killer") {
    for (let x = 20; x < 28; x++) {
      setPixel(img, x, 36, col.trim);
      setPixel(img, x, 47, col.trim);
    }
    strokeRect(img, 44, 36, 4, 12, [col.trim[0], col.trim[1], col.trim[2], 160]);
  }
  if (c.id === "daemon") paintDaemon(img, variant);
  if (c.id === "minion_pizza_bot") {
    fillRect(img, 8, 10, 8, 3, [200, 20, 20, 255]);
    drawText(img, "R", 9, 9, [255, 255, 255, 255]);
    paintBox(img, 0, 16, 4, 12, 4, [15, 15, 15, 255], s + 70);
    paintBox(img, 16, 48, 4, 12, 4, [15, 15, 15, 255], s + 71);
  }
  if (c.id === "minion_zombie") {
    for (const [u, v, w, h] of [[0, 0, 32, 16], [16, 16, 24, 16], [40, 16, 16, 16], [0, 16, 16, 16], [16, 48, 16, 16], [32, 48, 16, 16]]) noiseRect(img, u, v, w, h, [12, 14, 12, 255], 0.3, s + u);
    for (let i = 0; i < 40; i++) setPixel(img, (i * 13) % 64, (i * 29) % 64, [40, 120, 50, 255]);
    fillRect(img, 32, 0, 32, 16, [0, 0, 0, 0]);
  }
  return img;
}

/** Daemon: dark hood, blinking block cursor for a face, faint green terminal glow. */
function paintDaemon(img, variant) {
  const hood = [14, 16, 18, 255];
  const glow = [60, 255, 120, 255];
  paintBox(img, 0, 0, 8, 8, 8, [6, 8, 8, 255], 901, 0.05);
  paintBox(img, 32, 0, 8, 8, 8, hood, 902, 0.1); // hood on the hat layer
  fillRect(img, 40, 8, 8, 8, [0, 0, 0, 0]); // open hood front
  fillRect(img, 8, 8, 8, 8, [4, 6, 6, 255]);
  if (variant === 0) fillRect(img, 11, 10, 2, 4, glow);
  else fillRect(img, 11, 13, 3, 1, shade(glow, 0.6));
  paintBox(img, 16, 16, 8, 12, 4, hood, 903, 0.1);
  paintBox(img, 40, 16, 4, 12, 4, hood, 904, 0.1);
  paintBox(img, 32, 48, 4, 12, 4, hood, 905, 0.1);
  paintBox(img, 0, 16, 4, 12, 4, [10, 10, 12, 255], 906, 0.1);
  paintBox(img, 16, 48, 4, 12, 4, [10, 10, 12, 255], 907, 0.1);
  drawText(img, ">", 21, 22, glow);
  for (let y = 20; y < 32; y += 3) setPixel(img, 27, y, shade(glow, 0.5));
}

// ------------------------------------------------------------------ icons (16x16)
function initials(name) {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return (words[0] || "?").slice(0, 2).toUpperCase();
}

function makeIcon(bg, label, border) {
  const img = createImage(16, 16, [0, 0, 0, 0]);
  noiseRect(img, 1, 1, 14, 14, bg, 0.12, label.charCodeAt(0) * 17 + (label.charCodeAt(1) || 3));
  strokeRect(img, 0, 0, 16, 16, border);
  const fg = bg[0] * 0.3 + bg[1] * 0.59 + bg[2] * 0.11 > 140 ? [20, 20, 20, 255] : [245, 245, 245, 255];
  if (label.length === 1) drawGlyph(img, label, 5, 4, fg);
  else {
    drawGlyph(img, label[0], 2, 4, fg);
    drawGlyph(img, label[1], 9, 4, fg);
  }
  return img;
}

// ------------------------------------------------------------------ items
function abilityItemName(c, a) {
  return `ab_${c.id}_${a.id}`;
}

function writeItem(name, displayKey, iconKey, opts = {}) {
  const components = {
    "minecraft:icon": iconKey,
    "minecraft:display_name": { value: displayKey },
    "minecraft:max_stack_size": 1,
    "minecraft:hand_equipped": !!opts.handEquipped,
    "minecraft:can_destroy_in_creative": false,
    "minecraft:cooldown": { category: `forsaken:${name}`, duration: 0.05 },
  };
  if (opts.interact) components["minecraft:interact_button"] = opts.interact;
  if (opts.glint) components["minecraft:glint"] = true;
  bpJson(`items/${name}.json`, {
    format_version: ITEM_FORMAT,
    "minecraft:item": {
      description: { identifier: `forsaken:${name}`, menu_category: { category: opts.menu ? "items" : "none" } },
      components,
    },
  });
}

for (const c of characters) {
  const col = charColors(c);
  for (const a of c.abilities) {
    const name = abilityItemName(c, a);
    const key = `forsaken_${name}`;
    const bg = a.slot === 1 ? shade(col.primary, 0.8) : col.primary;
    const border = c.team === "killer" ? [220, 30, 40, 255] : [255, 255, 255, 255];
    rpPng(`textures/items/forsaken/${name}.png`, makeIcon(bg, initials(a.name), border), path.join(ROOT, "assets", "icon_overrides", `${name}.png`));
    itemTextures[key] = { textures: `textures/items/forsaken/${name}` };
    const langKey = `item.forsaken.${name}.name`;
    lang.set(langKey, `${a.name} §7(${c.name})`);
    writeItem(name, langKey, key, { handEquipped: a.slot === 1, interact: `Use ${a.name}` });
  }
}

// Utility items
const UTIL = [
  { name: "menu", label: "FM", text: "Forsaken Menu", bg: [90, 10, 20, 255], border: [255, 200, 60, 255], menu: true, interact: "Open Menu", glint: true },
  { name: "item_medkit", label: "+", text: "Medkit", bg: [235, 235, 235, 255], border: [200, 20, 20, 255], interact: "Use Medkit" },
  { name: "item_cola", label: "BC", text: "Bloxy Cola", bg: [150, 25, 25, 255], border: [255, 255, 255, 255], interact: "Drink" },
];
for (const u of UTIL) {
  rpPng(`textures/items/forsaken/${u.name}.png`, makeIcon(u.bg, u.label, u.border), path.join(ROOT, "assets", "icon_overrides", `${u.name}.png`));
  itemTextures[`forsaken_${u.name}`] = { textures: `textures/items/forsaken/${u.name}` };
  lang.set(`item.forsaken.${u.name}.name`, u.text);
  writeItem(u.name, `item.forsaken.${u.name}.name`, `forsaken_${u.name}`, { menu: u.menu, interact: u.interact, glint: u.glint });
}

// ------------------------------------------------------------------ blocks (generator)
function genTexture(lit, top) {
  const img = createImage(16, 16, [0, 0, 0, 255]);
  noiseRect(img, 0, 0, 16, 16, lit ? [70, 70, 60, 255] : [45, 45, 50, 255], 0.25, top ? 5 : 9);
  strokeRect(img, 0, 0, 16, 16, [20, 20, 22, 255]);
  if (top) {
    fillRect(img, 4, 4, 8, 8, lit ? [255, 240, 120, 255] : [90, 30, 20, 255]);
    strokeRect(img, 3, 3, 10, 10, [30, 30, 30, 255]);
  } else {
    for (let x = 1; x < 15; x += 3) fillRect(img, x, 6, 2, 4, lit ? [255, 220, 60, 255] : [200, 90, 20, 255]);
    fillRect(img, 2, 12, 12, 2, lit ? [120, 255, 120, 255] : [120, 20, 20, 255]);
  }
  return img;
}
for (const lit of [false, true]) {
  const suffix = lit ? "_lit" : "";
  rpPng(`textures/blocks/forsaken/generator${suffix}.png`, genTexture(lit, false));
  rpPng(`textures/blocks/forsaken/generator${suffix}_top.png`, genTexture(lit, true));
  terrainTextures[`forsaken_generator${suffix}`] = { textures: `textures/blocks/forsaken/generator${suffix}` };
  terrainTextures[`forsaken_generator${suffix}_top`] = { textures: `textures/blocks/forsaken/generator${suffix}_top` };
  const id = `generator${suffix}`;
  const key = `tile.forsaken:${id}.name`;
  lang.set(key, lit ? "Generator (Repaired)" : "Generator");
  bpJson(`blocks/${id}.json`, {
    format_version: BLOCK_FORMAT,
    "minecraft:block": {
      description: { identifier: `forsaken:${id}`, menu_category: { category: "construction" } },
      components: {
        "minecraft:display_name": key,
        "minecraft:geometry": "minecraft:geometry.full_block",
        "minecraft:material_instances": {
          "*": { texture: `forsaken_generator${suffix}`, render_method: "opaque" },
          up: { texture: `forsaken_generator${suffix}_top`, render_method: "opaque" },
        },
        "minecraft:light_emission": lit ? 15 : 2,
        "minecraft:destructible_by_mining": false,
        "minecraft:destructible_by_explosion": false,
      },
    },
  });
}

// ------------------------------------------------------------------ entities (behavior)
bpJson("entities/bot.json", {
  format_version: ENTITY_FORMAT,
  "minecraft:entity": {
    description: {
      identifier: "forsaken:bot",
      is_spawnable: false,
      is_summonable: true,
      properties: {
        "forsaken:character": { type: "int", range: [0, 31], default: 0, client_sync: true },
        "forsaken:role": { type: "int", range: [0, 3], default: 0, client_sync: true },
        "forsaken:action": { type: "int", range: [0, 7], default: 0, client_sync: true },
      },
    },
    components: {
      "minecraft:type_family": { family: ["forsaken_bot", "mob"] },
      "minecraft:collision_box": { width: 0.6, height: 1.8 },
      "minecraft:health": { value: 20, max: 20 },
      "minecraft:movement": { value: 0.25 },
      "minecraft:movement.basic": {},
      "minecraft:jump.static": {},
      "minecraft:physics": {},
      "minecraft:pushable_by_block": {},
      "minecraft:nameable": { always_show: true, allow_name_tag_renaming: false },
      "minecraft:knockback_resistance": { value: 0 },
      "minecraft:fire_immune": {},
      "minecraft:persistent": {},
      "minecraft:damage_sensor": { triggers: [{ cause: "all", deals_damage: "no" }] },
    },
  },
});
bpJson("entities/prop.json", {
  format_version: ENTITY_FORMAT,
  "minecraft:entity": {
    description: {
      identifier: "forsaken:prop",
      is_spawnable: false,
      is_summonable: true,
      properties: {
        "forsaken:variant": { type: "int", range: [0, 31], default: 0, client_sync: true },
      },
    },
    components: {
      "minecraft:type_family": { family: ["forsaken_prop", "inanimate"] },
      "minecraft:collision_box": { width: 0.4, height: 0.4 },
      "minecraft:health": { value: 1, max: 1 },
      "minecraft:physics": { has_gravity: false, has_collision: false },
      "minecraft:nameable": { always_show: false, allow_name_tag_renaming: false },
      "minecraft:knockback_resistance": { value: 1 },
      "minecraft:fire_immune": {},
      "minecraft:persistent": {},
      "minecraft:damage_sensor": { triggers: [{ cause: "all", deals_damage: "no" }] },
    },
  },
});
lang.set("entity.forsaken:bot.name", "Forsaken Bot");
lang.set("entity.forsaken:prop.name", "Forsaken Prop");

// ------------------------------------------------------------------ client entities, geometry, animations
const skinDefs = [...characters, ...MINION_SKINS];
const skinTextures = {};
for (let i = 0; i < SKIN_COUNT; i++) {
  const c = skinDefs.find((x) => x.skinIndex === i);
  if (!c) throw new Error(`no character for skin index ${i}`);
  const rel = `textures/entity/forsaken/skin_${c.id}`;
  rpPng(rel + ".png", makeSkin(c, 0), path.join(ROOT, "assets", "skin_overrides", `${c.id}.png`));
  skinTextures[`skin_${i}`] = rel;
}
const daemon = characters.find((c) => c.id === "daemon");
rpPng("textures/entity/forsaken/skin_daemon_blink.png", makeSkin(daemon, 1), path.join(ROOT, "assets", "skin_overrides", "daemon_blink.png"));
skinTextures.daemon_blink = "textures/entity/forsaken/skin_daemon_blink";

rpJson("entity/bot.entity.json", {
  format_version: "1.10.0",
  "minecraft:client_entity": {
    description: {
      identifier: "forsaken:bot",
      materials: { default: "entity_alphatest" },
      textures: skinTextures,
      geometry: { default: "geometry.forsaken.humanoid" },
      animations: {
        walk: "animation.forsaken.walk",
        look: "animation.forsaken.look",
        swing: "animation.forsaken.swing",
        stunned: "animation.forsaken.stunned",
        repair: "animation.forsaken.repair",
        cast: "animation.forsaken.cast",
      },
      scripts: {
        scale: `query.property('forsaken:character') == ${daemon.skinIndex} ? 1.15 : 1.0`,
        animate: [
          "walk",
          "look",
          { swing: "query.property('forsaken:action') == 1" },
          { stunned: "query.property('forsaken:action') == 2" },
          { repair: "query.property('forsaken:action') == 3" },
          { cast: "query.property('forsaken:action') == 4" },
        ],
      },
      render_controllers: ["controller.render.forsaken.bot"],
    },
  },
});

const propTextures = {};
PROPS.forEach((p, i) => {
  const img = createImage(64, 64, [0, 0, 0, 0]);
  noiseRect(img, 0, 0, 64, 64, [...p.color, 255], 0.22, i * 41 + 3);
  if (p.id === "graffiti") {
    for (let k = 0; k < 6; k++) fillRect(img, 2 + k * 5, 18 + (k % 2) * 4, 4, 9, hsl(k * 60, 0.9, 0.55));
  }
  if (p.id === "medkit") {
    fillRect(img, 6, 6, 4, 12, [220, 20, 20, 255]);
    fillRect(img, 2, 10, 12, 4, [220, 20, 20, 255]);
  }
  rpPng(`textures/entity/forsaken/prop_${p.id}.png`, img);
  propTextures[`p${i}`] = `textures/entity/forsaken/prop_${p.id}`;
});
const maskExpr = PROPS.reduceRight((acc, p, i) => `(v.k == ${i}) ? ${p.mask} : (${acc})`, "8");
rpJson("entity/prop.entity.json", {
  format_version: "1.10.0",
  "minecraft:client_entity": {
    description: {
      identifier: "forsaken:prop",
      materials: { default: "entity_alphatest" },
      textures: propTextures,
      geometry: { default: "geometry.forsaken.prop" },
      animations: { spin: "animation.forsaken.prop_spin" },
      scripts: {
        pre_animation: ["v.k = query.property('forsaken:variant');", `v.mask = ${maskExpr};`],
        animate: [{ spin: "math.mod(math.floor(v.mask / 8), 2) == 1" }],
      },
      render_controllers: ["controller.render.forsaken.prop"],
    },
  },
});

rpJson("render_controllers/forsaken.render_controllers.json", {
  format_version: "1.8.0",
  render_controllers: {
    "controller.render.forsaken.bot": {
      arrays: { textures: { "Array.skins": Array.from({ length: SKIN_COUNT }, (_, i) => `Texture.skin_${i}`) } },
      geometry: "Geometry.default",
      materials: [{ "*": "Material.default" }],
      textures: [`(query.property('forsaken:character') == ${daemon.skinIndex} && math.mod(math.floor(query.life_time * 2.0), 2.0) == 1.0) ? Texture.daemon_blink : Array.skins[query.property('forsaken:character')]`],
    },
    "controller.render.forsaken.prop": {
      arrays: { textures: { "Array.props": PROPS.map((_, i) => `Texture.p${i}`) } },
      geometry: "Geometry.default",
      materials: [{ "*": "Material.default" }],
      textures: ["Array.props[query.property('forsaken:variant')]"],
      part_visibility: [
        { "*": false },
        { cube: "math.mod(math.floor(v.mask / 1), 2) == 1" },
        { flat: "math.mod(math.floor(v.mask / 2), 2) == 1" },
        { pole: "math.mod(math.floor(v.mask / 4), 2) == 1" },
        { small: "math.mod(math.floor(v.mask / 8), 2) == 1" },
        { tall: "math.mod(math.floor(v.mask / 16), 2) == 1" },
        { panel: "math.mod(math.floor(v.mask / 32), 2) == 1" },
      ],
    },
  },
});

function cube(origin, size, uv, extra = {}) {
  return { origin, size, uv, ...extra };
}
rpJson("models/entity/forsaken_humanoid.geo.json", {
  format_version: "1.12.0",
  "minecraft:geometry": [
    {
      description: { identifier: "geometry.forsaken.humanoid", texture_width: 64, texture_height: 64, visible_bounds_width: 2, visible_bounds_height: 3, visible_bounds_offset: [0, 1.5, 0] },
      bones: [
        { name: "root", pivot: [0, 0, 0] },
        { name: "body", parent: "root", pivot: [0, 24, 0], cubes: [cube([-4, 12, -2], [8, 12, 4], [16, 16])] },
        { name: "jacket", parent: "body", pivot: [0, 24, 0], cubes: [cube([-4, 12, -2], [8, 12, 4], [16, 32], { inflate: 0.25 })] },
        { name: "head", parent: "body", pivot: [0, 24, 0], cubes: [cube([-4, 24, -4], [8, 8, 8], [0, 0])] },
        { name: "hat", parent: "head", pivot: [0, 24, 0], cubes: [cube([-4, 24, -4], [8, 8, 8], [32, 0], { inflate: 0.5 })] },
        { name: "rightarm", parent: "body", pivot: [-5, 22, 0], cubes: [cube([-8, 12, -2], [4, 12, 4], [40, 16])] },
        { name: "rightsleeve", parent: "rightarm", pivot: [-5, 22, 0], cubes: [cube([-8, 12, -2], [4, 12, 4], [40, 32], { inflate: 0.25 })] },
        { name: "leftarm", parent: "body", pivot: [5, 22, 0], cubes: [cube([4, 12, -2], [4, 12, 4], [32, 48])] },
        { name: "leftsleeve", parent: "leftarm", pivot: [5, 22, 0], cubes: [cube([4, 12, -2], [4, 12, 4], [48, 48], { inflate: 0.25 })] },
        { name: "rightleg", parent: "root", pivot: [-1.9, 12, 0], cubes: [cube([-3.9, 0, -2], [4, 12, 4], [0, 16])] },
        { name: "rightpants", parent: "rightleg", pivot: [-1.9, 12, 0], cubes: [cube([-3.9, 0, -2], [4, 12, 4], [0, 32], { inflate: 0.25 })] },
        { name: "leftleg", parent: "root", pivot: [1.9, 12, 0], cubes: [cube([-0.1, 0, -2], [4, 12, 4], [16, 48])] },
        { name: "leftpants", parent: "leftleg", pivot: [1.9, 12, 0], cubes: [cube([-0.1, 0, -2], [4, 12, 4], [0, 48], { inflate: 0.25 })] },
      ],
    },
  ],
});
rpJson("models/entity/forsaken_prop.geo.json", {
  format_version: "1.12.0",
  "minecraft:geometry": [
    {
      description: { identifier: "geometry.forsaken.prop", texture_width: 64, texture_height: 64, visible_bounds_width: 2, visible_bounds_height: 2.5, visible_bounds_offset: [0, 1, 0] },
      bones: [
        { name: "root", pivot: [0, 0, 0] },
        { name: "cube", parent: "root", pivot: [0, 0, 0], cubes: [cube([-4, 0, -4], [8, 8, 8], [0, 0])] },
        { name: "flat", parent: "root", pivot: [0, 0, 0], cubes: [cube([-7, 0, -7], [14, 1, 14], [0, 0])] },
        { name: "pole", parent: "root", pivot: [0, 0, 0], cubes: [cube([-1, 0, -1], [2, 16, 2], [0, 0])] },
        { name: "small", parent: "root", pivot: [0, 6, 0], cubes: [cube([-2, 4, -2], [4, 4, 4], [0, 0])] },
        { name: "tall", parent: "root", pivot: [0, 0, 0], cubes: [cube([-1.5, 0, -1.5], [3, 24, 3], [0, 0])] },
        { name: "panel", parent: "root", pivot: [0, 0, 0], cubes: [cube([-8, 4, 6], [16, 16, 1], [0, 0])] },
      ],
    },
  ],
});
const swingCurve = "math.sin(query.anim_time * 1080.0) * 40.0";
const walkCurve = "math.cos(query.modified_distance_moved * 38.17) * 70.0 * math.min(1.0, query.modified_move_speed * 1.5)";
rpJson("animations/forsaken.animation.json", {
  format_version: "1.8.0",
  animations: {
    "animation.forsaken.walk": {
      loop: true,
      bones: {
        rightarm: { rotation: [walkCurve, 0, 0] },
        leftarm: { rotation: [`-(${walkCurve})`, 0, 0] },
        rightleg: { rotation: [`-(${walkCurve})`, 0, 0] },
        leftleg: { rotation: [walkCurve, 0, 0] },
      },
    },
    "animation.forsaken.look": { loop: true, bones: { head: { rotation: ["query.target_x_rotation", "query.target_y_rotation", 0] } } },
    "animation.forsaken.swing": { loop: true, bones: { rightarm: { rotation: [`-100.0 + ${swingCurve}`, 0, 15] }, body: { rotation: [0, `math.sin(query.anim_time * 1080.0) * 12.0`, 0] } } },
    "animation.forsaken.stunned": { loop: true, bones: { head: { rotation: [20, `math.sin(query.anim_time * 400.0) * 25.0`, 10] }, rightarm: { rotation: [0, 0, 20] }, leftarm: { rotation: [0, 0, -20] } } },
    "animation.forsaken.repair": { loop: true, bones: { root: { position: [0, -3, 0] }, rightleg: { rotation: [-70, 0, 0] }, leftleg: { rotation: [-70, 0, 0] }, rightarm: { rotation: [`-60.0 + math.sin(query.anim_time * 900.0) * 10.0`, 0, 0] }, leftarm: { rotation: [`-60.0 - math.sin(query.anim_time * 900.0) * 10.0`, 0, 0] } } },
    "animation.forsaken.cast": { loop: true, bones: { rightarm: { rotation: [-160, 0, 10] }, leftarm: { rotation: [-160, 0, -10] } } },
    "animation.forsaken.prop_spin": { loop: true, bones: { small: { rotation: [0, "query.anim_time * 120.0", 0], position: [0, "math.sin(query.anim_time * 180.0) * 1.5", 0] } } },
  },
});

// ------------------------------------------------------------------ fogs
const FOGS = {
  "forsaken:arena_fog": { start: 6, end: 42, color: "#0B0E12" },
  "forsaken:blood_hunt_fog": { start: 2, end: 26, color: "#2A0204" },
  "forsaken:lms_fog": { start: 4, end: 34, color: "#3A0508" },
};
for (const [id, f] of Object.entries(FOGS)) {
  rpJson(`fogs/${id.split(":")[1]}.json`, {
    format_version: "1.16.100",
    "minecraft:fog_settings": {
      description: { identifier: id },
      distance: {
        air: { fog_start: f.start, fog_end: f.end, fog_color: f.color, render_distance_type: "fixed" },
        weather: { fog_start: f.start, fog_end: f.end, fog_color: f.color, render_distance_type: "fixed" },
      },
    },
  });
}
for (const id of Object.values(config.fog)) if (!FOGS[id]) throw new Error(`config.fog references unknown fog ${id}`);

// ------------------------------------------------------------------ atlases, lang
rpJson("textures/item_texture.json", { resource_pack_name: "forsaken", texture_name: "atlas.items", texture_data: itemTextures });
rpJson("textures/terrain_texture.json", { resource_pack_name: "forsaken", texture_name: "atlas.terrain", padding: 8, num_mip_levels: 4, texture_data: terrainTextures });
lang.set("pack.name", "FORSAKEN: Bedrock Edition");
lang.set("pack.description", "Unofficial fan project. Not affiliated with or endorsed by the FORSAKEN developers or Roblox.");
const langText = ["## FORSAKEN: Bedrock Edition — generated by tools/gen-content.mjs", ...[...lang.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`)].join("\n") + "\n";
generatedRP.add("texts/en_US.lang");
writeText(path.join(RP, "texts", "en_US.lang"), langText);
rpJson("texts/languages.json", ["en_US"]);

// pack icons (64x64)
for (const [dir, set] of [[BP, generatedBP], [RP, generatedRP]]) {
  const img = createImage(64, 64, [10, 6, 8, 255]);
  noiseRect(img, 0, 0, 64, 64, [24, 8, 10, 255], 0.4, 77);
  strokeRect(img, 0, 0, 64, 64, [190, 20, 30, 255]);
  drawText(img, "FORS", 8, 14, [230, 30, 40, 255], 2);
  drawText(img, dir === BP ? "BP" : "RP", 20, 40, [200, 200, 200, 255], 2);
  set.add("pack_icon.png");
  writeBuffer(path.join(dir, "pack_icon.png"), encodePng(img));
}

// Remove stale generated files from previous runs (only in generated folders).
const GEN_DIRS_BP = ["items/", "blocks/", "entities/"];
const GEN_DIRS_RP = ["entity/", "models/", "animations/", "render_controllers/", "fogs/", "textures/", "texts/"];
pruneDir(BP, generatedBP, (r) => GEN_DIRS_BP.some((d) => r.startsWith(d)));
pruneDir(RP, generatedRP, (r) => GEN_DIRS_RP.some((d) => r.startsWith(d)));

console.log(`[gen-content] ${characters.length} characters, ${Object.keys(itemTextures).length} items, ${SKIN_COUNT} skins, ${PROPS.length} props, ${lang.size} lang keys`);
