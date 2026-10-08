# Brawl Arena 3D — Architecture (contract; Opus-owned)

Plain ES modules, Three.js 0.170.0 via importmap (`three`, `three/addons/`). No build step. All art/audio procedural.
Shared, read-only for workers: `src/contracts.js` (constants, stats, entity shapes, `bus`, `EV`), `src/render/toon.js`
(`toonMat`, `addOutline`, `addInstancedOutline`, `mergeColored`, `gradientMap`), this file.

## Loop & ownership
`main.js` boots modules; `game.js` runs the state machine, the fixed 60 Hz sim (`DT`), match rules, crystals,
movement, visibility, respawn, and render interpolation (`lerp(px,x,alpha)`). Modules never import each other
except `contracts.js` / `toon.js` / `three`. Cross-module talk = `bus.emit/on` with `EV` payloads in contracts.
Hot loop: zero allocations (pool + reuse objects; no closures/arrays/vectors per frame).
Per sim tick (game.js): input/ai write `b.input` → game moves brawlers (`arena.moveCircle`) unless
`dashTimer|stunTimer > 0` → game resolves fire edges via `combat.tryAttack/trySuper` → `combat.update(DT)` →
crystals/visibility/rules. Per render frame: interpolate, `view.setPose`, `fx.update`, `renderer.render`.
Visibility (game.js): `b.visibleTo[t]` false when `b.inBush` && `revealTimer<=0` && no enemy (team t) within
`RULES.revealRadius`. Never draw/target enemies with `visibleTo[myTeam] === false`. Allies in bush: opacity 0.5.

## Module APIs (exact names; factories return plain objects)
### render — `src/render/renderer.js` (+ camera.js, post.js, quality.js)
`createRenderer(canvas, { mobile }) -> R`: `R.renderer, R.scene, R.camera`;
`R.setArenaBounds(cols, rows)` fit sun shadow frustum (2048 map, PCFSoft) to the arena;
`R.follow(x, z, dt)` damped follow (camera tilt ~55°, looks toward -z, ~15.5 tiles wide landscape / ~12 portrait);
`R.snap(x, z)`; `R.shake(intensity, duration)` (also on `EV.SCREEN_SHAKE`);
`R.render(dt)` composer (RenderPass→UnrealBloomPass→OutputPass) or plain when bloom off;
`R.setQuality('high'|'low')` (low = no shadows, no bloom, pixelRatio 1); `R.autoQuality(on)` fps<45 for 3 s →
low + emit `EV.QUALITY_CHANGE`; pixelRatio cap 2 (1.5 mobile); `R.resize()` (auto on window resize);
`R.worldToScreen(x, y, z, out)` → `out.x,out.y` CSS px, `out.visible`; `R.screenToGround(sx, sy, out)` → `out.x,out.z`
on plane y=0; `R.stats()` → `{ fps, drawCalls, triangles, quality }` (drawCalls summed over all passes of a frame).

### world — `src/world/maps.js`, `generator.js`, `arena.js`, `crystals.js`
`MAPS` `{ id: { id, name, rows: string[33] } }`, `MAP_IDS` `['canyon','lagoons','random']`; `parseMap(rows)` →
`{ cols, rows, tiles: Uint8Array, spawns: [[{x,z}×3],[{x,z}×3]], mine: {x,z} }`; `generateMap(seed)` → `string[33]`
(180° point-symmetric, spawns+mine reachable). `createArena(scene, parsed) -> A`:
`A.cols, A.rows, A.tiles, A.spawns, A.mine, A.navVersion` (++ on wall loss); `A.tile(c,r)` (OOB→WALL);
`A.blocksMove(c,r)`, `A.blocksShot(c,r)`, `A.isBushAt(x,z)`; `A.moveCircle(x, z, radius, dx, dz, out)` →
`out.x,out.z,out.hit` (slides, no tunneling); `A.raycast(x0,z0,x1,z1)` → 0..1 fraction to first shot-blocking tile
(1 = clear); `A.hasLOS(x0,z0,x1,z1)`; `A.destroyWalls(x, z, radius)` → count (emits `EV.WALL_DESTROYED`);
`A.update(dt, time, focusX, focusZ)` sway, water, bushes near focus part/squash; `A.dispose()`.
`createCrystalView(scene, max=40) -> { sync(crystals, time), dispose() }` instanced glowing crystals.
Budget ≤ 14 draw calls for the whole world (instancing).

