GOAL: automated QA suite + QA.md report. Never edit game code; report defects.
FILES: tests/qa/run-qa.mjs (+ helpers in tests/qa/), QA.md.
SETUP: openBrowser() from tests/browser-env.mjs (headless Chromium, SwiftShader WebGL, three.js CDN served locally). Debug handle window.__BRAWL__: state, game.match (brawlers, player, arena, combat, teamCrystals), quickStart({mode,brawlerId,mapId}), fastForward(s), skipEnding(), stats(), pause(), resume(). UI: buttons [data-act] = play-crystal, play-training, select[data-brawler], map[data-map], start, hud-pause, resume, quit, again, results-menu, open-settings, settings-back, quality[data-q]; screens [data-screen].active.
CHECKS, desktop 1280×720 and mobile 390×844 (index.html?mobile, touch):
1. Boot: zero console errors/pageerrors/failed requests; state 'menu'.
2. Real clicks: menu → mode → each brawler → map → start → matchmaking → 'playing'.
3. Gameplay: keys move player; click fires (ammo drops); super (set superCharge=1, press E) works for all 4 (dash moves, rail, cluster raises arena.navVersion, totem); bush hides enemy (visibleTo).
4. Bots: fastForward(30) → bots moved, crystals collected.
5. Full match → 'ending' → skipEnding → results visible; Play Again and Menu work; Training too.
6. Pause/resume via Esc and button.
7. Mobile: no overflow; joysticks inside viewport; left-stick drag moves; right-stick tap fires.
8. Perf: 10 s live play per quality: avg/min FPS, avg/max draw calls; note SwiftShader.
REPORT: QA.md (pass/fail table, perf, errors); exit 1 on failure; `npm run qa`.
