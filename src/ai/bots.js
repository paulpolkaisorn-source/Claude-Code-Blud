// bots.js — utility-AI bots. Each bot writes ONLY its own b.input; the game resolves fire edges and moves brawlers.
// Fairness: enemies with visibleTo[bot.team] === false are never targeted or fired at. A last-seen position of a
// visible enemy is remembered for 1.5 s and used only as a movement goal while investigating.
import { BRAWLERS, DIFFICULTY, DT, T, makeInput } from '../contracts.js';
import { findPath } from './astar.js';

const RESCORE = 0.25;        // s between utility re-scores, +/-0.05 jitter
const ENGAGE = 1.2;          // target acquisition radius = ENGAGE * weapon range
const RETREAT_ON = 0.35;     // hp fraction that starts a retreat
const RETREAT_OFF = 0.7;     // hp fraction that ends a retreat (regenerated)
const MEMORY = 1.5;          // s a last-seen position is remembered
const REPATH = 1.0;          // s between forced repaths
const HYSTERESIS = 0.05;     // keep the current intent unless another beats it by this margin
const AIM_ERROR = 0.35;      // rad, scaled by (1 - difficulty)

export const INTENT = { SEEK: 0, ATTACK: 1, RETREAT: 2, REGROUP: 3, PROTECT: 4, CONTEST: 5 };
const N_INTENT = 6;
const EMPTY = [];
const arenaInfos = new WeakMap();

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

function tileAt(arena, c, r) {
  return typeof arena.tile === 'function' ? arena.tile(c, r) : arena.tiles[r * arena.cols + c];
}

// Per-arena constants: bush tile indices (static) and each team's spawn centre.
function arenaInfo(arena) {
  let v = arenaInfos.get(arena);
  if (v) return v;
  const cols = arena.cols;
  const rows = arena.rows;
  const bushes = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) if (tileAt(arena, c, r) === T.BUSH) bushes.push(r * cols + c);
  }
  const spawnX = [cols * 0.5, cols * 0.5];
  const spawnZ = [rows - 1.5, 1.5];   // fallbacks: BLUE near row 32, RED far row 0
  for (let team = 0; team < 2; team++) {
    const sp = arena.spawns && arena.spawns[team];
    if (!sp || sp.length === 0) continue;
    let sx = 0;
    let sz = 0;
    for (let i = 0; i < sp.length; i++) { sx += sp[i].x; sz += sp[i].z; }
    spawnX[team] = sx / sp.length;
    spawnZ[team] = sz / sp.length;
  }
  v = { bushes: Int32Array.from(bushes), spawnX, spawnZ };
  arenaInfos.set(arena, v);
  return v;
}

// Line of sight for direct shots (walls block shots; water does not).
function sight(arena, x0, z0, x1, z1) {
  if (typeof arena.hasLOS === 'function') return arena.hasLOS(x0, z0, x1, z1);
  const n = Math.ceil(dist(x0, z0, x1, z1) * 4);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const c = Math.floor(x0 + (x1 - x0) * t);
    const r = Math.floor(z0 + (z1 - z0) * t);
    if (c < 0 || r < 0 || c >= arena.cols || r >= arena.rows || tileAt(arena, c, r) === T.WALL) return false;
  }
  return true;
}

// Fairness gate: only living enemies that are not hidden from this bot's team.
const hostile = (b, e) => e !== b && e.alive && e.team !== b.team && !(e.visibleTo && e.visibleTo[b.team] === false);

function enemyNearPoint(b, list, x, z, r) {
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (hostile(b, e) && dist(e.x, e.z, x, z) <= r) return true;
  }
  return false;
}

function pickTarget(b, list, engage) {
  let best = null;
  let bestScore = -Infinity;
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (!hostile(b, e)) continue;
    const d = dist(b.x, b.z, e.x, e.z);
    if (d > engage) continue;
    const frac = e.maxHp > 0 ? e.hp / e.maxHp : 1;
    const score = (1 - frac) * 0.5 + (e.crystals > 0 ? 0.3 : 0) + (1 - d / engage) * 0.4;
    if (score > bestScore) { bestScore = score; best = e; }
  }
  return best;
}

function hurtAlly(b, list, range, frac, allowSelf) {
  let best = null;
  let bestFrac = frac;
  for (let i = 0; i < list.length; i++) {
    const e = list[i];
    if (!e.alive || e.team !== b.team || (e === b && !allowSelf)) continue;
    const f = e.maxHp > 0 ? e.hp / e.maxHp : 1;
    if (f >= bestFrac || dist(b.x, b.z, e.x, e.z) > range) continue;
    best = e;
    bestFrac = f;
  }
  return best;
}

