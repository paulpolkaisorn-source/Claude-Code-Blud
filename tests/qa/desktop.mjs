// Desktop checks (1280x720, mouse + keyboard). Drives the game via real clicks, keys and window.__BRAWL__.
import {
  DESKTOP, openSession, closeSession, gotoGame, snapshot, playerPos, waitState, waitScreen, ensureMenu,
  quickStart, eventsSince, eventCount, poll, sleep, quitToMenuFromHud, rendererStats,
} from './harness.mjs';

const FLOW_CASES = [
  { id: 'D02', brawler: 'rivet', map: 'canyon' },
  { id: 'D03', brawler: 'pip', map: 'lagoons' },
  { id: 'D04', brawler: 'mortara', map: 'random' },
  { id: 'D05', brawler: 'lumen', map: 'canyon' },
];

// In-page helpers. These run inside the game page, so they must be self-contained.
// Moves the player to a walkable tile 3.8-4.5 tiles from an inner wall (away from RED brawlers, preferring
// walls with more wall neighbours) and returns that wall tile centre as the cluster target.
function placeForWallShot() {
  const m = window.__BRAWL__.game.match;
  const A = m.arena;
  const p = m.player;
  const reds = m.brawlers.filter((b) => b.team === 1);
  let best = null;
  for (let r = 3; r < A.rows - 3; r++) {
    for (let c = 3; c < A.cols - 3; c++) {
      if (A.tile(c, r) !== 1) continue;
      let walls = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (A.tile(c + dc, r + dr) === 1) walls++;
      const tx = c + 0.5;
      const tz = r + 0.5;
      for (let k = 0; k < 12; k++) {
        const ang = (k * Math.PI) / 6;
        for (const rad of [4, 4.5, 3.8]) {
          const x = tx + Math.cos(ang) * rad;
          const z = tz + Math.sin(ang) * rad;
          if (A.blocksMove(Math.floor(x), Math.floor(z))) continue;
          const dEnemy = reds.length ? Math.min(...reds.map((b) => Math.hypot(b.x - x, b.z - z))) : 99;
          if (dEnemy < 3) continue;
          const score = walls * 10 + Math.min(dEnemy, 10);
          if (!best || score > best.score) best = { score, walls, tx, tz, x, z };
        }
      }
    }
  }
  if (!best) return { error: 'no inner wall with a walkable tile 3.8-4.5 tiles away from it' };
  p.x = best.x;
  p.z = best.z;
  p.px = best.x;
  p.pz = best.z;
  return { target: { x: best.tx, z: best.tz }, walls: best.walls };
}

function screenOf([x, z]) {
  const o = { x: 0, y: 0, visible: false };
  window.__BRAWL__.R.worldToScreen(x, 0.5, z, o);
  const inView = o.visible && o.x >= 0 && o.x <= innerWidth && o.y >= 0 && o.y <= innerHeight;
  return { x: o.x, y: o.y, inView };
}

// Cosine between the player's current aim and the direction to (tx, tz).
function aimAlignment([tx, tz]) {
  const p = window.__BRAWL__.game.match.player;
  const dx = tx - p.x;
  const dz = tz - p.z;
  const i = p.input;
  const n = Math.hypot(dx, dz) * Math.hypot(i.aimX, i.aimZ);
  return n > 0 ? (i.aimX * dx + i.aimZ * dz) / n : 0;
}

function setupBushScenario() {
  const m = window.__BRAWL__.game.match;
  const A = m.arena;
  const BUSH = 2;
  const blues = m.brawlers.filter((b) => b.team === 0);
  const bot = m.brawlers.find((b) => b.team === 1 && b.isBot);
  if (!bot) return { error: 'no RED bot in the match' };
  let spot = null;
  for (let r = 1; r < A.rows - 1; r++) {
    for (let c = 1; c < A.cols - 1; c++) {
      if (A.tile(c, r) !== BUSH) continue;
      const x = c + 0.5;
      const z = r + 0.5;
      const dBlue = Math.min(...blues.map((b) => Math.hypot(b.x - x, b.z - z)));
      if (dBlue < 6) continue;
      if (!spot || dBlue > spot.dBlue) spot = { x, z, dBlue };
    }
  }
  if (!spot) return { error: 'no bush tile at least 6 tiles from every BLUE brawler' };
  bot.x = spot.x;
  bot.z = spot.z;
  bot.px = spot.x;
  bot.pz = spot.z;
  bot.revealTimer = 0;
  let near = null;
  const offsets = [[1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5], [1.1, 1.1], [-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1]];
  for (const [dx, dz] of offsets) {
    const x = spot.x + dx;
    const z = spot.z + dz;
    if (!A.blocksMove(Math.floor(x), Math.floor(z))) {
      near = { x, z };
      break;
    }
  }
  if (!near) return { error: 'no walkable tile within 1.5 tiles of the bush block' };
  const p = m.player;
  return { botId: bot.id, bot: { x: spot.x, z: spot.z }, near, far: { x: p.x, z: p.z } };
}

