// Export the procedural model to a binary glTF (GLB) file.
//   node tools/export-glb.mjs [out.glb]
import fs from 'node:fs';
import path from 'node:path';
import { openPage, ROOT } from './lib.mjs';

const out = process.argv[2] || path.join(ROOT, 'models', 'sundown-inhuman-18.glb');
const { page, close } = await openPage('?headless', { width: 256, height: 256 });
try {
  const b64 = await page.evaluate(async () => {
    const buf = await window.__api.exportGLB();
    const bytes = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(b64, 'base64'));
  console.log(`wrote ${path.relative(ROOT, out)} (${(fs.statSync(out).size / 1048576).toFixed(1)} MB)`);
} finally {
  await close();
}