function nearestActiveCrystal(b, crystals) {
  let best = null;
  let bestD = Infinity;
  for (let i = 0; i < crystals.length; i++) {
    const c = crystals[i];
    if (!c.active) continue;
    const d = dist(b.x, b.z, c.x, c.z);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

// Deterministic per-bot xorshift32 in [0, 1).
function rnd(s) {
  let x = s.rng;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  s.rng = x >>> 0;
  return s.rng / 4294967296;
}

function newState(b, diff, index, cells) {
  return {
    b, diff,
    rng: (((index + 1) * 2654435761) >>> 0) || 1,
    clock: 0,
    intent: -1, scores: new Float32Array(N_INTENT), rescoreT: 0, retreating: false,
    target: null, reactT: 0, aimErr: 0,
    crystal: null, carrier: null,
    holdX: 0, holdZ: 0,
    memX: 0, memZ: 0, memT: -1e9, memRef: null,
    goalX: 0, goalZ: 0,
    dirX: 0, dirZ: 0, mvX: 0, mvZ: 0,
    path: new Int32Array(cells), pathLen: 0, pathIdx: 0, pathGoal: -1, pathNav: -1, pathAge: 0,
    strafeSign: 1, strafeT: 0,
    sampleT: 0, lastX: b.x, lastZ: b.z, moveWanted: false, unstick: 0, unstickSign: 1,
    wasAlive: true,
  };
}

function resetBot(s) {
  s.intent = -1;
  s.rescoreT = 0;
  s.retreating = false;
  s.target = null;
  s.reactT = 0;
  s.pathGoal = -1;
  s.pathLen = 0;
  s.crystal = null;
  s.carrier = null;
  s.unstick = 0;
  s.moveWanted = false;
  s.memT = -1e9;
  s.memRef = null;
}

function pickHold(arena, s) {
  const info = arenaInfo(arena);
  const b = s.b;
  const cols = arena.cols;
  const rows = arena.rows;
  const team = b.team;
  const sx = info.spawnX[team];
  const sz = info.spawnZ[team];
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < info.bushes.length; i++) {
    const p = info.bushes[i];
    const c = p % cols;
    const r = (p - c) / cols;
    const ownSide = team === 0 ? r > rows / 2 : r < rows / 2;
    if (!ownSide) continue;
    const x = c + 0.5;
    const z = r + 0.5;
    if (dist(x, z, sx, sz) > 9) continue;
    const d = dist(x, z, b.x, b.z);
    if (d < bestD) { bestD = d; best = p; }
  }
  if (best >= 0) {
    const c = best % cols;
    s.holdX = c + 0.5;
    s.holdZ = (best - c) / cols + 0.5;
  } else {
    s.holdX = sx;
    s.holdZ = sz;
  }
}

// Utility scoring: retreat latch, protect, attack/investigate, regroup, seek, contest. Hysteresis on the winner.
function rescore(arena, s, ctx, list) {
  const b = s.b;
  const hp = b.maxHp > 0 ? b.hp / b.maxHp : 1;
  if (s.retreating) { if (hp >= RETREAT_OFF) s.retreating = false; }
  else if (hp < RETREAT_ON) s.retreating = true;
  if (s.memRef && !s.memRef.alive) s.memT = -1e9;   // no investigating the spot where an enemy died

  const crystals = ctx.crystals || EMPTY;
  s.crystal = nearestActiveCrystal(b, crystals);
  const seekD = s.crystal ? dist(b.x, b.z, s.crystal.x, s.crystal.z) : Infinity;

  // Regroup: nearest ally carrier that has a visible enemy close to it.
  let carrier = null;
  let carrierD = Infinity;
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a === b || !a.alive || a.team !== b.team || !(a.crystals > 0)) continue;
    const d = dist(b.x, b.z, a.x, a.z);
    if (d >= carrierD || !enemyNearPoint(b, list, a.x, a.z, 7)) continue;
    carrier = a;
    carrierD = d;
  }
  s.carrier = carrier;

  const tc = ctx.teamCrystals;
  const behind = tc ? tc[b.team] < tc[1 - b.team] : false;
  const sc = s.scores;
  sc[INTENT.RETREAT] = s.retreating ? 1 : 0;
  sc[INTENT.PROTECT] = (b.crystals >= 4 || ctx.countdownTeam === b.team) ? 0.9 : 0;
  if (s.target) sc[INTENT.ATTACK] = 0.7 + 0.1 * (1 - hp);
  else sc[INTENT.ATTACK] = s.clock - s.memT <= MEMORY ? 0.45 : 0;
  sc[INTENT.REGROUP] = carrier ? 0.6 : 0;
  sc[INTENT.SEEK] = s.crystal ? 0.45 + (behind ? 0.2 : 0) - 0.004 * Math.min(seekD, 40) : 0;
  sc[INTENT.CONTEST] = ctx.mine ? 0.1 : 0;

  let best = 0;
  for (let i = 1; i < N_INTENT; i++) if (sc[i] > sc[best]) best = i;
  if (s.intent >= 0 && sc[s.intent] > 0 && sc[s.intent] >= sc[best] - HYSTERESIS) best = s.intent;
  if (best !== s.intent) {
    s.intent = best;
    s.pathGoal = -1;
    if (best === INTENT.PROTECT) pickHold(arena, s);
  }
}

