// hud.js - DOM heads-up display for a match. createHUD(parent) builds it inside `parent`; ui.js exposes it as U.hud.
// update(h): h = { time (s left), teamCrystals: [blue, red], target, countdownTeam (-1|0|1), countdown (s),
//   hp, maxHp, ammo, maxAmmo, reload (0..1, progress of the segment being reloaded), superCharge (0..1),
//   respawn (s; > 0 shows the respawn overlay) }. Every field is optional and keeps its last value.
// labels(list, count): list[i] = { x, y (CSS px of the anchor), name, team (0|1), isPlayer, hpFrac (0..1), crystals, visible }.
// killFeed(killer, victim): { name, team } objects, or plain name strings for neutral names.
// toast(text, kind): kind 'info' | 'good' | 'bad' | 'crystal'.
// reset(): clears toasts, kill feed and labels (call when a match starts). DOM is written only when a value changes.
import { RULES } from '../contracts.js';

const TEAM_NAME = ['BLUE', 'RED'];
const FEED_MAX = 4;
const FEED_MS = 3500;
const TOAST_MAX = 3;
const TOAST_MS = 2000;
const SX = [];
for (let i = 0; i <= 100; i++) SX.push('scaleX(' + i / 100 + ')');
const clamp01 = (v) => (v > 0 ? (v < 1 ? v : 1) : 0); // NaN -> 0
const fmtTime = (s) => {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
};
const mk = (tag, cls) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
};

const HTML = `
<div class="hud-top">
  <div class="hud-score t0"><span class="hs-name">BLUE</span><b class="hs-n">0</b><span class="hs-tgt">/10</span><span class="hs-bar"><i class="hs-fill"></i></span></div>
  <div class="hud-clock"><span class="hud-timer">02:30</span></div>
  <div class="hud-score t1"><span class="hs-name">RED</span><b class="hs-n">0</b><span class="hs-tgt">/10</span><span class="hs-bar"><i class="hs-fill"></i></span></div>
  <button class="hud-pause" data-act="hud-pause" aria-label="Pause"><span></span><span></span></button>
</div>
<div class="hud-banner"></div>
<div class="hud-status">
  <div class="hud-hp"><i class="hp-fill"></i><span class="hp-num">0</span></div>
  <div class="hud-ammo"></div>
  <div class="hud-super"><span class="sp-track"><i class="sp-fill"></i></span><span class="sp-lbl">SUPER</span></div>
</div>
<div class="hud-feed"></div>
<div class="hud-toasts"></div>
<div class="hud-respawn"><div class="rs-card"><span class="rs-lbl">RESPAWN IN</span><b class="rs-n">3</b></div></div>
<div class="hud-labels"></div>`;

