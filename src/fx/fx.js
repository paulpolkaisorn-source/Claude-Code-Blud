// fx.js — pooled VFX, damage numbers, aim decals, screen-shake and hit-stop hooks.
// Listens to combat/game bus events and emits EV.SCREEN_SHAKE and EV.HITSTOP. update() allocates nothing.
import { BRAWLERS, EV, TEAM_COLORS, CRYSTAL_COLOR } from '../contracts.js';
import { createParticlePool, createRingPool, rand, CAP_HIGH, CAP_LOW, DUST_CAP_HIGH, DUST_CAP_LOW } from './particles.js';
import { createNumbers } from './numbers.js';
import { createAim } from './aim.js';

const PI = Math.PI;
const WHITE_HOT = 0xfff1c2, FIRE = 0xffa640, SMOKE = 0x8a90a2, DUST = 0xd8c8a6, HEAL = 0x7dff9e, DEBRIS = 0x9d8b76;
const ARENA_CX = 10.5, ARENA_CZ = 16.5, SHAKE_RANGE = 16;
const isP = (b) => !!(b && b.isPlayer);

let R = 1, G = 1, B = 1; // current emit colour, set by tint()
function tint(hex, k) {
  R = ((hex >> 16) & 255) / 255 * k;
  G = ((hex >> 8) & 255) / 255 * k;
  B = (hex & 255) / 255 * k;
}

// Radial (cone = PI) or directional (ang = facing, cone = half-width) burst. Facing convention: dir = (sin a, cos a).
// up scales the launch speed on Y; grav is applied per second squared (negative pulls down).
function burst(pool, n, x, y, z, ang, cone, sMin, sMax, up, s0, s1, lMin, lMax, drag, grav, alpha) {
  for (let i = 0; i < n; i++) {
    const a = ang + (rand() * 2 - 1) * cone;
    const sp = sMin + (sMax - sMin) * rand();
    const vy = up * (0.6 + 0.8 * rand());
    const life = lMin + (lMax - lMin) * rand();
    pool.add(x, y, z, Math.sin(a) * sp, vy, Math.cos(a) * sp, R, G, B, alpha, s0, s1, life, drag, grav);
  }
}

