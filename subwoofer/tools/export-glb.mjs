// Build the textured model in headless Chromium and write it out as a binary glTF (metres, +Z = front).
import { openHarness } from './browser.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('out', { recursive: true });
const { browser, page, logs } = await openHarness();
const b64 = await page.evaluate(async () => {
  window.__boot({ width: 64, height: 64, pixelRatio: 1 });
  return await window.__sub.exportGLBBase64();
});
const buf = Buffer.from(b64, 'base64');
const file = process.argv[2] || 'out/sundown-subwoofer.glb';
writeFileSync(file, buf);
// quick structural report from the JSON chunk
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString('utf8'));
console.log(file, (buf.length / 1048576).toFixed(2), 'MB');
console.log('nodes', json.nodes.length, 'meshes', json.meshes.length, 'materials', json.materials.length, 'textures', (json.textures || []).length, 'images', (json.images || []).length);
console.log(logs.filter((l) => !l.includes('willReadFrequently')).join('\n'));
await browser.close();
