// Shared tooling: a tiny static server for the project and a headless
// Chromium (WebGL via SwiftShader) session. Requests for the three.js CDN used
// by index.html are answered from node_modules so tooling works offline.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.186.1/';
const THREE_LOCAL = path.join(ROOT, 'node_modules', 'three');

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.svg': 'image/svg+xml',
};

export function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      let file = path.join(ROOT, url);
      if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
      if (!fs.existsSync(file)) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }));
  });
}

export async function openBrowser({ width = 1200, height = 1200 } = {}) {
  const browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'],
  });
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  await context.route(`${THREE_CDN}**`, async (route) => {
    const rel = route.request().url().slice(THREE_CDN.length).split('?')[0];
    const file = path.join(THREE_LOCAL, rel);
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: 'missing' });
    return route.fulfill({ status: 200, contentType: 'text/javascript', body: fs.readFileSync(file) });
  });
  return { browser, context };
}

export async function openPage(query = '', viewport) {
  const { server, url } = await startServer();
  const { browser, context } = await openBrowser(viewport);
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[page ${m.type()}]`, m.text()); });
  page.on('pageerror', (e) => console.log('[page error]', e.message));
  await page.goto(`${url}/index.html${query}`);
  await page.waitForFunction(() => window.__ready === true || window.__error, null, { timeout: 300000 });
  const err = await page.evaluate(() => window.__error && String(window.__error));
  if (err) throw new Error(err);
  const close = async () => { await browser.close(); server.close(); };
  return { page, close, url };
}

export function dataUrlToFile(dataUrl, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
}
