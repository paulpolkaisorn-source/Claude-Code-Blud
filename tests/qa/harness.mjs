// Shared QA harness: browser sessions, page helpers, in-page event recorder, check recorder.
// Everything here drives the game through the page (clicks, keys, touch) and the debug handle window.__BRAWL__.
import { openBrowser } from '../browser-env.mjs';

export const DESKTOP = { width: 1280, height: 720 };
export const MOBILE = { width: 390, height: 844 };

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function withTimeout(promise, ms, label) {
  let timer;
  const guard = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms);
  });
  return Promise.race([promise, guard]).finally(() => clearTimeout(timer));
}

// Polls fn() until it returns a truthy value (returned to the caller) or the timeout elapses.
export async function poll(fn, { timeout = 15000, interval = 150, label = 'condition' } = {}) {
  const t0 = Date.now();
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() - t0 >= timeout) throw new Error(`timed out after ${timeout} ms waiting for ${label}`);
    await sleep(interval);
  }
}

// ---- Check recorder -------------------------------------------------------------------------------
export class Recorder {
  constructor(filter = null) {
    this.rows = [];
    this.filter = filter;
  }

  // fn returns a detail string on success, or throws an Error describing the failure.
  // ctx (optional) is a session whose error list must not grow during the check.
  async check(id, area, name, fn, { ctx = null, timeoutMs = 120000 } = {}) {
    if (this.filter && !this.filter.test(`${id} ${area} ${name}`)) return null;
    const t0 = Date.now();
    const errorsBefore = ctx ? ctx.errors.length : 0;
    let status = 'PASS';
    let detail = '';
    try {
      const out = await withTimeout(Promise.resolve().then(fn), timeoutMs, `check ${id}`);
      detail = typeof out === 'string' ? out : '';
    } catch (e) {
      status = 'FAIL';
      detail = oneLine(e && e.message ? e.message : String(e));
    }
    const newErrors = ctx ? ctx.errors.slice(errorsBefore) : [];
    if (newErrors.length && status === 'PASS') {
      status = 'FAIL';
      detail = `${newErrors.length} runtime error(s) during check: ${oneLine(newErrors[0])}`;
    }
    const row = { id, area, name, status, ms: Date.now() - t0, detail, sessionErrors: newErrors.length };
    this.rows.push(row);
    const tail = status === 'FAIL' ? ` :: ${detail}` : detail ? ` :: ${detail}` : '';
    process.stdout.write(`${status} ${id} [${(row.ms / 1000).toFixed(1)}s] ${name}${tail}\n`);
    return row;
  }
}

function oneLine(text) {
  return String(text).split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 2).join(' | ').slice(0, 400);
}

// ---- Sessions -------------------------------------------------------------------------------------
export const sessions = [];
export const runEnv = { chromium: '', started: new Date().toISOString() };

export async function openSession(name, { viewport, mobile = false, query = '' }) {
  const b = await openBrowser({ viewport, mobile });
  if (!runEnv.chromium) runEnv.chromium = b.browser.version();
  const page = b.page;
  const session = { name, b, page, errors: b.errors, url: `${b.server.url}/index.html${query}`, mobile, viewport };
  sessions.push(session);
  page.on('response', (r) => {
    if (r.status() >= 400 && !/favicon/.test(r.url())) session.errors.push(`http ${r.status()} ${r.url()}`);
  });
  page.on('crash', () => session.errors.push('page crashed'));
  return session;
}

export async function closeSession(session) {
  await session.b.close();
}

// Loads the game, waits for the menu state, and installs the in-page recorder.
export async function gotoGame(session) {
  const page = session.page;
  await page.goto(session.url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => !!window.__BRAWL__ && window.__BRAWL__.state === 'menu',
    null, { timeout: 60000, polling: 100 });
  await installRecorder(page);
}

// Records bus events, state transitions, and the pip rail pool size right after a super.
export async function installRecorder(page) {
  await page.evaluate(() => {
    if (window.__qaRec) return;
    const B = window.__BRAWL__;
    const rec = (window.__qaRec = { events: [], states: [], railSeen: 0, railShots: 0 });
    const push = (k, e) => {
      if (rec.events.length > 1500) rec.events.splice(0, 500);
      const b = e && e.b ? e.b : null;
      rec.events.push({
        k,
        t: performance.now(),
        brawlerId: b ? b.brawlerId : (e && e.target ? e.target.brawlerId : null),
        isPlayer: !!(b && b.isPlayer),
        team: b ? b.team : (e && typeof e.team === 'number' ? e.team : null),
        isSuper: !!(e && e.isSuper),
        x: e && typeof e.x === 'number' ? e.x : null,
        z: e && typeof e.z === 'number' ? e.z : null,
        outcome: e && e.outcome !== undefined ? e.outcome : null,
        winner: e && e.winner !== undefined ? e.winner : null,
      });
    };
    for (const evt of Object.values(B.EV)) B.bus.on(evt, (e) => push(evt, e));
    B.bus.on(B.EV.SUPER_USED, (e) => {
      if (!(e && e.b && e.b.brawlerId === 'pip')) return;
      // The rail projectile lives for several sim ticks, so sample the pool on the next macrotask.
      setTimeout(() => {
        const m = B.game.match;
        if (!m) return;
        const n = m.combat.projectiles.filter((p) => p.active && p.kind === 'rail').length;
        if (n > rec.railSeen) rec.railSeen = n;
      }, 0);
    });
    let last = B.state;
    rec.states.push([performance.now(), last]);
    setInterval(() => {
      const s = B.state;
      if (s !== last) {
        last = s;
        rec.states.push([performance.now(), s]);
      }
    }, 10);
  });
}

