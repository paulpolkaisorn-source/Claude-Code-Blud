// contracts.js — single source of truth shared by every module. Pure data + event bus. No THREE import.
// World space: 1 tile = 1 unit. Tile (c,r) center = (c+0.5, r+0.5) on the x/z plane, y is up.
// Row 0 is the far (top-of-screen) edge = RED base; row 32 is near the camera = BLUE base. Player is always BLUE.
// Facing angle: facing = Math.atan2(dirX, dirZ); dir = (sin f, cos f). Models face +Z at rotation.y = 0.

export const DT = 1 / 60;                 // fixed simulation step (s)
export const TILE = 1;
export const GRID = { cols: 21, rows: 33 };
export const TEAM = { BLUE: 0, RED: 1 };
export const TEAM_COLORS = [0x3d9bff, 0xff4b5c];
export const PLAYER_COLOR = 0x4dff8a;     // player's own ring / label accent
export const CRYSTAL_COLOR = 0xc46bff;
export const OUTLINE_COLOR = 0x1a1230;

// Tile types + ASCII legend for maps (each map = 33 strings of 21 chars).
export const T = { FLOOR: 0, WALL: 1, BUSH: 2, WATER: 3, SPAWN0: 4, SPAWN1: 5, MINE: 6 };
export const MAP_CHARS = { '.': T.FLOOR, '#': T.WALL, '"': T.BUSH, '~': T.WATER, B: T.SPAWN0, R: T.SPAWN1, M: T.MINE };
// WALL blocks movement + shots (destructible by supers). WATER blocks movement only. BUSH/SPAWN/MINE are walkable floor.

export const RULES = {
  matchTime: 150, crystalTarget: 10, countdown: 15, crystalSpawnEvery: 6, maxCrystals: 30,
  respawnTime: 3, pickupRadius: 0.75, revealRadius: 2, revealAfterAttack: 1.0,
  regenDelay: 3, regenRate: 0.13,           // fraction of maxHp per second once out of combat
  minAttackGap: 0.3,                         // s between shots even with ammo
  training: { matchTime: 90, crystalTarget: 5, countdown: 10 },
};
export const DIFFICULTY = { easy: 0.3, normal: 0.6, hard: 0.85 };
export const BOT_NAMES = ['Kiko', 'Juno', 'Brix', 'Fennel', 'Zuzu', 'Moxie', 'Tango', 'Pebble', 'Nova', 'Quill'];

// Stats. speed = tiles/s, range = tiles, damage/heal = HP, superCost = damage(+heal) needed to fill super.
export const BRAWLERS = {
  rivet: {
    id: 'rivet', name: 'Rivet', role: 'Tank', color: 0xff9f2e, hp: 5400, speed: 3.0, radius: 0.42,
    ammo: 3, reload: 1.5, superCost: 4800,
    attack: { kind: 'spread', pellets: 5, spread: 0.55, damage: 320, range: 5, speed: 17, radius: 0.14 },
    super: { kind: 'dash', range: 6, duration: 0.35, damage: 1100, knockback: 3, radius: 0.85, breaksWalls: true },
  },
  pip: {
    id: 'pip', name: 'Pip', role: 'Sniper', color: 0x38e8ff, hp: 2600, speed: 3.0, radius: 0.36,
    ammo: 3, reload: 2.0, superCost: 3600,
    attack: { kind: 'bolt', damage: 1250, range: 10, speed: 26, radius: 0.16 },
    super: { kind: 'rail', damage: 2300, range: 14, speed: 44, radius: 0.32, pierce: true, breaksWalls: true },
  },
  mortara: {
    id: 'mortara', name: 'Mortara', role: 'Thrower', color: 0xb6ff3b, hp: 3000, speed: 2.9, radius: 0.38,
    ammo: 3, reload: 1.8, superCost: 4200,
    attack: { kind: 'lob', damage: 1050, range: 7, flightTime: 0.75, blastRadius: 1.25 },
    super: { kind: 'cluster', damage: 1500, range: 8, flightTime: 0.95, blastRadius: 2.6, breaksWalls: true,
      bomblets: 5, bombletDamage: 380, bombletRadius: 1.0 },
  },
  lumen: {
    id: 'lumen', name: 'Lumen', role: 'Support', color: 0xffe14d, hp: 3400, speed: 3.1, radius: 0.38,
    ammo: 3, reload: 1.3, superCost: 3400,
    attack: { kind: 'beam', damage: 720, heal: 520, range: 4.5, width: 0.55 },
    super: { kind: 'totem', range: 5, radius: 2.6, duration: 6, healPerSec: 520, damagePerSec: 180 },
  },
};
export const BRAWLER_IDS = ['rivet', 'pip', 'mortara', 'lumen'];