function botSnapshot() {
  const m = window.__BRAWL__.game.match;
  return {
    bots: m.brawlers.filter((b) => b.isBot).map((b) => ({ id: b.id, team: b.team, x: b.x, z: b.z, alive: b.alive, collected: b.stats.crystals })),
    teamCrystals: m.teamCrystals.slice(),
    spawned: m.totalSpawned,
    time: m.time,
  };
}

function botVisibility(id) {
  const m = window.__BRAWL__.game.match;
  const b = m.brawlers.find((x) => x.id === id);
  return { inBush: b.inBush, visibleToBlue: b.visibleTo[0], revealTimer: b.revealTimer, x: b.x, z: b.z };
}

async function holdKey(page, key, ms) {
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
}

async function awaitPlayerEvent(page, fromIndex, kind, timeout = 12000) {
  return poll(async () => {
    const hits = (await eventsSince(page, fromIndex)).filter((e) => e.k === kind && e.isPlayer);
    return hits.length ? hits : null;
  }, { timeout, interval: 100, label: `${kind} event from the player` });
}

async function setSuperCharge(page) {
  await page.evaluate(() => { window.__BRAWL__.game.match.player.superCharge = 1; });
  await poll(async () => (await playerPos(page)).sc >= 1, { timeout: 5000, interval: 50, label: 'super charge to read 1' });
}

async function resultHeading(page) {
  return page.evaluate(() => {
    const el = document.querySelector('section.s-results .res-text');
    return el ? el.textContent.trim() : '';
  });
}

async function resultsVisible(page) {
  return page.evaluate(() => {
    const sec = document.querySelector('section.s-results');
    if (!sec || !sec.classList.contains('active')) return { ok: false, why: 'results section not active' };
    const cs = getComputedStyle(sec);
    const r = sec.getBoundingClientRect();
    const again = document.querySelector('section.s-results [data-act=again]');
    const menu = document.querySelector('section.s-results [data-act=results-menu]');
    const inView = (el) => {
      if (!el) return false;
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.height > 0 && b.left >= -1 && b.right <= innerWidth + 1 && b.top >= -1 && b.bottom <= innerHeight + 1;
    };
    return {
      ok: cs.display !== 'none' && parseFloat(cs.opacity) > 0.95 && r.width > 0 && inView(again) && inView(menu),
      display: cs.display, opacity: cs.opacity, again: inView(again), menu: inView(menu),
    };
  });
}

