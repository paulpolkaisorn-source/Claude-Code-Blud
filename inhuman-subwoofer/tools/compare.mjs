// Side-by-side comparison of the reference photos with renders from the
// fitted cameras (photo | model | silhouette overlay).
//   node tools/compare.mjs <photoDir> [outDir] [height] [ids...]
import fs from 'node:fs';
import path from 'node:path';
import { openPage, dataUrlToFile, ROOT } from './lib.mjs';

const [photoDir, outDir = path.join(ROOT, 'renders', 'compare'), hArg = '900', ...ids] = process.argv.slice(2);
const H = Number(hArg);
const { PHOTO_VIEWS } = await import(path.join(ROOT, 'src', 'photo-views.js') + `?t=${Date.now()}`);
const { page, close } = await openPage('?headless', { width: 400, height: 400 });
try {
  for (const key of Object.keys(PHOTO_VIEWS)) {
    const id = key.replace('photo', '');
    if (ids.length && !ids.includes(id)) continue;
    const v = PHOTO_VIEWS[key];
    const file = fs.existsSync(path.join(photoDir, `${id}.webp`)) ? path.join(photoDir, `${id}.webp`) : path.join(photoDir, `${id}.png`);
    const photo = `data:image/${path.extname(file).slice(1)};base64,${fs.readFileSync(file).toString('base64')}`;
    const out = await page.evaluate(async ([v, photo, H]) => {
      const api = window.__api;
      const W = Math.round((H * v.size[0]) / v.size[1]);
      const rendered = api.render(W, H, v);
      const load = async (src) => createImageBitmap(await (await fetch(src)).blob());
      const [pimg, rimg] = await Promise.all([load(photo), load(rendered)]);
      // model mask
      api.renderMask(W, H, v);
      const mimg = await load(api.renderer.domElement.toDataURL('image/png'));
      const c = document.createElement('canvas');
      c.width = W * 3; c.height = H;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(pimg, 0, 0, W, H);
      ctx.drawImage(rimg, W, 0, W, H);
      // overlay: photo alpha (red) vs model mask (cyan); overlap = white-ish
      const a = document.createElement('canvas'); a.width = W; a.height = H;
      const actx = a.getContext('2d');
      actx.drawImage(pimg, 0, 0, W, H);
      const pd = actx.getImageData(0, 0, W, H).data;
      actx.clearRect(0, 0, W, H);
      actx.drawImage(mimg, 0, 0, W, H);
      const md = actx.getImageData(0, 0, W, H).data;
      const o = actx.createImageData(W, H);
      let inter = 0, uni = 0;
      for (let i = 0; i < W * H; i++) {
        const p = pd[i * 4 + 3] > 127, m = md[i * 4] > 127;
        inter += p && m; uni += p || m;
        const k = i * 4;
        if (p && m) { o.data[k] = 200; o.data[k + 1] = 200; o.data[k + 2] = 200; }
        else if (p) { o.data[k] = 230; o.data[k + 1] = 40; o.data[k + 2] = 40; }
        else if (m) { o.data[k] = 20; o.data[k + 1] = 170; o.data[k + 2] = 230; }
        else { o.data[k] = o.data[k + 1] = o.data[k + 2] = 255; }
        o.data[k + 3] = 255;
      }
      actx.putImageData(o, 0, 0);
      ctx.drawImage(a, 2 * W, 0);
      ctx.fillStyle = '#000';
      ctx.font = `${Math.round(H / 30)}px sans-serif`;
      ctx.fillText(`IoU ${(inter / uni).toFixed(4)}`, 2 * W + 12, H / 30 + 8);
      return { url: c.toDataURL('image/png'), iou: inter / uni };
    }, [v, photo, H]);
    dataUrlToFile(out.url, path.join(outDir, `compare_${id}.png`));
    console.log(`photo ${id}: IoU ${out.iou.toFixed(4)}`);
  }
} finally {
  await close();
}
