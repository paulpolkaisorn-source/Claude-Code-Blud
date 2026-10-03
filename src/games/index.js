// Game registry: metadata + lazy loaders + hand-drawn card art.

const svg = (id, body) =>
  `<svg viewBox="0 0 300 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${body.replaceAll('$id', id)}</svg>`;

const bubbleArt = (() => {
  let c = '';
  const cols = ['#ff9ec8', '#ffc2a8', '#c3a6ff', '#9fd3ff'];
  for (let r = 0; r < 5; r++) {
    for (let k = 0; k < 11; k++) {
      const x = 14 + k * 28 + (r % 2) * 14;
      const y = 14 + r * 28;
      const popped = (r * 7 + k * 3) % 5 === 0;
      c += popped
        ? `<circle cx="${x}" cy="${y}" r="11" fill="rgba(60,20,90,.12)"/><circle cx="${x}" cy="${y}" r="11" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1"/>`
        : `<circle cx="${x}" cy="${y}" r="12" fill="url(#$id-b${(r + k) % 4})"/><ellipse cx="${x - 4}" cy="${y - 5}" rx="3.6" ry="2.2" fill="#fff" opacity=".85" transform="rotate(-30 ${x - 4} ${y - 5})"/>`;
    }
  }
  return svg('bub', `<defs><linearGradient id="$id-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8fc0"/><stop offset="1" stop-color="#8c6bff"/></linearGradient>
  ${cols.map((col, i) => `<radialGradient id="$id-b${i}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".55" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="${col}" stop-opacity=".7"/></radialGradient>`).join('')}</defs>
  <rect width="300" height="150" fill="url(#$id-bg)"/>${c}`);
})();

const sandArt = (() => {
  let lines = '';
  for (let i = 0; i < 9; i++) {
    const y = 28 + i * 13;
    lines += `<path d="M-10 ${y} C 60 ${y - 18}, 120 ${y + 18}, 190 ${y} S 280 ${y - 14}, 320 ${y + 4}" fill="none" stroke="rgba(120,84,40,.38)" stroke-width="3.2"/><path d="M-10 ${y + 4} C 60 ${y - 14}, 120 ${y + 22}, 190 ${y + 4} S 280 ${y - 10}, 320 ${y + 8}" fill="none" stroke="rgba(255,244,214,.55)" stroke-width="2"/>`;
  }
  return svg('sand', `<defs><linearGradient id="$id-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9d3a5"/><stop offset="1" stop-color="#c9a870"/></linearGradient>
  <radialGradient id="$id-r" cx=".35" cy=".3" r=".9"><stop offset="0" stop-color="#8d8a87"/><stop offset="1" stop-color="#2f2d33"/></radialGradient></defs>
  <rect width="300" height="150" fill="url(#$id-bg)"/>${lines}
  <ellipse cx="214" cy="84" rx="58" ry="26" fill="none" stroke="rgba(120,84,40,.3)" stroke-width="3"/>
  <ellipse cx="214" cy="84" rx="42" ry="19" fill="none" stroke="rgba(120,84,40,.3)" stroke-width="3"/>
  <ellipse cx="214" cy="90" rx="30" ry="10" fill="rgba(60,40,10,.35)"/>
  <path d="M188 84 q4-24 28-24 q26 2 26 22 q0 14-26 16 q-28 0-28-14z" fill="url(#$id-r)"/>
  <ellipse cx="208" cy="72" rx="9" ry="4" fill="#fff" opacity=".28"/>`);
})();

const rainArt = (() => {
  const dots = [[40, 40, 22, '#ffb347'], [95, 95, 30, '#ff5fa8'], [150, 45, 18, '#7ad7ff'], [215, 100, 28, '#ffd27a'], [260, 40, 24, '#b48cff'], [60, 120, 16, '#7affc9'], [180, 20, 14, '#fff']];
  return svg('rain', `<defs><linearGradient id="$id-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#171d3f"/><stop offset="1" stop-color="#2a1740"/></linearGradient>
  <filter id="$id-bl"><feGaussianBlur stdDeviation="6"/></filter>
  <radialGradient id="$id-d" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset=".8" stop-color="#000" stop-opacity=".25"/><stop offset="1" stop-color="#fff" stop-opacity=".5"/></radialGradient></defs>
  <rect width="300" height="150" fill="url(#$id-bg)"/>
  <g filter="url(#$id-bl)">${dots.map(([x, y, r, c]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity=".75"/>`).join('')}</g>
  <rect width="300" height="150" fill="#b8c8e8" opacity=".18"/>
  ${[[70, 60, 9], [130, 100, 12], [200, 55, 8], [245, 90, 13], [100, 28, 6], [35, 105, 7]].map(([x, y, r]) => `<g><circle cx="${x}" cy="${y}" r="${r}" fill="url(#$id-d)"/><ellipse cx="${x - r * 0.3}" cy="${y - r * 0.4}" rx="${r * 0.28}" ry="${r * 0.18}" fill="#fff" opacity=".85"/></g>`).join('')}
  <path d="M130 112 q0 22 0 34" stroke="rgba(255,255,255,.2)" stroke-width="3" stroke-linecap="round"/>`);
})();

const slimeArt = svg('slime', `<defs><linearGradient id="$id-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d8fff0"/><stop offset="1" stop-color="#b9a7ff"/></linearGradient>
  <radialGradient id="$id-s" cx=".35" cy=".28" r=".85"><stop offset="0" stop-color="#ffe3f4"/><stop offset=".45" stop-color="#ff8fc8"/><stop offset="1" stop-color="#c2408f"/></radialGradient></defs>
  <rect width="300" height="150" fill="url(#$id-bg)"/>
  <ellipse cx="150" cy="128" rx="82" ry="12" fill="rgba(60,20,90,.28)"/>
  <path d="M70 118 C 52 76, 96 30, 150 34 C 206 30, 252 78, 230 118 C 206 132, 96 132, 70 118z" fill="url(#$id-s)"/>
  <ellipse cx="116" cy="62" rx="22" ry="11" fill="#fff" opacity=".7" transform="rotate(-24 116 62)"/>
  <circle cx="186" cy="92" r="6" fill="#fff" opacity=".35"/><circle cx="172" cy="100" r="3" fill="#fff" opacity=".4"/><circle cx="104" cy="98" r="4" fill="#fff" opacity=".3"/>
  <ellipse cx="190" cy="108" rx="26" ry="8" fill="#fff" opacity=".13"/>`);

const pondArt = (() => {
  let rings = '';
  for (let i = 1; i <= 5; i++) rings += `<ellipse cx="170" cy="82" rx="${i * 26}" ry="${i * 9.5}" fill="none" stroke="rgba(190,255,250,${0.62 - i * 0.1})" stroke-width="${2.6 - i * 0.28}"/>`;
  return svg('pond', `<defs><radialGradient id="$id-bg" cx=".55" cy=".5" r=".9"><stop offset="0" stop-color="#2f8f9b"/><stop offset="1" stop-color="#0a2a3a"/></radialGradient>
  <radialGradient id="$id-m" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
  <rect width="300" height="150" fill="url(#$id-bg)"/><ellipse cx="60" cy="24" rx="46" ry="16" fill="url(#$id-m)"/>${rings}
  <path d="M60 104 a30 12 0 1 0 58 -4 l-26 8z" fill="#4fae6b"/><path d="M60 104 a30 12 0 1 0 58 -4" fill="none" stroke="#2c7a49" stroke-width="2"/>
  <g transform="translate(240 112)"><ellipse cx="0" cy="4" rx="22" ry="8" fill="#3c9a5a"/>${[-26, -13, 0, 13, 26].map((a) => `<ellipse cx="0" cy="-5" rx="5" ry="11" fill="#ffc6e0" transform="rotate(${a})"/>`).join('')}<circle cy="-2" r="4" fill="#ffe28a"/></g>
  <path d="M168 60 q10 -6 18 0 q-6 8 -18 0z" fill="#ff9a4d" opacity=".85"/>`);
})();

const chimesArt = (() => {
  const cols = ['#ff9ec8', '#ffc59a', '#fff2a8', '#9fffd9', '#9fd3ff', '#c3a6ff', '#ff9ec8'];
  const bars = cols.map((c, i) => {
    const x = 40 + i * 37;
    const h = 46 + ((i * 17) % 4) * 14;
    return `<line x1="${x}" y1="34" x2="${x}" y2="50" stroke="rgba(255,255,255,.5)" stroke-width="1"/>
    <circle cx="${x}" cy="${50 + h / 2}" r="${h / 2 + 8}" fill="url(#$id-g${i})" opacity=".55"/>
    <path d="M${x} 50 l7 7 v${h - 14} l-7 7 l-7 -7 v-${h - 14}z" fill="${c}" opacity=".92"/><path d="M${x} 50 l-7 7 v${h - 14} l7 7z" fill="#fff" opacity=".28"/>`;
  }).join('');
  const stars = Array.from({ length: 30 }, (_, i) => `<circle cx="${(i * 97) % 300}" cy="${(i * 53) % 90}" r="${0.6 + (i % 3) * 0.4}" fill="#fff" opacity="${0.35 + (i % 4) * 0.15}"/>`).join('');
  return svg('chimes', `<defs><linearGradient id="$id-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f1034"/><stop offset="1" stop-color="#3a1d5c"/></linearGradient>
  ${cols.map((c, i) => `<radialGradient id="$id-g${i}"><stop offset="0" stop-color="${c}" stop-opacity=".7"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`).join('')}
  <radialGradient id="$id-moon"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#fff4d6"/><stop offset="1" stop-color="#fff4d6" stop-opacity="0"/></radialGradient></defs>
  <rect width="300" height="150" fill="url(#$id-bg)"/>${stars}<circle cx="252" cy="26" r="26" fill="url(#$id-moon)" opacity=".8"/>
  <rect x="22" y="28" width="256" height="7" rx="3.5" fill="#6b4a3a"/>${bars}`);
})();

export const GAMES = [
  {
    id: 'bubbles',
    title: 'Bubble Wrap',
    tagline: 'Crisp, satisfying pops. Tap, or sweep across the sheet.',
    kind: '2D',
    accent: '#ff8fc0',
    art: bubbleArt,
    load: () => import('./bubbles.js'),
  },
  {
    id: 'sand',
    title: 'Zen Sand',
    tagline: 'Rake slow lines through warm sand. Place a stone.',
    kind: '2D',
    accent: '#e8c98f',
    art: sandArt,
    load: () => import('./sand.js'),
  },
  {
    id: 'rain',
    title: 'Rainy Window',
    tagline: 'Wipe the fog off cold glass and watch the city blur.',
    kind: '2D',
    accent: '#7aa8ff',
    art: rainArt,
    load: () => import('./rain.js'),
  },
  {
    id: 'slime',
    title: 'Slime Squish',
    tagline: 'Press, stretch and squelch a glossy 3D blob.',
    kind: '3D',
    accent: '#ff7fc0',
    art: slimeArt,
    load: () => import('./slime.js'),
  },
  {
    id: 'pond',
    title: 'Moonlit Pond',
    tagline: 'Drop pebbles into still water. Ripples sing back.',
    kind: '3D',
    accent: '#4fd1c5',
    art: pondArt,
    load: () => import('./pond.js'),
  },
  {
    id: 'chimes',
    title: 'Crystal Chimes',
    tagline: 'Brush through glowing glass bells in the night air.',
    kind: '3D',
    accent: '#c3a6ff',
    art: chimesArt,
    load: () => import('./chimes.js'),
  },
];
