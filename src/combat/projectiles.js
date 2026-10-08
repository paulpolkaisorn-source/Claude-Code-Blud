// projectiles.js — pooled projectile physics (direct shots, arcs, beams) and their instanced view.
// Owned by combat.js. Fixed pool of reused objects: no allocation after createProjectilePool().
import * as THREE from 'three';
import { BRAWLERS } from '../contracts.js';
import { toonMat } from '../render/toon.js';

export const POOL_SIZE = 160;
export const SHOT_Y = 0.7;        // height of direct shots (tiles)
export const ARC_START_Y = 0.9;   // release height of thrown bombs (tiles)
export const BEAM_LIFE = 0.12;    // s a beam stays visible
const HIT_SLOTS = 8;              // distinct brawlers one piercing shot can strike
const TAIL = 1.4;                 // rail trail length (tiles)

export const lerp = (a, b, t) => a + (b - a) * t;
export const dummy = new THREE.Object3D();      // scratch transform for instance matrices
export const scratchColor = new THREE.Color();  // scratch color for instance colors

function resetProjectile(p) {
  p.kind = 'pellet'; p.owner = null; p.team = 0;
  p.x = 0; p.y = 0; p.z = 0; p.px = 0; p.py = 0; p.pz = 0;
  p.vx = 0; p.vy = 0; p.vz = 0; p.color = 0xffffff; p.radius = 0.1;
  p.age = 0; p.life = 0; p.dmg = 0; p.heal = 0; p.aoe = 0; p.isSuper = false;
  p.pierce = false; p.breaks = false; p.stretch = 1; p.width = 0.2;
  p.tx = 0; p.tz = 0; p.sx = 0; p.sy = 0; p.sz = 0; p.flight = 0; p.peak = 0;
  p.resolved = false; p.nHits = 0;
}

// Fixed pool. `items` is the contract array exposed as C.projectiles; alloc/release are O(1).
export function createProjectilePool(size = POOL_SIZE) {
  const items = new Array(size);
  for (let i = 0; i < size; i++) {
    const p = { idx: i, active: false, hits: new Array(HIT_SLOTS).fill(null) };
    resetProjectile(p);
    items[i] = p;
  }
  const free = new Int32Array(size);
  let top = 0;
  const pool = {
    items,
    size,
    alloc() {
      if (top === 0) return null;
      const p = items[free[--top]];
      resetProjectile(p);
      p.active = true;
      return p;
    },
    release(p) {
      if (!p.active) return;
      p.active = false;
      free[top++] = p.idx;
    },
    reset() {
      top = 0;
      for (let i = size - 1; i >= 0; i--) { items[i].active = false; free[top++] = i; }
    },
  };
  pool.reset();
  return pool;
}

// Entry fraction t in [0,1] at which segment (x0,z0)->(x1,z1) first reaches circle (cx,cz,r); -1 if never.
export function segCircle(x0, z0, x1, z1, cx, cz, r) {
  const fx = x0 - cx, fz = z0 - cz;
  const c = fx * fx + fz * fz - r * r;
  if (c <= 0) return 0;
  const dx = x1 - x0, dz = z1 - z0;
  const a = dx * dx + dz * dz;
  if (a < 1e-12) return -1;
  const b = 2 * (fx * dx + fz * dz);
  const disc = b * b - 4 * a * c;
  if (disc < 0) return -1;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : -1;
}

// Squared distance from point (px,pz) to segment (x0,z0)->(x1,z1).
export function pointSegDistSq(px, pz, x0, z0, x1, z1) {
  const dx = x1 - x0, dz = z1 - z0;
  const L2 = dx * dx + dz * dz;
  let t = L2 > 0 ? ((px - x0) * dx + (pz - z0) * dz) / L2 : 0;
  if (t < 0) t = 0; else if (t > 1) t = 1;
  const qx = x0 + dx * t - px, qz = z0 + dz * t - pz;
  return qx * qx + qz * qz;
}

