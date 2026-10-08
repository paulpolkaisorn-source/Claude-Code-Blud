// supers.js — super abilities: dash (Rivet), rail (Pip), cluster bombs (Mortara), totem (Lumen), plus the totem view.
import * as THREE from 'three';
import { BRAWLERS, EV, TEAM_COLORS } from '../contracts.js';
import { toonMat } from '../render/toon.js';
import {
  ARC_START_Y, breakAlong, spawnDirect, spawnArc, makeInstanced, flushInstanced, dummy, scratchColor,
} from './projectiles.js';

export const KB_DECAY = 8;      // knockback speed decays as e^(-8t): a push of K tiles starts at K*8 tiles/s
export const KB_STUN = 0.25;    // s a knocked-back brawler cannot steer
const PULSE = 0.25;             // s between totem pulses
const DASH_SLOTS = 8, DASH_HITS = 8, TOTEM_SLOTS = 8;
const CLUSTER_PEAK = 2.4;       // apex of the cluster bomb (tiles)
const BOMBLET_FLIGHT = 0.5, BOMBLET_PEAK = 0.8, BOMBLET_SCATTER = 2.2, BOMBLET_PHASE = 0.5;

const _mv = { x: 0, z: 0, hit: false };

// Slides a brawler by (dx,dz) through the arena (walls and water stop it).
export function moveBrawler(arena, b, dx, dz) {
  if (dx === 0 && dz === 0) return;
  arena.moveCircle(b.x, b.z, b.radius, dx, dz, _mv);
  b.x = _mv.x; b.z = _mv.z;
}

export function createSuperState() {
  const dashes = [], totems = [];
  for (let i = 0; i < DASH_SLOTS; i++) {
    dashes.push({ active: false, b: null, hits: new Array(DASH_HITS).fill(null), nHits: 0 });
  }
  for (let i = 0; i < TOTEM_SLOTS; i++) {
    totems.push({ active: false, owner: null, team: 0, x: 0, z: 0, radius: 0, life: 0, age: 0,
      pulse: 0, healPerSec: 0, damagePerSec: 0 });
  }
  return { dashes, totems };
}

// ---- dash (Rivet): moves the brawler, hits each enemy once in radius, knocks them back ----
function findDash(sup, b) {
  const ds = sup.dashes;
  for (let i = 0; i < ds.length; i++) if (ds[i].active && ds[i].b === b) return ds[i];
  return null;
}
function claimDash(sup, b) {
  const found = findDash(sup, b);
  let slot = found;
  if (!slot) {
    for (let i = 0; i < sup.dashes.length; i++) if (!sup.dashes[i].active) { slot = sup.dashes[i]; break; }
  }
  if (!slot) slot = sup.dashes[0];
  slot.active = true; slot.b = b; slot.nHits = 0;
  return slot;
}
function hasDashHit(d, e) {
  for (let i = 0; i < d.nHits; i++) if (d.hits[i] === e) return true;
  return false;
}
function addDashHit(d, e) {
  if (d.nHits < DASH_HITS) d.hits[d.nHits++] = e;
}
function endDash(d, b) {
  b.dashTimer = 0; b.dashVx = 0; b.dashVz = 0;
  if (d) { d.active = false; d.b = null; }
}

export function startDash(ctx, b, s, dirX, dirZ) {
  claimDash(ctx.sup, b);
  b.dashTimer = s.duration;
  b.dashVx = dirX * s.range / s.duration;
  b.dashVz = dirZ * s.range / s.duration;
  ctx.bus.emit(EV.DASH, { b, x: b.x, z: b.z, dirX, dirZ });
}

export function updateDash(ctx, dt, brawlers) {
  const arena = ctx.arena;
  for (let i = 0; i < brawlers.length; i++) {
    const b = brawlers[i];
    if (b.dashTimer <= 0) continue;
    const d = findDash(ctx.sup, b) || claimDash(ctx.sup, b);
    if (!b.alive) { endDash(d, b); continue; }
    const s = BRAWLERS[b.brawlerId].super;
    const x0 = b.x, z0 = b.z;
    moveBrawler(arena, b, b.dashVx * dt, b.dashVz * dt);
    breakAlong(arena, x0, z0, b.x, b.z, s.radius);
    const speed = Math.hypot(b.dashVx, b.dashVz) || 1;
    const ux = b.dashVx / speed, uz = b.dashVz / speed;
    for (let j = 0; j < brawlers.length; j++) {
      const e = brawlers[j];
      if (!e.alive || e.team === b.team || hasDashHit(d, e)) continue;
      const rr = s.radius + e.radius;
      const dx = e.x - b.x, dz = e.z - b.z;
      if (dx * dx + dz * dz > rr * rr) continue;
      addDashHit(d, e);
      ctx.damage(e, s.damage, b, true, e.x, e.z);
      if (e.alive) {
        e.kbVx = ux * s.knockback * KB_DECAY;
        e.kbVz = uz * s.knockback * KB_DECAY;
        if (e.stunTimer < KB_STUN) e.stunTimer = KB_STUN;
      }
    }
    b.dashTimer -= dt;
    if (b.dashTimer <= 0) endDash(d, b);
  }
  // free slots whose brawler is no longer dashing
  const ds = ctx.sup.dashes;
  for (let i = 0; i < ds.length; i++) {
    const d = ds[i];
    if (d.active && (!d.b || d.b.dashTimer <= 0)) { d.active = false; d.b = null; }
  }
}

