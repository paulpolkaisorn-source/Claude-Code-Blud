// screens.js - DOM for the menu, select, matchmaking, pause, settings and results screens.
// buildScreens(wrap) appends the markup to `wrap` and returns refs; buttons carry data-act (routed by ui.js).
import { BRAWLERS, BRAWLER_IDS } from '../contracts.js';

export const SX = [];
for (let i = 0; i <= 100; i++) SX.push('scaleX(' + i / 100 + ')');
export const hex = (c) => '#' + c.toString(16).padStart(6, '0');
const mk = (tag, cls) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
};
const MAP_LIST = [['canyon', 'Canyon'], ['lagoons', 'Lagoons'], ['random', 'Random']];

const SCREENS_HTML = `
<section class="screen s-menu" data-screen="menu">
  <div class="menu-wrap">
    <h1 class="title"><span class="title-a">BRAWL</span> <span class="title-b">ARENA</span></h1>
    <p class="tagline anim" style="--d:.05s">Grab crystals. Brawl. Win.</p>
    <div class="menu-btns">
      <button class="btn btn-gold big anim" style="--d:.12s" data-act="play-crystal"><span class="btn-t">CRYSTAL RUSH</span><span class="btn-s">3 vs 3</span></button>
      <button class="btn btn-blue anim" style="--d:.2s" data-act="play-training"><span class="btn-t">TRAINING</span><span class="btn-s">1 vs 1</span></button>
      <button class="btn btn-ghost anim" style="--d:.28s" data-act="open-settings"><span class="btn-t">SETTINGS</span></button>
    </div>
  </div>
</section>

<section class="screen s-select" data-screen="select">
  <div class="panel sel-panel anim">
    <header class="sel-head">
      <button class="btn btn-ghost btn-sm" data-act="back-menu"><span class="btn-t">BACK</span></button>
      <div class="sel-title"><h2>CHOOSE BRAWLER</h2><span class="mode-lbl">CRYSTAL RUSH 3v3</span></div>
    </header>
    <div class="sel-body">
      <div class="preview">
        <canvas class="preview-canvas"></canvas>
        <div class="preview-name">Rivet</div>
      </div>
      <div class="cards"></div>
      <div class="maps">${MAP_LIST.map(([id, name]) => `<button class="map-btn" data-act="map" data-map="${id}">${name}</button>`).join('')}</div>
      <div class="sel-foot"><button class="btn btn-green big" data-act="start"><span class="btn-t">START</span></button></div>
    </div>
  </div>
</section>

<section class="screen s-match" data-screen="matchmaking">
  <div class="panel mm-panel anim">
    <h2 class="mm-title">FINDING PLAYERS</h2>
    <div class="mode-lbl mm-mode">CRYSTAL RUSH 3v3</div>
    <div class="mm-slots"></div>
    <div class="mm-count"><span>STARTING IN</span> <b>0</b></div>
    <div class="mm-bar"><i class="mm-fill"></i></div>
  </div>
</section>

<section class="screen s-pause" data-screen="pause">
  <div class="panel pause-panel anim">
    <h2 class="pause-title">PAUSED</h2>
    <div class="pause-btns">
      <button class="btn btn-green" data-act="resume"><span class="btn-t">RESUME</span></button>
      <button class="btn btn-blue" data-act="pause-settings"><span class="btn-t">SETTINGS</span></button>
      <button class="btn btn-red" data-act="quit"><span class="btn-t">QUIT</span></button>
    </div>
  </div>
</section>

<section class="screen s-settings" data-screen="settings">
  <div class="panel set-panel anim">
    <h2 class="set-title">SETTINGS</h2>
    <div class="set-row"><span class="set-k">MASTER</span><input type="range" min="0" max="1" step="0.01" data-set="master" aria-label="Master volume"><span class="set-v" data-v="master">80%</span></div>
    <div class="set-row"><span class="set-k">SFX</span><input type="range" min="0" max="1" step="0.01" data-set="sfx" aria-label="Sound effects volume"><span class="set-v" data-v="sfx">90%</span></div>
    <div class="set-row"><span class="set-k">MUSIC</span><input type="range" min="0" max="1" step="0.01" data-set="music" aria-label="Music volume"><span class="set-v" data-v="music">50%</span></div>
    <div class="set-row set-q"><span class="set-k">QUALITY</span>
      <div class="seg-group">
        <button data-act="quality" data-q="auto">AUTO</button><button data-act="quality" data-q="high">HIGH</button><button data-act="quality" data-q="low">LOW</button>
      </div>
    </div>
    <div class="set-foot"><button class="btn btn-blue" data-act="settings-back"><span class="btn-t">BACK</span></button></div>
  </div>
</section>

<section class="screen s-results" data-screen="results">
  <div class="panel res-panel anim">
    <div class="res-banner"><span class="res-text">VICTORY</span><span class="res-sub"></span></div>
    <div class="res-body">
      <div class="mvp">
        <div class="mvp-tag">MVP</div>
        <div class="mvp-av">-</div>
        <div class="mvp-name">-</div>
        <div class="mvp-stats"></div>
      </div>
      <div class="res-table-wrap">
        <table class="res-table">
          <thead><tr><th>PLAYER</th><th class="c-br">BRAWLER</th><th>K</th><th>D</th><th>DMG</th><th>HEAL</th><th>CR</th></tr></thead>
          <tbody></tbody>
        </table>
      </div>
    </div>
    <div class="res-btns">
      <button class="btn btn-green" data-act="again"><span class="btn-t">PLAY AGAIN</span></button>
      <button class="btn btn-ghost" data-act="results-menu"><span class="btn-t">MENU</span></button>
    </div>
  </div>
</section>`;

