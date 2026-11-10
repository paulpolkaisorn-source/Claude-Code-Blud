// Builds clawd-playground-standalone.html: the whole game in one file that runs by double-clicking it.
// Usage: npm install && npm run build:standalone
import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'clawd-playground-standalone.html');

const result = await build({
  entryPoints: [path.join(root, 'game.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  write: false,
  target: 'es2020',
  legalComments: 'none',
  alias: {
    three: path.join(root, 'vendor/three.module.min.js'),
    'cannon-es': path.join(root, 'vendor/cannon-es.js'),
  },
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

let html = await readFile(path.join(root, 'index.html'), 'utf8');
const importMap = /<script type="importmap">[\s\S]*?<\/script>\s*/;
const moduleTag = '<script type="module" src="./game.js"></script>';
if (!importMap.test(html) || !html.includes(moduleTag)) throw new Error('index.html no longer has the expected script tags');
html = html.replace(importMap, '');
html = html.replace(moduleTag, () => `<!-- three.js r170 and cannon-es 0.20 (MIT) are bundled below -->\n<script>\n${js}\n</script>`);

await writeFile(out, html);
console.log(`Wrote ${path.relative(root, out)} (${(html.length / 1024).toFixed(0)} KB)`);