// Destroys walls around the start, middle and end of a movement segment (no tunnelling gaps).
export function breakAlong(arena, x0, z0, x1, z1, r) {
  arena.destroyWalls(x0, z0, r);
  arena.destroyWalls((x0 + x1) * 0.5, (z0 + z1) * 0.5, r);
  arena.destroyWalls(x1, z1, r);
}

function hasHit(p, b) {
  for (let i = 0; i < p.nHits; i++) if (p.hits[i] === b) return true;
  return false;
}
function addHit(p, b) {
  if (p.nHits < HIT_SLOTS) p.hits[p.nHits++] = b;
}

// Direct shot (pellet, bolt, rail). `s` is the attack or super block from BRAWLERS (speed, range, radius, damage).
export function spawnDirect(pool, owner, kind, dirX, dirZ, s, isSuper) {
  const p = pool.alloc();
  if (!p) return null;
  const speed = s.speed;
  p.kind = kind; p.owner = owner; p.team = owner.team;
  p.color = BRAWLERS[owner.brawlerId].color;
  p.x = owner.x; p.y = SHOT_Y; p.z = owner.z;
  p.px = p.x; p.py = p.y; p.pz = p.z;
  p.vx = dirX * speed; p.vz = dirZ * speed;
  p.radius = s.radius; p.width = s.radius * 2;
  p.life = s.range / speed;
  p.dmg = s.damage; p.isSuper = isSuper;
  p.pierce = !!s.pierce; p.breaks = !!s.breaksWalls;
  p.stretch = kind === 'bolt' ? 3.5 : kind === 'pellet' ? 1.2 : 1;
  return p;
}

// Arcing shot (lob, cluster, bomblet): leaves (sx,sy,sz), lands on (tx,tz) after `flight` s, apex `peak` high.
export function spawnArc(pool, owner, kind, sx, sy, sz, tx, tz, flight, peak, dmg, aoe, isSuper) {
  const p = pool.alloc();
  if (!p) return null;
  p.kind = kind; p.owner = owner; p.team = owner.team;
  p.color = BRAWLERS[owner.brawlerId].color;
  p.sx = sx; p.sy = sy; p.sz = sz; p.tx = tx; p.tz = tz;
  p.x = sx; p.y = sy; p.z = sz; p.px = sx; p.py = sy; p.pz = sz;
  p.flight = flight; p.life = flight; p.peak = peak;
  p.dmg = dmg; p.aoe = aoe; p.isSuper = isSuper;
  p.radius = kind === 'cluster' ? 0.26 : kind === 'bomblet' ? 0.14 : 0.22;
  return p;
}

// Beam from (x,z) to (ex,ez), already clipped by walls. Resolved on the next update, then shown for BEAM_LIFE.
export function spawnBeam(pool, owner, x, z, ex, ez, s, dmg, heal) {
  const p = pool.alloc();
  if (!p) return null;
  p.kind = 'beam'; p.owner = owner; p.team = owner.team;
  p.color = BRAWLERS[owner.brawlerId].color;
  p.x = x; p.y = SHOT_Y; p.z = z; p.px = x; p.py = p.y; p.pz = z;
  p.tx = ex; p.tz = ez; p.width = s.width;
  p.dmg = dmg; p.heal = heal; p.life = BEAM_LIFE; p.resolved = false;
  return p;
}

// Direct shots: stop at walls (unless breaks), hit the first enemy (or every enemy when piercing).
function stepDirect(ctx, p, dt, brawlers) {
  const x0 = p.x, z0 = p.z;
  const x1 = x0 + p.vx * dt, z1 = z0 + p.vz * dt;
  p.px = x0; p.py = p.y; p.pz = z0;
  p.age += dt;
  let end = 1;   // fraction of this step travelled before a wall stops the shot
  if (p.breaks) breakAlong(ctx.arena, x0, z0, x1, z1, p.radius + 0.5);
  else {
    const f = ctx.arena.raycast(x0, z0, x1, z1);
    if (f < 1) end = f;
  }
  let best = null, bestT = 2;
  for (let i = 0; i < brawlers.length; i++) {
    const e = brawlers[i];
    if (!e.alive || e.team === p.team) continue;
    const t = segCircle(x0, z0, x1, z1, e.x, e.z, e.radius + p.radius);
    if (t < 0) continue;
    if (p.pierce) {
      if (hasHit(p, e)) continue;
      addHit(p, e);
      ctx.damage(e, p.dmg, p.owner, p.isSuper, e.x, e.z);
    } else if (t <= end && t < bestT) {
      bestT = t; best = e;
    }
  }
  if (best) {
    ctx.damage(best, p.dmg, p.owner, p.isSuper, best.x, best.z);
    ctx.pool.release(p);
    return;
  }
  if (end < 1) { ctx.pool.release(p); return; }
  p.x = x1; p.z = z1;
  if (p.age >= p.life) ctx.pool.release(p);
}