// ---- rail (Pip): piercing, wall-breaking bolt; the projectile itself handles the path ----
export function startRail(ctx, b, s, dirX, dirZ) {
  spawnDirect(ctx.pool, b, 'rail', dirX, dirZ, s, true);
}

// ---- cluster (Mortara): big arc; on landing the blast breaks walls and scatters bomblets ----
export function startCluster(ctx, b, s, dirX, dirZ, aim) {
  const d = Math.max(1.5, s.range * aim);
  spawnArc(ctx.pool, b, 'cluster', b.x, ARC_START_Y, b.z, b.x + dirX * d, b.z + dirZ * d,
    s.flightTime, CLUSTER_PEAK, s.damage, s.blastRadius, true);
}

export function spawnBomblets(ctx, p) {
  const s = BRAWLERS[p.owner.brawlerId].super;
  const n = s.bomblets;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + BOMBLET_PHASE;
    const tx = p.tx + Math.cos(a) * BOMBLET_SCATTER;
    const tz = p.tz + Math.sin(a) * BOMBLET_SCATTER;
    spawnArc(ctx.pool, p.owner, 'bomblet', p.tx, 0.4, p.tz, tx, tz,
      BOMBLET_FLIGHT, BOMBLET_PEAK, s.bombletDamage, s.bombletRadius, true);
  }
}

// ---- totem (Lumen): zone at the aim point; pulses heal allies and damage enemies ----
function claimTotem(sup) {
  const ts = sup.totems;
  let oldest = null;
  for (let i = 0; i < ts.length; i++) {
    if (!ts[i].active) return ts[i];
    if (!oldest || ts[i].age > oldest.age) oldest = ts[i];
  }
  return oldest;   // every slot busy: recycle the oldest totem
}

export function startTotem(ctx, b, s, dirX, dirZ, aim) {
  const d0 = Math.max(1.5, s.range * aim);
  const f = ctx.arena.raycast(b.x, b.z, b.x + dirX * d0, b.z + dirZ * d0);
  const d = f < 1 ? Math.max(0.5, d0 * f - 0.5) : d0;   // do not place the zone inside a wall
  const t = claimTotem(ctx.sup);
  t.active = true; t.owner = b; t.team = b.team;
  t.x = b.x + dirX * d; t.z = b.z + dirZ * d;
  t.radius = s.radius; t.life = s.duration; t.age = 0; t.pulse = 0;
  t.healPerSec = s.healPerSec; t.damagePerSec = s.damagePerSec;
  ctx.bus.emit(EV.TOTEM, { x: t.x, z: t.z, team: t.team, radius: t.radius, duration: t.life });
}

function pulseTotem(ctx, t, brawlers) {
  const heal = t.healPerSec * PULSE, dmg = t.damagePerSec * PULSE;
  const r2 = t.radius * t.radius;
  for (let j = 0; j < brawlers.length; j++) {
    const e = brawlers[j];
    if (!e.alive) continue;
    const dx = e.x - t.x, dz = e.z - t.z;
    if (dx * dx + dz * dz > r2) continue;
    if (e.team === t.team) ctx.heal(e, heal, t.owner, e.x, e.z);
    else ctx.damage(e, dmg, t.owner, true, e.x, e.z);
  }
}

export function updateTotems(ctx, dt, brawlers) {
  const ts = ctx.sup.totems;
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i];
    if (!t.active) continue;
    t.age += dt;
    t.pulse += dt;
    while (t.pulse >= PULSE - 1e-9) {   // epsilon: 15 ticks of DT must make exactly one pulse
      t.pulse -= PULSE;
      pulseTotem(ctx, t, brawlers);
    }
    if (t.age >= t.life) { t.active = false; t.owner = null; }
  }
}

// Totem view: 2 instanced draw calls (glowing gem body, pulsing ground ring).
export function createTotemView(parent, totems) {
  const n = totems.length;
  const bodyGeo = new THREE.OctahedronGeometry(0.42, 0);
  const ringGeo = new THREE.RingGeometry(0.9, 1, 40).rotateX(-Math.PI / 2);
  const bodyMat = toonMat(0xffffff, { emissive: 0x3a2a55, emissiveIntensity: 1 });
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const body = makeInstanced(bodyGeo, bodyMat, n, 'combatTotems');
  const ring = makeInstanced(ringGeo, ringMat, n, 'combatTotemRings');
  parent.add(body);
  parent.add(ring);

  return {
    render() {
      let k = 0;
      for (let i = 0; i < n; i++) {
        const t = totems[i];
        if (!t.active) continue;
        scratchColor.setHex(TEAM_COLORS[t.team]);
        dummy.position.set(t.x, 1.1 + Math.sin(t.age * 4) * 0.12, t.z);
        dummy.rotation.set(0, t.age * 2, 0);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        body.setMatrixAt(k, dummy.matrix);
        body.instanceColor.setXYZ(k, scratchColor.r, scratchColor.g, scratchColor.b);
        const pulse = t.radius * (1 + 0.05 * Math.sin(t.age * 6));
        dummy.position.set(t.x, 0.05, t.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(pulse, 1, pulse);
        dummy.updateMatrix();
        ring.setMatrixAt(k, dummy.matrix);
        ring.instanceColor.setXYZ(k, scratchColor.r, scratchColor.g, scratchColor.b);
        k++;
      }
      body.count = k; ring.count = k;
      flushInstanced(body);
      flushInstanced(ring);
    },
    dispose() {
      parent.remove(body);
      parent.remove(ring);
      bodyGeo.dispose(); ringGeo.dispose(); ringMat.dispose();
    },
  };
}
