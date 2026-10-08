// Mobile checks (390x844, touch, index.html?mobile). Touch is sent as real CDP touch events.
import {
  MOBILE, openSession, closeSession, gotoGame, snapshot, playerPos, waitState, waitScreen, ensureMenu,
  quickStart, eventsSince, eventCount, poll, sleep,
} from './harness.mjs';

// In-page layout audit: document overflow plus every visible button on the current screen.
function layoutAudit() {
  const problems = [];
  const de = document.documentElement;
  if (de.scrollWidth > innerWidth + 1) problems.push(`page scrollWidth ${de.scrollWidth} > ${innerWidth}`);
  if (de.scrollHeight > innerHeight + 1) problems.push(`page scrollHeight ${de.scrollHeight} > ${innerHeight}`);
  const roots = Array.from(document.querySelectorAll('section.screen.active'));
  const ui = document.querySelector('.ui-root');
  if (ui && ui.getAttribute('data-screen') === 'hud') roots.push(ui);
  let checked = 0;
  const outside = (r) => r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1;
  for (const root of roots) {
    for (const el of root.querySelectorAll('button, .bi-pad, .bi-zone, .bi-ring')) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      checked++;
      if (outside(r)) {
        const label = (el.textContent || '').trim() || el.getAttribute('data-act') || el.className;
        problems.push(`${String(label).slice(0, 24)} outside viewport at ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
    }
  }
  return { problems, checked };
}

function touchRects() {
  const rect = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  };
  return {
    move: rect('.bi-zone.bi-move'),
    atk: rect('.bi-pad.bi-atk'),
    sup: rect('.bi-pad.bi-sup'),
    pause: rect('.hud-pause'),
    superDim: document.querySelector('.bi-pad.bi-sup') ? document.querySelector('.bi-pad.bi-sup').classList.contains('bi-dim') : null,
    ring: (() => {
      const el = document.querySelector('.bi-ring');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, on: el.classList.contains('bi-on'), w: r.width };
    })(),
  };
}

// Counts player shots inside the page, so the measurement does not depend on the recorder's event buffer.
async function installShotCounter(page) {
  await page.evaluate(() => {
    if (window.__qaShots !== undefined) return;
    window.__qaShots = 0;
    const B = window.__BRAWL__;
    B.bus.on(B.EV.SHOT, (e) => {
      if (e && e.b && e.b.isPlayer) window.__qaShots += 1;
    });
  });
}

// Informational touch measurement (not a pass/fail check). Presses under 300 ms (the game's tap window is 350 ms)
// with ammo available and at least 0.45 s of wall time between presses. Before each press the sim is advanced
// with fastForward so reload and attack gap are clear. A press counts as fired when a player shot follows within 4 s.
async function measureTaps(page, send) {
  await installShotCounter(page);
  const pad = await page.evaluate(() => {
    const r = document.querySelector('.bi-pad.bi-atk').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  const conditions = [
    { method: 'raw CDP', ms: 0 },
    { method: 'raw CDP', ms: 100 },
    { method: 'raw CDP', ms: 200 },
    { method: 'raw CDP', ms: 250 },
    { method: 'Playwright tap', ms: null },
  ];
  // Conditions are interleaved round by round, so no condition always follows the same predecessor.
  const TRIALS = 6;
  const rows = conditions.map((c) => ({ method: c.method, ms: c.ms, trials: 0, noAmmo: 0, fired: 0, delays: [] }));
  for (let round = 0; round < TRIALS; round++) {
    for (let i = 0; i < conditions.length; i++) {
      const cond = conditions[i];
      const row = rows[i];
      await page.evaluate(() => {
        const pl = window.__BRAWL__.game.match.player;
        pl.hp = pl.maxHp; // keep the test brawler alive across trials
        pl.alive = true;
        window.__BRAWL__.fastForward(1.6); // full ammo and a clear attack gap, in sim time
      });
      await sleep(450);
      const pre = await playerPos(page);
      if (pre.ammo < 1) {
        row.noAmmo += 1;
        continue;
      }
      row.trials += 1;
      const before = await page.evaluate(() => window.__qaShots);
      const t0 = Date.now();
      if (cond.ms === null) {
        await page.locator('.bi-pad.bi-atk').tap({ timeout: 15000 });
      } else {
        await send('touchStart', [{ x: pad.x, y: pad.y }]);
        if (cond.ms > 0) await sleep(cond.ms);
        await send('touchEnd', []);
      }
      let delay = null;
      const until = Date.now() + 4000;
      while (Date.now() < until) {
        if ((await page.evaluate(() => window.__qaShots)) > before) {
          delay = Date.now() - t0;
          break;
        }
        await sleep(100);
      }
      if (delay !== null) {
        row.fired += 1;
        row.delays.push(delay);
      }
    }
  }
  return rows;
}

export async function runMobile(rec, report = {}) {
  const s = await openSession('mobile', { viewport: MOBILE, mobile: true, query: '?mobile' });
  const page = s.page;
  const ctx = s;
  const cdp = await s.b.context.newCDPSession(page);
  // Multi-step drags use raw CDP touch events (left stick). Taps use Playwright's touch tap; raw touchStart/
  // touchEnd pairs are measured separately (see measureTaps and the Touch input measurement section of QA.md).
  const send = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
  const tapCentre = async (sel) => {
    await page.locator(sel).first().tap({ timeout: 15000 });
  };
  const fits = async (label) => {
    const a = await page.evaluate(layoutAudit);
    if (a.problems.length) throw new Error(`${label}: ${a.problems.slice(0, 3).join('; ')}`);
    return a.checked;
  };

  try {
    await rec.check('M01', 'Boot', 'Mobile boot: zero errors, menu state, menu fits 390x844 with no overflow', async () => {
      await gotoGame(s);
      await sleep(1200);
      const st = await snapshot(page);
      if (st.state !== 'menu') throw new Error(`state is ${st.state}, expected menu`);
      const checked = await fits('menu');
      if (s.errors.length) throw new Error(`${s.errors.length} error(s) at boot: ${s.errors[0]}`);
      return `menu fits; ${checked} controls checked`;
    }, { ctx });

    await rec.check('M02', 'Flow', 'Touch flow: menu > play > brawler > map > START > matchmaking > playing, screens fit', async () => {
      await ensureMenu(page);
      await tapCentre('[data-act=play-crystal]');
      await waitScreen(page, 'select');
      await fits('select');
      await tapCentre('[data-act=select][data-brawler=lumen]');
      await tapCentre('[data-act=map][data-map=lagoons]');
      const picked = await page.evaluate(() => ({
        card: document.querySelector('[data-act=select].on')?.getAttribute('data-brawler') ?? null,
        map: document.querySelector('[data-act=map].on')?.getAttribute('data-map') ?? null,
      }));
      if (picked.card !== 'lumen' || picked.map !== 'lagoons') throw new Error(`picked ${picked.card} / ${picked.map}`);
      const idx = await eventCount(page);
      await tapCentre('[data-act=start]');
      await waitScreen(page, 'matchmaking', 10000);
      await fits('matchmaking');
      await waitState(page, 'playing', 40000);
      const kinds = (await eventsSince(page, idx)).map((e) => e.k).filter((k) => k === 'uiStart' || k === 'uiMatchReady');
      if (kinds.join('>') !== 'uiStart>uiMatchReady') throw new Error(`UI events were ${kinds.join(' > ') || 'none'}`);
      const snap = await snapshot(page);
      if (snap.player.brawlerId !== 'lumen' || snap.mapId !== 'lagoons') throw new Error(`match is ${snap.player.brawlerId} on ${snap.mapId}`);
      return 'select > matchmaking (uiStart, uiMatchReady) > playing; match is lumen on lagoons';
    }, { ctx });

    await rec.check('M03', 'Layout', 'Touch controls (move zone, attack and super pads, pause) sit inside the viewport and do not overlap', async () => {
      await poll(async () => (await snapshot(page)).state === 'playing', { timeout: 5000, interval: 100, label: 'playing' });
      const r = await page.evaluate(touchRects);
      const need = { 'left stick zone': r.move, 'attack pad': r.atk, 'super pad': r.sup, 'pause button': r.pause };
      for (const [name, box] of Object.entries(need)) {
        if (!box) throw new Error(`${name} not rendered`);
        if (box.x < -1 || box.y < -1 || box.x + box.w > MOBILE.width + 1 || box.y + box.h > MOBILE.height + 1) {
          throw new Error(`${name} outside viewport at ${Math.round(box.x)},${Math.round(box.y)} ${Math.round(box.w)}x${Math.round(box.h)}`);
        }
      }
      const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      if (overlap(r.atk, r.sup)) throw new Error('attack pad overlaps super pad');
      await fits('playing HUD');
      return `left zone ${Math.round(r.move.w)}x${Math.round(r.move.h)}, attack ${Math.round(r.atk.w)}px, super ${Math.round(r.sup.w)}px, all inside 390x844`;
    }, { ctx });

    await rec.check('M04', 'Touch', 'Left-stick drag moves the player; joystick ring anchors at the touch point', async () => {
      const start = await playerPos(page);
      const x0 = 80;
      const y0 = 600;
      await send('touchStart', [{ x: x0, y: y0, id: 1 }]);
      await sleep(150);
      const ring = await page.evaluate(touchRects);
      if (!ring.ring || !ring.ring.on) throw new Error('move joystick ring did not appear on touch start');
      if (Math.hypot(ring.ring.cx - x0, ring.ring.cy - y0) > 6) {
        throw new Error(`ring centre ${Math.round(ring.ring.cx)},${Math.round(ring.ring.cy)} is not at the touch point`);
      }
      for (let i = 1; i <= 10; i++) {
        await send('touchMove', [{ x: x0 + i * 6, y: y0, id: 1 }]);
        await sleep(60);
      }
      let gained = 0;
      try {
        const t0 = Date.now();
        while (Date.now() - t0 < 8000) {
          const p = await playerPos(page);
          gained = p.x - start.x;
          if (gained >= 0.6) break;
          await sleep(100);
        }
      } finally {
        await send('touchEnd', []);
      }
      if (gained < 0.6) throw new Error(`left-stick drag right moved the player ${gained.toFixed(2)} tiles`);
      return `drag right moved player +${gained.toFixed(1)} tiles; ring anchored at touch`;
    }, { ctx });

    await rec.check('M05', 'Touch', 'Right-stick (attack pad) tap fires: ammo drops and a player shot is emitted', async () => {
      await quickStart(page, { mode: 'crystal', brawlerId: 'rivet', mapId: 'lagoons' });
      await poll(async () => (await page.evaluate(touchRects)).atk !== null, { timeout: 5000, interval: 100, label: 'attack pad' });
      const before = await playerPos(page);
      const idx = await eventCount(page);
      await tapCentre('.bi-pad.bi-atk');
      const after = await poll(async () => {
        const p = await playerPos(page);
        return p.ammo < before.ammo ? p : null;
      }, { timeout: 8000, interval: 100, label: 'ammo to drop after an attack tap' });
      const shots = (await eventsSince(page, idx)).filter((e) => e.k === 'shot' && e.isPlayer);
      if (!shots.length) throw new Error('ammo dropped but no shot event for the player');
      return `ammo ${before.ammo} -> ${after.ammo} after one tap`;
    }, { ctx });

    await rec.check('M06', 'Touch', 'Super pad lights up when charged; tapping it fires the super', async () => {
      await page.evaluate(() => { window.__BRAWL__.game.match.player.superCharge = 1; });
      await poll(async () => {
        const r = await page.evaluate(touchRects);
        return r.superDim === false ? r : null;
      }, { timeout: 6000, interval: 100, label: 'super pad to leave its dim state' });
      const idx = await eventCount(page);
      await tapCentre('.bi-pad.bi-sup');
      const used = await poll(async () => {
        const hits = (await eventsSince(page, idx)).filter((e) => e.k === 'superUsed' && e.isPlayer);
        return hits.length ? hits : null;
      }, { timeout: 10000, interval: 100, label: 'superUsed from the super pad' });
      const sc = (await playerPos(page)).sc;
      if (sc >= 1) throw new Error('super charge was not consumed by the super');
      return `super pad lit when charged; tap fired the super (${used.length} event)`;
    }, { ctx });

    await rec.check('M07', 'Touch', 'Pause, settings, results and menu are reachable by touch and fit the viewport', async () => {
      await tapCentre('.hud-pause');
      await waitState(page, 'paused', 10000);
      await waitScreen(page, 'pause');
      await fits('pause');
      await tapCentre('[data-act=pause-settings]');
      await waitScreen(page, 'settings');
      await fits('settings');
      await tapCentre('[data-act=settings-back]');
      await waitScreen(page, 'pause');
      await tapCentre('[data-act=resume]');
      await waitState(page, 'playing', 10000);
      await page.evaluate(() => window.__BRAWL__.fastForward(200));
      await waitState(page, 'ending', 5000);
      await page.evaluate(() => window.__BRAWL__.skipEnding());
      await waitState(page, 'results', 20000);
      await waitScreen(page, 'results');
      await fits('results');
      await tapCentre('section.s-results [data-act=again]');
      await waitState(page, 'playing', 40000);
      await page.evaluate(() => window.__BRAWL__.fastForward(200));
      await page.evaluate(() => window.__BRAWL__.skipEnding());
      await waitState(page, 'results', 20000);
      await tapCentre('section.s-results [data-act=results-menu]');
      await waitState(page, 'menu', 10000);
      await waitScreen(page, 'menu');
      await fits('menu after results');
      return 'pause, settings, back, resume, results (fits), PLAY AGAIN, MENU all by touch';
    }, { ctx });

    try {
      await quickStart(page, { mode: 'crystal', brawlerId: 'rivet', mapId: 'lagoons' });
      report.touchTaps = await measureTaps(page, send);
    } catch (e) {
      report.touchTapsError = String(e && e.message ? e.message : e).split('\n')[0];
    }

    await rec.check('M08', 'Errors', 'Whole mobile session: no console, page, request or HTTP errors', async () => {
      if (s.errors.length) throw new Error(`${s.errors.length} captured, first: ${s.errors[0]}`);
      return 'none captured';
    }, { ctx });
  } finally {
    await closeSession(s);
  }
}
