// touch.js — mobile touch overlay for input.js. Injects its own <style> and DOM into the UI root.
// Left half (lower 62%): floating move stick; the ring spawns where the thumb lands, knob travel is JOY_RADIUS.
// Bottom right: attack pad with the super pad above it. Every control tracks one pointer id, so the move stick
// and a pad can be used at the same time. A drag past DEADZONE aims (JOY_RADIUS maps to aimLen 1); releasing
// after aiming fires with that aim; a quick tap (< TAP_MS, never past DEADZONE) sends autoFire / autoSuper.
// Edges go into the `pend` object shared with input.js.
import { PLAYER_COLOR, CRYSTAL_COLOR, OUTLINE_COLOR } from '../contracts.js';

export const JOY_RADIUS = 52;  // px: knob travel. Full deflection = move magnitude 1 / aimLen 1
export const DEADZONE = 12;    // px: a drag past this starts aiming
export const TAP_MS = 350;     // ms: quick-tap window (lenient for real thumbs; a longer still press cancels)
const MOVE_DEAD = 4;           // px: the move stick ignores jitter below this
const RING_HALF = 78;          // px: floating ring is 156px across

const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const INK = hex(OUTLINE_COLOR);
const C_MOVE = hex(PLAYER_COLOR);
const C_ATK = '#ffb347';
const C_SUP = hex(CRYSTAL_COLOR);

const CSS = `
.bi-touch{position:fixed;left:0;top:0;width:100%;height:100%;z-index:60;display:none;pointer-events:none;
  touch-action:none;overflow:hidden;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;
  -webkit-tap-highlight-color:transparent;font-family:"Trebuchet MS","Segoe UI",system-ui,sans-serif}
.bi-touch.bi-on{display:block}
.bi-zone{position:absolute;left:0;bottom:0;width:50%;height:62%;pointer-events:auto;touch-action:none}
.bi-ring{position:absolute;left:0;top:0;width:156px;height:156px;box-sizing:border-box;border-radius:50%;
  border:5px solid ${INK};background:rgba(255,255,255,.12);box-shadow:0 6px 0 rgba(26,18,48,.45);
  pointer-events:none;display:none;will-change:transform}
.bi-ring.bi-on{display:block}
.bi-ring-move{background:rgba(77,255,138,.16)}
.bi-ring-atk{background:rgba(255,179,71,.18)}
.bi-ring-sup{background:rgba(196,107,255,.2)}
.bi-ring i{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px 0 0 -26px;box-sizing:border-box;
  border-radius:50%;border:4px solid ${INK};box-shadow:0 4px 0 ${INK};will-change:transform}
.bi-ring-move i{background:radial-gradient(circle at 35% 30%,#fff 0,${C_MOVE} 50%,#1fa35a 100%)}
.bi-ring-atk i{background:radial-gradient(circle at 35% 30%,#fff 0,${C_ATK} 50%,#e8701a 100%)}
.bi-ring-sup i{background:radial-gradient(circle at 35% 30%,#fff 0,${C_SUP} 50%,#8a3fd6 100%)}
.bi-pad{position:absolute;width:124px;height:124px;border-radius:50%;pointer-events:auto;touch-action:none}
.bi-pad::before{content:"";position:absolute;left:-14px;top:-14px;right:-14px;bottom:-14px;border-radius:50%}
.bi-atk{right:calc(16px + env(safe-area-inset-right,0px));bottom:calc(26px + env(safe-area-inset-bottom,0px))}
.bi-sup{width:88px;height:88px;right:calc(34px + env(safe-area-inset-right,0px));
  bottom:calc(156px + env(safe-area-inset-bottom,0px))}
.bi-face{position:absolute;left:0;top:0;right:0;bottom:0;box-sizing:border-box;border-radius:50%;
  border:5px solid ${INK};display:flex;align-items:center;justify-content:center;box-shadow:0 7px 0 ${INK};
  transition:transform .07s ease-out,box-shadow .07s ease-out,filter .2s,opacity .2s}
.bi-face svg{width:44%;height:44%;overflow:visible;filter:drop-shadow(0 3px 0 ${INK})}
.bi-atk .bi-face{background:radial-gradient(circle at 34% 26%,#fff3d6 0,#ffb347 42%,#f0751f 100%)}
.bi-sup .bi-face{background:radial-gradient(circle at 34% 26%,#f3e1ff 0,#c46bff 46%,#8a3fd6 100%)}
.bi-pad.bi-down .bi-face{transform:translateY(4px) scale(.94);box-shadow:0 3px 0 ${INK}}
.bi-sup.bi-dim .bi-face{filter:grayscale(.8) brightness(.75);opacity:.7}
.bi-sup.bi-ready .bi-face{animation:bi-pulse 1s ease-in-out infinite;
  box-shadow:0 7px 0 ${INK},0 0 0 6px rgba(196,107,255,.5),0 0 28px 10px rgba(196,107,255,.55)}
@keyframes bi-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}
@media (prefers-reduced-motion:reduce){.bi-sup.bi-ready .bi-face{animation:none}}
`;