// Path-follow toward (gx, gz). Repaths on goal tile change, navVersion change, or REPATH seconds.
// Sets s.dirX/s.dirZ to the unit direction of the next step and returns the distance to the goal.
function followTo(arena, s, gx, gz) {
  const b = s.b;
  const cols = arena.cols;
  const rows = arena.rows;
  const gc = clamp(Math.floor(gx), 0, cols - 1);
  const gr = clamp(Math.floor(gz), 0, rows - 1);
  const goalTile = gr * cols + gc;
  if (goalTile !== s.pathGoal || arena.navVersion !== s.pathNav || s.pathAge >= REPATH) {
    const sc = clamp(Math.floor(b.x), 0, cols - 1);
    const sr = clamp(Math.floor(b.z), 0, rows - 1);
    s.pathLen = findPath(arena, sc, sr, gc, gr, s.path);
    s.pathIdx = 0;
    s.pathGoal = goalTile;
    s.pathNav = arena.navVersion;
    s.pathAge = 0;
  }
  let tx = gx;
  let tz = gz;
  if (s.pathLen > 1) {
    while (s.pathIdx < s.pathLen - 1) {
      const p = s.path[s.pathIdx];
      const wc = p % cols;
      const wr = (p - wc) / cols;
      if (dist(wc + 0.5, wr + 0.5, b.x, b.z) < 0.4) s.pathIdx++;
      else break;
    }
    if (s.pathIdx < s.pathLen - 1) {
      const p = s.path[s.pathIdx];
      const wc = p % cols;
      tx = wc + 0.5;
      tz = (p - wc) / cols + 0.5;
    }
  }
  const dx = tx - b.x;
  const dz = tz - b.z;
  const len = Math.hypot(dx, dz);
  if (len > 1e-4) { s.dirX = dx / len; s.dirZ = dz / len; }
  else { s.dirX = 0; s.dirZ = 0; }
  return dist(gx, gz, b.x, b.z);
}

// Movement per intent into s.mvX/s.mvZ.
function intentMove(arena, s, ctx, atk) {
  const b = s.b;
  s.mvX = 0;
  s.mvZ = 0;
  switch (s.intent) {
    case INTENT.SEEK: {
      const c = s.crystal;
      if (!c || !c.active) { s.rescoreT = 0; return; }
      if (followTo(arena, s, c.x, c.z) > 0.2) { s.mvX = s.dirX; s.mvZ = s.dirZ; }
      return;
    }
    case INTENT.CONTEST: {
      const m = ctx.mine;
      if (!m) { s.rescoreT = 0; return; }
      if (followTo(arena, s, m.x, m.z) > 1.0) { s.mvX = s.dirX; s.mvZ = s.dirZ; }
      return;
    }
    case INTENT.REGROUP: {
      const c = s.carrier;
      if (!c || !c.alive || !(c.crystals > 0)) { s.rescoreT = 0; return; }
      if (followTo(arena, s, c.x, c.z) > 2.2) { s.mvX = s.dirX; s.mvZ = s.dirZ; }
      return;
    }
    case INTENT.PROTECT: {
      if (followTo(arena, s, s.holdX, s.holdZ) > 0.6) { s.mvX = s.dirX; s.mvZ = s.dirZ; }
      return;
    }
    case INTENT.RETREAT: {
      const info = arenaInfo(arena);
      const d = followTo(arena, s, info.spawnX[b.team], info.spawnZ[b.team]);
      if (d > 1.5) {
        // Walk toward spawn while strafing sideways.
        s.mvX = s.dirX * 0.8 - s.dirZ * 0.5 * s.strafeSign;
        s.mvZ = s.dirZ * 0.8 + s.dirX * 0.5 * s.strafeSign;
      } else {
        s.mvX = 0.6 * s.strafeSign;
      }
      return;
    }
    case INTENT.ATTACK: {
      const t = s.target;
      if (!t) {
        // Investigate the remembered last-seen position (no firing at it).
        if (followTo(arena, s, s.memX, s.memZ) > 1.0) { s.mvX = s.dirX; s.mvZ = s.dirZ; }
        return;
      }
      const d0 = dist(b.x, b.z, t.x, t.z);
      const d = Math.max(d0, 1e-4);
      const seen = atk.kind === 'lob' || sight(arena, b.x, b.z, t.x, t.z);
      if (d0 > atk.range * 0.9 || !seen) {
        followTo(arena, s, t.x, t.z);
        s.mvX = s.dirX;
        s.mvZ = s.dirZ;
        return;
      }
      // In position: strafe, back off when too close.
      const ux = (t.x - b.x) / d;
      const uz = (t.z - b.z) / d;
      const px = -uz * s.strafeSign;
      const pz = ux * s.strafeSign;
      if (d0 < atk.range * 0.4) { s.mvX = -ux * 0.6 + px * 0.8; s.mvZ = -uz * 0.6 + pz * 0.8; }
      else { s.mvX = px; s.mvZ = pz; }
      return;
    }
    default:
      return;
  }
}