const bar = (label, f) =>
  '<span class="bar"><span class="bar-l">' + label + '</span><span class="bar-t"><i style="--v:' + f.toFixed(3) + '"></i></span></span>';

export function buildScreens(wrap) {
  wrap.insertAdjacentHTML('beforeend', SCREENS_HTML);
  const q = (s) => wrap.querySelector(s);

  const screens = {};
  for (const s of wrap.querySelectorAll('.screen')) screens[s.dataset.screen] = s;

  // Brawler cards: stat bars normalised against the roster maximum.
  let maxHp = 1, maxSpd = 1, maxRng = 1;
  for (const id of BRAWLER_IDS) {
    const b = BRAWLERS[id];
    maxHp = Math.max(maxHp, b.hp);
    maxSpd = Math.max(maxSpd, b.speed);
    maxRng = Math.max(maxRng, b.attack.range);
  }
  const cardsEl = q('.cards');
  const cards = {};
  for (const id of BRAWLER_IDS) {
    const b = BRAWLERS[id];
    const card = mk('button', 'card');
    card.dataset.act = 'select';
    card.dataset.brawler = id;
    card.setAttribute('aria-pressed', 'false');
    card.style.setProperty('--c', hex(b.color));
    card.innerHTML = '<span class="card-av">' + b.name.charAt(0) + '</span>' +
      '<span class="card-id"><b class="card-name">' + b.name + '</b><span class="card-role">' + b.role + '</span></span>' +
      '<span class="card-bars">' + bar('HP', b.hp / maxHp) + bar('SPD', b.speed / maxSpd) + bar('RNG', b.attack.range / maxRng) + '</span>';
    cardsEl.appendChild(card);
    cards[id] = card;
  }

  const mapBtns = {};
  for (const b of wrap.querySelectorAll('.map-btn')) mapBtns[b.dataset.map] = b;

  const sliders = {};
  const setVals = {};
  for (const inp of wrap.querySelectorAll('input[data-set]')) {
    const key = inp.dataset.set;
    sliders[key] = inp;
    setVals[key] = q('[data-v="' + key + '"]');
  }

  const qualityBtns = {};
  for (const b of wrap.querySelectorAll('[data-act="quality"]')) qualityBtns[b.dataset.q] = b;

  return {
    screens, cards, mapBtns, sliders, setVals, qualityBtns,
    previewCanvas: q('.preview-canvas'),
    previewName: q('.preview-name'),
    mm: { slots: q('.mm-slots'), count: q('.mm-count b'), fill: q('.mm-fill'), items: [] },
    res: {
      banner: q('.res-banner'), text: q('.res-text'), sub: q('.res-sub'),
      mvpAv: q('.mvp-av'), mvpName: q('.mvp-name'), mvpStats: q('.mvp-stats'), tbody: q('.res-table tbody'),
    },
  };
}

export function markCard(R, id) {
  for (const k in R.cards) {
    const on = k === id;
    R.cards[k].classList.toggle('on', on);
    R.cards[k].setAttribute('aria-pressed', on ? 'true' : 'false');
  }
}

