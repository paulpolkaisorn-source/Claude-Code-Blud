// combat.test.mjs — unit tests for src/combat (stub arena, private bus, no DOM).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { DT, EV, TEAM, makeBrawler } from '../../src/contracts.js';
import { createCombat } from '../../src/combat/combat.js';
import { POOL_SIZE } from '../../src/combat/projectiles.js';

function makeBus() {
  const log = [];
  const handlers = new Map();
  return {
    log,
    on(evt, fn) { if (!handlers.has(evt)) handlers.set(evt, []); handlers.get(evt).push(fn); },
    off(evt, fn) { const a = handlers.get(evt); if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } },
    emit(evt, payload) {
      log.push([evt, payload]);
      const a = handlers.get(evt);
      if (a) for (const fn of a) fn(payload);
    },
    count(evt) { let n = 0; for (const [e] of log) if (e === evt) n++; return n; },
    last(evt) { for (let i = log.length - 1; i >= 0; i--) if (log[i][0] === evt) return log[i][1]; return null; },
  };
}

// Stub arena: optional wall plane z = wallZ that blocks shots; movement is unobstructed.
function makeArena(wallZ = null) {
  const arena = {
    wallZ,
    destroyed: [],
    raycast(x0, z0, x1, z1) {
      if (arena.wallZ === null) return 1;
      const a = z0 - arena.wallZ, b = z1 - arena.wallZ;
      if (a * b > 0 || a === b) return 1;
      return a / (a - b);
    },
    hasLOS(x0, z0, x1, z1) { return arena.raycast(x0, z0, x1, z1) === 1; },
    moveCircle(x, z, r, dx, dz, out) { out.x = x + dx; out.z = z + dz; out.hit = false; return out; },
    destroyWalls(x, z, r) { arena.destroyed.push([x, z, r]); return 0; },
  };
  return arena;
}

function setup(wallZ = null) {
  const bus = makeBus();
  const arena = makeArena(wallZ);
  const scene = new THREE.Scene();
  const C = createCombat({ scene, arena, bus });
  return { bus, arena, scene, C };
}

function brawler(id, brawlerId, team, x, z, isPlayer = false) {
  const b = makeBrawler(id, brawlerId, team, id, isPlayer);
  b.x = x; b.z = z; b.px = x; b.pz = z;
  b.combatTimer = 0;
  return b;
}

function run(C, list, seconds) {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) C.update(DT, list);
}

test('spread pellets hit an enemy in front', () => {
  const { C } = setup();
  const me = brawler('me', 'rivet', TEAM.BLUE, 5, 5, true);
  const foe = brawler('foe', 'pip', TEAM.RED, 5, 8);
  assert.equal(C.tryAttack(me, 0, 1, 1), true);
  run(C, [me, foe], 0.5);
  assert.ok(foe.hp < foe.maxHp, 'spread should damage the foe');
});

test('bolt hits the first enemy in line for exactly its damage', () => {
  const { C, bus } = setup();
  const me = brawler('me', 'pip', TEAM.BLUE, 5, 5, true);
  const foe = brawler('foe', 'rivet', TEAM.RED, 5, 9);
  assert.equal(C.tryAttack(me, 0, 1, 1), true);
  run(C, [me, foe], 0.5);
  assert.equal(foe.hp, foe.maxHp - 1250);
  assert.equal(bus.count(EV.HIT), 1);
});

test('lob lands on its aim point and damages enemies in the blast', () => {
  const { C, bus } = setup();
  const me = brawler('me', 'mortara', TEAM.BLUE, 5, 5, true);
  const foe = brawler('foe', 'rivet', TEAM.RED, 5, 12);
  const bystander = brawler('by', 'rivet', TEAM.RED, 5, 14);
  assert.equal(C.tryAttack(me, 0, 1, 1), true);
  run(C, [me, foe, bystander], 1.0);
  assert.equal(foe.hp, foe.maxHp - 1050);
  assert.equal(bystander.hp, bystander.maxHp);
  assert.equal(bus.count(EV.EXPLOSION), 1);
});

