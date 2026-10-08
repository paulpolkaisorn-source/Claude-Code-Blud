// game.js — state machine, fixed 60 Hz simulation, Crystal Rush rules, render interpolation (Opus-owned glue).
import { DT, RULES, BRAWLERS, BRAWLER_IDS, TEAM, EV, bus, makeBrawler, BOT_NAMES, DIFFICULTY } from './contracts.js';
import { MAPS, parseMap } from './world/maps.js';
import { generateMap } from './world/generator.js';
import { createArena } from './world/arena.js';
import { createCrystalView } from './world/crystals.js';
import { createBrawlerModel } from './entities/models.js';
import { createPreview } from './entities/preview.js';
import { createCombat } from './combat/combat.js';
import { createAI } from './ai/bots.js';

const MAX_CRYSTALS = 64;
const MAX_STEPS = 8;                     // max sim steps per frame (spiral-of-death guard)
const AIM_SHAPE = { spread: 'cone', bolt: 'line', lob: 'arc', beam: 'line', dash: 'line', rail: 'line', cluster: 'arc', totem: 'circle' };
const AIM_COLOR = 0xffffff, SUPER_AIM_COLOR = 0xffd23a;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const wrapAngle = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

export function createGame({ R, ui, input, fx, audio, mobile }) {
  const scene = R.scene;
  const tmp = { x: 0, z: 0, hit: false };
  const scr = { x: 0, y: 0, visible: false };

  // ---------- persistent state ----------
  const g = {
    state: 'boot',                  // boot|menu|select|matchmaking|playing|paused|ending|results
    cfg: { mode: 'crystal', brawlerId: 'rivet', mapId: 'canyon' },
    timeScale: 1, acc: 0, hitstop: 0, clock: 0, last: 0,
    match: null,                    // per-match world (see buildMatch)
    backdrop: null,                 // menu showcase arena
    preview: null,
    pauseFrom: 'playing',
  };

  // Crystal pool (owned by game, contract shape).
  const crystals = [];
  for (let i = 0; i < MAX_CRYSTALS; i++) crystals.push({ active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, age: 0, settled: false });

  // HUD payloads (preallocated, mutated in place).
  const hud = {
    mode: 'crystal', time: 0, crystals: [0, 0], target: RULES.crystalTarget, playerTeam: TEAM.BLUE,
    countdown: { active: false, team: -1, seconds: 0 },
    player: { hp: 0, maxHp: 1, ammo: 0, maxAmmo: 3, reload: 0, superCharge: 0, superReady: false, crystals: 0, alive: true, respawnIn: 0, brawlerId: 'rivet', name: '' },
  };
  const labels = [];
  for (let i = 0; i < 6; i++) labels.push({ id: 0, x: 0, y: 0, visible: false, hp: 0, maxHp: 1, team: 0, name: '', crystals: 0, isPlayer: false, alpha: 1, ammo: 0, maxAmmo: 3, brawlerId: '' });

  // ---------- scene lifetime helpers ----------
  let baseline = new Set(scene.children);
  function clearSceneAdditions() {
    for (let i = scene.children.length - 1; i >= 0; i--) {
      const o = scene.children[i];
      if (baseline.has(o)) continue;
      scene.remove(o);
      o.traverse((n) => {
        if (n.geometry) n.geometry.dispose();
        if (n.material) (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => m.dispose());
      });
    }
  }

  function loadMapRows(mapId) {
    if (mapId === 'random' || !MAPS[mapId]) return generateMap((Math.random() * 1e9) | 0);
    return MAPS[mapId].rows;
  }

  // ---------- menu backdrop ----------
  function buildBackdrop() {
    teardownBackdrop();
    clearSceneAdditions();
    const arena = createArena(scene, parseMap(MAPS.canyon.rows));
    R.setArenaBounds(arena.cols, arena.rows);
    const view = createCrystalView(scene, 12);
    const show = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      show.push({ active: true, x: arena.mine.x + Math.cos(a) * 1.3, y: 0, z: arena.mine.z + Math.sin(a) * 1.3, vx: 0, vy: 0, vz: 0, age: 1, settled: true });
    }
    g.backdrop = { arena, view, show, t: 0 };
    R.snap(arena.mine.x, arena.mine.z + 4);
  }
  function teardownBackdrop() {
    if (!g.backdrop) return;
    g.backdrop.view.dispose();
    g.backdrop.arena.dispose();
    g.backdrop = null;
    clearSceneAdditions();
  }

  // ---------- match construction ----------
  function buildMatch(cfg) {
    teardownMatch();
    teardownBackdrop();
    clearSceneAdditions();
    for (let i = 0; i < crystals.length; i++) crystals[i].active = false;
    const training = cfg.mode === 'training';
    const rules = training ? { ...RULES, ...RULES.training } : RULES;
    const parsed = parseMap(loadMapRows(cfg.mapId));
    const arena = createArena(scene, parsed);
    R.setArenaBounds(arena.cols, arena.rows);
    const crystalView = createCrystalView(scene, MAX_CRYSTALS);
    const combat = createCombat({ scene, arena, bus });
    const ai = createAI({ arena, combat });

    const others = shuffle(BRAWLER_IDS.filter((id) => id !== cfg.brawlerId).concat(BRAWLER_IDS));
    const names = shuffle(BOT_NAMES.slice());
    const roster = [{ brawlerId: cfg.brawlerId, team: TEAM.BLUE, name: 'You', isPlayer: true, slot: training ? 1 : 0 }];
    if (training) roster.push({ brawlerId: others[0], team: TEAM.RED, name: names[0], slot: 1, diff: DIFFICULTY.easy });
    else {
      roster.push({ brawlerId: others[0], team: TEAM.BLUE, name: names[0], slot: 1, diff: DIFFICULTY.normal });
      roster.push({ brawlerId: others[1], team: TEAM.BLUE, name: names[1], slot: 2, diff: DIFFICULTY.normal });
      for (let i = 0; i < 3; i++) roster.push({ brawlerId: others[2 + i], team: TEAM.RED, name: names[2 + i], slot: i, diff: DIFFICULTY.normal });
    }
    const brawlers = [], views = [];
    let player = null;
    roster.forEach((r, i) => {
      const b = makeBrawler(i + 1, r.brawlerId, r.team, r.name, !!r.isPlayer);
      const sp = arena.spawns[r.team][r.slot % arena.spawns[r.team].length];
      b.x = b.px = sp.x; b.z = b.pz = sp.z;
      b.facing = r.team === TEAM.BLUE ? Math.PI : 0;
      b.slot = r.slot; b.flashShown = 0; b.attackFace = 0; b.moveSpeed01 = 0; b.baseAnim = 'idle'; b.deadTime = 0;
      const view = createBrawlerModel(r.brawlerId, { team: r.team, isPlayer: !!r.isPlayer });
      scene.add(view.root);
      view.setPose(b.x, b.z, b.facing);
      view.play('idle');
      brawlers.push(b); views.push(view);
      if (r.isPlayer) player = b; else ai.addBot(b, r.diff);
    });
    g.match = {
      cfg: { ...cfg }, training, rules, arena, crystalView, combat, ai, brawlers, views, player,
      time: rules.matchTime, spawnTimer: 1.5, teamCrystals: [0, 0], totalSpawned: 0,
      countdownTeam: -1, countdownT: 0, countdownSec: 0, winner: -2, endTimer: 0, superReadyShown: false,
      aiCtx: { brawlers, crystals, mine: arena.mine, teamCrystals: [0, 0], countdownTeam: -1, time: 0 },
    };
    hud.mode = cfg.mode; hud.target = rules.crystalTarget; hud.playerTeam = TEAM.BLUE;
    hud.player.brawlerId = cfg.brawlerId; hud.player.name = player.name;
    fx.reset();
    R.snap(player.x, player.z);
    return roster;
  }

  function teardownMatch() {
    const m = g.match;
    if (!m) return;
    m.views.forEach((v) => { scene.remove(v.root); v.dispose(); });
    m.combat.reset();
    if (m.combat.dispose) m.combat.dispose();
    m.ai.reset();
    m.crystalView.dispose();
    m.arena.dispose();
    g.match = null;
    fx.setAim(false, 0, 0, 0, 1, 1, 'line', AIM_COLOR);
    clearSceneAdditions();
  }

  // ---------- crystals ----------
  function spawnCrystal(x, z, speed, angle) {
    for (let i = 0; i < crystals.length; i++) {
      const c = crystals[i];
      if (c.active) continue;
      c.active = true; c.settled = false; c.age = 0;
      c.x = x; c.z = z; c.y = 0.6;
      c.vx = Math.sin(angle) * speed; c.vz = Math.cos(angle) * speed; c.vy = 5.5;
      return c;
    }
    return null;
  }
  function crystalsInPlay(m) {
    let n = 0;
    for (let i = 0; i < crystals.length; i++) if (crystals[i].active) n++;
    for (let i = 0; i < m.brawlers.length; i++) n += m.brawlers[i].crystals;
    return n;
  }
  function stepCrystals(m) {
    const A = m.arena;
    m.spawnTimer -= DT;
    if (m.spawnTimer <= 0) {
      m.spawnTimer = RULES.crystalSpawnEvery;
      if (crystalsInPlay(m) < RULES.maxCrystals) {
        const c = spawnCrystal(A.mine.x, A.mine.z, 1.6 + Math.random() * 1.6, Math.random() * Math.PI * 2);
        if (c) { m.totalSpawned++; bus.emit(EV.CRYSTAL_SPAWN, { x: c.x, z: c.z }); }
      }
    }
    for (let i = 0; i < crystals.length; i++) {
      const c = crystals[i];
      if (!c.active) continue;
      c.age += DT;
      if (!c.settled) {
        c.vy -= 22 * DT;
        c.y += c.vy * DT;
        A.moveCircle(c.x, c.z, 0.2, c.vx * DT, c.vz * DT, tmp);
        if (tmp.hit) { c.vx *= -0.3; c.vz *= -0.3; }
        c.x = tmp.x; c.z = tmp.z;
        if (c.y <= 0) {
          c.y = 0;
          if (Math.abs(c.vy) < 2.5) { c.vy = 0; c.vx = 0; c.vz = 0; c.settled = true; }
          else { c.vy = -c.vy * 0.35; c.vx *= 0.55; c.vz *= 0.55; }
        }
      }
      if (c.age < 0.35) continue;
      const pr2 = RULES.pickupRadius * RULES.pickupRadius;
      for (let j = 0; j < m.brawlers.length; j++) {
        const b = m.brawlers[j];
        if (!b.alive) continue;
        const dx = b.x - c.x, dz = b.z - c.z;
        if (dx * dx + dz * dz > pr2) continue;
        c.active = false;
        b.crystals++; b.stats.crystals++;
        m.teamCrystals[b.team]++;
        bus.emit(EV.CRYSTAL_PICKUP, { b, x: c.x, z: c.z, total: m.teamCrystals[b.team] });
        break;
      }
    }
  }
  function dropCrystals(m, b) {
    const n = b.crystals;
    if (n <= 0) return;
    b.crystals = 0;
    for (let i = 0; i < n; i++) spawnCrystal(b.x, b.z, 1.2 + Math.random() * 1.8, (i / n) * Math.PI * 2 + Math.random() * 0.5);
    bus.emit(EV.CRYSTAL_DROP, { b, count: n, x: b.x, z: b.z });
  }

  // ---------- simulation ----------
  function stepMovement(m) {
    const A = m.arena, list = m.brawlers;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      b.px = b.x; b.pz = b.z;
      if (!b.alive) { b.vx = 0; b.vz = 0; continue; }
      if (b.revealTimer > 0) b.revealTimer -= DT;
      if (b.attackFace > 0) b.attackFace -= DT;
      if (b.dashTimer > 0 || b.stunTimer > 0) continue;         // combat drives displacement
      const inp = b.input;
      let mx = inp.moveX || 0, mz = inp.moveZ || 0;
      const len = Math.hypot(mx, mz);
      if (len > 1) { mx /= len; mz /= len; }
      const speed = BRAWLERS[b.brawlerId].speed;
      if (len > 0.05) {
        A.moveCircle(b.x, b.z, b.radius, mx * speed * DT, mz * speed * DT, tmp);
        b.x = tmp.x; b.z = tmp.z;
        if (b.attackFace <= 0) {
          const target = Math.atan2(mx, mz);
          b.facing = wrapAngle(b.facing + clamp(wrapAngle(target - b.facing), -16 * DT, 16 * DT));
        }
      }
    }
    // Soft body separation (brawlers don't overlap).
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (!b.alive) continue;
        const dx = b.x - a.x, dz = b.z - a.z, d2 = dx * dx + dz * dz, rr = a.radius + b.radius;
        if (d2 >= rr * rr || d2 < 1e-6) continue;
        const d = Math.sqrt(d2), push = (rr - d) * 0.5, nx = dx / d, nz = dz / d;
        A.moveCircle(a.x, a.z, a.radius, -nx * push, -nz * push, tmp); a.x = tmp.x; a.z = tmp.z;
        A.moveCircle(b.x, b.z, b.radius, nx * push, nz * push, tmp); b.x = tmp.x; b.z = tmp.z;
      }
    }
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      b.vx = (b.x - b.px) / DT; b.vz = (b.z - b.pz) / DT;
      b.moveSpeed01 = clamp(Math.hypot(b.vx, b.vz) / BRAWLERS[b.brawlerId].speed, 0, 1);
    }
  }

  function aimFor(m, b, auto, isSuper, out) {
    const inp = b.input, s = BRAWLERS[b.brawlerId], range = isSuper ? s.super.range : s.attack.range;
    out.x = inp.aimX; out.z = inp.aimZ; out.len = clamp(inp.aimLen ?? 1, 0, 1);
    if (auto) {
      const t = m.combat.autoAim(b, m.brawlers);
      if (t) {
        const dx = t.x - b.x, dz = t.z - b.z, d = Math.hypot(dx, dz) || 1;
        out.x = dx / d; out.z = dz / d; out.len = clamp(d / range, 0.15, 1);
      } else { out.x = Math.sin(b.facing); out.z = Math.cos(b.facing); out.len = 1; }
    }
    const l = Math.hypot(out.x, out.z);
    if (l < 1e-4) { out.x = Math.sin(b.facing); out.z = Math.cos(b.facing); } else { out.x /= l; out.z /= l; }
    return out;
  }
  const aimTmp = { x: 0, z: 0, len: 1 };
  function stepAttacks(m) {
    for (let i = 0; i < m.brawlers.length; i++) {
      const b = m.brawlers[i], inp = b.input, view = m.views[i];
      if (b.alive && (inp.superFire || inp.autoSuper) && b.superCharge >= 1) {
        aimFor(m, b, inp.autoSuper && !inp.superFire, true, aimTmp);
        if (m.combat.trySuper(b, aimTmp.x, aimTmp.z, aimTmp.len)) {
          b.facing = Math.atan2(aimTmp.x, aimTmp.z); b.attackFace = 0.45; view.play('super');
        }
      } else if (b.alive && (inp.fire || inp.autoFire)) {
        aimFor(m, b, inp.autoFire && !inp.fire, false, aimTmp);
        if (m.combat.tryAttack(b, aimTmp.x, aimTmp.z, aimTmp.len)) {
          b.facing = Math.atan2(aimTmp.x, aimTmp.z); b.attackFace = 0.35; view.play('attack');
        }
      }
      inp.fire = inp.autoFire = inp.superFire = inp.autoSuper = false;
    }
  }

  function stepVisibility(m) {
    const list = m.brawlers, rr = RULES.revealRadius * RULES.revealRadius;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      b.inBush = b.alive && m.arena.isBushAt(b.x, b.z);
      for (let t = 0; t < 2; t++) {
        if (t === b.team) { b.visibleTo[t] = true; continue; }
        if (!b.alive) { b.visibleTo[t] = false; continue; }
        if (!b.inBush || b.revealTimer > 0) { b.visibleTo[t] = true; continue; }
        let near = false;
        for (let j = 0; j < list.length && !near; j++) {
          const o = list[j];
          if (o.team !== t || !o.alive) continue;
          const dx = o.x - b.x, dz = o.z - b.z;
          near = dx * dx + dz * dz <= rr;
        }
        b.visibleTo[t] = near;
      }
    }
  }

  function stepRespawns(m) {
    for (let i = 0; i < m.brawlers.length; i++) {
      const b = m.brawlers[i];
      if (b.alive) continue;
      b.deadTime += DT;
      b.respawnTimer -= DT;
      if (b.respawnTimer > 0) continue;
      const s = BRAWLERS[b.brawlerId], sp = m.arena.spawns[b.team][b.slot % m.arena.spawns[b.team].length];
      b.x = b.px = sp.x; b.z = b.pz = sp.z; b.vx = b.vz = 0;
      b.hp = b.maxHp; b.alive = true; b.ammo = s.ammo; b.reloadTimer = 0; b.attackCooldown = 0;
      b.dashTimer = b.stunTimer = 0; b.kbVx = b.kbVz = 0; b.combatTimer = 99; b.revealTimer = 0;
      b.facing = b.team === TEAM.BLUE ? Math.PI : 0;
      m.views[i].play('idle'); b.baseAnim = 'idle';
      bus.emit(EV.RESPAWN, { b });
      if (b.isPlayer) R.snap(b.x, b.z);
    }
  }

  function stepRules(m) {
    m.time -= DT;
    const tc = m.teamCrystals;
    tc[0] = 0; tc[1] = 0;
    for (let i = 0; i < m.brawlers.length; i++) tc[m.brawlers[i].team] += m.brawlers[i].crystals;
    const target = m.rules.crystalTarget;
    const leader = tc[0] >= target && tc[0] > tc[1] ? 0 : tc[1] >= target && tc[1] > tc[0] ? 1 : -1;
    if (leader !== m.countdownTeam) {
      if (m.countdownTeam !== -1) bus.emit(EV.COUNTDOWN_CANCEL, { team: m.countdownTeam });
      m.countdownTeam = leader;
      m.countdownT = m.rules.countdown;
      m.countdownSec = Math.ceil(m.countdownT) + 1;
      if (leader !== -1) ui.hud.toast(leader === TEAM.BLUE ? 'Hold the crystals!' : 'Enemy is counting down!', leader === TEAM.BLUE ? 'good' : 'bad');
    }
    if (leader !== -1) {
      m.countdownT -= DT;
      const sec = Math.max(0, Math.ceil(m.countdownT));
      if (sec !== m.countdownSec) { m.countdownSec = sec; bus.emit(EV.COUNTDOWN, { team: leader, seconds: sec }); }
      if (m.countdownT <= 0) return endMatch(leader);
    }
    if (m.time <= 0) {
      m.time = 0;
      endMatch(tc[0] > tc[1] ? 0 : tc[1] > tc[0] ? 1 : -1);
    }
  }

  function tick() {
    const m = g.match;
    if (!m || g.state !== 'playing') return;
    const ctx = m.aiCtx;
    ctx.teamCrystals[0] = m.teamCrystals[0]; ctx.teamCrystals[1] = m.teamCrystals[1];
    ctx.countdownTeam = m.countdownTeam; ctx.time = m.rules.matchTime - m.time;
    m.ai.update(DT, ctx);
    stepMovement(m);
    stepAttacks(m);
    m.combat.update(DT, m.brawlers);
    stepRespawns(m);
    stepCrystals(m);
    stepVisibility(m);
    stepRules(m);
  }

  // ---------- events ----------
  bus.on(EV.DEATH, ({ victim, killer }) => {
    const m = g.match;
    if (!m) return;
    const i = m.brawlers.indexOf(victim);
    if (i < 0) return;
    victim.respawnTimer = RULES.respawnTime;
    victim.deadTime = 0;
    dropCrystals(m, victim);
    m.views[i].play('death');
    victim.baseAnim = 'death';
    if (killer && killer !== victim) ui.hud.killFeed(killer, victim);
    else ui.hud.killFeed(victim, victim);
  });
  bus.on(EV.HIT, ({ target }) => {
    const m = g.match;
    if (!m || !target) return;
    target.hitFlash = 1;
    const i = m.brawlers.indexOf(target);
    if (i >= 0 && target.alive && target.attackFace <= 0) m.views[i].play('hit');
  });
  bus.on(EV.HITSTOP, ({ ms }) => { g.hitstop = Math.max(g.hitstop, (ms || 0) / 1000); });
  bus.on(EV.SUPER_READY, ({ b }) => { if (b && b.isPlayer) ui.hud.toast('Super ready!', 'super'); });

  // ---------- end of match ----------
  function endMatch(winner) {
    const m = g.match;
    if (!m || g.state !== 'playing') return;
    m.winner = winner;
    const outcome = winner === -1 ? 'draw' : winner === TEAM.BLUE ? 'victory' : 'defeat';
    g.state = 'ending';
    m.endTimer = 2.2;
    input.setEnabled(false);
    input.setTouchVisible(false);
    fx.setAim(false, 0, 0, 0, 1, 1, 'line', AIM_COLOR);
    m.views.forEach((v, i) => { const b = m.brawlers[i]; if (b.alive && (winner === -1 || b.team === winner)) v.play('victory'); });
    bus.emit(EV.MATCH_END, { outcome, winner });
    audio.music(null);
    m.outcome = outcome;
  }
  function results() {
    const m = g.match;
    const score = (b) => b.stats.kills * 3 + b.stats.crystals * 2 + b.stats.damage / 600 + b.stats.healing / 600 - b.stats.deaths * 0.5;
    const pool = m.brawlers.filter((b) => m.winner === -1 || b.team === m.winner);
    const mvp = pool.reduce((best, b) => (score(b) > score(best) ? b : best), pool[0]);
    return {
      outcome: m.outcome, winner: m.winner, playerTeam: TEAM.BLUE, mode: m.cfg.mode,
      score: [m.teamCrystals[0], m.teamCrystals[1]],
      mvp: { name: mvp.name, brawlerId: mvp.brawlerId, team: mvp.team, score: Math.round(score(mvp) * 10) / 10, isPlayer: mvp.isPlayer },
      rows: m.brawlers.map((b) => ({ name: b.name, brawlerId: b.brawlerId, team: b.team, isPlayer: b.isPlayer,
        kills: b.stats.kills, deaths: b.stats.deaths, crystals: b.stats.crystals, damage: Math.round(b.stats.damage), healing: Math.round(b.stats.healing) })),
    };
  }

  // ---------- per-frame presentation ----------
  function presentMatch(m, dt, alpha) {
    const pl = m.player;
    for (let i = 0; i < m.brawlers.length; i++) {
      const b = m.brawlers[i], v = m.views[i];
      const x = lerp(b.px, b.x, alpha), z = lerp(b.pz, b.z, alpha);
      const hidden = !b.visibleTo[TEAM.BLUE] && b.team !== TEAM.BLUE;
      const gone = !b.alive && b.deadTime > 1.1;
      v.root.visible = !hidden && !gone;
      v.setPose(x, z, b.facing);
      if (b.alive) {
        const base = b.moveSpeed01 > 0.2 ? 'run' : 'idle';
        if (base !== b.baseAnim) { b.baseAnim = base; v.play(base); }
      }
      v.setOpacity(b.team === TEAM.BLUE && b.inBush ? 0.5 : 1);
      if (b.hitFlash > 0 || b.flashShown > 0) { b.flashShown = b.hitFlash; v.setFlash(b.hitFlash); }
      v.update(dt, b.moveSpeed01);
      const L = labels[i];
      R.worldToScreen(x, 2.0, z, scr);
      L.id = b.id; L.x = scr.x; L.y = scr.y; L.visible = scr.visible && v.root.visible && b.alive;
      L.hp = b.hp; L.maxHp = b.maxHp; L.team = b.team; L.name = b.name; L.crystals = b.crystals;
      L.isPlayer = b.isPlayer; L.alpha = b.inBush && b.team === TEAM.BLUE ? 0.6 : 1;
      L.ammo = b.ammo; L.maxAmmo = b.maxAmmo; L.brawlerId = b.brawlerId;
    }
    m.crystalView.sync(crystals, g.clock);
    m.arena.update(dt, g.clock, pl.x, pl.z);
    m.combat.render(alpha);
    fx.update(dt, m.brawlers, m.combat.projectiles);

    // Aim indicator for the player.
    const inp = pl.input;
    if (g.state === 'playing' && pl.alive && (inp.aiming || inp.superAiming)) {
      const s = BRAWLERS[pl.brawlerId], sup = inp.superAiming, spec = sup ? s.super : s.attack;
      const shape = AIM_SHAPE[spec.kind] || 'line';
      const len = shape === 'arc' || shape === 'circle' ? Math.max(1.5, spec.range * clamp(inp.aimLen ?? 1, 0, 1)) : spec.range;
      fx.setAim(true, lerp(pl.px, pl.x, alpha), lerp(pl.pz, pl.z, alpha), inp.aimX, inp.aimZ, len, shape, sup ? SUPER_AIM_COLOR : AIM_COLOR);
    } else fx.setAim(false, 0, 0, 0, 1, 1, 'line', AIM_COLOR);

    R.follow(lerp(pl.px, pl.x, alpha), lerp(pl.pz, pl.z, alpha), dt);

    // HUD
    hud.time = Math.max(0, m.time);
    hud.crystals[0] = m.teamCrystals[0]; hud.crystals[1] = m.teamCrystals[1];
    hud.countdown.active = m.countdownTeam !== -1; hud.countdown.team = m.countdownTeam;
    hud.countdown.seconds = Math.max(0, Math.ceil(m.countdownT));
    const P = hud.player, s = BRAWLERS[pl.brawlerId];
    P.hp = pl.hp; P.maxHp = pl.maxHp; P.ammo = pl.ammo; P.maxAmmo = pl.maxAmmo;
    P.reload = pl.ammo >= pl.maxAmmo ? 0 : clamp(pl.reloadTimer / s.reload, 0, 1);
    P.superCharge = pl.superCharge; P.superReady = pl.superCharge >= 1;
    P.crystals = pl.crystals; P.alive = pl.alive; P.respawnIn = pl.alive ? 0 : Math.max(0, pl.respawnTimer);
    ui.hud.update(hud);
    ui.hud.labels(labels, m.brawlers.length);
    if (P.superReady !== m.superReadyShown) { m.superReadyShown = P.superReady; input.setSuperReady(P.superReady); }
  }

  function presentBackdrop(dt) {
    const bd = g.backdrop;
    if (!bd) return;
    bd.t += dt;
    const x = bd.arena.mine.x + Math.sin(bd.t * 0.12) * 4;
    const z = bd.arena.mine.z + Math.sin(bd.t * 0.07) * 9;
    bd.view.sync(bd.show, g.clock);
    bd.arena.update(dt, g.clock, -100, -100);
    fx.update(dt, EMPTY, EMPTY);
    R.follow(x, z, dt);
  }
  const EMPTY = [];

  // ---------- main loop ----------
  function frame(now) {
    requestAnimationFrame(frame);
    const dtReal = g.last ? clamp((now - g.last) / 1000, 0, 0.1) : 1 / 60;
    g.last = now;
    g.clock += dtReal;
    const m = g.match;
    if (g.state === 'playing' && m) {
      input.update(m.player);
      if (g.hitstop > 0) g.hitstop -= dtReal;
      else {
        g.acc += dtReal * g.timeScale;
        let steps = 0;
        while (g.acc >= DT && steps < MAX_STEPS * g.timeScale) { tick(); g.acc -= DT; steps++; }
        if (g.acc > DT * 2) g.acc = DT;
      }
    } else if (g.state === 'ending' && m) {
      m.endTimer -= dtReal;
      if (m.endTimer <= 0) {
        g.state = 'results';
        ui.showResults(results());
        ui.show('results');
      }
    }
    const alpha = g.state === 'playing' ? clamp(g.acc / DT, 0, 1) : 1;
    if (m && (g.state === 'playing' || g.state === 'paused' || g.state === 'ending' || g.state === 'results')) presentMatch(m, g.state === 'paused' ? 0 : dtReal, alpha);
    else if (g.backdrop) presentBackdrop(dtReal);
    if (g.state !== 'select') R.render(dtReal);
  }

  // ---------- state transitions ----------
  function toMenu() {
    teardownMatch();
    closePreview();
    if (!g.backdrop) buildBackdrop();
    g.state = 'menu';
    input.setEnabled(false);
    input.setTouchVisible(false);
    ui.show('menu');
    audio.music('menu');
  }
  function closePreview() { if (g.preview) { g.preview.dispose(); g.preview = null; } }
  function toSelect(mode) {
    g.cfg.mode = mode || g.cfg.mode;
    g.state = 'select';
    ui.show('select');
    ui.setSelected(g.cfg.brawlerId);
    closePreview();
    if (ui.previewCanvas) g.preview = createPreview(ui.previewCanvas, g.cfg.brawlerId);
  }
  function toMatchmaking() {
    closePreview();
    const roster = buildMatch(g.cfg);
    g.state = 'matchmaking';
    ui.show('matchmaking');
    ui.matchmaking(g.cfg.mode === 'training' ? 1.5 : 3, roster.map((r) => ({ name: r.name, brawlerId: r.brawlerId, team: r.team, isPlayer: !!r.isPlayer })));
  }
  function toPlaying() {
    const m = g.match;
    if (!m) return;
    g.state = 'playing';
    g.acc = 0; g.hitstop = 0;
    ui.show('hud');
    input.setEnabled(true);
    input.setTouchVisible(!!mobile);
    input.setSuperReady(false);
    audio.music('battle');
    bus.emit(EV.MATCH_START, { mode: m.cfg.mode, mapId: m.cfg.mapId, playerTeam: TEAM.BLUE });
  }
  function pause() {
    if (g.state !== 'playing') return;
    g.state = 'paused';
    input.setEnabled(false);
    input.setTouchVisible(false);
    fx.setAim(false, 0, 0, 0, 1, 1, 'line', AIM_COLOR);
    ui.show('pause');
  }
  function resume() {
    if (g.state !== 'paused') return;
    g.state = 'playing';
    g.last = 0; g.acc = 0;
    input.setEnabled(true);
    input.setTouchVisible(!!mobile);
    ui.show('hud');
  }

  bus.on(EV.UI_PLAY, ({ mode } = {}) => { if (g.state === 'menu' || g.state === 'results') toSelect(mode); });
  bus.on(EV.UI_SELECT, ({ brawlerId } = {}) => {
    if (!BRAWLERS[brawlerId]) return;
    g.cfg.brawlerId = brawlerId;
    ui.setSelected(brawlerId);
    if (g.preview) g.preview.setBrawler(brawlerId);
  });
  bus.on(EV.UI_START, (p = {}) => {
    if (g.state !== 'select') return;
    if (BRAWLERS[p.brawlerId]) g.cfg.brawlerId = p.brawlerId;
    if (p.mode) g.cfg.mode = p.mode;
    if (p.mapId) g.cfg.mapId = p.mapId;
    toMatchmaking();
  });
  bus.on(EV.UI_MATCH_READY, () => { if (g.state === 'matchmaking') toPlaying(); });
  bus.on(EV.UI_PAUSE, () => pause());
  bus.on(EV.UI_RESUME, () => resume());
  bus.on(EV.UI_QUIT, () => { if (g.state === 'paused' || g.state === 'playing' || g.state === 'results') toMenu(); });
  bus.on(EV.UI_AGAIN, () => { if (g.state === 'results') toMatchmaking(); });
  bus.on(EV.UI_MENU, () => { if (g.state !== 'playing') toMenu(); });

  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

  // ---------- public / debug ----------
  return {
    start() { toMenu(); requestAnimationFrame(frame); },
    get state() { return g.state; },
    get match() { return g.match; },
    get crystals() { return crystals; },
    debug: {
      setTimeScale(s) { g.timeScale = clamp(s, 0.1, 16); },
      quickStart(cfg = {}) { Object.assign(g.cfg, cfg); toMatchmaking(); toPlaying(); },
      fastForward(seconds) {
        const n = Math.round(seconds / DT);
        for (let i = 0; i < n && g.state === 'playing'; i++) tick();
        return g.state;
      },
      endMatch(winner) { endMatch(winner); },
      skipEnding() { if (g.match && g.state === 'ending') g.match.endTimer = 0; },
      pause, resume, toMenu,
    },
  };
}
