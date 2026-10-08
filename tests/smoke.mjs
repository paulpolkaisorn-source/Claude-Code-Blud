// Integration smoke (Opus): boots index.html, runs a quick match per brawler via the debug handle, reports errors.
// Usage: node tests/smoke.mjs [--mobile] [--shots]
import fs from 'node:fs';
import { openBrowser, ROOT } from './browser-env.mjs';

const mobile = process.argv.includes('--mobile');
const shots = process.argv.includes('--shots');
const env = await openBrowser(mobile ? { viewport: { width: 390, height: 844 }, mobile: true } : {});
const { page } = env;
const log = (...a) => console.log(...a);
let ok = true;
try {
  await page.goto(`${env.server.url}/index.html${mobile ? '?mobile' : ''}`);
  await page.waitForFunction(() => window.__BRAWL__ && window.__BRAWL__.state === 'menu', null, { timeout: 30000 });
  log('boot -> menu');
  if (shots) { fs.mkdirSync(`${ROOT}/test-results`, { recursive: true }); await page.waitForTimeout(800); await page.screenshot({ path: `${ROOT}/test-results/menu${mobile ? '-m' : ''}.png` }); }
  for (const brawlerId of ['rivet', 'pip', 'mortara', 'lumen']) {
    const r = await page.evaluate(async (id) => {
      const B = window.__BRAWL__;
      B.quickStart({ mode: 'crystal', brawlerId: id, mapId: id === 'mortara' ? 'random' : id === 'pip' ? 'lagoons' : 'canyon' });
      await new Promise((res) => setTimeout(res, 1500));
      const m = B.game.match, p = m.player;
      p.input.moveZ = -1;
      await new Promise((res) => setTimeout(res, 500));
      p.input.moveZ = 0;
      p.input.autoFire = true;
      await new Promise((res) => setTimeout(res, 300));
      p.superCharge = 1; p.input.autoSuper = true;
      await new Promise((res) => setTimeout(res, 600));
      const st = B.fastForward(25);
      return { state: st, time: m.time.toFixed(1), crystals: m.teamCrystals.slice(), hp: m.brawlers.map((b) => Math.round(b.hp)), stats: B.stats() };
    }, brawlerId);
    log(brawlerId, JSON.stringify(r));
    if (shots) await page.screenshot({ path: `${ROOT}/test-results/play-${brawlerId}${mobile ? '-m' : ''}.png` });
  }
  const end = await page.evaluate(async () => {
    const B = window.__BRAWL__;
    B.fastForward(200);
    B.skipEnding();
    await new Promise((res) => setTimeout(res, 500));
    return B.state;
  });
  log('full match ->', end);
  if (shots) await page.screenshot({ path: `${ROOT}/test-results/results${mobile ? '-m' : ''}.png` });
} catch (e) {
  ok = false;
  log('SMOKE FAILURE:', e.message);
}
for (const e of env.errors) log('ERROR', e.slice(0, 400));
await env.close();
process.exit(ok && env.errors.length === 0 ? 0 : 1);
