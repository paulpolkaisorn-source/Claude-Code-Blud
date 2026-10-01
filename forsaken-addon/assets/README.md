# Art overrides

The addon ships original placeholder art drawn by `tools/gen-content.mjs` (procedural: golden-angle hues per character, darker palettes with a red trim for killers, brighter ones for survivors, the character's initial on the chest; ability icons are coloured squares with the ability's initials). To use your own art, drop PNG files here and rebuild with `npm run build`.

## Skins: `assets/skin_overrides/<id>.png` (64×64, standard Minecraft skin layout)

`<id>` is a character id: `slasher`, `c00lkidd`, `john_doe`, `1x1x1x1`, `noli`, `guest_666`, `nosferatu`, `daemon`, `noob`, `007n7`, `veeronica`, `guest_1337`, `shedletsky`, `chance`, `two_time`, `jane_doe`, `elliot`, `builderman`, `dusekkar`, `taph`; minions: `minion_pizza_bot`, `minion_zombie`. `daemon_blink.png` is Daemon's second frame (his cursor blink).

## Icons: `assets/icon_overrides/<name>.png` (16×16)

`<name>` is the item's file name without the `forsaken:` prefix: `ab_<character id>_<ability id>` (for example `ab_slasher_raging_pace`, `ab_noob_bloxy_cola`; ability ids are in `data/killers.json` / `data/survivors.json`), plus `menu`, `item_medkit` and `item_cola`. The generated icons in `packs/Forsaken_RP/textures/items/forsaken/` show every name.

`npm run validate` rejects override files that are not PNG or have the wrong size.

Please only use art you have the rights to. Don't copy official FORSAKEN or Roblox character art.