export function markMap(R, id) {
  for (const k in R.mapBtns) R.mapBtns[k].classList.toggle('on', k === id);
}

export function markQuality(R, quality) {
  for (const k in R.qualityBtns) R.qualityBtns[k].classList.toggle('on', k === quality);
}

export function setSliderUI(R, key, v) {
  R.sliders[key].value = v;
  R.setVals[key].textContent = Math.round(v * 100) + '%';
}

// Two team columns; slot 0 is the player.
export function mmBuild(R, n) {
  R.mm.slots.textContent = '';
  R.mm.items = [];
  const cols = [mk('div', 'mm-col t0'), mk('div', 'mm-col t1')];
  for (let i = 0; i < n; i++) {
    const team = i < n / 2 ? 0 : 1;
    const s = mk('div', 'slot t' + team + (i === 0 ? ' me' : ''));
    s.innerHTML = '<span class="slot-av"></span><span class="slot-name">Searching</span>';
    cols[team].appendChild(s);
    R.mm.items.push(s);
  }
  R.mm.slots.appendChild(cols[0]);
  R.mm.slots.appendChild(cols[1]);
}

export function mmFill(R, i, name) {
  const s = R.mm.items[i];
  if (!s || s.classList.contains('on')) return;
  s.classList.add('on');
  s.querySelector('.slot-name').textContent = name;
}

const statsOf = (p) => {
  const s = p.stats || p;
  return { kills: s.kills | 0, deaths: s.deaths | 0, damage: s.damage || 0, healing: s.healing || 0, crystals: s.crystals | 0 };
};
const kfmt = (v) => (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(Math.round(v)));
const cell = (txt, cls) => {
  const td = mk('td', cls);
  td.textContent = txt;
  return td;
};
const brawlerName = (id) => (BRAWLERS[id] ? BRAWLERS[id].name : '');

// r = { outcome: 'victory'|'defeat'|'draw', crystals?: [blue, red], mvp?: player|name, players: [player] }
// player = { name, brawlerId, team, isPlayer, stats: { kills, deaths, damage, healing, crystals } } (or flat fields).
export function fillResults(R, r) {
  const res = R.res;
  const outcome = r.outcome === 'victory' || r.outcome === 'defeat' ? r.outcome : 'draw';
  res.text.textContent = outcome === 'victory' ? 'VICTORY' : outcome === 'defeat' ? 'DEFEAT' : 'DRAW';
  res.banner.className = 'res-banner ' + outcome;
  res.sub.textContent = r.crystals ? 'Crystals ' + (r.crystals[0] | 0) + ' : ' + (r.crystals[1] | 0) : '';

  const list = r.players || [];
  let mvp = null;
  let best = -Infinity;
  for (const p of list) {
    const s = statsOf(p);
    const score = s.kills * 3 + s.crystals * 2 + (s.damage + s.healing) / 2000;
    if (score > best) { best = score; mvp = p; }
  }
  if (r.mvp) mvp = typeof r.mvp === 'string' ? (list.find((p) => p.name === r.mvp) || mvp) : r.mvp;
  if (mvp) {
    const s = statsOf(mvp);
    res.mvpName.textContent = mvp.name || '';
    res.mvpAv.textContent = (mvp.name || '?').charAt(0);
    const b = BRAWLERS[mvp.brawlerId];
    res.mvpAv.style.setProperty('--c', b ? hex(b.color) : '#ffffff');
    res.mvpStats.textContent = brawlerName(mvp.brawlerId) + ' - K ' + s.kills + ' D ' + s.deaths + ' - ' + kfmt(s.damage) + ' dmg';
  } else {
    res.mvpName.textContent = '-';
    res.mvpAv.textContent = '-';
    res.mvpStats.textContent = '';
  }

  res.tbody.textContent = '';
  for (const p of list) {
    const s = statsOf(p);
    const tr = mk('tr', 't' + (p.team === 1 ? 1 : 0) + (p.isPlayer ? ' me' : ''));
    tr.append(
      cell(p.name || '', 'c-name'), cell(brawlerName(p.brawlerId), 'c-br'),
      cell(String(s.kills), ''), cell(String(s.deaths), ''), cell(kfmt(s.damage), ''),
      cell(kfmt(s.healing), ''), cell(String(s.crystals), ''),
    );
    res.tbody.appendChild(tr);
  }
}
