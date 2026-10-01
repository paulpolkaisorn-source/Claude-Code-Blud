// Match lifecycle in Minecraft: LOBBY → ROLE_SELECT → LOADING → HEAD_START → ROUND → ENDING → RESULTS → LOBBY.
import { Dimension, EntityComponentTypes, GameMode, Player, system, world, Difficulty as McDifficulty, type Entity, type ItemStack } from "@minecraft/server";
import { MatchMachine } from "../core/match";
import { Game, type ResultRow, type Winner } from "../core/game";
import { config, type Difficulty } from "../core/config";
import { KITS } from "../abilities/kits";
import { useAbility } from "../abilities/engine";
import { character, KILLERS, SURVIVORS, abilityItemId } from "../characters/roster";
import type { CharacterDef } from "../characters/types";
import { Actor } from "../entities/actor";
import { buildHollowHamlet, type ArenaLayout } from "../world/layout";
import { Cell, type NavGrid } from "../world/nav";
import { spawnMapItems, heldItem, useHeldItem } from "../world/items";
import { Rng } from "../util/rng";
import { dist2D, type Vec3 } from "../util/vec";
import { BotDirector } from "../bots/director";
import { pickBotCharacters, pickGeneratorSpots } from "../core/setup";
import { McPorts, purgeRuntimeEntities, RUNTIME_TAG } from "./ports.mc";
import { applyBotMovement, applyPlayerMovement, BotBody, PlayerBody, resetPlayerMovement, type PlayerMoveCache } from "./bodies.mc";
import { renderFx } from "./fx.mc";
import { HudRenderer } from "./hud.mc";
import { clearSnapshot, gameModeFromString, giveHotbar, giveMenuItem, loadSnapshot, saveSnapshot, setMapItemSlot, stashInventory, unstashInventory, type PlayerSnapshot } from "./inventory.mc";
import { arenaLoaded, arenaStamp, buildArena, ensureTickingArea, removeTickingArea, resetArenaBlocks } from "../world/builder.mc";
import { inMatchMenu, resultsMenu, roleMenu, type MatchSettings } from "../ui/menus.mc";

const HUMAN_ID = "human";
const ARENA_STAMP_KEY = "forsaken:arenaStamp";
const SAVED_RULES = ["doDayLightCycle", "doWeatherCycle", "doMobSpawning", "mobGriefing", "keepInventory", "naturalRegeneration", "pvp", "showDeathMessages", "doImmediateRespawn", "fallDamage", "doFireTick", "tntExplodes"] as const;

/** `/scriptevent forsaken:debug` toggles extra logging (world dynamic property). */
export function debugOn(): boolean {
  return world.getDynamicProperty("forsaken:debug") === true;
}

export function log(msg: string): void {
  console.warn(`[forsaken] ${msg}`);
}

export class MatchController {
  readonly machine = new MatchMachine();
  game: Game | null = null;
  private dim: Dimension;
  private host: Player | null = null;
  private hostId: string | null = null;
  private ports: McPorts | null = null;
  private hud = new HudRenderer();
  private director: BotDirector | null = null;
  private moveCache: PlayerMoveCache = { attr: -1, frozen: false, hunger: -1, hearts: -1 };
  private origin: Vec3 = { x: 0, y: 0, z: 0 };
  private layout: ArenaLayout | null = null;
  private grid: NavGrid | null = null;
  private settings: MatchSettings | null = null;
  private endingUntil = 0;
  private spectating = false;
  private selfTest = false;
  private selfTestStats = { ticks: 0, ms: 0, maxMs: 0 };
  private lastReport = 0;
  private busy = false;

  constructor() {
    this.dim = world.getDimension("overworld");
    system.runInterval(() => this.safeTick(), 1);
  }

  get inMatch(): boolean {
    return this.machine.inMatch;
  }

  isHost(p: Player): boolean {
    return this.hostId !== null && p.id === this.hostId;
  }

  /** True for entities whose vanilla damage must be cancelled (virtual HP). Safe in before-events. */
  isProtected(e: Entity): boolean {
    if (e.hasTag(RUNTIME_TAG)) return true;
    return this.inMatch && this.hostId !== null && e.id === this.hostId;
  }

