// numbers.js — pooled DOM damage/heal numbers in the overlay. Pop + float + fade over 0.8 s, bold and outlined,
// placed each frame with worldToScreen. The node count is fixed at creation; when every node is busy the oldest is reused.
const POOL = 48;
const LIFE = 0.8;
const MERGE = 0.15;
const STYLE_ID = 'fx-num-style';
const CSS = `
.fx-layer{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:5}
.fx-num{position:absolute;left:0;top:0;opacity:0;white-space:nowrap;pointer-events:none;
  font:900 24px/1 "Arial Rounded MT Bold",ui-rounded,"SF Pro Rounded","Nunito","Trebuchet MS",system-ui,sans-serif;color:#ffffff;
  text-shadow:-2px -2px 0 #1a1230,2px -2px 0 #1a1230,-2px 2px 0 #1a1230,2px 2px 0 #1a1230,0 3px 0 #1a1230;
  will-change:transform,opacity}
.fx-num.heal{color:#7dff9e}
.fx-num.super{color:#ffd23d;font-size:36px}
@media (max-width:600px){.fx-num{font-size:17px}.fx-num.super{font-size:25px}}
`;

// kind: 0 = damage, 1 = super damage (bigger, gold), 2 = heal (green, prefixed with +).
export function createNumbers({ overlay, worldToScreen }) {
  if (!document.getElementById(STYLE_ID)) {
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  const host = overlay || document.body;
  const layer = document.createElement('div');
  layer.className = 'fx-layer';
  host.appendChild(layer);

  const items = [];
  for (let i = 0; i < POOL; i++) {
    const el = document.createElement('span');
    el.className = 'fx-num';
    layer.appendChild(el);
    items.push({ el, on: false, age: 0, x: 0, y: 0, z: 0, key: null, kind: 0, value: 0 });
  }
  const out = { x: 0, y: 0, visible: false };

  // key (optional, e.g. the target entity): hits on the same key within MERGE s add up into one number (pellets).
  function spawn(value, x, y, z, kind = 0, key = null) {
    if (key !== null) {
      for (let i = 0; i < POOL; i++) {
        const it = items[i];
        if (!it.on || it.key !== key || it.kind !== kind || it.age > (kind === 2 ? 0.3 : MERGE)) continue;
        it.value += value || 0;
        it.age = 0; it.x = x; it.y = y; it.z = z;
        const v = Math.round(it.value);
        it.el.textContent = kind === 2 ? '+' + v : String(v);
        return i;
      }
    }
    let pick = -1, oldest = 0, oldestAge = -1;
    for (let i = 0; i < POOL; i++) {
      const it = items[i];
      if (!it.on) { pick = i; break; }
      if (it.age > oldestAge) { oldestAge = it.age; oldest = i; }
    }
    if (pick < 0) pick = oldest;
    const it = items[pick];
    const v = Math.round(value || 0);
    it.on = true; it.age = 0; it.x = x; it.y = y; it.z = z; it.key = key; it.kind = kind; it.value = value || 0;
    it.el.textContent = kind === 2 ? '+' + v : String(v);
    it.el.className = 'fx-num' + (kind === 1 ? ' super' : kind === 2 ? ' heal' : '');
    return pick;
  }

  function update(dt) {
    for (let i = 0; i < POOL; i++) {
      const it = items[i];
      if (!it.on) continue;
      it.age += dt;
      if (it.age >= LIFE) { it.on = false; it.el.style.opacity = '0'; continue; }
      worldToScreen(it.x, it.y, it.z, out);
      if (!out.visible) { it.el.style.opacity = '0'; continue; }
      const t = it.age / LIFE;
      const pop = t < 0.12 ? 1.6 - 0.6 * (t / 0.12) : 1;           // 1.6 -> 1.0 punch
      const rise = (1 - (1 - t) * (1 - t)) * 44;                    // ease-out float, px
      const alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;             // fade in the last 40%
      it.el.style.transform = 'translate(' + Math.round(out.x) + 'px,' + Math.round(out.y - rise) +
        'px) translate(-50%,-50%) scale(' + pop.toFixed(2) + ')';
      it.el.style.opacity = alpha.toFixed(2);
    }
  }

  function clear() {
    for (let i = 0; i < POOL; i++) {
      items[i].on = false;
      items[i].el.style.opacity = '0';
    }
  }

  function activeCount() {
    let c = 0;
    for (let i = 0; i < POOL; i++) if (items[i].on) c++;
    return c;
  }

  return {
    spawn,
    update,
    clear,
    activeCount,
    domCount() { return layer.childElementCount; },
    dispose() { layer.remove(); },
  };
}