export function createFX({ scene, bus, worldToScreen, overlay }) {
  const add = createParticlePool(CAP_HIGH, true);     // glow: sparks, muzzle, trails, flashes
  const dust = createParticlePool(DUST_CAP_HIGH, false); // dust, smoke, debris, confetti
  const rings = createRingPool();
  const aim = createAim(scene);
  const nums = createNumbers({ overlay, worldToScreen });
  scene.add(add.points, dust.points, rings.mesh);

  let quality = 'high';
  let player = null;
  let lastTilePx = 40;                 // CSS px per tile at the focus, refreshed each update()
  const dustAcc = new Map();           // brawler id -> { acc }: dust timers, objects reused
  const s0 = { x: 0, y: 0, visible: false }, s1 = { x: 0, y: 0, visible: false };
  const dpr = () => (quality === 'low' ? 1 : Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));

  // Device pixels per tile near the focus (player, else arena centre). Sizes are authored in tiles.
  function tilePixels() {
    const cx = player ? player.x : ARENA_CX, cz = player ? player.z : ARENA_CZ;
    worldToScreen(cx, 0, cz, s0);
    worldToScreen(cx + 1, 0, cz, s1);
    if (s0.visible && s1.visible) {
      const d = Math.hypot(s1.x - s0.x, s1.y - s0.y);
      if (d > 1) lastTilePx = d;
    }
    return lastTilePx * dpr();
  }

  function shakeAt(x, z, base, dur, involved) {
    let k = 1;
    if (!involved) {
      const px = player ? player.x : ARENA_CX, pz = player ? player.z : ARENA_CZ;
      k = Math.max(0.15, 1 - Math.hypot(x - px, z - pz) / SHAKE_RANGE);
    }
    const I = Math.min(1, base * k);
    if (I < 0.02) return;
    bus.emit(EV.SCREEN_SHAKE, { intensity: I, duration: dur });
  }

  function hitstop(ms) { bus.emit(EV.HITSTOP, { ms }); }

  function onShot(p) {
    const c = BRAWLERS[p.b.brawlerId].color;
    const ang = Math.atan2(p.dirX, p.dirZ);
    const mx = p.x + p.dirX * 0.5, mz = p.z + p.dirZ * 0.5;
    tint(c, 2.2);
    add.add(mx, 0.55, mz, 0, 0, 0, R, G, B, 1, p.isSuper ? 1.5 : 0.9, 0.2, 0.07, 0, 0);
    burst(add, p.isSuper ? 14 : 6, mx, 0.55, mz, ang, 0.45, 2.5, 5.5, 0, 0.35, 0.05, 0.08, 0.2, 9, 0, 1);
  }

  function onHit(p) {
    const big = !!p.isSuper, inv = isP(p.source) || isP(p.target);
    tint(WHITE_HOT, 1.8);
    burst(add, big ? 16 : 8, p.x, 0.6, p.z, 0, PI, 2.2, big ? 6 : 4.5, 1.2, big ? 0.22 : 0.13, 0.02, 0.18, 0.38, 5, -9.8, 1);
    if (big && p.source && BRAWLERS[p.source.brawlerId]) {
      tint(BRAWLERS[p.source.brawlerId].color, 1.5);
      burst(add, 8, p.x, 0.6, p.z, 0, PI, 1.5, 3.5, 1.5, 0.3, 0.05, 0.25, 0.45, 3, -6, 1);
    }
    spawnNumber(p.amount, p.x, p.z, big ? 1 : 0);
    if (big) { hitstop(inv ? 55 : 40); shakeAt(p.x, p.z, 0.55, 0.22, inv); }
  }

  function onHeal(p) {
    tint(HEAL, 1.4);
    burst(add, 10, p.x, 0.4, p.z, 0, PI, 0.2, 0.9, 1.9, 0.2, 0.04, 0.5, 0.75, 2.5, 0, 1);
    rings.add(p.x, 0.05, p.z, 0.9, 0.4, 0.12, HEAL, 1);
    spawnNumber(p.amount, p.x, p.z, 2);
  }

  function onDeath(p) {
    const v = p.victim, inv = isP(v) || isP(p.killer);
    const team = v && v.team !== undefined ? v.team : 0;
    tint(SMOKE, 1);
    burst(dust, 14, p.x, 0.4, p.z, 0, PI, 0.4, 1.3, 0.5, 0.5, 1.5, 0.8, 1.3, 2.2, 0, 0.55);
    tint(TEAM_COLORS[team], 1);
    burst(dust, 18, p.x, 0.9, p.z, 0, PI, 2, 4.5, 4.5, 0.22, 0.12, 0.9, 1.4, 1.2, -9.8, 1);
    tint(WHITE_HOT, 1.6);
    add.add(p.x, 0.6, p.z, 0, 0, 0, R, G, B, 1, 1.6, 0.4, 0.25, 0, 0);
    if (inv) hitstop(60);
    shakeAt(p.x, p.z, isP(v) ? 1 : 0.7, 0.4, inv);
  }

  function onRespawn(p) {
    const b = p.b;
    tint(BRAWLERS[b.brawlerId].color, 1.6);
    for (let i = 0; i < 16; i++) {
      add.add(b.x + (rand() - 0.5) * 0.5, 0.1 + i * 0.12, b.z + (rand() - 0.5) * 0.5, 0, 0.6 + rand(), 0, R, G, B, 0.9, 0.22, 0.04, 0.55, 0.3, 0);
    }
  }

  function onExplosion(p) {
    const x = p.x, z = p.z, rad = p.radius || 1.2, big = !!p.isSuper, k = big ? 1.35 : 1;
    tint(FIRE, 1.9);
    add.add(x, 0.5, z, 0, 0.3, 0, R, G, B, 1, rad * 0.7 * k, rad * 1.5 * k, 0.4, 0.5, 0);
    burst(add, 22, x, 0.5, z, 0, PI, 1.5 * rad, 4 * rad, 2.2, 0.28, 0.04, 0.25, 0.6, 3, -7, 1);
    tint(SMOKE, 1);
    burst(dust, 12, x, 0.4, z, 0, PI, 0.5, 1.6, 0.8, 0.6, 1.6 * k, 0.8, 1.3, 2.2, 0, 0.5);
    tint(DEBRIS, 1);
    burst(dust, 8, x, 0.3, z, 0, PI, 2, 4.5, 4.2, 0.14, 0.07, 0.5, 0.9, 0.6, -9.8, 1);
    rings.add(x, 0.05, z, rad * 1.3 * k, 0.45, rad * 0.22, FIRE, 1.4);
    if (big) rings.add(x, 0.05, z, rad * 1.9, 0.6, rad * 0.16, TEAM_COLORS[p.team ?? 0], 1.1);
    shakeAt(x, z, big ? 0.95 : 0.7, 0.45, false);
  }

  function onWall(p) {
    tint(DEBRIS, 1);
    burst(dust, 12, p.x, 0.4, p.z, 0, PI, 1.5, 3.5, 4, 0.14, 0.08, 0.6, 0.9, 0.6, -9.8, 1);
    tint(SMOKE, 1);
    burst(dust, 6, p.x, 0.5, p.z, 0, PI, 0.3, 0.9, 0.5, 0.5, 1.3, 0.8, 1.0, 1.8, 0, 0.4);
  }

  function onCrystal(p) {
    tint(CRYSTAL_COLOR, 1.7);
    burst(add, 14, p.x, 0.4, p.z, 0, PI, 0.4, 1.2, 2.6, 0.26, 0.04, 0.45, 0.8, 1.5, 0, 1);
    tint(WHITE_HOT, 1.3);
    add.add(p.x, 0.5, p.z, 0, 0, 0, R, G, B, 1, 1.1, 0.3, 0.2, 0, 0);
  }

  function onSuper(p) {
    const c = BRAWLERS[p.b.brawlerId].color;
    tint(c, 1.8);
    burst(add, 28, p.x, 0.6, p.z, 0, PI, 3, 7, 1.2, 0.35, 0.05, 0.3, 0.6, 5, 0, 1);
    rings.add(p.x, 0.05, p.z, 2.4, 0.5, 0.35, c, 1.6);
    if (isP(p.b)) shakeAt(p.x, p.z, 0.35, 0.3, true);
  }

  function onDash(p) {
    tint(DUST, 1);
    burst(dust, 8, p.x, 0.12, p.z, Math.atan2(p.dirX, p.dirZ) + PI, 0.7, 0.2, 0.9, 0.2, 0.35, 0.6, 0.35, 0.6, 1.4, 0, 0.5);
  }

  function onTotem(p) {
    const c = TEAM_COLORS[p.team ?? 0];
    rings.add(p.x, 0.05, p.z, p.radius || 2.6, 0.6, 0.3, c, 1.4);
    tint(c, 1.5);
    burst(add, 12, p.x, 0.2, p.z, 0, PI, 0.1, 0.6, 1.6, 0.18, 0.03, 0.4, 0.7, 1, 0, 1);
  }

  function spawnNumber(amount, x, z, kind) { nums.spawn(amount, x, 1.15, z, kind); }

  const subs = [
    bus.on(EV.SHOT, onShot),
    bus.on(EV.HIT, onHit),
    bus.on(EV.HEAL, onHeal),
    bus.on(EV.DEATH, onDeath),
    bus.on(EV.RESPAWN, onRespawn),
    bus.on(EV.EXPLOSION, onExplosion),
    bus.on(EV.WALL_DESTROYED, onWall),
    bus.on(EV.CRYSTAL_PICKUP, onCrystal),
    bus.on(EV.SUPER_USED, onSuper),
    bus.on(EV.DASH, onDash),
    bus.on(EV.TOTEM, onTotem),
  ];

  // Per render frame: dust under moving brawlers, glowing trails behind projectiles, then pool integration.
  function update(dt, brawlers, projectiles) {
    dt = Math.min(Math.max(dt || 0, 0), 0.1);
    const list = brawlers || [];
    player = null;
    for (let i = 0; i < list.length; i++) if (list[i].isPlayer) player = list[i];

    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      let st = dustAcc.get(b.id);
      if (!st) { st = { acc: 0 }; dustAcc.set(b.id, st); }
      const sp2 = b.vx * b.vx + b.vz * b.vz;
      if (!b.alive || sp2 < 0.36) { st.acc = 0; continue; }
      st.acc += dt;
      if (st.acc < 0.09) continue;
      st.acc = 0;
      tint(DUST, 1);
      dust.add(b.x + (rand() - 0.5) * 0.3, 0.04, b.z + (rand() - 0.5) * 0.3, -b.vx * 0.12, 0.25, -b.vz * 0.12, R, G, B, 0.45, 0.2, 0.6, 0.45, 0.8, 0);
    }

    const pj = projectiles || [];
    for (let i = 0; i < pj.length; i++) {
      const p = pj[i];
      if (!p.active || p.kind === 'beam') continue;
      tint(p.color ?? 0xffffff, 1.5);
      add.add(p.x, p.y, p.z, (rand() - 0.5) * 0.3, 0.2, (rand() - 0.5) * 0.3, R, G, B, 0.9, 0.16, 0.02, 0.22, 2.5, 0);
    }

    const px = tilePixels();
    add.update(dt, px);
    dust.update(dt, px);
    rings.update(dt);
    nums.update(dt);
  }

  function setQuality(level) {
    quality = level === 'low' ? 'low' : 'high';
    add.setCap(quality === 'low' ? CAP_LOW : CAP_HIGH);
    dust.setCap(quality === 'low' ? DUST_CAP_LOW : DUST_CAP_HIGH);
  }

  function reset() {
    add.clear();
    dust.clear();
    rings.clear();
    nums.clear();
    aim.set(false);
    dustAcc.clear();
  }

  function stats() {
    return {
      quality,
      addActive: add.count, addCap: add.cap,
      dustActive: dust.count, dustCap: dust.cap,
      rings: rings.active(),
      numbers: nums.activeCount(), domNumbers: nums.domCount(),
      aim: aim.state(),
      bufferFloats: add.floats + dust.floats + rings.floats,
    };
  }

  function dispose() {
    for (const off of subs) off();
    scene.remove(add.points, dust.points, rings.mesh);
    add.dispose();
    dust.dispose();
    rings.dispose();
    aim.dispose();
    nums.dispose();
  }

  return {
    update,
    setAim(show, x, z, dirX, dirZ, length, shape, color, radius) { aim.set(show, x, z, dirX, dirZ, length, shape, color, radius); },
    setQuality,
    reset,
    stats,
    dispose,
  };
}