// Thrown shots: ignore walls, follow a parabola, call ctx.land on arrival.
function stepArc(ctx, p, dt, brawlers) {
  p.px = p.x; p.py = p.y; p.pz = p.z;
  p.age += dt;
  const u = p.age >= p.flight ? 1 : p.age / p.flight;
  const dx = p.tx - p.sx, dz = p.tz - p.sz;
  p.x = p.sx + dx * u; p.z = p.sz + dz * u;
  p.y = p.sy * (1 - u) + 4 * p.peak * u * (1 - u);
  const inv = 1 / p.flight;
  p.vx = dx * inv; p.vz = dz * inv;
  p.vy = (4 * p.peak * (1 - 2 * u) - p.sy) * inv;
  if (u >= 1) {
    ctx.land(p, brawlers);
    ctx.pool.release(p);
  }
}

// Instant beam: damages every enemy and heals every ally (not the caster) touching the segment.
function resolveBeam(ctx, p, brawlers) {
  const r0 = p.width * 0.5;
  for (let i = 0; i < brawlers.length; i++) {
    const e = brawlers[i];
    if (!e.alive || e === p.owner) continue;
    const rr = r0 + e.radius;
    if (pointSegDistSq(e.x, e.z, p.x, p.z, p.tx, p.tz) > rr * rr) continue;
    if (e.team === p.team) ctx.heal(e, p.heal, p.owner, e.x, e.z);
    else ctx.damage(e, p.dmg, p.owner, false, e.x, e.z);
  }
}

// Advances every live projectile by dt. ctx = { arena, pool, damage, heal, land }.
export function stepProjectiles(ctx, dt, brawlers) {
  const items = ctx.pool.items;
  for (let i = 0; i < items.length; i++) {
    const p = items[i];
    if (!p.active) continue;
    switch (p.kind) {
      case 'pellet': case 'bolt': case 'rail':
        stepDirect(ctx, p, dt, brawlers);
        break;
      case 'lob': case 'cluster': case 'bomblet':
        stepArc(ctx, p, dt, brawlers);
        break;
      case 'beam':
        if (!p.resolved) { p.resolved = true; resolveBeam(ctx, p, brawlers); }
        p.age += dt;
        if (p.age >= p.life) ctx.pool.release(p);
        break;
    }
  }
}

// Instanced mesh with per-instance color (defaults to white) and dynamic buffers. Shared with supers.js.
export function makeInstanced(geo, mat, max, name) {
  const m = new THREE.InstancedMesh(geo, mat, max);
  m.name = name;
  m.count = 0;
  m.frustumCulled = false;
  m.castShadow = false;
  m.receiveShadow = false;
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3).fill(1), 3);
  m.instanceColor.setUsage(THREE.DynamicDrawUsage);
  return m;
}

export function flushInstanced(m) {
  m.instanceMatrix.needsUpdate = true;
  m.instanceColor.needsUpdate = true;
}