const ICON_ATK = '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><circle cx="12" cy="12" r="6"/><path d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5"/></g></svg>';
const ICON_SUP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.6 1.8 4.8 13.2h6.1L9.6 22.2l9.6-12.1h-6.2z" fill="#fff" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>';

const MARKUP = `<style>${CSS}</style>
<div class="bi-zone bi-move"></div>
<div class="bi-ring bi-ring-move"><i></i></div>
<div class="bi-pad bi-atk"><div class="bi-face">${ICON_ATK}</div></div>
<div class="bi-ring bi-ring-atk"><i></i></div>
<div class="bi-pad bi-sup"><div class="bi-face">${ICON_SUP}</div></div>
<div class="bi-ring bi-ring-sup"><i></i></div>`;

function ctl(kind, el, ring) {
  return { kind, el, ring, knob: ring.firstElementChild, id: -1, ox: 0, oy: 0, t0: 0, aimed: false };
}
const place = (el, x, y) => { el.style.transform = `translate3d(${x - RING_HALF}px,${y - RING_HALF}px,0)`; };
const knob = (c, x, y) => { c.knob.style.transform = `translate3d(${x}px,${y}px,0)`; };

// host: element that receives the overlay. pend: { fire, superFire, autoFire, autoSuper } edges (owned by input.js).
// Returns T: move {x,z} (unit-capped), aimX/aimZ/aimLen/hasAim (last drag aim), aiming, superAiming, and
// setVisible(bool), setLive(bool), setReady(bool), reset(), dispose().
export function createTouch(host, pend) {
  const layer = document.createElement('div');
  layer.className = 'bi-touch';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = MARKUP;
  host.appendChild(layer);

  const mv = ctl('move', layer.querySelector('.bi-zone'), layer.querySelector('.bi-ring-move'));
  const atk = ctl('atk', layer.querySelector('.bi-atk'), layer.querySelector('.bi-ring-atk'));
  const sup = ctl('sup', layer.querySelector('.bi-sup'), layer.querySelector('.bi-ring-sup'));
  const all = [mv, atk, sup];

  let live = true, ready = null, disposed = false;

  const T = {
    move: { x: 0, z: 0 }, aimX: 0, aimZ: -1, aimLen: 0, hasAim: false, aiming: false, superAiming: false,
    setVisible, setLive, setReady, reset, dispose,
  };

  function refresh() {
    T.aiming = atk.id !== -1 && atk.aimed;
    T.superAiming = sup.id !== -1 && sup.aimed;
  }

  function byId(id) {
    for (let i = 0; i < 3; i++) if (all[i].id === id) return all[i];
    return null;
  }

  // Attack / super: direction and length from the touch-down origin, once the drag passes DEADZONE.
  function aimFrom(c, e) {
    const dx = e.clientX - c.ox, dy = e.clientY - c.oy;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < DEADZONE) return;
    c.aimed = true;
    T.aimX = dx / d;
    T.aimZ = dy / d;
    T.aimLen = d >= JOY_RADIUS ? 1 : d / JOY_RADIUS;
    T.hasAim = true;
  }

  function onDown(c, e) {
    if (!live || disposed || c.id !== -1) return;
    c.id = e.pointerId;
    c.ox = e.clientX;
    c.oy = e.clientY;
    c.t0 = performance.now();
    c.aimed = false;
    try { c.el.setPointerCapture(e.pointerId); } catch (_) { /* synthetic pointer: nothing to capture */ }
    c.el.classList.add('bi-down');
    c.ring.classList.add('bi-on');
    place(c.ring, c.ox, c.oy);
    knob(c, 0, 0);
    if (c.kind === 'move') { T.move.x = 0; T.move.z = 0; }
    e.preventDefault();
    refresh();
  }

  // Window-level so drags keep tracking even when the thumb leaves the control.
  function onMove(e) {
    const c = byId(e.pointerId);
    if (!c) return;
    const dx = e.clientX - c.ox, dy = e.clientY - c.oy;
    const d = Math.sqrt(dx * dx + dy * dy);
    const k = d > JOY_RADIUS ? JOY_RADIUS / d : 1;
    knob(c, dx * k, dy * k);
    if (c.kind === 'move') {
      if (d < MOVE_DEAD) { T.move.x = 0; T.move.z = 0; }
      else { const m = d > JOY_RADIUS ? d : JOY_RADIUS; T.move.x = dx / m; T.move.z = dy / m; }
    } else {
      aimFrom(c, e);
      refresh();
    }
  }

  function onEnd(e, cancel) {
    const c = byId(e.pointerId);
    if (!c) return;
    if (!cancel && c.kind !== 'move') aimFrom(c, e);
    const held = performance.now() - c.t0;
    try { c.el.releasePointerCapture(e.pointerId); } catch (_) { /* already released */ }
    c.id = -1;
    c.el.classList.remove('bi-down');
    c.ring.classList.remove('bi-on');
    if (c.kind === 'move') {
      T.move.x = 0; T.move.z = 0;
    } else if (!cancel) {
      if (c.aimed) {
        if (c.kind === 'atk') pend.fire = true; else pend.superFire = true;
      } else if (held < TAP_MS) {
        if (c.kind === 'atk') pend.autoFire = true; else pend.autoSuper = true;
      }
    }
    c.aimed = false;
    refresh();
  }

  const onUp = (e) => onEnd(e, false);
  const onCancel = (e) => onEnd(e, true);

  function reset() {
    for (let i = 0; i < 3; i++) {
      const c = all[i];
      if (c.id !== -1) { try { c.el.releasePointerCapture(c.id); } catch (_) { /* already released */ } }
      c.id = -1;
      c.aimed = false;
      c.el.classList.remove('bi-down');
      c.ring.classList.remove('bi-on');
    }
    T.move.x = 0; T.move.z = 0;
    T.aiming = false; T.superAiming = false;
    pend.fire = false; pend.superFire = false; pend.autoFire = false; pend.autoSuper = false;
  }

  function setVisible(on) {
    layer.classList.toggle('bi-on', !!on);
    if (!on) reset();
  }

  function setLive(on) {
    live = !!on;
    if (!live) reset();
  }

  function setReady(on) {
    on = !!on;
    if (on === ready) return;
    ready = on;
    sup.el.classList.toggle('bi-ready', on);
    sup.el.classList.toggle('bi-dim', !on);
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    reset();
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
    layer.remove();
  }

  mv.el.addEventListener('pointerdown', (e) => onDown(mv, e));
  atk.el.addEventListener('pointerdown', (e) => onDown(atk, e));
  sup.el.addEventListener('pointerdown', (e) => onDown(sup, e));
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onCancel);

  setReady(false);
  return T;
}
