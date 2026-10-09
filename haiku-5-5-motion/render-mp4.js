// Renders one full loop of the motion graphic to MP4, frame by frame on a
// virtual clock (deterministic, no dropped frames).
// Usage: NODE_PATH=$(npm root -g) node render-mp4.js [out.mp4] [fps] [width]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, 'claude-haiku-5-5.mp4'));
const FPS = Number(process.argv[3] || 30);
const W = Number(process.argv[4] || 1920);
const H = Math.round(W * 9 / 16);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000); // otherwise wall time leaks into the fake clock
  await page.goto('file://' + path.join(__dirname, 'index.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: '#controls{display:none!important}' });

  // Drive every CSS animation/transition from the virtual clock instead of
  // wall time. Children of a leaving scene stay frozen (matches base.css).
  await page.evaluate(() => {
    const seen = new WeakMap();
    window.__sync = (vt) => {
      for (const a of document.getAnimations()) {
        let rec = seen.get(a);
        if (!rec) { rec = { start: vt, t: 0 }; seen.set(a, rec); a.pause(); }
        const el = a.effect && a.effect.target;
        const frozen = el && !el.classList.contains('scene') && el.closest('.scene.leaving');
        if (!frozen) rec.t = vt - rec.start;
        a.currentTime = rec.t;
      }
    };
  });

  const total = await page.evaluate(() =>
    window.HAIKU_SCENES.reduce((s, sc) => s + sc.duration, 0));
  const frames = Math.round(total / 1000 * FPS);
  const step = 1000 / FPS;

  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe',
    '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'slow',
    '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const ffDone = new Promise((res, rej) => ff.on('close', c => c ? rej(new Error('ffmpeg exit ' + c)) : res()));

  for (let i = 0; i < frames; i++) {
    if (i > 0) await page.clock.runFor(step);
    await page.evaluate(vt => window.__sync(vt), i * step);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % (FPS * 5) === 0) console.log(`frame ${i}/${frames}`);
  }
  ff.stdin.end();
  await ffDone;
  await browser.close();
  console.log(errors.length ? 'page errors: ' + errors.join(' | ') : 'no page errors');
  console.log('wrote ' + OUT);
})().catch(e => { console.error(e); process.exit(1); });
