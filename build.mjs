// Builds velvet-hours.html: one self-contained file with the bundled JS and CSS inlined.
// Usage: node build.mjs            (one-off build)
//        node build.mjs --watch    (rebuild whenever src/ changes)
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, statSync, watch } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, 'src');
const out = join(root, 'velvet-hours.html');

async function build() {
  const started = performance.now();
  const js = await esbuild.build({
    entryPoints: [join(src, 'main.js')],
    bundle: true,
    format: 'iife',
    minify: true,
    target: ['es2020'],
    write: false,
    legalComments: 'none',
    charset: 'utf8',
    define: { 'process.env.NODE_ENV': '"production"' },
    logLevel: 'warning',
  });
  const css = await esbuild.transform(readFileSync(join(src, 'styles.css'), 'utf8'), {
    loader: 'css',
    minify: true,
  });
  // A literal "</script" inside bundled code would end the inline script early.
  const code = js.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  const template = readFileSync(join(src, 'template.html'), 'utf8');
  const html = template
    .replace('/*__CSS__*/', () => css.code.trim())
    .replace('/*__JS__*/', () => code);
  writeFileSync(out, html);
  const kb = (statSync(out).size / 1024).toFixed(1);
  console.log(`velvet-hours.html  ${kb} KB  (${(performance.now() - started).toFixed(0)} ms)`);
}

await build();

if (process.argv.includes('--watch')) {
  let timer = null;
  watch(src, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => build().catch((e) => console.error(e)), 120);
  });
  console.log('watching src/ ...');
}