// Aim with lead (t = flight or dist/speed), predicted = pos + vel*t, angular error, lob length scaled by range.
function aimAt(s, tx, tz, tvx, tvz, speed, flight, lenScale) {
  const b = s.b;
  const inp = b.input;
  const dx = tx - b.x;
  const dz = tz - b.z;
  const d = Math.hypot(dx, dz);
  const t = flight > 0 ? flight : speed > 0 ? d / speed : 0;
  const ax = dx + tvx * t;
  const az = dz + tvz * t;
  const e = s.aimErr;
  const c = Math.cos(e);
  const sn = Math.sin(e);
  const rx = ax * c - az * sn;
  const rz = ax * sn + az * c;
  const L = Math.hypot(rx, rz);
  if (L < 1e-6) return;
  inp.aimX = rx / L;
  inp.aimZ = rz / L;
  inp.aimLen = lenScale > 0 ? clamp(d / lenScale, 0, 1) : 1;
  inp.aiming = true;
}

function runBot(arena, s, ctx, list, dt) {
  const b = s.b;
  const inp = b.input;
  inp.moveX = 0;
  inp.moveZ = 0;
  inp.fire = false;
  inp.superFire = false;
  inp.superAiming = false;
  inp.aiming = false;
  inp.autoFire = false;
  inp.autoSuper = false;
  if (!b.alive) { s.wasAlive = false; s.target = null; s.intent = -1; return; }
  if (!s.wasAlive) { s.wasAlive = true; resetBot(s); }

  const stats = BRAWLERS[b.brawlerId];
  const atk = stats.attack;
  const sup = stats.super;
  const engage = ENGAGE * atk.range;
  s.clock += dt;
  s.pathAge += dt;
  s.strafeT -= dt;
  if (s.strafeT <= 0) { s.strafeSign = -s.strafeSign; s.strafeT = 0.6 + 0.6 * rnd(s); }

  // Target upkeep: keep a visible enemy until it dies, hides, or leaves 1.5x engage range.
  if (s.target && (!hostile(b, s.target) || dist(b.x, b.z, s.target.x, s.target.z) > engage * 1.5)) s.target = null;
  if (!s.target) {
    const t = pickTarget(b, list, engage);
    if (t) {
      s.target = t;
      s.reactT = 0.6 + (0.15 - 0.6) * s.diff;     // reaction delay 0.6 s (easy) .. 0.15 s (hard)
      s.aimErr = (2 * rnd(s) - 1) * AIM_ERROR * (1 - s.diff);
    }
  }
  const t = s.target;
  if (t) {
    s.memX = t.x;
    s.memZ = t.z;
    s.memT = s.clock;
    s.memRef = t;
  }
  s.reactT = Math.max(0, s.reactT - dt);

  s.rescoreT -= dt;
  if (s.rescoreT <= 0 || s.intent < 0) {
    rescore(arena, s, ctx, list);
    s.rescoreT = RESCORE + (rnd(s) - 0.5) * 0.1;
  }

  intentMove(arena, s, ctx, atk);

  // Unstick: no progress over 0.5 s while moving -> sidestep for 0.6 s and force a repath.
  s.sampleT += dt;
  if (s.sampleT >= 0.5) {
    s.sampleT = 0;
    if (s.unstick <= 0 && s.moveWanted && dist(b.x, b.z, s.lastX, s.lastZ) < 0.1) {
      s.unstick = 0.6;
      s.unstickSign = rnd(s) < 0.5 ? -1 : 1;
      s.pathGoal = -1;
    }
    s.lastX = b.x;
    s.lastZ = b.z;
  }
  if (s.unstick > 0) {
    s.unstick -= dt;
    let px = -s.dirZ;
    let pz = s.dirX;
    if (px * px + pz * pz < 1e-6) { px = 1; pz = 0; }
    s.mvX = px * s.unstickSign * 0.9 - s.dirX * 0.3;
    s.mvZ = pz * s.unstickSign * 0.9 - s.dirZ * 0.3;
  }
  const mag = Math.hypot(s.mvX, s.mvZ);
  if (mag > 1) { s.mvX /= mag; s.mvZ /= mag; }
  inp.moveX = s.mvX;
  inp.moveZ = s.mvZ;
  s.moveWanted = mag > 0.5;

  // Aim and fire (only at visible enemies; reaction delay gates the trigger, not the aim).
  const reactReady = s.reactT <= 0;
  let tdist = Infinity;
  let superUsed = false;
  if (t) {
    tdist = dist(b.x, b.z, t.x, t.z);
    const lob = atk.kind === 'lob';
    aimAt(s, t.x, t.z, t.vx || 0, t.vz || 0, lob ? 0 : (atk.speed || 0), lob ? atk.flightTime : 0, lob ? atk.range : 0);
    const los = lob || sight(arena, b.x, b.z, t.x, t.z);
    if (b.ammo >= 1 && reactReady && tdist <= atk.range && los) inp.fire = true;
  } else if (atk.kind === 'beam' && b.ammo >= 1) {
    // Support beam: heal a hurt ally in range with line of sight.
    const ally = hurtAlly(b, list, atk.range, 0.6, false);
    if (ally && sight(arena, b.x, b.z, ally.x, ally.z)) {
      aimAt(s, ally.x, ally.z, ally.vx || 0, ally.vz || 0, 0, 0, 0);
      inp.fire = true;
    }
  }

  // Supers when sensible. A super owns the aim for this tick, so the normal shot is dropped.
  if (b.superCharge >= 1) {
    let want = false;
    let tx = 0;
    let tz = 0;
    let tvx = 0;
    let tvz = 0;
    let sp = 0;
    let fl = 0;
    let ls = 0;
    if (b.brawlerId === 'rivet') {
      if (t && reactReady && tdist <= 5) { want = true; tx = t.x; tz = t.z; tvx = t.vx || 0; tvz = t.vz || 0; }
    } else if (b.brawlerId === 'pip') {
      if (t && reactReady && tdist <= sup.range && sight(arena, b.x, b.z, t.x, t.z)) {
        want = true; tx = t.x; tz = t.z; tvx = t.vx || 0; tvz = t.vz || 0; sp = sup.speed;
      }
    } else if (b.brawlerId === 'mortara') {
      if (t && reactReady && tdist <= sup.range) {
        want = true; tx = t.x; tz = t.z; tvx = t.vx || 0; tvz = t.vz || 0; fl = sup.flightTime; ls = sup.range;
      }
    } else if (b.brawlerId === 'lumen') {
      const ally = hurtAlly(b, list, sup.range, 0.7, true);
      if (ally) { want = true; tx = ally.x; tz = ally.z; ls = sup.range; }
    }
    if (want) {
      aimAt(s, tx, tz, tvx, tvz, sp, fl, ls);
      inp.superAiming = true;
      inp.superFire = true;
      inp.fire = false;
      superUsed = true;
    }
  }
  if (superUsed) inp.fire = false;
}

export function createAI({ arena, combat } = {}) {
  const states = [];
  return {
    arena,
    combat,
    addBot(b, difficulty = DIFFICULTY.normal) {
      const diff = typeof difficulty === 'string'
        ? (DIFFICULTY[difficulty] ?? DIFFICULTY.normal)
        : clamp(Number(difficulty) || 0, 0, 1);
      if (!b.input) b.input = makeInput();
      for (let i = 0; i < states.length; i++) {
        if (states[i].b === b) { states[i].diff = diff; return; }
      }
      states.push(newState(b, diff, states.length, arena.cols * arena.rows));
    },
    // Writes b.input for every registered bot. ctx = { brawlers, crystals, mine, teamCrystals, countdownTeam, time }.
    update(dt = DT, ctx = {}) {
      const list = ctx.brawlers || EMPTY;
      for (let i = 0; i < states.length; i++) runBot(arena, states[i], ctx, list, dt);
    },
    intentOf(b) {
      for (let i = 0; i < states.length; i++) if (states[i].b === b) return states[i].intent;
      return -1;
    },
    reset() {
      states.length = 0;
    },
  };
}