  insideArena(p: Vec3): boolean {
    if (!this.layout) return false;
    const o = this.origin;
    return p.x >= o.x - 2 && p.z >= o.z - 2 && p.x <= o.x + this.layout.size + 2 && p.z <= o.z + this.layout.size + 2 && p.y >= o.y - 8 && p.y <= o.y + 20;
  }

  // ================================================================== menus & commands

  async openMenu(player: Player): Promise<void> {
    if (this.busy) return;
    if (this.machine.phase === "LOBBY") {
      this.busy = true;
      try {
        this.machine.go("ROLE_SELECT", "menu");
        const s = await roleMenu(player);
        if (!s) {
          this.machine.go("LOBBY", "menu closed");
          return;
        }
        await this.start(player, s);
      } catch (e) {
        log(`menu failed: ${String(e)}`);
        if (this.machine.phase !== "LOBBY") await this.cleanup(`error: ${String(e)}`);
      } finally {
        this.busy = false;
      }
      return;
    }
    if (this.isHost(player) && (this.machine.phase === "HEAD_START" || this.machine.phase === "ROUND")) {
      const r = await inMatchMenu(player);
      if (r === "leave") await this.abort("You left the match.");
    } else if (!this.isHost(player)) {
      player.sendMessage("§7[Forsaken] A match is already running in this world.");
    }
  }

  /** Starts a match without menus (debug / tests). */
  async quickStart(player: Player | null, s: MatchSettings): Promise<void> {
    if (this.machine.phase !== "LOBBY" || this.busy) return;
    this.busy = true;
    try {
      this.selfTest = player === null;
      this.machine.go("ROLE_SELECT", "quickstart");
      await this.start(player, s);
    } catch (e) {
      log(`quickstart failed: ${String(e)}`);
      if (this.machine.phase !== "LOBBY") await this.cleanup(`error: ${String(e)}`);
    } finally {
      this.busy = false;
    }
  }

  async abort(reason: string): Promise<void> {
    if (this.machine.phase === "LOBBY") return;
    this.game?.abort();
    this.notifyHost(`§c[Forsaken] Match stopped: ${reason}`);
    await this.cleanup(reason);
  }

  // ================================================================== start

  private notifyHost(text: string): void {
    if (this.host?.isValid) this.host.sendMessage(text);
    if (this.selfTest) log(text.replace(/§./g, ""));
  }

  private progress(text: string): void {
    if (this.host?.isValid) this.host.onScreenDisplay.setActionBar(text);
    if (this.selfTest) log(text.replace(/§./g, ""));
  }

