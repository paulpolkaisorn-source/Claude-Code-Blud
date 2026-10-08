GOAL: pooled VFX, damage numbers, aim indicator, shake/hit-stop hooks. API: ARCHITECTURE.md "fx".
FILES: src/fx/fx.js, src/fx/particles.js, src/fx/numbers.js, src/fx/aim.js, tests/browser/fx.html.
PARTICLES: additive THREE.Points pool (2000 high / 700 low), ShaderMaterial (per-particle size/color/alpha, soft sprite, depthWrite false) → blooms; second normal-blended pool (dust/smoke/debris). Ring pool (8) for explosions/heal pulses. Preallocated typed arrays, swap-remove, zero allocation. ≤6 draw calls total.
BUS REACTIONS: SHOT muzzle flash (BRAWLERS[b.brawlerId].color); HIT sparks + damage number (bigger if isSuper); HEAL green sparkles + green number; DEATH smoke poof + team-color confetti; EXPLOSION fireball + ring; WALL_DESTROYED debris chunks; CRYSTAL_PICKUP purple sparkle; SUPER_USED burst; DASH dust; TOTEM ring; RESPAWN sparkle column.
Emit EV.SCREEN_SHAKE{intensity,duration} (explosions, deaths, super hits; stronger if near/involving the player) and EV.HITSTOP{ms:40–60} for super hits and kills by/of the player.
update(dt,brawlers,projectiles): dust puffs under moving brawlers, glowing trails behind active projectiles (their color).
NUMBERS: pooled DOM spans in overlay (own injected style), pop+float+fade 0.8s, bold outlined, positioned via worldToScreen.
AIM: setAim → ground decals (MeshBasic transparent, depthWrite false, y≈0.03): line (length×0.5), cone (sector ±0.3 rad), arc (dotted path + target circle), circle. α≈0.35, tinted by color.
TESTS (browser): each event spawns particles; caps hold; DOM number count fixed; aim shapes toggle; 600 updates no pool growth; setQuality changes cap.
