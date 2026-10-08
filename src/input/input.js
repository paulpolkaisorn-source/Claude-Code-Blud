// input.js — player input. Desktop: WASD/arrows move on the screen axes (up = -z, right = +x); the mouse aims at
// the ground under the cursor (screenToGround), LMB fires, RMB or E superFires, Q/Space autoFire, F autoSuper.
// Esc/P emit EV.UI_PAUSE. Mobile: the touch overlay (touch.js) replaces the mouse for aiming and firing; the
// keyboard still works. update(player) writes player.input (moveX/moveZ, aimX/aimZ/aimLen, aiming, superAiming)
// and ORs the one-frame edges (fire, superFire, autoFire, autoSuper). The game clears those after use.
import { BRAWLERS, EV } from '../contracts.js';
import { createTouch } from './touch.js';

const HALF_SQRT2 = Math.SQRT1_2;

// Physical key (e.code); falls back to e.key for synthetic events that only carry key.
function keyName(e) {
  if (e.code) return e.code;
  const k = e.key || '';
  if (k === ' ') return 'Space';
  return k.length === 1 ? 'Key' + k.toUpperCase() : k;
}

export function createInput({ canvas, root, bus, mobile = false, screenToGround }) {
  const keys = { up: false, down: false, left: false, right: false, superKey: false };
  const pend = { fire: false, superFire: false, autoFire: false, autoSuper: false };   // one-frame edges
  const cur = { x: 0, y: 0, known: false, inside: false, superBtn: false };             // desktop cursor
  const ground = { x: 0, z: 0 };
  const touch = mobile ? createTouch(root || document.body, pend) : null;
  let enabled = true, disposed = false;

  function onKeyDown(e) {
    const k = keyName(e);
    if (k === 'Escape' || k === 'KeyP') {
      if (!e.repeat) bus.emit(EV.UI_PAUSE, {});   // game decides: pause while playing, resume while paused
      return;
    }
    if (!enabled) return;
    switch (k) {
      case 'KeyW': case 'ArrowUp': keys.up = true; break;
      case 'KeyS': case 'ArrowDown': keys.down = true; break;
      case 'KeyA': case 'ArrowLeft': keys.left = true; break;
      case 'KeyD': case 'ArrowRight': keys.right = true; break;
      case 'KeyQ': case 'Space':
        if (!e.repeat) pend.autoFire = true;
        break;
      case 'KeyF':
        if (!e.repeat) pend.autoSuper = true;
        break;
      case 'KeyE':
        if (!e.repeat) pend.superFire = true;
        keys.superKey = true;
        break;
      default:
        return;
    }
    if (k === 'Space' || k.startsWith('Arrow')) e.preventDefault();
  }

  function onKeyUp(e) {
    switch (keyName(e)) {
      case 'KeyW': case 'ArrowUp': keys.up = false; break;
      case 'KeyS': case 'ArrowDown': keys.down = false; break;
      case 'KeyA': case 'ArrowLeft': keys.left = false; break;
      case 'KeyD': case 'ArrowRight': keys.right = false; break;
      case 'KeyE': keys.superKey = false; break;
      default: break;
    }
  }

  function onBlur() {
    keys.up = keys.down = keys.left = keys.right = keys.superKey = false;
    cur.superBtn = false;
    if (touch) touch.reset();
  }

  function onContextMenu(e) { e.preventDefault(); }

  function setCursor(e) {
    const r = canvas.getBoundingClientRect();
    cur.x = e.clientX - r.left;
    cur.y = e.clientY - r.top;
    cur.known = true;
  }
  function onCanvasEnter(e) { cur.inside = true; setCursor(e); }
  function onCanvasMove(e) { cur.inside = true; setCursor(e); }
  function onCanvasLeave() { cur.inside = false; }
  function onCanvasDown(e) {
    cur.inside = true;
    setCursor(e);
    if (!enabled) return;
    if (e.button === 0) pend.fire = true;
    else if (e.button === 2) { pend.superFire = true; cur.superBtn = true; }
  }
  function onWinUp(e) { if (e.button === 2) cur.superBtn = false; }
  function onWinCancel() { cur.superBtn = false; }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  window.addEventListener('contextmenu', onContextMenu);
  if (!mobile) {
    canvas.addEventListener('pointerenter', onCanvasEnter);
    canvas.addEventListener('pointermove', onCanvasMove);
    canvas.addEventListener('pointerleave', onCanvasLeave);
    canvas.addEventListener('pointerdown', onCanvasDown);
    window.addEventListener('pointerup', onWinUp);
    window.addEventListener('pointercancel', onWinCancel);
  }

  return {
    update(player) {
      if (disposed) return;
      const inp = player.input;
      if (!enabled) {
        inp.moveX = 0; inp.moveZ = 0; inp.aiming = false; inp.superAiming = false;
        pend.fire = false; pend.superFire = false; pend.autoFire = false; pend.autoSuper = false;
        return;
      }

      let mx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      let mz = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
      if (mx !== 0 && mz !== 0) { mx *= HALF_SQRT2; mz *= HALF_SQRT2; }
      let superAiming = keys.superKey || cur.superBtn;
      let aiming = false;

      if (touch) {
        mx += touch.move.x;
        mz += touch.move.z;
        superAiming = superAiming || touch.superAiming;
        aiming = touch.aiming || touch.superAiming;
        if (touch.hasAim) { inp.aimX = touch.aimX; inp.aimZ = touch.aimZ; inp.aimLen = touch.aimLen; }
      } else if (cur.known && screenToGround) {
        screenToGround(cur.x, cur.y, ground);
        const dx = ground.x - player.x, dz = ground.z - player.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        const ok = d > 1e-4;                       // also false for NaN
        if (ok) { inp.aimX = dx / d; inp.aimZ = dz / d; }
        const s = BRAWLERS[player.brawlerId];
        const range = s ? (superAiming ? s.super.range : s.attack.range) : 1;
        const f = ok ? d / range : 0;
        inp.aimLen = f > 1 ? 1 : f;
        aiming = cur.inside;
      }

      const m2 = mx * mx + mz * mz;
      if (m2 > 1) { const k = 1 / Math.sqrt(m2); mx *= k; mz *= k; }
      inp.moveX = mx;
      inp.moveZ = mz;
      inp.aiming = aiming;
      inp.superAiming = superAiming;

      if (pend.fire) { inp.fire = true; pend.fire = false; }
      if (pend.superFire) { inp.superFire = true; pend.superFire = false; }
      if (pend.autoFire) { inp.autoFire = true; pend.autoFire = false; }
      if (pend.autoSuper) { inp.autoSuper = true; pend.autoSuper = false; }
    },

    setEnabled(on) {
      enabled = !!on;
      if (!enabled) {
        keys.up = keys.down = keys.left = keys.right = keys.superKey = false;
        cur.superBtn = false;
        pend.fire = false; pend.superFire = false; pend.autoFire = false; pend.autoSuper = false;
      }
      if (touch) touch.setLive(enabled);
    },

    setTouchVisible(on) { if (touch) touch.setVisible(on); },

    setSuperReady(on) { if (touch) touch.setReady(on); },

    dispose() {
      if (disposed) return;
      disposed = true;
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('contextmenu', onContextMenu);
      if (!mobile) {
        canvas.removeEventListener('pointerenter', onCanvasEnter);
        canvas.removeEventListener('pointermove', onCanvasMove);
        canvas.removeEventListener('pointerleave', onCanvasLeave);
        canvas.removeEventListener('pointerdown', onCanvasDown);
        window.removeEventListener('pointerup', onWinUp);
        window.removeEventListener('pointercancel', onWinCancel);
      }
      if (touch) touch.dispose();
    },
  };
}