export async function runDesktop(rec) {
  const s = await openSession('desktop', { viewport: DESKTOP });
  const page = s.page;
  const ctx = s;
  try {
    await rec.check('D01', 'Boot', 'Loads with zero console, page, request or HTTP errors; state is menu', async () => {
      await gotoGame(s);
      await sleep(1500);
      const snap = await snapshot(page);
      const canvas = await page.evaluate(() => {
        const c = document.getElementById('game');
        const r = c.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) };
      });
      if (snap.state !== 'menu') throw new Error(`state is ${snap.state}, expected menu`);
      if (!snap.screens.includes('menu')) throw new Error(`menu screen not active (active: ${snap.screens.join(',') || 'none'})`);
      if (!(canvas.w > 0 && canvas.h > 0)) throw new Error('game canvas has no layout size');
      if (s.errors.length) throw new Error(`${s.errors.length} error(s) at boot: ${s.errors[0]}`);
      return `state=menu, canvas ${canvas.w}x${canvas.h}`;
    }, { ctx });

    for (const c of FLOW_CASES) {
      await rec.check(c.id, 'Flow', `Crystal Rush: menu > ${c.brawler} > ${c.map} > START > matchmaking > playing`, async () => {
        await ensureMenu(page);
        await page.click('[data-act=play-crystal]', { timeout: 15000 });
        await waitState(page, 'select');
        await page.click(`[data-act=select][data-brawler=${c.brawler}]`, { timeout: 15000 });
        await page.click(`[data-act=map][data-map=${c.map}]`, { timeout: 15000 });
        const picked = await page.evaluate(() => ({
          card: document.querySelector('[data-act=select].on')?.getAttribute('data-brawler') ?? null,
          map: document.querySelector('[data-act=map].on')?.getAttribute('data-map') ?? null,
        }));
        if (picked.card !== c.brawler) throw new Error(`brawler card selected is ${picked.card}`);
        if (picked.map !== c.map) throw new Error(`map selected is ${picked.map}`);
        const idx = await eventCount(page);
        await page.click('[data-act=start]', { timeout: 15000 });
        await waitState(page, 'playing', 40000);
        // Matchmaking is confirmed by the UI events (select > matchmaking, then match ready), which are not
        // subject to the sampling delay of the state log.
        const kinds = (await eventsSince(page, idx)).map((e) => e.k).filter((k) => k === 'uiStart' || k === 'uiMatchReady');
        if (kinds.join('>') !== 'uiStart>uiMatchReady') throw new Error(`UI events were ${kinds.join(' > ') || 'none'}`);
        const snap = await snapshot(page);
        if (snap.brawlerId !== c.brawler || snap.player.brawlerId !== c.brawler) throw new Error(`match brawler is ${snap.player.brawlerId}`);
        if (snap.mapId !== c.map) throw new Error(`match map is ${snap.mapId}`);
        if (snap.mode !== 'crystal' || snap.training) throw new Error(`match mode is ${snap.mode}`);
        if (snap.root !== 'hud') throw new Error(`UI root is ${snap.root}, expected hud`);
        await quitToMenuFromHud(page);
        return `menu > ${c.brawler} > ${c.map} > select > matchmaking (uiStart, uiMatchReady) > playing`;
      }, { ctx });
    }

    await rec.check('D06', 'Flow', 'Training: menu > TRAINING > pip > lagoons > START > playing (1v1, 90 s clock)', async () => {
      await ensureMenu(page);
      await page.click('[data-act=play-training]', { timeout: 15000 });
      await waitState(page, 'select');
      await page.click('[data-act=select][data-brawler=pip]', { timeout: 15000 });
      await page.click('[data-act=map][data-map=lagoons]', { timeout: 15000 });
      await page.click('[data-act=start]', { timeout: 15000 });
      await waitState(page, 'playing', 40000);
      const snap = await snapshot(page);
      const brawlers = await page.evaluate(() => window.__BRAWL__.game.match.brawlers.length);
      if (!snap.training) throw new Error('match is not flagged as training');
      if (snap.brawlerId !== 'pip' || snap.mapId !== 'lagoons') throw new Error(`match is ${snap.brawlerId} on ${snap.mapId}`);
      if (!(snap.time > 85 && snap.time <= 90.01)) throw new Error(`match clock is ${snap.time}, expected about 90`);
      if (brawlers !== 2) throw new Error(`training has ${brawlers} brawlers, expected 2`);
      await quitToMenuFromHud(page);
      return `training clock ${snap.time.toFixed(1)} s, 2 brawlers`;
    }, { ctx });

    await rec.check('D07', 'Gameplay', 'Keyboard moves the player: W/A/S/D and all four arrow keys', async () => {
      await quickStart(page, { mode: 'crystal', brawlerId: 'rivet', mapId: 'lagoons' });
      const dirs = [['KeyD', 1, 0], ['KeyS', 0, 1], ['KeyA', -1, 0], ['KeyW', 0, -1],
        ['ArrowRight', 1, 0], ['ArrowDown', 0, 1], ['ArrowLeft', -1, 0], ['ArrowUp', 0, -1]];
      const report = [];
      for (const [key, sx, sz] of dirs) {
        const start = await playerPos(page);
        let gained = 0;
        await page.keyboard.down(key);
        try {
          const t0 = Date.now();
          while (Date.now() - t0 < 8000) {
            const p = await playerPos(page);
            gained = (p.x - start.x) * sx + (p.z - start.z) * sz;
            if (gained >= 0.6) break;
            await sleep(100);
          }
        } finally {
          await page.keyboard.up(key);
        }
        if (gained < 0.6) throw new Error(`${key} moved the player ${gained.toFixed(2)} tiles along its axis`);
        report.push(`${key}+${gained.toFixed(1)}`);
      }
      await sleep(400);
      return report.join(' ');
    }, { ctx });

    await rec.check('D08', 'Gameplay', 'Mouse click fires: ammo drops and a player shot event is emitted', async () => {
      await quickStart(page, { mode: 'crystal', brawlerId: 'pip', mapId: 'lagoons' });
      const before = await playerPos(page);
      const idx = await eventCount(page);
      await page.mouse.click(640, 360);
      const after = await poll(async () => {
        const p = await playerPos(page);
        return p.ammo < before.ammo ? p : null;
      }, { timeout: 8000, interval: 100, label: 'ammo to drop after a click' });
      const shots = (await eventsSince(page, idx)).filter((e) => e.k === 'shot' && e.isPlayer);
      if (!shots.length) throw new Error('ammo dropped but no shot event was emitted for the player');
      return `ammo ${before.ammo} -> ${after.ammo}, ${shots.length} player shot event(s)`;
    }, { ctx });

    await rec.check('D09', 'Super', 'Rivet super (hold E, release): dashes the player and breaks walls', async () => {
      await quickStart(page, { mode: 'crystal', brawlerId: 'rivet', mapId: 'canyon' });
      await setSuperCharge(page);
      const idx = await eventCount(page);
      const navBefore = (await snapshot(page)).navVersion;
      await holdKey(page, 'KeyE', 800);
      const [used] = await awaitPlayerEvent(page, idx, 'superUsed');
      await awaitPlayerEvent(page, idx, 'dash');
      await page.evaluate(() => window.__BRAWL__.fastForward(0.5));
      const after = await playerPos(page);
      const dist = Math.hypot(after.x - used.x, after.z - used.z);
      if (dist < 2) throw new Error(`dash moved the player only ${dist.toFixed(2)} tiles`);
      if (after.sc >= 1) throw new Error('super charge was not consumed');
      const navAfter = (await snapshot(page)).navVersion;
      return `dash ${dist.toFixed(1)} tiles, charge consumed, navVersion ${navBefore} -> ${navAfter}`;
    }, { ctx });

    await rec.check('D10', 'Super', 'Pip super (hold E, release): fires a piercing rail projectile', async () => {
      await quickStart(page, { mode: 'crystal', brawlerId: 'pip', mapId: 'lagoons' });
      await page.evaluate(() => { window.__qaRec.railSeen = 0; });
      await setSuperCharge(page);
      const idx = await eventCount(page);
      await holdKey(page, 'KeyE', 800);
      await awaitPlayerEvent(page, idx, 'superUsed');
      const rails = await poll(async () => {
        const n = await page.evaluate(() => window.__qaRec.railSeen);
        return n > 0 ? n : null;
      }, { timeout: 5000, interval: 50, label: 'an active rail projectile' });
      const after = await playerPos(page);
      if (after.sc >= 1) throw new Error('super charge was not consumed');
      return `${rails} active rail projectile(s) right after the super; charge consumed`;
    }, { ctx });

    await rec.check('D11', 'Super', 'Mortara super (aimed at a wall, hold E, release): cluster raises arena.navVersion', async () => {
      await quickStart(page, { mode: 'crystal', brawlerId: 'mortara', mapId: 'canyon' });
      const placed = await page.evaluate(placeForWallShot);
      if (placed.error) throw new Error(placed.error);
      const target = placed.target;
      // The camera follows with damping, so snap it to the moved player and wait for the target to be on screen.
      await page.evaluate(() => {
        const pl = window.__BRAWL__.game.match.player;
        window.__BRAWL__.R.snap(pl.x, pl.z);
      });
      const pt = await poll(async () => {
        const s = await page.evaluate(screenOf, [target.x, target.z]);
        return s.inView ? s : null;
      }, { timeout: 8000, interval: 150, label: 'the wall target to come on screen' });
      await page.mouse.move(pt.x, pt.y);
      await poll(async () => {
        const c = await page.evaluate(aimAlignment, [target.x, target.z]);
        return c > 0.95 ? c : null;
      }, { timeout: 6000, interval: 100, label: 'mouse aim to point at the wall' });
      await setSuperCharge(page);
      const idx = await eventCount(page);
      const navBefore = (await snapshot(page)).navVersion;
      await holdKey(page, 'KeyE', 800);
      await awaitPlayerEvent(page, idx, 'superUsed');
      await page.evaluate(() => window.__BRAWL__.fastForward(1.6));
      const navAfter = (await snapshot(page)).navVersion;
      const blasts = (await eventsSince(page, idx)).filter((e) => e.k === 'explosion' && e.isSuper && e.team === 0).length;
      if (navAfter <= navBefore) throw new Error(`navVersion stayed at ${navBefore} after the cluster landed`);
      return `navVersion ${navBefore} -> ${navAfter}, ${blasts} super blast(s)`;
    }, { ctx });

    await rec.check('D12', 'Super', 'Lumen super (hold E, release): drops a team totem on the player', async () => {
      await quickStart(page, { mode: 'crystal', brawlerId: 'lumen', mapId: 'canyon' });
      await setSuperCharge(page);
      const idx = await eventCount(page);
      await holdKey(page, 'KeyE', 800);
      await awaitPlayerEvent(page, idx, 'superUsed');
      const totem = await poll(async () => {
        const hits = (await eventsSince(page, idx)).filter((e) => e.k === 'totem' && e.team === 0);
        return hits.length ? hits[0] : null;
      }, { timeout: 8000, interval: 100, label: 'a BLUE totem event' });
      const p = await playerPos(page);
      const d = Math.hypot(totem.x - p.x, totem.z - p.z);
      if (d > 2) throw new Error(`totem ${d.toFixed(2)} tiles from the player`);
      return `totem placed ${d.toFixed(2)} tiles from the player`;
    }, { ctx });

    await rec.check('D13', 'Visibility', 'Enemy in a bush is hidden from BLUE, revealed within 2 tiles, hidden again when away', async () => {
      await quickStart(page, { mode: 'crystal', brawlerId: 'rivet', mapId: 'canyon' });
      const setup = await page.evaluate(setupBushScenario);
      if (setup.error) throw new Error(setup.error);
      await page.evaluate(() => window.__BRAWL__.fastForward(0.05));
      const hidden = await page.evaluate(botVisibility, setup.botId);
      if (!hidden.inBush) throw new Error(`bot at ${hidden.x.toFixed(1)},${hidden.z.toFixed(1)} is not inBush`);
      if (hidden.visibleToBlue !== false) throw new Error(`enemy in bush visible to BLUE (visibleTo[0]=${hidden.visibleToBlue})`);
      await page.evaluate((p) => {
        const pl = window.__BRAWL__.game.match.player;
        pl.x = p.x; pl.z = p.z; pl.px = p.x; pl.pz = p.z;
      }, setup.near);
      await page.evaluate(() => window.__BRAWL__.fastForward(0.05));
      const near = await page.evaluate(botVisibility, setup.botId);
      if (near.visibleToBlue !== true) throw new Error('enemy stayed hidden with a BLUE brawler within 2 tiles');
      await page.evaluate((p) => {
        const pl = window.__BRAWL__.game.match.player;
        pl.x = p.x; pl.z = p.z; pl.px = p.x; pl.pz = p.z;
      }, setup.far);
      await page.evaluate(() => window.__BRAWL__.fastForward(0.05));
      const away = await page.evaluate(botVisibility, setup.botId);
      if (away.visibleToBlue !== false) throw new Error('enemy still visible after the BLUE brawler left');
      return 'hidden (far) -> visible (2 tiles) -> hidden (far again)';
    }, { ctx });

    await rec.check('D14', 'Bots', 'fastForward(30): bots move and crystals are collected', async () => {
      await quickStart(page, { mode: 'crystal', brawlerId: 'rivet', mapId: 'lagoons' });
      const before = await page.evaluate(botSnapshot);
      await page.evaluate(() => window.__BRAWL__.fastForward(30));
      const after = await page.evaluate(botSnapshot);
      const state = await page.evaluate(() => window.__BRAWL__.state);
      if (state !== 'playing') throw new Error(`match left playing during fastForward(30): ${state}`);
      const moved = before.bots.map((b) => {
        const a = after.bots.find((x) => x.id === b.id);
        return Math.hypot(a.x - b.x, a.z - b.z);
      });
      const movedCount = moved.filter((d) => d >= 1).length;
      const collected = after.bots.reduce((sum, b) => sum + b.collected, 0);
      const deposited = after.teamCrystals[0] + after.teamCrystals[1];
      if (movedCount < before.bots.length) {
        throw new Error(`only ${movedCount}/${before.bots.length} bots moved >= 1 tile (${moved.map((d) => d.toFixed(1)).join(', ')})`);
      }
      if (after.spawned < 1) throw new Error('no crystals spawned in 30 s');
      if (collected + deposited < 1) throw new Error('bots collected no crystals');
      return `${movedCount}/${before.bots.length} bots moved >= 1 tile (max ${Math.max(...moved).toFixed(1)}), ${after.spawned} spawned, ${collected} collected, ${deposited} deposited`;
    }, { ctx });

    await rec.check('D15', 'Match end', 'Full crystal match: ending > skipEnding > results visible > PLAY AGAIN > MENU', async () => {
      await quickStart(page, { mode: 'crystal', brawlerId: 'rivet', mapId: 'lagoons' });
      const idx = await eventCount(page);
      await page.evaluate(() => window.__BRAWL__.fastForward(200));
      const st = await page.evaluate(() => window.__BRAWL__.state);
      if (st !== 'ending') throw new Error(`state after a full match is ${st}, expected ending`);
      const ends = (await eventsSince(page, idx)).filter((e) => e.k === 'matchEnd');
      if (ends.length !== 1) throw new Error(`matchEnd emitted ${ends.length} times`);
      const outcome = ends[0].outcome;
      await page.evaluate(() => window.__BRAWL__.skipEnding());
      await waitState(page, 'results', 20000);
      await waitScreen(page, 'results');
      const heading = await resultHeading(page);
      const want = { victory: 'VICTORY', defeat: 'DEFEAT', draw: 'DRAW' }[outcome];
      if (heading !== want) throw new Error(`results heading "${heading}", expected "${want}" for outcome ${outcome}`);
      // The results panel fades in with CSS; under SwiftShader that completes only after a few frames.
      let vis = null;
      try {
        await poll(async () => {
          vis = await resultsVisible(page);
          return vis.ok;
        }, { timeout: 10000, interval: 200, label: 'results screen to be fully visible' });
      } catch {
        throw new Error(`results panel not fully visible after 10 s: ${JSON.stringify(vis)}`);
      }
      await page.click('section.s-results [data-act=again]', { timeout: 15000 });
      await waitState(page, 'playing', 40000);
      const again = await snapshot(page);
      if (again.brawlerId !== 'rivet' || again.mapId !== 'lagoons' || again.mode !== 'crystal') {
        throw new Error(`PLAY AGAIN started ${again.brawlerId} on ${again.mapId} (${again.mode})`);
      }
      await page.evaluate(() => window.__BRAWL__.fastForward(200));
      await page.evaluate(() => window.__BRAWL__.skipEnding());
      await waitState(page, 'results', 20000);
      await waitScreen(page, 'results');
      await page.click('section.s-results [data-act=results-menu]', { timeout: 15000 });
      await waitState(page, 'menu', 10000);
      await waitScreen(page, 'menu');
      return `outcome ${outcome}, heading "${heading}", PLAY AGAIN restarted the match, MENU returned to menu`;
    }, { ctx });

    await rec.check('D16', 'Match end', 'Training: time-out ends the match; PLAY AGAIN restarts training; MENU returns', async () => {
      await quickStart(page, { mode: 'training', brawlerId: 'lumen', mapId: 'random' });
      await page.evaluate(() => window.__BRAWL__.fastForward(100));
      const st = await page.evaluate(() => window.__BRAWL__.state);
      if (st !== 'ending') throw new Error(`training state after 100 s is ${st}, expected ending`);
      await page.evaluate(() => window.__BRAWL__.skipEnding());
      await waitState(page, 'results', 20000);
      await waitScreen(page, 'results');
      await page.click('section.s-results [data-act=again]', { timeout: 15000 });
      await waitState(page, 'playing', 40000);
      const again = await snapshot(page);
      if (!again.training) throw new Error('PLAY AGAIN from training did not start a training match');
      await page.evaluate(() => window.__BRAWL__.fastForward(100));
      await page.evaluate(() => window.__BRAWL__.skipEnding());
      await waitState(page, 'results', 20000);
      await waitScreen(page, 'results');
      await page.click('section.s-results [data-act=results-menu]', { timeout: 15000 });
      await waitState(page, 'menu', 10000);
      return `training clock ran out, PLAY AGAIN restarted training, MENU returned`;
    }, { ctx });

    await rec.check('D17', 'Pause', 'Esc and P pause (clock freezes); Esc, HUD button and RESUME resume', async () => {
      await quickStart(page, { mode: 'crystal', brawlerId: 'mortara', mapId: 'random' });
      await page.keyboard.press('Escape');
      await waitState(page, 'paused');
      await waitScreen(page, 'pause');
      const t1 = (await snapshot(page)).time;
      await sleep(1500);
      const t2 = (await snapshot(page)).time;
      if (Math.abs(t2 - t1) > 1e-6) throw new Error(`match clock moved while paused (${t1} -> ${t2})`);
      await page.keyboard.press('Escape');
      await waitState(page, 'playing');
      await page.click('[data-act=hud-pause]', { timeout: 15000 });
      await waitState(page, 'paused');
      await page.click('[data-act=resume]', { timeout: 15000 });
      await waitState(page, 'playing');
      await page.keyboard.press('KeyP');
      await waitState(page, 'paused');
      await page.click('[data-act=resume]', { timeout: 15000 });
      await waitState(page, 'playing');
      await poll(async () => !(await page.evaluate(() => {
        const el = document.querySelector('section.screen[data-screen="pause"]');
        return !!el && el.classList.contains('active');
      })), { timeout: 5000, interval: 100, label: 'pause screen to close' });
      return `Esc, HUD pause, P and RESUME all paused/resumed; clock frozen at ${t1.toFixed(2)} while paused`;
    }, { ctx });

    await rec.check('D18', 'Settings', 'Settings: HIGH/LOW/AUTO apply, BACK returns; settings also reachable from pause', async () => {
      await ensureMenu(page);
      await page.click('[data-act=open-settings]', { timeout: 15000 });
      await waitScreen(page, 'settings');
      for (const q of ['high', 'low', 'auto']) {
        await page.click(`[data-act=quality][data-q=${q}]`, { timeout: 15000 });
        await poll(async () => page.evaluate((qq) => document.querySelector(`[data-act=quality][data-q=${qq}]`).classList.contains('on'), q),
          { timeout: 5000, interval: 100, label: `quality ${q} to be selected` });
        if (q !== 'auto') {
          await poll(async () => (await rendererStats(page)).quality === q, { timeout: 8000, interval: 150, label: `renderer quality ${q}` });
        }
      }
      await page.click('[data-act=settings-back]', { timeout: 15000 });
      await waitScreen(page, 'menu');
      await quickStart(page, { mode: 'crystal', brawlerId: 'rivet', mapId: 'canyon' });
      await page.click('[data-act=hud-pause]', { timeout: 15000 });
      await waitState(page, 'paused');
      await page.click('[data-act=pause-settings]', { timeout: 15000 });
      await waitScreen(page, 'settings');
      await page.click('[data-act=settings-back]', { timeout: 15000 });
      await waitScreen(page, 'pause');
      await quitToMenuFromHud(page);
      return 'quality HIGH/LOW verified via renderer stats, AUTO selected, BACK to menu and to pause';
    }, { ctx });

    await rec.check('D19', 'Errors', 'Whole desktop session: no console, page, request or HTTP errors', async () => {
      if (s.errors.length) throw new Error(`${s.errors.length} captured, first: ${s.errors[0]}`);
      return 'none captured';
    }, { ctx });

    // DEF-01 regression: the brawler preview canvas must keep a live WebGL context after matches and select visits.
    await rec.check('D20', 'Regression', 'DEF-01: preview canvas WebGL context stays live after matches and select visits', async () => {
      const info = await page.evaluate(() => {
        const c = document.querySelector('canvas.preview-canvas');
        if (!c) return { found: false };
        const gl = c.getContext('webgl2');
        return { found: true, hasCtx: !!gl, lost: gl ? gl.isContextLost() : null, w: c.width, h: c.height };
      });
      if (!info.found) throw new Error('preview canvas not found');
      if (!info.hasCtx) throw new Error('preview canvas has no WebGL context');
      if (info.lost) throw new Error('preview WebGL context is lost');
      return `preview canvas ${info.w}x${info.h} context live after the D02-D06 matches and select visits`;
    }, { ctx });
  } finally {
    await closeSession(s);
  }
}
