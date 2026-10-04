import { openHarness } from './browser.mjs';
import { readFileSync } from 'node:fs';
const fit = JSON.parse(readFileSync('tools/poses2.json', 'utf8'));
const pose = { ...fit.poses['4'], fov: fit.poses['4'].fov ?? fit.fov };
const { browser, page } = await openHarness({ query: 'sil&notex' });
const res = await page.evaluate(async (pose) => {
  window.__boot({ width: 160, height: 160, pixelRatio: 1, silhouette: true, noTex: true });
  const v = window.__sub.viewer;
  v.setPose(pose); v.render();
  const gl = v.renderer.getContext();
  const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
  const px = new Uint8Array(w * h * 4);
  gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  // centroid of black pixels from readPixels (y flipped to top-down)
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (px[((h - 1 - y) * w + x) * 4] < 128) { sx += x; sy += y; n++; }
  const a = [sx / n, sy / n];
  // same via toDataURL -> 2d canvas
  v.render();
  const img = new Image(); img.src = v.renderer.domElement.toDataURL();
  await img.decode();
  const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, w, h).data;
  sx = sy = n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[(y * w + x) * 4] < 128) { sx += x; sy += y; n++; }
  const b = [sx / n, sy / n];
  return { a, b, cam: v.camera.position.toArray(), up: v.camera.up.toArray(), size: [w, h] };
}, pose);
console.log(JSON.stringify(res));
await browser.close();
