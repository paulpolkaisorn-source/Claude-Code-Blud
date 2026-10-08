// Performance checks at 1280x720. The browser uses SwiftShader (CPU rasterizer), so absolute numbers are
// environment-bound; they are reported for relative comparison and checked against the draw-call budget only.
import {
  DESKTOP, openSession, closeSession, gotoGame, snapshot, waitScreen, ensureMenu, quickStart,
  poll, sleep, rendererStats, eventCount, eventsSince,
} from './harness.mjs';

const DRAW_CALL_BUDGET = 150; // ARCHITECTURE.md: <= 150 draw calls per frame

// Reference scene: 40 lit meshes on a plain three.js renderer with the same viewport and MSAA as the game.
const BASELINE_HTML = `<!doctype html><html><head><style>html,body{margin:0;background:#222}
canvas{display:block;width:1280px;height:720px}</style></head><body><canvas id="c" width="1280" height="720"></canvas>
<script type="module">
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: true });
renderer.setPixelRatio(1);
renderer.setSize(1280, 720, false);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1280 / 720, 0.1, 100);
camera.position.set(0, 10, 10);
camera.lookAt(0, 0, 0);
const geo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
for (let i = 0; i < 40; i++) {
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: i * 9999 }));
  m.position.set((i % 8) - 4, 0.4, Math.floor(i / 8) - 2);
  scene.add(m);
}
scene.add(new THREE.DirectionalLight(0xffffff, 1));
scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 1));
window.__measure = (ms) => new Promise((resolve) => {
  let frames = 0;
  let start = 0;
  const step = (t) => {
    if (!start) start = t;
    frames++;
    renderer.render(scene, camera);
    if (t - start < ms) requestAnimationFrame(step);
    else resolve({ fps: frames / ((t - start) / 1000), frames });
  };
  requestAnimationFrame(step);
});
window.__ready = true;
</script></body></html>`;

