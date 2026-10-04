// Render camera presets to PNG files.
//   node tools/render.mjs [outDir] [size] [view ...]
import path from 'node:path';
import { openPage, dataUrlToFile, ROOT } from './lib.mjs';

const [outDir = path.join(ROOT, 'renders'), sizeArg = '1200', ...names] = process.argv.slice(2);
const size = Number(sizeArg);
const { page, close } = await openPage('?headless', { width: size, height: size });
try {
  const all = await page.evaluate(async () => Object.keys((await import('/src/views.js')).VIEWS));
  for (const name of names.length ? names : all) {
    const url = await page.evaluate(async ([n, s]) => {
      const { VIEWS } = await import('/src/views.js');
      const v = VIEWS[n];
      const w = v.size ? v.size[0] : s, h = v.size ? v.size[1] : s;
      return window.__api.render(w, h, v);
    }, [name, size]);
    const file = path.join(outDir, `${name}.png`);
    dataUrlToFile(url, file);
    console.log('wrote', path.relative(ROOT, file));
  }
} finally {
  await close();
}