  private async start(player: Player | null, s: MatchSettings): Promise<void> {
    this.machine.go("LOADING", "start");
    this.settings = s;
    this.host = player;
    this.hostId = player?.id ?? null;
    this.spectating = false;
    this.origin = { x: config().arena.originX, y: config().arena.originY, z: config().arena.originZ };
    const built = buildHollowHamlet(this.origin);
    this.layout = built.layout;
    this.grid = built.grid;
    const layout = built.layout;

    // 1. Save the player and park them (spectator) above the arena while it loads.
    if (player) {
      const snap: PlayerSnapshot = {
        gameMode: player.getGameMode(),
        dimension: player.dimension.id,
        location: { ...player.location },
        nameTag: player.nameTag,
        difficulty: Object.values(McDifficulty).indexOf(world.getDifficulty()),
        gamerules: Object.fromEntries(SAVED_RULES.map((k) => [k, world.gameRules[k] as boolean])),
        time: world.getTimeOfDay(),
      };
      saveSnapshot(player, snap);
      player.setGameMode(GameMode.Spectator);
      player.teleport({ x: this.origin.x + 40, y: this.origin.y + 18, z: this.origin.z + 40 }, { dimension: this.dim });
    }
    this.progress("§7Loading arena...");

    // 2. Load + build the arena (time-sliced).
    const hasArea = await ensureTickingArea(this.dim, this.origin, layout);
    if (!hasArea) this.notifyHost("§e[Forsaken] No ticking-area capacity left; the arena stays loaded only while you are nearby.");
    for (let i = 0; i < 400 && !arenaLoaded(this.dim, this.origin, layout); i++) await system.waitTicks(5);
    if (!arenaLoaded(this.dim, this.origin, layout)) throw new Error("arena chunks did not load");
    const stamp = arenaStamp(layout, this.origin, config().arena.layoutVersion);
    if (world.getDynamicProperty(ARENA_STAMP_KEY) !== stamp) {
      this.notifyHost("§7[Forsaken] Building the arena (first time only)...");
      let lastPct = -10;
      await buildArena(this.dim, this.origin, layout, (d, t) => {
        const pct = Math.round((d / t) * 100);
        if (pct >= lastPct + 10 || pct === 100) {
          lastPct = pct;
          this.progress(`§7Building arena ${pct}%`);
        }
      });
      world.setDynamicProperty(ARENA_STAMP_KEY, stamp);
    }
    purgeRuntimeEntities(this.dim);

    // 3. Stash inventory into the vault (needs the arena), world rules.
    if (player) {
      const vault = layout.vault.map(([x, y, z]) => ({ x: this.origin.x + x, y: this.origin.y + y, z: this.origin.z + z }));
      if (!stashInventory(player, this.dim, vault)) throw new Error("inventory vault unavailable");
    }
    for (const k of SAVED_RULES) {
      const want: Record<string, boolean> = { doDayLightCycle: false, doWeatherCycle: false, doMobSpawning: false, mobGriefing: false, keepInventory: true, naturalRegeneration: false, pvp: true, showDeathMessages: false, doImmediateRespawn: true, fallDamage: false, doFireTick: false, tntExplodes: false };
      try {
        (world.gameRules as unknown as Record<string, boolean>)[k] = want[k];
      } catch {
        // rule not settable on this platform
      }
    }
    world.setTimeOfDay(18000);
    try {
      if (world.getDifficulty() === McDifficulty.Peaceful) world.setDifficulty(McDifficulty.Easy);
    } catch {
      // ignore
    }

    // 4. Characters, generators, game.
    const rng = new Rng((Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0);
    const pick = this.pickCharacters(s, rng);
    const gens = pickGeneratorSpots(rng, layout.generatorSpots.length, config().match.generatorCount, pick.killer.id === "noli" ? config().match.noliFakeGenerators : 0);
    resetArenaBlocks(this.dim, this.origin, layout, [...gens.real, ...gens.fake]);
    layout.generatorSpots.forEach((g, i) => {
      if (!gens.real.includes(i) && !gens.fake.includes(i)) built.grid.set(g.x, g.z, Cell.Floor);
    });
    this.ports = new McPorts(this.dim, built.grid);
    const game = new Game({ grid: built.grid, layout, ports: this.ports, kits: KITS, rng, difficulty: s.difficulty, humanId: player ? HUMAN_ID : null });
    this.game = game;
    const toWorld = (g: { x: number; z: number }): Vec3 => built.grid.toWorld(g);
    // Killer
    const killerSpawn = toWorld(layout.killerSpawn);
    if (player && s.role === "killer") game.addParticipant(HUMAN_ID, `${pick.killer.name} (${player.name})`, pick.killer, new PlayerBody(player), false);
    else game.addParticipant("bot_killer", `${pick.killer.name} [BOT]`, pick.killer, this.ports.createBotBody({ characterId: pick.killer.id, skinIndex: pick.killer.skinIndex, pos: killerSpawn, nameTag: `§c${pick.killer.name} §7[BOT]` }), true);
    // Survivors
    pick.survivors.forEach((c, i) => {
      const sp = toWorld(layout.survivorSpawns[i % layout.survivorSpawns.length]);
      if (player && s.role === "survivor" && i === 0) game.addParticipant(HUMAN_ID, `${c.name} (${player.name})`, c, new PlayerBody(player), false);
      else game.addParticipant(`bot_${i}`, `${c.name} [BOT]`, c, this.ports!.createBotBody({ characterId: c.id, skinIndex: c.skinIndex, pos: sp, nameTag: `§a${c.name} §7[BOT]` }), true);
    });
    game.setupGenerators(gens.real, gens.fake);

    // 5. Player setup.
    if (player) {
      const me = game.get(HUMAN_ID)!;
      const spawn = me.isKiller ? killerSpawn : toWorld(layout.survivorSpawns[0]);
      player.setGameMode(GameMode.Adventure);
      player.teleport(spawn, { dimension: this.dim, facingLocation: toWorld({ x: 40, z: 40 }) });
      giveHotbar(player, me.character);
      player.nameTag = `${me.isKiller ? "§c" : "§a"}${me.character.name} §7(${player.name})`;
      for (const eff of ["blindness", "invisibility", "nausea", "darkness", "speed", "slowness", "levitation", "slow_falling"]) player.removeEffect(eff);
      game.fx.fog(HUMAN_ID, "arena", true);
      this.moveCache = { attr: -1, frozen: false, hunger: -1, hearts: -1 };
    }
    spawnMapItems(game);
    this.director = new BotDirector(game);
    game.startHeadStart();
    this.machine.go("HEAD_START", "loaded");
    const me = game.get(HUMAN_ID);
    if (me) {
      game.fx.title([HUMAN_ID], me.isKiller ? `§4You are ${me.character.name}` : `§aYou are ${me.character.name}`, me.isKiller ? `§7The survivors have ${config().match.headStartSeconds}s head start` : `§7The killer is §c${game.killer?.character.name}§7 — RUN`, 80);
    }
    game.log(`Match: ${pick.killer.name} vs ${pick.survivors.map((c) => c.name).join(", ")} (${s.difficulty})`);
    if (this.selfTest) log(`SELFTEST start: killer=${pick.killer.id} survivors=${pick.survivors.map((c) => c.id).join(",")}`);
    else log(`match start: you=${me ? `${me.team}:${me.character.id}` : "none"} killer=${pick.killer.id} survivors=${pick.survivors.map((c) => c.id).join(",")} difficulty=${s.difficulty}`);
  }

  private pickCharacters(s: MatchSettings, rng: Rng): { killer: CharacterDef; survivors: CharacterDef[] } {
    const chosen = s.characterId === "random" ? null : character(s.characterId);
    return pickBotCharacters(rng, {
      humanRole: this.host ? s.role : null,
      humanCharacter: chosen,
      killers: KILLERS,
      survivors: SURVIVORS,
      survivorCount: config().match.survivorCount,
      allowDuplicates: config().match.allowDuplicateSurvivors,
      forcedKiller: !this.host && s.characterId !== "random" ? character(s.characterId) : null,
    });
  }

  // ================================================================== per tick

  private safeTick(): void {
    try {
      this.tick();
    } catch (e) {
      log(`tick error: ${String(e)} ${(e as Error)?.stack ?? ""}`);
      if (this.inMatch) void this.abort(`internal error (${String(e)})`);
    }
  }

  private tick(): void {
    const game = this.game;
    const phase = this.machine.phase;
    if (!game || (phase !== "HEAD_START" && phase !== "ROUND" && phase !== "ENDING")) return;
    if (phase === "ENDING") {
      if (system.currentTick >= this.endingUntil) void this.showResultsAndCleanup();
      return;
    }
    const t0 = Date.now();
    if (this.host && !this.host.isValid) {
      void this.abort("host left");
      return;
    }
    const me = game.get(HUMAN_ID);
    if (me && this.host) this.syncHumanInput(me, this.host);
    game.tick();
    if (game.phase === "ROUND" && phase === "HEAD_START") {
      this.machine.go("ROUND", "head start over");
      if (me) game.fx.title([HUMAN_ID], me.isKiller ? "§4HUNT" : "§cThe killer is free", undefined, 30);
    }
    this.director?.update();
    // Movement application.
    for (const a of game.actors) {
      if (a.body instanceof BotBody) {
        if (a.alive) applyBotMovement(a, this.origin.y);
        this.updateBotAnimation(a, game);
      }
    }
    if (me && this.host) {
      applyPlayerMovement(me, this.host, this.moveCache);
      this.bodyFlags(me, this.host);
      if (!me.alive && !this.spectating) {
        this.spectating = true;
        this.host.setGameMode(GameMode.Spectator);
        game.fx.title([HUMAN_ID], "§4ELIMINATED", "§7You are now spectating", 60);
      }
    }
    this.keepInsideArena(game);
    renderFx(this.dim, game.fx.drain(), {
      player: (id) => (id === HUMAN_ID && this.host?.isValid ? this.host : undefined),
      entity: (id) => this.entityOf(game.get(id)),
      flash: (id, text, ticks) => this.hud.flash(id, text, ticks, game.now),
      allPlayers: () => (this.host?.isValid ? [this.host] : []),
    });
    if (me && this.host) {
      this.hud.debugLine = debugOn() ? this.debugLine(game) : null;
      this.hud.update(game, me, this.host, this.dim, (a) => this.entityOf(a));
    }
    const ms = Date.now() - t0;
    this.lastTickMs = ms;
    this.selfTestStats.ticks++;
    this.selfTestStats.ms += ms;
    this.selfTestStats.maxMs = Math.max(this.selfTestStats.maxMs, ms);
    if (this.selfTest && game.now - this.lastReport >= 100) {
      this.lastReport = game.now;
      log(`t=${(game.now / 20).toFixed(0)}s phase=${game.phase} clock=${game.round.timeLeft.toFixed(0)} alive=${game.aliveSurvivors().length} gens=${game.round.generatorsDone} avgTickMs=${(this.selfTestStats.ms / this.selfTestStats.ticks).toFixed(2)} maxTickMs=${this.selfTestStats.maxMs}`);
    }
    if (game.phase === "ENDED") this.finish(game.round.winner ?? "nobody", game.round.endReason);
  }

  /** Jump presses already turned into flaps (bat form). */
  private lastFlapPresses = 0;
  private lastTickMs = 0;

  /** Debug overlay line: script time, bot time, phase and what the opposing bots are doing. */
  private debugLine(game: Game): string {
    const s = this.selfTestStats;
    const k = game.killer;
    const kb = k && k.isBot ? this.director?.brainOf(k) : undefined;
    const states = kb ? `killer ${kb.state}` : game.aliveSurvivors().filter((a) => a.isBot).map((a) => this.director?.brainOf(a)?.state ?? "?").slice(0, 4).join(",");
    return `§8[debug] tick ${this.lastTickMs}ms avg ${(s.ms / Math.max(1, s.ticks)).toFixed(1)} max ${s.maxMs} | bots ${this.director?.lastUpdateMs ?? 0}ms | objects ${game.objects.length} | ${states}`;
  }

  private entityOf(a: Actor | undefined): Entity | undefined {
    if (!a) return undefined;
    if (a.body instanceof PlayerBody) return a.body.player;
    if (a.body instanceof BotBody) return a.body.entity;
    return undefined;
  }

  /** Generator under the crosshair while sneaking → repair intent; map item slot; jump handled by events. */
  private syncHumanInput(me: Actor, p: Player): void {
    const game = this.game!;
    me.input.repairTarget = null;
    if (me.alive && me.isSurvivor && p.isSneaking) {
      try {
        const hit = p.getBlockFromViewDirection({ maxDistance: config().match.repairRangeBlocks + 0.5 });
        const b = hit?.block;
        if (b && (b.typeId === "forsaken:generator" || b.typeId === "forsaken:generator_lit")) {
          const g = game.generators.find((x) => x.block.x === b.location.x && x.block.y === b.location.y && x.block.z === b.location.z);
          if (g && g.completed && game.now % 40 === 0) this.hud.flash(HUMAN_ID, "§7This generator is already repaired.", 30, game.now);
          if (g && !g.completed) me.input.repairTarget = g.id;
        }
      } catch {
        // raycast into unloaded space
      }
    }
    if (me.isSurvivor) setMapItemSlot(p, heldItem(me));
  }

  /** Bat form etc.: slow falling keeps the player airborne and each jump press flaps upward. */
  private bodyFlags(me: Actor, p: Player): void {
    if (me.flags.has("flying")) {
      if (!p.getEffect("slow_falling")) p.addEffect("slow_falling", 40, { showParticles: false });
      if (me.input.jumpPresses > this.lastFlapPresses) {
        const flap = (me.ability("ascension")?.params.flapStrength as number | undefined) ?? 0.55;
        // Knockback replaces horizontal motion: pass the current velocity through so flapping keeps momentum.
        me.body.impulse({ ...p.getVelocity(), y: flap });
      }
    }
    this.lastFlapPresses = me.input.jumpPresses;
  }

  private updateBotAnimation(a: Actor, game: Game): void {
    const body = a.body as BotBody;
    if (!body.entity.isValid) return;
    const action = !a.alive ? 0 : a.isStunned(game.now) ? 2 : a.repairing ? 3 : a.channel ? 4 : game.now < body.actionUntil ? 1 : 0;
    if (action !== body.action) {
      body.action = action;
      try {
        body.entity.setProperty("forsaken:action", action);
      } catch {
        // entity removed
      }
    }
  }

  /** Teleports anyone who fell out of the arena back to a safe cell. */
  private keepInsideArena(game: Game): void {
    if (game.now % 10 !== 0 || !this.grid) return;
    for (const a of game.actors) {
      if (!a.alive || !a.body.isValid()) continue;
      if (a.pos.y < this.origin.y - 3 || a.pos.y > this.origin.y + 16 || !this.insideArena(a.pos)) {
        const g = this.grid.nearestWalkable(this.grid.toGrid(a.pos), 12) ?? this.layout!.survivorSpawns[0];
        a.body.teleport(this.grid.toWorld(g));
        game.clearNav(a);
      }
    }
  }

  // ================================================================== input from events

  onItemUse(player: Player, item: ItemStack): void {
    const id = item.typeId;
    if (id === "forsaken:menu") {
      void this.openMenu(player);
      return;
    }
    const game = this.game;
    if (!game || !this.isHost(player) || (this.machine.phase !== "HEAD_START" && this.machine.phase !== "ROUND")) return;
    const me = game.get(HUMAN_ID);
    if (!me) return;
    if (id === "forsaken:item_medkit" || id === "forsaken:item_cola") {
      const r = useHeldItem(game, me);
      if (r) this.hud.flash(HUMAN_ID, `§c${r}`, 30, game.now);
      return;
    }
    const ab = me.character.abilities.find((a) => abilityItemId(me.character.id, a.id) === id);
    if (!ab) return;
    const out = useAbility(game, me, ab.id);
    if (debugOn()) log(`input: use ${ab.id} -> ${out.ok ? "ok" : out.reason}`);
    if (!out.ok && out.reason && out.reason !== "failed") this.hud.flash(HUMAN_ID, `§c${ab.name}: ${out.reason}`, 25, game.now);
  }

  /** Left-click swing with the slot-1 weapon = killer basic attack. */
  onSwing(player: Player, item: ItemStack | undefined): void {
    const game = this.game;
    if (!game || !item || !this.isHost(player)) return;
    const me = game.get(HUMAN_ID);
    if (!me || !me.isKiller) return;
    const main = me.character.abilities.find((a) => a.slot === 1);
    if (!main || abilityItemId(me.character.id, main.id) !== item.typeId) return;
    const out = useAbility(game, me, main.id);
    if (debugOn()) log(`input: swing ${main.id} -> ${out.ok ? "ok" : out.reason}`);
    if (!out.ok && out.reason && !out.reason.startsWith("cooldown")) this.hud.flash(HUMAN_ID, `§c${main.name}: ${out.reason}`, 20, game.now);
  }

  onJump(player: Player): void {
    const me = this.game?.get(HUMAN_ID);
    if (me && this.isHost(player)) {
      me.input.jumpPresses++;
      if (debugOn()) log(`input: jump (${me.input.jumpPresses})`);
    }
  }

  onPlayerLeave(playerId: string): void {
    if (this.hostId === playerId && this.inMatch) void this.abort("host left");
  }

  /** /kill or the void bypass hurt events: treat as an elimination (survivor) or respawn (killer). */
  onEntityDie(e: Entity): void {
    const game = this.game;
    if (!game || !this.inMatch) return;
    const a = game.actors.find((x) => this.entityOf(x)?.id === e.id);
    if (!a || !a.alive) return;
    if (a.isSurvivor || a.isMinion) game.kill(a, null);
    else if (a.body instanceof PlayerBody) system.runTimeout(() => a.body.teleport(game.grid.toWorld(game.layout.killerSpawn)), 2);
  }

  // ================================================================== end

  private finish(winner: Winner, reason: string): void {
    if (this.machine.phase !== "ROUND" && this.machine.phase !== "HEAD_START") return;
    this.machine.go("ENDING", reason);
    this.endingUntil = system.currentTick + Math.round(config().match.endingSeconds * 20);
    const game = this.game!;
    const me = game.get(HUMAN_ID);
    if (me && this.host?.isValid) {
      const won = (winner === "killer" && me.isKiller) || (winner === "survivors" && me.isSurvivor);
      this.host.onScreenDisplay.setTitle(won ? "§aVICTORY" : winner === "nobody" ? "§7DRAW" : "§4DEFEAT", { subtitle: `§7${reason}`, fadeInDuration: 5, stayDuration: 70, fadeOutDuration: 20 });
      this.host.playSound(config().sounds[won ? "win" : "lose"].id);
    }
    log(`round over: ${winner} — ${reason}`);
    if (this.selfTest) {
      const s = this.selfTestStats;
      log(`SELFTEST DONE winner=${winner} reason="${reason}" ticks=${s.ticks} avgTickMs=${(s.ms / Math.max(1, s.ticks)).toFixed(2)} maxTickMs=${s.maxMs}`);
      for (const r of game.results()) log(`  ${r.team} ${r.character} alive=${r.alive} layers=${r.layers} gens=${r.generators} dealt=${r.damageDealt} taken=${r.damageTaken} kills=${r.kills} stuns=${r.stuns}`);
      for (const line of game.eventLog.slice(-40)) log(`  log ${line}`);
    }
  }

  private async showResultsAndCleanup(): Promise<void> {
    if (this.machine.phase !== "ENDING") return;
    this.machine.go("RESULTS", "results");
    const game = this.game!;
    const rows: ResultRow[] = game.results();
    const winner = game.round.winner ?? "nobody";
    const reason = game.round.endReason;
    const player = this.host;
    await this.cleanup("match over");
    if (player?.isValid) {
      const again = await resultsMenu(player, winner, reason, rows, HUMAN_ID);
      if (again === "again") await this.openMenu(player);
    }
  }

  /** Restores the world and the player. Safe to call from any phase. */
  async cleanup(reason: string): Promise<void> {
    const player = this.host;
    const game = this.game;
    this.hud.clear(player ?? undefined);
    this.ports?.removeAll();
    try {
      purgeRuntimeEntities(this.dim);
    } catch {
      // dimension unavailable during shutdown
    }
    if (player?.isValid) {
      resetPlayerMovement(player);
      for (const tag of ["forsaken_arena_fog", "forsaken_blood_hunt_fog", "forsaken_lms_fog"]) player.fogSettings.remove(tag);
      for (const eff of ["blindness", "invisibility", "nausea", "darkness", "speed", "slowness", "slow_falling"]) player.removeEffect(eff);
      await this.restorePlayer(player);
    }
    if (game) game.phase = "ENDED";
    removeTickingArea();
    this.game = null;
    this.director = null;
    this.ports = null;
    this.selfTest = false;
    this.selfTestStats = { ticks: 0, ms: 0, maxMs: 0 };
    if (this.machine.phase !== "LOBBY") this.machine.go("LOBBY", reason);
    this.host = null;
    this.hostId = null;
    log(`cleanup done (${reason})`);
  }

  /** Puts a player back the way they were before the match (also used on rejoin after a crash). */
  async restorePlayer(player: Player): Promise<void> {
    const snap = loadSnapshot(player);
    if (!snap) return;
    const layout = this.layout ?? buildHollowHamlet(this.origin).layout;
    const o = { x: config().arena.originX, y: config().arena.originY, z: config().arena.originZ };
    const vault = layout.vault.map(([x, y, z]) => ({ x: o.x + x, y: o.y + y, z: o.z + z }));
    const loaded = () => vault.every((v) => this.dim.isChunkLoaded(v));
    // Items come back from the vault barrels, which must be loaded. Returns null while they are not.
    const tryUnstash = (): boolean | null => (loaded() ? unstashInventory(player, this.dim, vault) : null);
    let got = tryUnstash();
    if (got === null) {
      // Load the vault with the arena's ticking area (it resolves once the chunks are loaded)...
      const tempArea = !this.inMatch && (await ensureTickingArea(this.dim, this.origin, layout).catch(() => false));
      got = player.isValid ? tryUnstash() : null;
      // ...or, without ticking-area capacity, by briefly visiting it (invisible in spectator mode).
      for (let i = 0; got === null && i < 30 && player.isValid; i++) {
        if (i === 0) {
          player.setGameMode(GameMode.Spectator);
          player.teleport({ x: vault[0].x, y: vault[0].y + 8, z: vault[0].z }, { dimension: this.dim });
        }
        await system.waitTicks(10);
        if (player.isValid) got = tryUnstash();
      }
      if (tempArea && !this.inMatch) removeTickingArea();
    }
    if (!player.isValid) return;
    if (got === null) {
      // Keep the snapshot so the next join tries again; give the player their game mode and position back.
      player.sendMessage("§c[Forsaken] Your saved inventory could not be reached yet; rejoin to try again.");
      this.finishRestore(player, snap, false);
      return;
    }
    if (!got) log(`restore: vault barrels missing for ${player.name}; inventory could not be returned`);
    this.finishRestore(player, snap, true);
  }

  private finishRestore(player: Player, snap: PlayerSnapshot, done: boolean): void {
    for (const [k, v] of Object.entries(snap.gamerules)) {
      try {
        (world.gameRules as unknown as Record<string, boolean | number>)[k] = v;
      } catch {
        // ignore
      }
    }
    try {
      const diffs = Object.values(McDifficulty);
      if (snap.difficulty >= 0 && snap.difficulty < diffs.length) world.setDifficulty(diffs[snap.difficulty] as McDifficulty);
      world.setTimeOfDay(snap.time);
    } catch {
      // ignore
    }
    player.nameTag = snap.nameTag;
    player.setGameMode(gameModeFromString(snap.gameMode));
    player.teleport(snap.location, { dimension: world.getDimension(snap.dimension) });
    resetPlayerMovement(player);
    if (done) {
      clearSnapshot(player);
      giveMenuItem(player);
    }
    player.getComponent(EntityComponentTypes.Health)?.resetToMaxValue();
    log(`restored ${player.name}: game mode ${snap.gameMode}, position${done ? ", inventory" : " (inventory still saved)"}`);
  }

  /** Bots-only match for automated smoke tests (no player needed). */
  async selfTestMatch(killerId: string, difficulty: Difficulty): Promise<void> {
    await this.quickStart(null, { role: "killer", characterId: killerId, difficulty, arenaId: "hollow_hamlet" });
  }

  debugReport(): string {
    const g = this.game;
    if (!g) return `phase=${this.machine.phase} (no match)`;
    const me = g.get(HUMAN_ID);
    return [
      `settings=${JSON.stringify(this.settings)}`,
      `phase=${this.machine.phase} game=${g.phase} t=${(g.now / 20).toFixed(1)} clock=${g.round.timeLeft.toFixed(1)} lms=${g.round.lms}`,
      `alive=${g.aliveSurvivors().length} gens=${g.round.generatorsDone} objects=${g.objects.length} reveals=${g.reveals.length}`,
      me ? `you: ${me.character.name} hp=${me.hp.toFixed(1)}/${me.maxHp} sta=${me.stamina.toFixed(0)} walk=${me.walkBps.toFixed(2)} sprint=${me.sprintBps.toFixed(2)} attr=${this.moveCache.attr.toFixed(4)} frozen=${me.frozen}` : "spectator",
      `avgTickMs=${(this.selfTestStats.ms / Math.max(1, this.selfTestStats.ticks)).toFixed(2)} maxTickMs=${this.selfTestStats.maxMs}`,
      ...g.eventLog.slice(-5),
    ].join("\n");
  }

  /** Called on join: hand out the menu item once, restore an interrupted match. */
  onPlayerSpawn(player: Player, initial: boolean): void {
    if (initial && player.getDynamicProperty("forsaken:gotMenu") !== true) {
      giveMenuItem(player);
      player.setDynamicProperty("forsaken:gotMenu", true);
      player.sendMessage("§4[FORSAKEN] §7Use the §fForsaken Menu§7 item or §f/scriptevent forsaken:menu§7 to start. §8(Unofficial fan project.)");
    }
    if (initial && !this.inMatch && loadSnapshot(player)) {
      player.sendMessage("§e[Forsaken] Restoring your inventory from an interrupted match...");
      system.runTimeout(() => {
        if (player.isValid) void this.restorePlayer(player);
      }, 40);
    }
  }

  near(a: Vec3, b: Vec3, d: number): boolean {
    return dist2D(a, b) <= d;
  }
}
