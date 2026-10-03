// Build script: bundles src/ into docs/ (a static site that also works from file://).
import * as esbuild from 'esbuild';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const watch = process.argv.includes('--watch');
const serve = process.argv.includes('--serve');

await mkdir('docs', { recursive: true });
// Also emit docs/hush.html: ONE self-contained file (CSS + JS inlined) that works from file://.
const inlineSingle = async () => {
  let html = await readFile('src/index.html', 'utf8');
  const css = await readFile('src/style.css', 'utf8');
  let js;
  try { js = await readFile('docs/hush.js', 'utf8'); } catch { return; }
  html = html.replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${css}\n</style>`);
  html = html.replace('<script src="hush.js" defer></script>', () => `<script>\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>`);
  await writeFile('docs/hush.html', html);
};
const copyStatic = async () => {
  await copyFile('src/index.html', 'docs/index.html');
  await copyFile('src/style.css', 'docs/style.css');
  await inlineSingle();
};
await copyStatic();

const options = {
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  outfile: 'docs/hush.js',
  minify: !(watch || serve),
  sourcemap: watch || serve ? 'inline' : false,
  legalComments: 'none',
  logLevel: 'info',
  plugins: [{
    name: 'copy-static',
    setup(b) { b.onEnd(() => copyStatic().catch(console.error)); },
  }],
};

if (watch || serve) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  if (serve) {
    const { port } = await ctx.serve({ servedir: 'docs', port: 8080 });
    console.log(`Hush running at http://localhost:${port}`);
  }
} else {
  await esbuild.build(options);
  await copyStatic();
}