### models — `src/entities/models.js`, `preview.js`
`createBrawlerModel(brawlerId, { team, isPlayer }) -> V`: `V.root` (origin at feet, faces +Z), `V.setPose(x, z, facing)`,
`V.play(anim)` `'idle'|'run'|'attack'|'super'|'hit'|'death'|'victory'` (attack/super/hit one-shot back to
idle/run; death holds), `V.update(dt, speed01)`, `V.setOpacity(a)`, `V.setFlash(f 0..1)`, `V.dispose()`.
Team ring under feet (player=PLAYER_COLOR else TEAM_COLORS[team]). ≤ 12 draw calls per model incl. outlines.
`createPreview(canvas, brawlerId) -> { setBrawler(id), resize(), dispose() }` own small WebGLRenderer, turntable.

### combat — `src/combat/combat.js` (+ projectiles.js, supers.js)
`createCombat({ scene, arena, bus }) -> C`: `C.projectiles` (pool, contract shape); `C.tryAttack(b, dirX, dirZ,
aimLen)` / `C.trySuper(b, dirX, dirZ, aimLen)` → bool (ammo/cooldown/charge checks, spawn, `EV.SHOT`/`EV.SUPER_USED`,
set `b.revealTimer`); `C.autoAim(b, brawlers)` → nearest valid enemy or null; `C.update(dt, brawlers)` projectiles,
hits, damage/heal, ammo reload, super charge, regen, dash/knockback (moves via arena.moveCircle), totems, deaths
(`alive=false`, `EV.DEATH`); `C.damage(target, amount, source, isSuper)`; `C.render(alpha)`; `C.reset()`.

### ai — `src/ai/astar.js`, `bots.js`
`findPath(arena, c0, r0, c1, r1, out)` → length, `out` filled with tile indices (`r*cols+c`), cached per navVersion.
`createAI({ arena, combat }) -> AI`: `AI.addBot(b, difficulty)`, `AI.update(dt, ctx)` with
`ctx = { brawlers, crystals, mine, teamCrystals:[n0,n1], countdownTeam:-1|0|1, time }` → writes each bot's `b.input`;
`AI.reset()`.

### input — `src/input/input.js`, `touch.js`
`createInput({ canvas, root, bus, mobile, screenToGround }) -> I`: `I.update(player)` once per frame writes
`player.input` (move, aim, edges OR-ed in); `I.setEnabled(bool)`, `I.setTouchVisible(bool)`, `I.setSuperReady(bool)`,
`I.dispose()`. Esc/P → `EV.UI_PAUSE`.

### ui — `src/ui/ui.js`, `hud.js`, `screens.js`, `styles/ui.css`
`createUI(root, bus) -> U`: `U.show(name)` `'menu'|'select'|'matchmaking'|'hud'|'pause'|'results'|'settings'`;
`U.previewCanvas`; `U.setSelected(id)`; `U.matchmaking(seconds, players)` → emits `EV.UI_MATCH_READY`;
`U.hud.update(h)`; `U.hud.labels(list, count)`; `U.hud.killFeed(killer, victim)`; `U.hud.toast(text, kind)`;
`U.showResults(r)`; `U.setSettings(s)`. Emits `EV.UI_*`.

### fx — `src/fx/fx.js` (+ particles.js, numbers.js, aim.js)
`createFX({ scene, bus, worldToScreen, overlay }) -> F`: `F.update(dt, brawlers, projectiles)`;
`F.setAim(show, x, z, dirX, dirZ, length, shape, color)` shape `'line'|'cone'|'arc'|'circle'`; `F.setQuality(l)`;
`F.reset()`. Listens to combat/game events; emits `EV.SCREEN_SHAKE`, `EV.HITSTOP`. ≤ 6 draw calls.

### audio — `src/audio/audio.js` (+ synth.js, music.js)
`createAudio(bus) -> A`: `A.unlock()`, `A.setVolumes({ master, sfx, music })`, `A.music('menu'|'battle'|null)`,
`A.play(name)`; auto-plays SFX from bus events.

## Testing
Unit (Node, no DOM): `node --test tests/unit/` — `three` resolves from node_modules. Browser (DOM/WebGL):
`node tests/browser-test.mjs tests/browser/<x>.html [--mobile]` (see `_template.html`, `harness.js`).
QA: `npm run qa`. Debug handle: `window.__BRAWL__` (main.js).

## Performance budget
≤ 150 draw calls/frame, 60 Hz fixed step + interpolation, pooled projectiles/particles, pixelRatio ≤ 2 (1.5 mobile),
auto quality drop. Lights: 1 hemisphere + 1 directional (shadows). Shadows only on brawlers + walls.
