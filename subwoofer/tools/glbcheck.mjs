// Re-import the exported GLB with three's GLTFLoader and render it from two angles.
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { openHarness } from './browser.mjs';
const out = process.argv[2];
const res = await build({ entryPoints: ['tools/glbview.js'], bundle: true, format: 'iife', write: false, target: 'es2020' });
const html = `<!doctype html><html><body style="margin:0"><canvas id="c" width="900" height="900"></canvas><script>${res.outputFiles[0].text.replace(/<\/script>/g, '<\\/script>')}</script></body></html>`;
writeFileSync('dist/glbview.html', html);
const { chromium } = await import('playwright-core');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(m.text()));
page.on('pageerror', (e) => logs.push('ERR ' + e.message));
await page.goto('file://' + process.cwd() + '/dist/glbview.html');
await page.waitForFunction(() => window.__glbReady);
const b64 = readFileSync('out/sundown-subwoofer.glb').toString('base64');
for (const [name, yaw, pitch] of [['a', -35, 12], ['b', 150, 25]]) {
  const r = await page.evaluate(([b64, yaw, pitch]) => window.loadGLB(b64, 900, 900, yaw, pitch), [b64, yaw, pitch]);
  writeFileSync(`${out}/glb_${name}.png`, Buffer.from(r.url.split(',')[1], 'base64'));
  if (name === 'a') console.log(JSON.stringify(r.info));
}
console.log(logs.slice(0, 5).join('\n'));
await browser.close();