test('beam damages enemies, heals allies and never heals the caster', () => {
  const { C } = setup();
  const me = brawler('me', 'lumen', TEAM.BLUE, 5, 5, true);
  const ally = brawler('ally', 'rivet', TEAM.BLUE, 5.2, 6);
  const foe = brawler('foe', 'rivet', TEAM.RED, 5, 8);
  ally.hp = ally.maxHp - 600;
  me.hp = me.maxHp - 300;
  assert.equal(C.tryAttack(me, 0, 1, 1), true);
  run(C, [me, ally, foe], DT);
  assert.equal(foe.hp, foe.maxHp - 720);
  assert.equal(ally.hp, ally.maxHp - 80);
  assert.equal(me.hp, me.maxHp - 300);
});

test('a wall blocks a bolt', () => {
  const { C, bus } = setup(8);
  const me = brawler('me', 'pip', TEAM.BLUE, 5, 5, true);
  const foe = brawler('foe', 'rivet', TEAM.RED, 5, 10);
  assert.equal(C.tryAttack(me, 0, 1, 1), true);
  run(C, [me, foe], 1.0);
  assert.equal(foe.hp, foe.maxHp);
  assert.equal(bus.count(EV.HIT), 0);
  assert.equal(C.projectiles.some((p) => p.active), false);
});

test('a lob clears a wall', () => {
  const { C } = setup(8);
  const me = brawler('me', 'mortara', TEAM.BLUE, 5, 5, true);
  const foe = brawler('foe', 'rivet', TEAM.RED, 5, 12);
  assert.equal(C.tryAttack(me, 0, 1, 1), true);
  run(C, [me, foe], 1.0);
  assert.equal(foe.hp, foe.maxHp - 1050);
});

test('ammo is spent per shot and refills one per reload period', () => {
  const { C } = setup();
  const me = brawler('me', 'pip', TEAM.BLUE, 5, 5, true);
  const list = [me];
  assert.equal(C.tryAttack(me, 0, -1, 1), true); run(C, list, 0.35);
  assert.equal(C.tryAttack(me, 0, -1, 1), true); run(C, list, 0.35);
  assert.equal(C.tryAttack(me, 0, -1, 1), true); run(C, list, 0.35);
  assert.equal(me.ammo, 0);
  assert.equal(C.tryAttack(me, 0, -1, 1), false);
  run(C, list, 0.9);
  assert.equal(me.ammo, 0, 'no refill before the 2 s reload');
  run(C, list, 0.2);
  assert.equal(me.ammo, 1, 'first refill at ~2 s');
  run(C, list, 2.0);
  assert.equal(me.ammo, 2, 'second refill at ~4 s');
});

test('super charges from damage dealt, fires SUPER_READY once and is spent on use', () => {
  const { C, bus } = setup();
  const me = brawler('me', 'pip', TEAM.BLUE, 5, 5, true);
  const foe = brawler('foe', 'rivet', TEAM.RED, 5, 9);
  foe.maxHp = 1e6; foe.hp = 1e6;
  const list = [me, foe];
  for (let i = 0; i < 3; i++) { assert.equal(C.tryAttack(me, 0, 1, 1), true); run(C, list, 0.35); }
  assert.equal(me.superCharge, 1);
  assert.equal(bus.count(EV.SUPER_READY), 1);
  me.ammo = me.maxAmmo; me.attackCooldown = 0;
  assert.equal(C.tryAttack(me, 0, 1, 1), true); run(C, list, 0.35);
  assert.equal(bus.count(EV.SUPER_READY), 1, 'SUPER_READY is not repeated');
  assert.equal(C.trySuper(me, 0, 1, 1), true);
  assert.equal(me.superCharge, 0);
  assert.equal(bus.count(EV.SUPER_USED), 1);
  assert.equal(C.trySuper(me, 0, 1, 1), false);
});

test('regen starts only after 3 s without taking or dealing damage', () => {
  const { C } = setup();
  const me = brawler('me', 'rivet', TEAM.BLUE, 5, 5, true);
  const list = [me];
  C.damage(me, 2000, null, false);
  run(C, list, 2.9);
  assert.equal(me.hp, me.maxHp - 2000);
  run(C, list, 0.5);
  assert.ok(me.hp > me.maxHp - 2000, 'regen after 3 s');
});

test('death is emitted once, credits the killer and stops further hits', () => {
  const { C, bus } = setup();
  const a = brawler('a', 'pip', TEAM.BLUE, 5, 5, true);
  const d = brawler('d', 'lumen', TEAM.RED, 5, 8);
  C.damage(d, 999999, a, false);
  C.damage(d, 100, a, false);
  run(C, [a, d], 0.5);
  assert.equal(d.alive, false);
  assert.equal(bus.count(EV.DEATH), 1);
  assert.equal(bus.count(EV.HIT), 1);
  assert.equal(bus.last(EV.DEATH).killer, a);
  assert.equal(a.stats.kills, 1);
  assert.equal(d.stats.deaths, 1);
});