// In-page frame sampler: one rAF callback per frame, reading BRAWL renderer stats. Allocation is test-only.
function startSampler() {
  const B = window.__BRAWL__;
  const run = (window.__perfRun = { ts: [], draws: [], gameFps: [], qualities: [], on: true });
  const frame = (t) => {
    if (!run.on) return;
    run.ts.push(t);
    const st = B.stats();
    run.draws.push(st.drawCalls);
    run.gameFps.push(st.fps);
    run.qualities.push(st.quality);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function stopSampler() {
  const run = window.__perfRun;
  run.on = false;
  const ts = run.ts;
  const diffs = [];
  for (let i = 1; i < ts.length; i++) diffs.push(ts[i] - ts[i - 1]);
  const span = ts.length > 1 ? ts[ts.length - 1] - ts[0] : 0;
  const draws = run.draws.filter((d) => d > 0);
  const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  let worst = 0;
  for (const d of diffs) if (d > worst) worst = d;
  const qualities = Array.from(new Set(run.qualities));
  return {
    frames: diffs.length,
    seconds: span / 1000,
    avgFps: span > 0 ? diffs.length / (span / 1000) : 0,
    minFps: worst > 0 ? 1000 / worst : 0,
    avgDraws: mean(draws),
    maxDraws: draws.length ? Math.max(...draws) : 0,
    minDraws: draws.length ? Math.min(...draws) : 0,
    gameFpsAvg: mean(run.gameFps.filter((f) => f > 0)),
    qualities,
  };
}

async function measureLive(page, seconds) {
  await page.evaluate(startSampler);
  const clock0 = (await snapshot(page)).time;
  await page.keyboard.down('KeyD');
  const t0 = Date.now();
  try {
    while (Date.now() - t0 < seconds * 1000) {
      await sleep(1500);
      await page.mouse.click(640, 360);
    }
  } finally {
    await page.keyboard.up('KeyD');
  }
  const result = await page.evaluate(stopSampler);
  const clock1 = (await snapshot(page)).time;
  return { ...result, clockAdvance: clock0 - clock1, state: await page.evaluate(() => window.__BRAWL__.state) };
}

async function setQuality(page, q) {
  await ensureMenu(page);
  await page.click('[data-act=open-settings]', { timeout: 15000 });
  await waitScreen(page, 'settings');
  await page.click(`[data-act=quality][data-q=${q}]`, { timeout: 15000 });
  await poll(async () => page.evaluate((qq) => document.querySelector(`[data-act=quality][data-q=${qq}]`).classList.contains('on'), q),
    { timeout: 5000, interval: 100, label: `quality ${q} selected` });
  await page.click('[data-act=settings-back]', { timeout: 15000 });
  await waitScreen(page, 'menu');
}

function fmtPerf(m) {
  return `${m.frames} frames in ${m.seconds.toFixed(1)} s: avg ${m.avgFps.toFixed(2)} fps, worst frame ${m.minFps.toFixed(2)} fps, `
    + `draw calls avg ${m.avgDraws.toFixed(0)} / max ${m.maxDraws}, match clock advanced ${m.clockAdvance.toFixed(1)} s`;
}

export async function runPerf(rec, report) {
  const s = await openSession('perf', { viewport: DESKTOP });
  const page = s.page;
  const ctx = s;
  try {
    await rec.check('P01', 'Perf', 'Reference: empty three.js scene at 1280x720 (same viewport, MSAA) for context', async () => {
      await page.setContent(BASELINE_HTML, { waitUntil: 'load' });
      await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000, polling: 100 });
      await page.evaluate(() => window.__measure(1000));
      const r = await page.evaluate(() => window.__measure(3000));
      report.reference = { fps: r.fps, frames: r.frames, scene: '40 lit cubes, 1 directional + 1 hemisphere light, MSAA x4' };
      return `reference scene ${r.fps.toFixed(1)} fps`;
    }, { ctx });

    await rec.check('P02', 'Perf', 'Auto quality falls back to low under SwiftShader load (qualityChange emitted)', async () => {
      await gotoGame(s);
      const before = await rendererStats(page);
      if (before.quality !== 'high' && before.quality !== 'low') throw new Error(`unexpected quality at boot: ${before.quality}`);
      const idx = await eventCount(page);
      const t0 = Date.now();
      await quickStart(page, { mode: 'crystal', brawlerId: 'rivet', mapId: 'canyon' });
      await page.keyboard.down('KeyD');
      let dropped = null;
      try {
        dropped = await poll(async () => {
          const q = (await rendererStats(page)).quality;
          if (q === 'low') return true;
          await page.mouse.click(640, 360);
          return null;
        }, { timeout: 45000, interval: 800, label: 'auto quality to drop to low' });
      } finally {
        await page.keyboard.up('KeyD');
      }
      const changes = (await eventsSince(page, idx)).filter((e) => e.k === 'qualityChange').length;
      if (!dropped || changes < 1) throw new Error('quality did not drop to low (no qualityChange event)');
      return `auto ${before.quality} -> low after ${((Date.now() - t0) / 1000).toFixed(1)} s, ${changes} qualityChange event(s)`;
    }, { ctx });

    for (const q of ['high', 'low']) {
      const id = q === 'high' ? 'P03' : 'P04';
      await rec.check(id, 'Perf', `${q.toUpperCase()} quality: 10 s live play (6 brawlers, bots, player moving and firing)`, async () => {
        await setQuality(page, q);
        await quickStart(page, { mode: 'crystal', brawlerId: 'rivet', mapId: 'canyon' });
        await sleep(4000);
        const seen = await rendererStats(page);
        if (seen.quality !== q) throw new Error(`renderer quality is ${seen.quality}, expected ${q}`);
        const m = await measureLive(page, 10);
        if (m.state !== 'playing') throw new Error(`match left playing during measurement (${m.state})`);
        report.perf = report.perf || [];
        report.perf.push({ scenario: '10 s live play', quality: q, ...m });
        if (m.frames < 5) throw new Error(`only ${m.frames} frames rendered in 10 s`);
        if (m.clockAdvance < 0.5) throw new Error(`match clock advanced only ${m.clockAdvance.toFixed(2)} s`);
        if (m.maxDraws > DRAW_CALL_BUDGET) throw new Error(`max draw calls ${m.maxDraws} exceeds budget ${DRAW_CALL_BUDGET}`);
        await page.evaluate(() => window.__BRAWL__.toMenu());
        return fmtPerf(m);
      }, { ctx });
    }

    await rec.check('P05', 'Errors', 'Whole perf session: no console, page, request or HTTP errors', async () => {
      if (s.errors.length) throw new Error(`${s.errors.length} captured, first: ${s.errors[0]}`);
      return 'none captured';
    }, { ctx });
  } finally {
    await closeSession(s);
  }
}
