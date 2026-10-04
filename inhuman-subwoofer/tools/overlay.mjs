// Project model landmarks (flange holes, badges, spokes, terminals, boot
// markings) onto a reference photo using its fitted camera, to check the
// angular alignment of features.
//   node tools/overlay.mjs <photoDir> <id> [outFile] [spinDeg]
import fs from 'node:fs';
import path from 'node:path';
import { openPage, dataUrlToFile, ROOT } from './lib.mjs';

const [photoDir, id, outFile = `/tmp/overlay_${process.argv[3]}.png`, spin = '0'] = process.argv.slice(2);
const { PHOTO_VIEWS } = await import(path.join(ROOT, 'src', 'photo-views.js') + `?t=${Date.now()}`);
const v = PHOTO_VIEWS[`photo${id}`];
const webp = path.join(photoDir, `${id}.webp`);
const file = fs.existsSync(webp) ? webp : path.join(photoDir, `${id}.png`);
const photo = `data:image/${path.extname(file).slice(1)};base64,${fs.readFileSync(file).toString('base64')}`;
const { page, close } = await openPage('?headless&lod=0.3', { width: 300, height: 300 });
try {
  const url = await page.evaluate(async ([v, photo, spin]) => {
    const api = window.__api;
    const { THREE } = api;
    const D = api.model.userData.dims;
    const img = await createImageBitmap(await (await fetch(photo)).blob());
    const W = img.width, H = img.height;
    // spin the camera about the speaker axis (world Z through the origin)
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), (spin * Math.PI) / 180);
    const view = {
      fov: v.fov,
      position: new THREE.Vector3(...v.position).applyQuaternion(q).toArray(),
      target: new THREE.Vector3(...v.target).applyQuaternion(q).toArray(),
      up: new THREE.Vector3(...v.up).applyQuaternion(q).toArray(),
    };
    api.setView(view);
    api.camera.aspect = W / H;
    api.camera.updateProjectionMatrix();
    api.camera.updateMatrixWorld();
    api.model.updateMatrixWorld(true);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(0, 0, W, H);
    const P = (th, r, y) => {
      const p = new THREE.Vector3(Math.sin(th) * r, y, -Math.cos(th) * r);
      api.model.localToWorld(p).project(api.camera);
      return [((p.x + 1) / 2) * W, ((1 - p.y) / 2) * H];
    };
    const dot = (xy, col, r = 9, label) => {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.arc(xy[0], xy[1], r, 0, Math.PI * 2); ctx.fill();
      if (label) { ctx.font = '28px sans-serif'; ctx.fillText(label, xy[0] + 12, xy[1] - 8); }
    };
    const deg = Math.PI / 180;
    for (let k = 0; k < 16; k++) dot(P(D.boltStart + k * 22.5 * deg, D.boltR, 0), k % 2 ? '#00c853' : '#ff1744', 8);
    for (let k = 0; k < 8; k++) dot(P(D.badgeStart + k * 45 * deg, D.boltR, 0), '#ffd600', 10, k === 0 ? 'B0' : '');
    for (let k = 0; k < D.spokeCount; k++) {
      const th = D.spokeStart + (k * 360 / D.spokeCount) * deg;
      for (const [r, y] of [[209, -45], [199, -109], [187, -168], [147, -211]]) dot(P(th, r, y), '#2979ff', 9);
      dot(P(th, 209, -45), '#2979ff', 9, `S${k}`);
    }
    for (const th of [D.terminalAngle, D.terminalAngle + Math.PI]) dot(P(th, 195, -185), '#ff6d00', 14, 'T');
    for (let k = 0; k < 3; k++) {
      dot(P(D.bootTextAngle + k * 120 * deg, D.bootR, -336), '#d500f9', 14, 'txt');
      dot(P(D.bootTextAngle + (60 + k * 120) * deg, D.bootR, -336), '#00e5ff', 14, 'alien');
    }
    const ring = (r, y, col) => {
      ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath();
      for (let k = 0; k <= 180; k++) { const [x, yy] = P((k / 180) * Math.PI * 2, r, y); k ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }
      ctx.stroke();
    };
    ring(D.flangeR, -2, '#ff1744');
    ring(190, D.surroundApex, '#ffd600');
    ring(D.surroundIn, D.surroundBase, '#00e676');
    ring(D.capR, -86, '#00b0ff');
    ring(168.5, D.bootTop - 3, '#d500f9');
    ring(167.8, D.bootBottom + 3, '#d500f9');
    ring(D.backDiscR, D.backDiscY, '#ff9100');
    dot(P(0, 0, D.backDiscY), '#000', 10, 'vent');
    dot(P(0, 0, -66), '#000', 10, 'cap');
    return c.toDataURL('image/png');
  }, [v, photo, Number(spin)]);
  dataUrlToFile(url, outFile);
  console.log('wrote', outFile);
} finally {
  await close();
}
