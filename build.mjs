// Build script: bundles src/ into docs/ (a static site that also works from file://).
//   node build.mjs                 production build -> docs/
//   node build.mjs --watch         rebuild on change
//   node build.mjs --serve         dev server on :8080
//   node build.mjs --out=/tmp/x    write somewhere else
//   node build.mjs --only=pond     stub out every other game (fast, isolated dev builds)
import * as esbuild from 'esbuild';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const watch = process.argv.includes('--watch');
const serve = process.argv.includes('--serve');
const outDir = arg('out') || 'docs';
const only = arg('only');

await mkdir(outDir, { recursive: true });

// Also emit hush.html: ONE self-contained file (CSS + JS inlined) that works from file://.
const inlineSingle = async () => {
  let html = await readFile('src/index.html', 'utf8');
  const css = await readFile('src/style.css', 'utf8');
  let js;
  try { js = await readFile(`${outDir}/hush.js`, 'utf8'); } catch { return; }
  html = html.replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${css}\n</style>`);
  html = html.replace('<script src="hush.js" defer></script>', () => `<script>\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>`);
  await writeFile(`${outDir}/hush.html`, html);
};
const copyStatic = async () => {
  await copyFile('src/index.html', `${outDir}/index.html`);
  await copyFile('src/style.css', `${outDir}/style.css`);
  await inlineSingle();
};
await copyStatic();

const onlyPlugin = {
  name: 'only-game',
  setup(b) {
    if (!only) return;
    b.onResolve({ filter: /^\.\/[a-z]+\.js$/ }, (a) => {
      if (!a.importer.replace(/\\/g, '/').endsWith('games/index.js')) return;
      if (a.path === `./${only}.js`) return;
      return { path: a.path, namespace: 'stub' };
    });
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export function create(){ throw new Error("game disabled in --only build"); }', loader: 'js' }));
  },
};

const options = {
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  outfile: `${outDir}/hush.js`,
  minify: !(watch || serve),
  sourcemap: watch || serve ? 'inline' : false,
  legalComments: 'none',
  logLevel: 'info',
  plugins: [onlyPlugin, { name: 'copy-static', setup(b) { b.onEnd(() => copyStatic().catch(console.error)); } }],
};

if (watch || serve) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
  if (serve) {
    const { port } = await ctx.serve({ servedir: outDir, port: 8080 });
    console.log(`Hush running at http://localhost:${port}`);
  }
} else {
  await esbuild.build(options);
  await copyStatic();
}