// ---- Entity shapes (plain objects). Only the listed owner writes a field; everyone may read. ----
export function makeInput() {
  // Written by input (player) or ai (bots) each frame. *Fire/*Super flags are edges: game.js clears them after use.
  return { moveX: 0, moveZ: 0, aimX: 0, aimZ: -1, aimLen: 1, aiming: false, superAiming: false,
    fire: false, superFire: false, autoFire: false, autoSuper: false };
}
export function makeBrawler(id, brawlerId, team, name, isPlayer = false) {
  const s = BRAWLERS[brawlerId];
  return {
    id, kind: 'brawler', brawlerId, team, name, isPlayer, isBot: !isPlayer,
    x: 0, z: 0, px: 0, pz: 0, vx: 0, vz: 0, facing: 0, radius: s.radius,      // game.js (movement)
    hp: s.hp, maxHp: s.hp, alive: true, respawnTimer: 0,                        // combat (hp/alive), game (respawn)
    ammo: s.ammo, maxAmmo: s.ammo, reloadTimer: 0, attackCooldown: 0,           // combat
    superCharge: 0,                                                             // combat, 0..1
    combatTimer: 99,          // combat: seconds since last dealt/took damage (regen when > RULES.regenDelay)
    dashTimer: 0, dashVx: 0, dashVz: 0, kbVx: 0, kbVz: 0, stunTimer: 0,         // combat (game skips input move while >0)
    crystals: 0,                                                                // game
    inBush: false, revealTimer: 0, visibleTo: [true, true],                     // game (visibility), combat sets revealTimer
    anim: 'idle', hitFlash: 0,                                                  // game/combat (view hints)
    input: makeInput(),
    stats: { kills: 0, deaths: 0, damage: 0, healing: 0, crystals: 0 },
  };
}
// Projectile (pooled, owned by combat; fx reads for trails):
// { active, kind:'pellet'|'bolt'|'rail'|'lob'|'cluster'|'bomblet'|'beam', owner, team, x,y,z, px,py,pz, vx,vy,vz, color, radius, age, life }
// Crystal (pooled, owned by game): { active, x, y, z, vx, vy, vz, age, settled }

// ---- Event bus: every cross-module message goes through here. ----
export const EV = {
  SHOT: 'shot',                 // { b, x, z, dirX, dirZ, isSuper }
  HIT: 'hit',                   // { target, source, amount, x, z, isSuper, killed }
  HEAL: 'heal',                 // { target, source, amount, x, z }
  DEATH: 'death',               // { victim, killer, x, z }        (combat emits; game handles respawn/drops)
  RESPAWN: 'respawn',           // { b }
  EXPLOSION: 'explosion',       // { x, z, radius, team, isSuper }
  WALL_DESTROYED: 'wallDestroyed', // { c, r, x, z }
  DASH: 'dash',                 // { b, x, z, dirX, dirZ }
  TOTEM: 'totem',               // { x, z, team, radius, duration }
  SUPER_READY: 'superReady',    // { b }
  SUPER_USED: 'superUsed',      // { b, x, z, dirX, dirZ }
  CRYSTAL_SPAWN: 'crystalSpawn', // { x, z }
  CRYSTAL_PICKUP: 'crystalPickup', // { b, x, z, total }
  CRYSTAL_DROP: 'crystalDrop',  // { b, count, x, z }
  COUNTDOWN: 'countdown',       // { team, seconds }  each whole second while a team holds the target
  COUNTDOWN_CANCEL: 'countdownCancel', // { team }
  MATCH_START: 'matchStart',    // { mode, mapId, playerTeam }
  MATCH_END: 'matchEnd',        // { outcome:'victory'|'defeat'|'draw', winner: -1|0|1 }
  SCREEN_SHAKE: 'screenShake',  // { intensity 0..1, duration s }   (fx emits, render consumes)
  HITSTOP: 'hitstop',           // { ms }                          (fx emits, game consumes)
  QUALITY_CHANGE: 'qualityChange', // { level:'high'|'low' }
  UI_CLICK: 'uiClick',          // {}  any button press (audio)
  UI_PLAY: 'uiPlay',            // { mode:'crystal'|'training' }  menu -> select
  UI_SELECT: 'uiSelect',        // { brawlerId }
  UI_START: 'uiStart',          // { brawlerId, mode, mapId }      select -> matchmaking
  UI_MATCH_READY: 'uiMatchReady', // {}  fake matchmaking finished
  UI_PAUSE: 'uiPause', UI_RESUME: 'uiResume', UI_QUIT: 'uiQuit',  // {}
  UI_AGAIN: 'uiAgain', UI_MENU: 'uiMenu',  // {}  results screen buttons
  UI_SETTINGS: 'uiSettings',    // { master, sfx, music, quality:'auto'|'high'|'low' }
};
const handlers = new Map();
export const bus = {
  on(evt, fn) { let a = handlers.get(evt); if (!a) handlers.set(evt, (a = [])); a.push(fn); return () => bus.off(evt, fn); },
  off(evt, fn) { const a = handlers.get(evt); if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } },
  emit(evt, payload) { const a = handlers.get(evt); if (a) for (let i = 0; i < a.length; i++) a[i](payload); },
  clear() { handlers.clear(); },
};

export const SETTINGS_KEY = 'brawlArena.settings';
export const DEFAULT_SETTINGS = { master: 0.8, sfx: 0.9, music: 0.5, quality: 'auto' };
export const isMobile = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