// ---- Page helpers ---------------------------------------------------------------------------------
export async function snapshot(page) {
  return page.evaluate(() => {
    const B = window.__BRAWL__;
    const m = B.game.match;
    const root = document.querySelector('.ui-root');
    const out = {
      state: B.state,
      root: root ? root.getAttribute('data-screen') : null,
      screens: Array.from(document.querySelectorAll('section.screen.active')).map((e) => e.getAttribute('data-screen')),
      hasMatch: !!m,
    };
    if (m) {
      const p = m.player;
      out.time = m.time;
      out.winner = m.winner;
      out.mode = m.cfg.mode;
      out.mapId = m.cfg.mapId;
      out.brawlerId = m.cfg.brawlerId;
      out.training = m.training;
      out.navVersion = m.arena.navVersion;
      out.teamCrystals = m.teamCrystals.slice();
      out.player = { id: p.id, x: p.x, z: p.z, ammo: p.ammo, sc: p.superCharge, brawlerId: p.brawlerId,
        alive: p.alive, hp: p.hp, dash: p.dashTimer, team: p.team };
    }
    return out;
  });
}

export async function playerPos(page) {
  return page.evaluate(() => {
    const p = window.__BRAWL__.game.match.player;
    return { x: p.x, z: p.z, ammo: p.ammo, sc: p.superCharge, dash: p.dashTimer };
  });
}

export async function waitState(page, state, timeout = 30000) {
  await page.waitForFunction((s) => !!window.__BRAWL__ && window.__BRAWL__.state === s, state,
    { timeout, polling: 100 });
}

export async function waitScreen(page, name, timeout = 15000) {
  await page.waitForFunction((n) => {
    const el = document.querySelector(`section.screen[data-screen="${n}"]`);
    return !!el && el.classList.contains('active');
  }, name, { timeout, polling: 100 });
}

// Returns to the menu from any state through the UI when possible; falls back to the debug handle.
export async function ensureMenu(page) {
  const state = await page.evaluate(() => window.__BRAWL__.state);
  if (state === 'menu') return;
  if (state === 'results') await page.click('[data-act=results-menu]', { timeout: 15000 });
  else if (state === 'paused') await page.click('[data-act=quit]', { timeout: 15000 });
  else if (state === 'playing') {
    await page.click('[data-act=hud-pause]', { timeout: 15000 });
    await waitState(page, 'paused');
    await page.click('[data-act=quit]', { timeout: 15000 });
  } else if (state === 'select') await page.click('[data-act=back-menu]', { timeout: 15000 });
  else await page.evaluate(() => window.__BRAWL__.toMenu());
  try {
    await waitState(page, 'menu', 8000);
  } catch {
    await page.evaluate(() => window.__BRAWL__.toMenu());
    await waitState(page, 'menu', 8000);
  }
}

// Starts a match directly through the debug handle (used for gameplay setup; flows use real clicks).
export async function quickStart(page, cfg) {
  await ensureMenu(page);
  await page.evaluate((c) => window.__BRAWL__.quickStart(c), cfg);
  await waitState(page, 'playing', 10000);
}

// Pulls the events recorded since a given index.
export async function eventsSince(page, index) {
  return page.evaluate((i) => window.__qaRec.events.slice(i), index);
}

export async function eventCount(page) {
  return page.evaluate(() => window.__qaRec.events.length);
}

// Leaves a running match through PAUSE > QUIT. The HUD pause button toggles, so it is only pressed while playing.
export async function quitToMenuFromHud(page) {
  if ((await page.evaluate(() => window.__BRAWL__.state)) === 'playing') {
    await page.click('[data-act=hud-pause]', { timeout: 15000 });
    await waitState(page, 'paused');
  }
  await page.click('[data-act=quit]', { timeout: 15000 });
  await waitState(page, 'menu', 10000);
}

// Reads the current game-reported stats (quality, draw calls) through the renderer handle.
export async function rendererStats(page) {
  return page.evaluate(() => window.__BRAWL__.stats());
}