export function createHUD(parent) {
  const root = mk('div', 'hud');
  root.innerHTML = HTML;
  parent.appendChild(root);
  const q = (s) => root.querySelector(s);
  const timerEl = q('.hud-timer');
  const scoreN = [q('.hud-score.t0 .hs-n'), q('.hud-score.t1 .hs-n')];
  const scoreTgt = [q('.hud-score.t0 .hs-tgt'), q('.hud-score.t1 .hs-tgt')];
  const scoreFill = [q('.hud-score.t0 .hs-fill'), q('.hud-score.t1 .hs-fill')];
  const banner = q('.hud-banner');
  const hudHp = q('.hud-hp');
  const hpFill = q('.hp-fill');
  const hpNum = q('.hp-num');
  const ammoEl = q('.hud-ammo');
  const superEl = q('.hud-super');
  const superFill = q('.sp-fill');
  const superLbl = q('.sp-lbl');
  const feed = q('.hud-feed');
  const toasts = q('.hud-toasts');
  const respawn = q('.hud-respawn');
  const respawnN = q('.rs-n');
  const labelsEl = q('.hud-labels');

  const c = {
    time: -1, sc: [-1, -1], scQ: [-1, -1], tgt: RULES.crystalTarget, cdTeam: -2, cdSec: -1,
    maxHp: 1, hpQ: -1, hpN: -1, lowHp: false, maxAmmo: 0, ammo: 3, reload: 0, segQ: [],
    superQ: -1, superOn: false, resp: -1, urgent: false,
  };
  let segFills = [];
  const pool = [];

  function buildAmmo(n) {
    c.maxAmmo = n;
    c.segQ = [];
    ammoEl.textContent = '';
    segFills = [];
    for (let i = 0; i < n; i++) {
      const seg = mk('div', 'seg');
      const fill = mk('i', 'seg-fill');
      seg.appendChild(fill);
      ammoEl.appendChild(seg);
      segFills.push(fill);
      c.segQ.push(-1);
    }
  }

  for (let t = 0; t < 2; t++) scoreTgt[t].textContent = '/' + c.tgt;
  buildAmmo(3);

  function update(h) {
    if (h.time !== undefined) {
      const s = h.time > 0 ? Math.ceil(h.time) : 0;
      if (s !== c.time) {
        c.time = s;
        timerEl.textContent = fmtTime(s);
        const urgent = s > 0 && s <= 10;
        if (urgent !== c.urgent) { c.urgent = urgent; root.classList.toggle('urgent', urgent); }
      }
    }
    if (h.target > 0 && h.target !== c.tgt) {
      c.tgt = h.target;
      scoreTgt[0].textContent = '/' + c.tgt;
      scoreTgt[1].textContent = '/' + c.tgt;
      c.scQ[0] = -1;
      c.scQ[1] = -1;
    }
    if (h.teamCrystals !== undefined) {
      for (let t = 0; t < 2; t++) {
        const n = h.teamCrystals[t] | 0;
        if (n !== c.sc[t]) { c.sc[t] = n; scoreN[t].textContent = n; }
        const q = Math.round(clamp01(n / c.tgt) * 100);
        if (q !== c.scQ[t]) { c.scQ[t] = q; scoreFill[t].style.transform = SX[q]; }
      }
    }
    if (h.countdownTeam !== undefined) {
      const team = h.countdownTeam === 0 || h.countdownTeam === 1 ? h.countdownTeam : -1;
      const sec = team >= 0 && h.countdown > 0 ? Math.ceil(h.countdown) : 0;
      if (team !== c.cdTeam || sec !== c.cdSec) {
        c.cdTeam = team;
        c.cdSec = sec;
        if (sec > 0) {
          banner.textContent = TEAM_NAME[team] + ' HOLDS THE CRYSTALS  ' + sec;
          banner.className = 'hud-banner on t' + team;
        } else {
          banner.className = 'hud-banner';
        }
      }
    }
    if (h.maxHp > 0) c.maxHp = h.maxHp;
    if (h.hp !== undefined) {
      const hp = h.hp > 0 ? h.hp : 0;
      const q = Math.round(clamp01(hp / c.maxHp) * 100);
      if (q !== c.hpQ) {
        c.hpQ = q;
        hpFill.style.transform = SX[q];
        const low = q <= 30;
        if (low !== c.lowHp) { c.lowHp = low; hudHp.classList.toggle('low', low); }
      }
      const n = Math.ceil(hp);
      if (n !== c.hpN) { c.hpN = n; hpNum.textContent = n; }
    }
    if (h.maxAmmo > 0 && (h.maxAmmo | 0) !== c.maxAmmo) buildAmmo(h.maxAmmo | 0);
    if (h.ammo !== undefined) c.ammo = h.ammo | 0;
    if (h.reload !== undefined) c.reload = clamp01(h.reload);
    for (let i = 0; i < c.maxAmmo; i++) {
      const v = i < c.ammo ? 1 : i === c.ammo ? c.reload : 0;
      const q = Math.round(v * 100);
      if (q !== c.segQ[i]) { c.segQ[i] = q; segFills[i].style.transform = SX[q]; }
    }
    if (h.superCharge !== undefined) {
      const q = Math.round(clamp01(h.superCharge) * 100);
      if (q !== c.superQ) {
        c.superQ = q;
        superFill.style.transform = SX[q];
        const on = q >= 100;
        if (on !== c.superOn) {
          c.superOn = on;
          superEl.classList.toggle('ready', on);
          superLbl.textContent = on ? 'SUPER READY' : 'SUPER';
        }
      }
    }
    if (h.respawn !== undefined) {
      const s = h.respawn > 0 ? Math.ceil(h.respawn) : 0;
      if (s !== c.resp) {
        c.resp = s;
        respawn.classList.toggle('show', s > 0);
        if (s > 0) respawnN.textContent = s;
      }
    }
  }

  function makeLabel() {
    const el = mk('div', 'lbl');
    el.style.display = 'none';
    el.innerHTML = '<div class="lbl-in"><div class="lbl-name"></div><div class="lbl-hp"><i class="lbl-hp-fill"></i></div>' +
      '<div class="lbl-cr"><i></i><b>0</b></div></div>';
    labelsEl.appendChild(el);
    return {
      el, nameEl: el.querySelector('.lbl-name'), hpFill: el.querySelector('.lbl-hp-fill'),
      crEl: el.querySelector('.lbl-cr'), crNum: el.querySelector('.lbl-cr b'),
      vis: false, x: NaN, y: NaN, key: -1, name: '', hq: -1, cr: -1,
    };
  }

  // d === null hides the node.
  function setLabel(p, d) {
    const vis = d !== null && !!d.visible;
    if (vis !== p.vis) { p.vis = vis; p.el.style.display = vis ? '' : 'none'; }
    if (!vis) return;
    const x = Math.round(d.x) || 0;
    const y = Math.round(d.y) || 0;
    if (x !== p.x || y !== p.y) {
      p.x = x;
      p.y = y;
      p.el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    }
    const team = d.team === 1 ? 1 : 0;
    const key = team * 2 + (d.isPlayer ? 1 : 0);
    if (key !== p.key) { p.key = key; p.el.className = 'lbl t' + team + (d.isPlayer ? ' me' : ''); }
    const name = d.name === undefined || d.name === null ? '' : String(d.name);
    if (name !== p.name) { p.name = name; p.nameEl.textContent = name; }
    const hq = Math.round(clamp01(d.hpFrac) * 100);
    if (hq !== p.hq) { p.hq = hq; p.hpFill.style.transform = SX[hq]; }
    const cr = d.crystals | 0;
    if (cr !== p.cr) { p.cr = cr; p.crNum.textContent = cr; p.crEl.classList.toggle('show', cr > 0); }
  }

  function labels(list, count) {
    const n = Math.min(count | 0, list.length);
    for (let i = 0; i < n; i++) {
      if (i === pool.length) pool.push(makeLabel());
      setLabel(pool[i], list[i]);
    }
    for (let i = n; i < pool.length; i++) setLabel(pool[i], null);
  }

  function nameSpan(p) {
    const s = mk('span', 'kf-n');
    const obj = p !== null && typeof p === 'object';
    s.textContent = obj ? (p.name === undefined || p.name === null ? '' : String(p.name)) : (p == null ? '' : String(p));
    if (obj && (p.team === 0 || p.team === 1)) s.classList.add('t' + p.team);
    return s;
  }

  function killFeed(killer, victim) {
    const row = mk('div', 'kf');
    row.appendChild(nameSpan(killer));
    row.appendChild(mk('i', 'kf-arrow'));
    row.appendChild(nameSpan(victim));
    feed.appendChild(row);
    while (feed.childElementCount > FEED_MAX) feed.firstElementChild.remove();
    setTimeout(() => row.remove(), FEED_MS);
  }

  function toast(text, kind) {
    const t = mk('div', 'toast k-' + (kind || 'info'));
    t.textContent = text === undefined || text === null ? '' : String(text);
    toasts.appendChild(t);
    while (toasts.childElementCount > TOAST_MAX) toasts.firstElementChild.remove();
    setTimeout(() => t.remove(), TOAST_MS);
  }

  function reset() {
    feed.textContent = '';
    toasts.textContent = '';
    labels([], 0);
    c.cdTeam = -2;
    c.cdSec = -1;
    banner.className = 'hud-banner';
    c.resp = -1;
    respawn.classList.remove('show');
  }

  return { el: root, update, labels, killFeed, toast, reset };
}
