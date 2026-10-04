import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('dist', { recursive: true });

const res = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  minify: process.argv.includes('--min'),
  format: 'iife',
  target: 'es2020',
  write: false,
  legalComments: 'none',
});
const js = res.outputFiles[0].text.replace(/<\/script>/g, '<\\/script>');
const html = readFileSync('src/index.html', 'utf8').replace('/*__BUNDLE__*/', () => js);
writeFileSync('dist/index.html', html);
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' KB');