// Projectile view: 4 instanced draw calls (shots, bombs, shadow blobs, trails). render(alpha) interpolates.
export function createProjectileView(parent, items) {
  const max = items.length;
  const shotGeo = new THREE.SphereGeometry(1, 8, 6);
  const bombGeo = new THREE.SphereGeometry(1, 10, 8);
  const blobGeo = new THREE.CircleGeometry(1, 24).rotateX(-Math.PI / 2);
  const trailGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const blobMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false });
  const trailMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const shots = makeInstanced(shotGeo, toonMat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.55 }), max, 'combatShots');
  const bombs = makeInstanced(bombGeo, toonMat(0xffffff, { emissive: 0x303030 }), max, 'combatBombs');
  const blobs = makeInstanced(blobGeo, blobMat, max, 'combatBlobs');
  const trails = makeInstanced(trailGeo, trailMat, max, 'combatTrails');
  const all = [shots, bombs, blobs, trails];
  for (const m of all) parent.add(m);

  return {
    render(alpha) {
      let ns = 0, nb = 0, nt = 0;
      for (let i = 0; i < max; i++) {
        const p = items[i];
        if (!p.active) continue;
        const k = p.kind;
        if (k === 'pellet' || k === 'bolt') {
          const r = p.radius;
          dummy.position.set(lerp(p.px, p.x, alpha), lerp(p.py, p.y, alpha), lerp(p.pz, p.z, alpha));
          dummy.rotation.set(0, Math.atan2(p.vx, p.vz), 0);
          dummy.scale.set(r, r, r * p.stretch);
          dummy.updateMatrix();
          shots.setMatrixAt(ns, dummy.matrix);
          scratchColor.setHex(p.color);
          shots.instanceColor.setXYZ(ns, scratchColor.r, scratchColor.g, scratchColor.b);
          ns++;
        } else if (k === 'lob' || k === 'cluster' || k === 'bomblet') {
          dummy.position.set(lerp(p.px, p.x, alpha), lerp(p.py, p.y, alpha), lerp(p.pz, p.z, alpha));
          dummy.rotation.set(0, 0, 0);
          dummy.scale.setScalar(p.radius);
          dummy.updateMatrix();
          bombs.setMatrixAt(nb, dummy.matrix);
          scratchColor.setHex(p.color);
          bombs.instanceColor.setXYZ(nb, scratchColor.r, scratchColor.g, scratchColor.b);
          dummy.position.set(p.tx, 0.04, p.tz);
          dummy.scale.set(p.aoe, 1, p.aoe);
          dummy.updateMatrix();
          blobs.setMatrixAt(nb, dummy.matrix);
          nb++;
        } else {
          // rail and beam: flat stretched quad on the ground, length along its local +Z
          let cx, cz, len, ang, fade = 1;
          if (k === 'rail') {
            const sp = Math.hypot(p.vx, p.vz) || 1;
            const ux = p.vx / sp, uz = p.vz / sp;
            const hx = lerp(p.px, p.x, alpha), hz = lerp(p.pz, p.z, alpha);
            cx = hx - ux * TAIL * 0.5; cz = hz - uz * TAIL * 0.5;
            len = TAIL; ang = Math.atan2(ux, uz);
          } else {
            const dx = p.tx - p.x, dz = p.tz - p.z;
            len = Math.hypot(dx, dz);
            if (len < 1e-4) continue;
            cx = (p.x + p.tx) * 0.5; cz = (p.z + p.tz) * 0.5;
            ang = Math.atan2(dx, dz);
            fade = Math.max(0, 1 - p.age / p.life);
          }
          dummy.position.set(cx, 0.5, cz);
          dummy.rotation.set(0, ang, 0);
          dummy.scale.set(p.width, 1, len);
          dummy.updateMatrix();
          trails.setMatrixAt(nt, dummy.matrix);
          scratchColor.setHex(p.color).multiplyScalar(fade);
          trails.instanceColor.setXYZ(nt, scratchColor.r, scratchColor.g, scratchColor.b);
          nt++;
        }
      }
      shots.count = ns; bombs.count = nb; blobs.count = nb; trails.count = nt;
      for (const m of all) flushInstanced(m);
    },
    dispose() {
      for (const m of all) parent.remove(m);
      shotGeo.dispose(); bombGeo.dispose(); blobGeo.dispose(); trailGeo.dispose();
      blobMat.dispose(); trailMat.dispose();
    },
  };
}
