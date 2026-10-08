// combat.js — attacks, supers, damage/heal, ammo, super charge, regen and deaths.
// createCombat({ scene, arena, bus }) -> C. game.js drives it: tryAttack/trySuper on fire edges,
// update(DT, brawlers) once per sim tick, render(alpha) once per frame.
import * as THREE from 'three';
import { BRAWLERS, EV, RULES } from '../contracts.js';
import {
  POOL_SIZE, ARC_START_Y, createProjectilePool, createProjectileView, spawnDirect, spawnArc, spawnBeam,
  stepProjectiles,
} from './projectiles.js';
import {
  KB_DECAY, createSuperState, createTotemView, moveBrawler, startDash, startRail, startCluster, startTotem,
  updateDash, updateTotems, spawnBomblets,
} from './supers.js';

const LOB_PEAK = 1.8;    // apex height of a thrown bomb (tiles)
let _dx = 0, _dz = 0;    // normalized aim scratch (synchronous use only)

function normalize(b, dirX, dirZ) {
  const l = Math.sqrt(dirX * dirX + dirZ * dirZ);
  if (l > 1e-6) { _dx = dirX / l; _dz = dirZ / l; }
  else { _dx = Math.sin(b.facing); _dz = Math.cos(b.facing); }
}
function clampAim(v) { return v === undefined ? 1 : v < 0 ? 0 : v > 1 ? 1 : v; }

// +1 ammo per `reload` seconds while below max; the timer rests at 0 when full.
function tickReload(b, dt) {
  if (b.ammo >= b.maxAmmo) { b.reloadTimer = 0; return; }
  b.reloadTimer += dt;
  const rl = BRAWLERS[b.brawlerId].reload;
  while (b.reloadTimer >= rl && b.ammo < b.maxAmmo) { b.ammo += 1; b.reloadTimer -= rl; }
  if (b.ammo >= b.maxAmmo) b.reloadTimer = 0;
}

function fireSpread(ctx, b, a, dx, dz) {
  const n = a.pellets;
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? (i / (n - 1) - 0.5) * a.spread : 0;
    const c = Math.cos(t), s = Math.sin(t);
    spawnDirect(ctx.pool, b, 'pellet', dx * c - dz * s, dx * s + dz * c, a, false);
  }
}

function fireLob(ctx, b, a, dx, dz, aim) {
  const d = Math.max(1.5, a.range * aim);
  spawnArc(ctx.pool, b, 'lob', b.x, ARC_START_Y, b.z, b.x + dx * d, b.z + dz * d,
    a.flightTime, LOB_PEAK, a.damage, a.blastRadius, false);
}

// Beam length is clipped by the first shot-blocking tile.
function fireBeam(ctx, b, a, dx, dz) {
  const L = a.range;
  const f = ctx.arena.raycast(b.x, b.z, b.x + dx * L, b.z + dz * L);
  const len = f < 1 ? L * f : L;
  spawnBeam(ctx.pool, b, b.x, b.z, b.x + dx * len, b.z + dz * len, a, a.damage, a.heal);
}

