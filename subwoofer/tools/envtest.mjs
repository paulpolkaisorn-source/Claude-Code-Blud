import { openHarness } from './browser.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const poses = JSON.parse(readFileSync('tools/poses3.json', 'utf8'));
const shape = JSON.parse(readFileSync('tools/shape3.json', 'utf8'));
const { P: P0 } = await import('../src/params.js');
const P = { ...JSON.parse(JSON.stringify(P0)), ...shape };
const variants = JSON.parse(process.argv[3]);
const view = process.argv[4] || '2';
const out = process.argv[2];
let i = 0;
for (const v of variants) {
  const { browser, page } = await openHarness();
  await page.evaluate((v) => { window.__envBright = v; }, v);
  const url = await page.evaluate(([pose, P]) => {
    window.__boot({ width: 720, height: 720, pixelRatio: 1 });
    window.__sub.rebuild(P);
    window.__sub.pose(pose);
    return window.__sub.shot();
  }, [poses[view], P]);
  writeFileSync(`${out}/env_${i++}.png`, Buffer.from(url.split(',')[1], 'base64'));
  await browser.close();
}
