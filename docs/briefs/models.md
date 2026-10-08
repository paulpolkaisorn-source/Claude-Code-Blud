GOAL: 4 original procedural chunky low-poly brawlers with code animations + select-screen preview. API: ARCHITECTURE.md "models".
FILES: src/entities/models.js, src/entities/preview.js, tests/browser/models.html.
DESIGNS (distinct silhouettes, accent = BRAWLERS[id].color, saturated palette):
- rivet: wide armored brute, riveted shoulder pads, three-barrel boxy scattergun, stubby legs.
- pip: small slim scout, oversized goggles, long thin rifle with glowing scope.
- mortara: round demolitions engineer, goggles, backpack bomb rack, stubby launcher tube.
- lumen: lantern-headed support, floating halo, staff with glowing orb.
BUILD: ≤6 animated parts (body+head merged with mergeColored; armL; armR+weapon; legL; legR; extra), each toonMat(0xffffff,{vertexColors:true,unique:true}) + addOutline(≈0.035); castShadow on parts. Team ring under feet (flat ring, MeshBasic, no shadow). ≤12 draw calls per model.
ANIMS (code, easing): idle breathe/bob; run (leg swing, arm pump, lean; speed01 scales); attack recoil 0.25s; super windup+burst 0.45s; hit flinch 0.2s; death topple+sink 0.6s (holds); victory jump/cheer loop. One-shots return to idle/run.
setFlash → emissive white on own materials. setOpacity(<1) → transparent own materials, hide outlines. dispose frees geometries/materials.
PREVIEW: own WebGLRenderer(alpha), lights, pedestal, turntable, idle + attack every 3s, fits canvas size, rAF stops on dispose.
TESTS (browser): all 4 build; draw-call count ≤12 each; every anim updates 60 frames without NaN; preview renders; dispose works.