export function createCombat({ scene, arena, bus }) {
  const pool = createProjectilePool(POOL_SIZE);
  const sup = createSuperState();
  const root = new THREE.Group();
  root.name = 'combat';
  scene.add(root);
  const shotView = createProjectileView(root, pool.items);
  const totemView = createTotemView(root, sup.totems);

  // Super charge grows with damage+heal the brawler delivers; SUPER_READY fires once on reaching 1.
  function addCharge(src, amount) {
    if (amount <= 0 || src.superCharge >= 1) return;
    const v = src.superCharge + amount / BRAWLERS[src.brawlerId].superCost;
    if (v >= 1) { src.superCharge = 1; bus.emit(EV.SUPER_READY, { b: src }); }
    else src.superCharge = v;
  }

  function die(b, killer, x, z) {
    b.alive = false;
    b.hp = 0;
    b.anim = 'death';
    b.dashTimer = 0; b.dashVx = 0; b.dashVz = 0;
    b.kbVx = 0; b.kbVz = 0; b.stunTimer = 0;
    b.stats.deaths += 1;
    if (killer) killer.stats.kills += 1;
    bus.emit(EV.DEATH, { victim: b, killer, x, z });
  }

  // Returns the HP actually removed. Dead targets take nothing. Death is emitted exactly once.
  function applyDamage(target, amount, source, isSuper, x, z) {
    if (!target.alive || !(amount > 0)) return 0;
    const before = target.hp;
    const dealt = amount < before ? amount : before;
    target.hp = before - dealt;
    target.combatTimer = 0;
    target.hitFlash = 1;
    if (source) { source.stats.damage += dealt; addCharge(source, dealt); }
    const killed = target.hp <= 0;
    bus.emit(EV.HIT, { target, source, amount, x, z, isSuper, killed });
    if (killed) die(target, source, x, z);
    return dealt;
  }

  // Returns the HP actually restored (never above maxHp). Dead targets are not healed.
  function applyHeal(target, amount, source, x, z) {
    if (!target.alive || !(amount > 0)) return 0;
    const missing = target.maxHp - target.hp;
    if (missing <= 0) return 0;
    const healed = amount < missing ? amount : missing;
    target.hp += healed;
    if (source) { source.stats.healing += healed; addCharge(source, healed); }
    bus.emit(EV.HEAL, { target, source, amount: healed, x, z });
    return healed;
  }

  // Blast on arrival of a thrown shot. Cluster bombs also break walls and scatter bomblets.
  function land(p, brawlers) {
    bus.emit(EV.EXPLOSION, { x: p.tx, z: p.tz, radius: p.aoe, team: p.team, isSuper: p.isSuper });
    for (let i = 0; i < brawlers.length; i++) {
      const e = brawlers[i];
      if (!e.alive || e.team === p.team) continue;
      const dx = e.x - p.tx, dz = e.z - p.tz, rr = p.aoe + e.radius;
      if (dx * dx + dz * dz <= rr * rr) applyDamage(e, p.dmg, p.owner, p.isSuper, e.x, e.z);
    }
    if (p.kind === 'cluster') {
      arena.destroyWalls(p.tx, p.tz, p.aoe);
      spawnBomblets(ctx, p);
    }
  }

  const ctx = { arena, bus, pool, sup, damage: applyDamage, heal: applyHeal, land };

  return {
    projectiles: pool.items,

    tryAttack(b, dirX, dirZ, aimLen) {
      if (!b.alive || b.ammo < 1 || b.attackCooldown > 0) return false;
      const a = BRAWLERS[b.brawlerId].attack;
      normalize(b, dirX, dirZ);
      const dx = _dx, dz = _dz;
      b.ammo -= 1;
      b.attackCooldown = RULES.minAttackGap;
      b.revealTimer = RULES.revealAfterAttack;
      b.combatTimer = 0;
      b.anim = 'attack';
      if (a.kind === 'spread') fireSpread(ctx, b, a, dx, dz);
      else if (a.kind === 'bolt') spawnDirect(pool, b, 'bolt', dx, dz, a, false);
      else if (a.kind === 'lob') fireLob(ctx, b, a, dx, dz, clampAim(aimLen));
      else if (a.kind === 'beam') fireBeam(ctx, b, a, dx, dz);
      bus.emit(EV.SHOT, { b, x: b.x, z: b.z, dirX: dx, dirZ: dz, isSuper: false });
      return true;
    },

    trySuper(b, dirX, dirZ, aimLen) {
      if (!b.alive || b.superCharge < 1) return false;
      const s = BRAWLERS[b.brawlerId].super;
      normalize(b, dirX, dirZ);
      const dx = _dx, dz = _dz, aim = clampAim(aimLen);
      b.superCharge = 0;
      b.revealTimer = RULES.revealAfterAttack;
      b.combatTimer = 0;
      b.anim = 'super';
      bus.emit(EV.SUPER_USED, { b, x: b.x, z: b.z, dirX: dx, dirZ: dz });
      if (s.kind === 'dash') startDash(ctx, b, s, dx, dz);
      else if (s.kind === 'rail') startRail(ctx, b, s, dx, dz);
      else if (s.kind === 'cluster') startCluster(ctx, b, s, dx, dz, aim);
      else if (s.kind === 'totem') startTotem(ctx, b, s, dx, dz, aim);
      return true;
    },

    // Nearest enemy within the brawler's attack range that it can see (and shoot at, unless the shot is a lob).
    autoAim(b, brawlers) {
      const a = BRAWLERS[b.brawlerId].attack;
      const maxD2 = a.range * a.range;
      const needLOS = a.kind !== 'lob';
      let best = null, bestD2 = Infinity;
      for (let i = 0; i < brawlers.length; i++) {
        const e = brawlers[i];
        if (!e.alive || e.team === b.team || e.visibleTo[b.team] === false) continue;
        const dx = e.x - b.x, dz = e.z - b.z, d2 = dx * dx + dz * dz;
        if (d2 > maxD2 || d2 >= bestD2) continue;
        if (needLOS && !arena.hasLOS(b.x, b.z, e.x, e.z)) continue;
        best = e;
        bestD2 = d2;
      }
      return best;
    },

    update(dt, brawlers) {
      const decay = Math.exp(-KB_DECAY * dt);
      for (let i = 0; i < brawlers.length; i++) {
        const b = brawlers[i];
        if (b.alive && b.hp <= 0) die(b, null, b.x, b.z);
        b.attackCooldown = b.attackCooldown > dt ? b.attackCooldown - dt : 0;
        b.stunTimer = b.stunTimer > dt ? b.stunTimer - dt : 0;
        b.combatTimer += dt;
        if (b.hitFlash > 0) b.hitFlash = b.hitFlash > dt * 5 ? b.hitFlash - dt * 5 : 0;
        tickReload(b, dt);
        if (!b.alive) continue;
        if (b.hp < b.maxHp && b.combatTimer > RULES.regenDelay) {
          b.hp = Math.min(b.maxHp, b.hp + RULES.regenRate * b.maxHp * dt);
        }
        if (b.kbVx !== 0 || b.kbVz !== 0) {
          moveBrawler(arena, b, b.kbVx * dt, b.kbVz * dt);
          b.kbVx *= decay;
          b.kbVz *= decay;
          if (Math.abs(b.kbVx) < 1e-3 && Math.abs(b.kbVz) < 1e-3) { b.kbVx = 0; b.kbVz = 0; }
        }
      }
      updateDash(ctx, dt, brawlers);
      stepProjectiles(ctx, dt, brawlers);
      updateTotems(ctx, dt, brawlers);
    },

    damage(target, amount, source, isSuper) {
      return applyDamage(target, amount, source, !!isSuper, target.x, target.z);
    },

    render(alpha) {
      shotView.render(alpha);
      totemView.render();
    },

    reset() {
      pool.reset();
      for (const t of sup.totems) { t.active = false; t.owner = null; }
      for (const d of sup.dashes) { d.active = false; d.b = null; }
    },

    dispose() {
      shotView.dispose();
      totemView.dispose();
      scene.remove(root);
    },
  };
}
