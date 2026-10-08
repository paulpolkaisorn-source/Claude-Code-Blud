// Builds dist/brawl-arena-3d.html: one self-contained file (three.js, every game module and the CSS inlined).
// Works offline and straight from disk (file://). Usage: npm run build:standalone
import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'dist', 'brawl-arena-3d.html');

const result = await build({
  entryPoints: [path.join(ROOT, 'src/main.js')],
  bundle: true,
  format: 'esm',
  target: ['es2020'],
  minify: true,
  legalComments: 'none',
  write: false,
  logLevel: 'warning',
});
// Never let bundled code close the inline <script> early.
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = fs.readFileSync(path.join(ROOT, 'styles/ui.css'), 'utf8').replace(/<\/style/gi, '<\\/style');

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const swap = (pattern, replacement, what) => {
  if (!pattern.test(html)) throw new Error(`build-standalone: could not find ${what} in index.html`);
  html = html.replace(pattern, () => replacement);
};
swap(/\s*<link rel="stylesheet" href="styles\/ui\.css" \/>/, `\n  <style data-ui-css>\n${css}\n  </style>`, 'the ui.css link');
swap(/\s*<script type="importmap">[\s\S]*?<\/script>/, '', 'the import map');
swap(/<script type="module" src="src\/main\.js"><\/script>/, `<script type="module">\n${js}\n</script>`, 'the main.js script tag');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`wrote ${path.relative(ROOT, OUT)} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