test('rail pierces two brawlers and breaks walls along its path', () => {
  const { C, arena } = setup();
  const me = brawler('me', 'pip', TEAM.BLUE, 5, 5, true);
  const f1 = brawler('f1', 'rivet', TEAM.RED, 5, 8);
  const f2 = brawler('f2', 'rivet', TEAM.RED, 5, 11);
  f1.maxHp = f1.hp = 1e6;
  f2.maxHp = f2.hp = 1e6;
  me.superCharge = 1;
  assert.equal(C.trySuper(me, 0, 1, 1), true);
  run(C, [me, f1, f2], 0.5);
  assert.equal(1e6 - f1.hp, 2300);
  assert.equal(1e6 - f2.hp, 2300);
  assert.ok(arena.destroyed.length > 0, 'rail should break walls on its path');
});

test('dash hits each enemy once and knocks it back along the dash', () => {
  const { C, bus } = setup();
  const me = brawler('me', 'rivet', TEAM.BLUE, 5, 5, true);
  const foe = brawler('foe', 'pip', TEAM.RED, 5, 6.5);
  foe.maxHp = foe.hp = 1e6;
  me.superCharge = 1;
  assert.equal(C.trySuper(me, 0, 1, 1), true);
  assert.equal(bus.count(EV.DASH), 1);
  run(C, [me, foe], 1.0);
  assert.equal(1e6 - foe.hp, 1100);
  assert.ok(foe.z - 6.5 >= 2.5, `knocked back to z=${foe.z}`);
  assert.equal(me.dashTimer, 0);
});

test('projectile pool never grows and drops shots when full', () => {
  const { C } = setup();
  const first = C.projectiles[0];
  const me = brawler('me', 'rivet', TEAM.BLUE, 5, 5, true);
  for (let i = 0; i < 200; i++) {
    me.ammo = me.maxAmmo;
    me.attackCooldown = 0;
    C.tryAttack(me, 0, 1, 1);
  }
  assert.equal(C.projectiles.length, POOL_SIZE);
  assert.equal(C.projectiles[0], first);
  assert.equal(C.projectiles.filter((p) => p.active).length, POOL_SIZE);
});

test('totem heals allies and damages enemies inside its zone', () => {
  const { C, bus } = setup();
  const lum = brawler('lum', 'lumen', TEAM.BLUE, 5, 5, true);
  const ally = brawler('ally', 'rivet', TEAM.BLUE, 5, 10);
  const foe = brawler('foe', 'pip', TEAM.RED, 5, 10.5);
  ally.hp = ally.maxHp - 1000;
  lum.superCharge = 1;
  assert.equal(C.trySuper(lum, 0, 1, 1), true);
  assert.equal(bus.count(EV.TOTEM), 1);
  run(C, [lum, ally, foe], 1.0);
  assert.ok(ally.hp - (ally.maxHp - 1000) >= 400, 'ally healed by the totem');
  assert.ok(foe.hp <= foe.maxHp - 150, 'enemy damaged by the totem');
});

test('autoAim picks the nearest visible enemy in range', () => {
  const { C } = setup();
  const me = brawler('me', 'pip', TEAM.BLUE, 5, 5, true);
  const near = brawler('near', 'rivet', TEAM.RED, 5, 7);
  const far = brawler('far', 'rivet', TEAM.RED, 5, 9);
  const hidden = brawler('hidden', 'rivet', TEAM.RED, 5, 6);
  const lone = brawler('lone', 'rivet', TEAM.RED, 5, 30);
  hidden.visibleTo[TEAM.BLUE] = false;
  assert.equal(C.autoAim(me, [me, far, hidden, near]), near);
  assert.equal(C.autoAim(me, [me, lone]), null);
});

test('render keeps the combat draw calls within budget', () => {
  const { C, scene } = setup();
  const me = brawler('me', 'mortara', TEAM.BLUE, 5, 5, true);
  C.tryAttack(me, 0, 1, 1);
  C.update(DT, [me]);
  C.render(0.5);
  const root = scene.children[0];
  assert.equal(root.children.length, 6);
  assert.ok(root.children.length <= 8);
});
