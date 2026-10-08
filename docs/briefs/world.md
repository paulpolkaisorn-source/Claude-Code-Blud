GOAL: maps, generator, arena visuals, collision, destructible walls, crystal view. API: ARCHITECTURE.md "world".
FILES: src/world/maps.js, src/world/generator.js, src/world/arena.js, src/world/crystals.js, tests/unit/world.test.mjs.
MAPS: two handcrafted 21×33 ASCII maps (MAP_CHARS legend): 'canyon' (walls+bush lanes) and 'lagoons' (water pools, bridges). 180° point-symmetric (tile(c,r)≡tile(20-c,32-r), B↔R). 3 'B' rows 29-31, 3 'R' rows 1-3, single 'M' at (10,16). Rich cover, all walkable tiles connected. generateMap(seed): deterministic PRNG, same guarantees (flood-fill check + retry). 'random' id → generator.
VISUALS (toon.js helpers, ≤14 draw calls): ground with procedural canvas texture (tile checker, grass/sand tints), border cliffs; walls = InstancedMesh boxes h≈1.1 + addInstancedOutline, castShadow; bushes = InstancedMesh chunky tufts (mergeColored), sway in vertex shader (onBeforeCompile time uniform); bushes within 1.2 tiles of focus squash to ~40% smoothly; water animated (shader/emissive ripple); team-tinted spawn pads; glowing center mine.
COLLISION: moveCircle axis-separated, substeps ≤0.2, circle vs blocking tiles, slides. raycast = grid DDA.
destroyWalls: instance scale 0, tile→FLOOR, navVersion++, emit EV.WALL_DESTROYED.
crystals.js: InstancedMesh octahedra, CRYSTAL_COLOR emissive (bloom), spin+bob, inactive hidden.
TESTS (node --test): maps parse (dims, 3 spawns/team, mine), symmetry, connectivity, generator 20 seeds valid, moveCircle stops/slides at wall and water, raycast blocked by wall not water, destroyWalls effects, scene mesh count ≤14.
