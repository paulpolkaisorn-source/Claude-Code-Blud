// Displays the HUD: actionbar lines, sidebar, aura markers (TextPrimitive), heartbeat, cooldown overlays.
import { DisplaySlotId, MolangVariableMap, ObjectiveSortOrder, Player, TextPrimitive, world, type Dimension, type Entity, type ScoreboardObjective } from "@minecraft/server";
import type { Game } from "../core/game";
import type { Actor } from "../entities/actor";
import { composeHud, sidebarRows } from "../ui/hud";
import { config } from "../core/config";
import { abilityItemId } from "../characters/roster";

const SIDEBAR_ID = "forsaken_sb";

export class HudRenderer {
  private flashes = new Map<string, Array<{ text: string; until: number }>>();
  private objective: ScoreboardObjective | null = null;
  private sidebarLabels = new Set<string>();
  private markers = new Map<string, TextPrimitive>();
  private lastCooldown = new Map<string, number>();
  private nextBeat = 0;

  flash(actorId: string, text: string, ticks: number, now: number): void {
    const list = this.flashes.get(actorId) ?? [];
    list.push({ text, until: now + ticks });
    while (list.length > 3) list.shift();
    this.flashes.set(actorId, list);
  }

  update(game: Game, viewer: Actor, player: Player, dim: Dimension, entityOf: (a: Actor) => Entity | undefined): void {
    if (!player.isValid) return;
    const now = game.now;
    const fl = (this.flashes.get(viewer.id) ?? []).filter((f) => f.until > now);
    this.flashes.set(viewer.id, fl);
    if (now % config().hud.intervalTicks === 0) {
      const hud = composeHud(game, viewer, fl.map((f) => f.text));
      player.onScreenDisplay.setActionBar(hud.lines.join("\n"));
      // Heartbeat: faster and louder closer to the killer.
      if (hud.terror > 0 && now >= this.nextBeat) {
        const t = config().terror;
        const interval = Math.round(t.heartbeatFarTicks - (t.heartbeatFarTicks - t.heartbeatNearTicks) * hud.terror);
        player.playSound(config().sounds.heartbeat.id, { volume: 0.4 + hud.terror * 0.8, pitch: 0.9 + hud.terror * 0.3 });
        this.nextBeat = now + interval;
      }
    }
    if (now % 10 === 0 && config().hud.sidebar) this.updateSidebar(game);
    if (now % 5 === 0) this.updateMarkers(game, viewer, player, dim, entityOf);
    if (now % 2 === 0 && viewer.alive) this.updateCooldowns(game, viewer, player);
  }

  private updateSidebar(game: Game): void {
    try {
      if (!this.objective || !this.objective.isValid) {
        const old = world.scoreboard.getObjective(SIDEBAR_ID);
        if (old) world.scoreboard.removeObjective(old);
        this.objective = world.scoreboard.addObjective(SIDEBAR_ID, "§4FORSAKEN");
        world.scoreboard.setObjectiveAtDisplaySlot(DisplaySlotId.Sidebar, { objective: this.objective, sortOrder: ObjectiveSortOrder.Descending });
        this.sidebarLabels.clear();
      }
      const rows = sidebarRows(game);
      const labels = new Set(rows.map((r) => r.label));
      for (const old of this.sidebarLabels) if (!labels.has(old)) this.objective.removeParticipant(old);
      for (const r of rows) this.objective.setScore(r.label, r.score);
      this.sidebarLabels = labels;
    } catch {
      // scoreboard unavailable this tick
    }
  }

  private updateMarkers(game: Game, viewer: Actor, player: Player, dim: Dimension, entityOf: (a: Actor) => Entity | undefined): void {
    const wanted = new Set<string>();
    for (const t of game.actors) {
      if (t === viewer || !t.alive) continue;
      const rv = game.revealsFor(viewer, t);
      if (rv.length === 0) continue;
      wanted.add(t.id);
      const color = rv.some((r) => r.marked) || t.statuses.has("marked") ? [1, 0.15, 0.15] : rv[0].color;
      // Particle in the aura colour, visible only to the viewer (works without TextPrimitive).
      // colored_flame_particle reads variable.color (vanilla particles/colored_flame.json).
      try {
        const molang = new MolangVariableMap();
        molang.setColorRGB("variable.color", { red: color[0], green: color[1], blue: color[2] });
        player.spawnParticle(config().particles.auraColored, { x: t.pos.x, y: t.pos.y + 2.4, z: t.pos.z }, molang);
      } catch {
        // unloaded
      }
      if (!config().useTextPrimitives) continue;
      const label = `◆ ${t.isMinion ? t.displayName : t.character.name}`;
      let m = this.markers.get(t.id);
      const ent = entityOf(t);
      if (!ent) continue;
      try {
        if (!m) {
          m = new TextPrimitive({ x: 0, y: 2.5, z: 0 }, label);
          m.attachedTo = ent;
          m.depthTest = false;
          m.visibleTo = [player];
          world.primitiveShapesManager.addText(m, dim);
          this.markers.set(t.id, m);
        }
        m.color = { red: color[0], green: color[1], blue: color[2], alpha: 1 };
      } catch {
        this.markers.delete(t.id);
      }
    }
    for (const [id, m] of this.markers) {
      if (!wanted.has(id)) {
        try {
          m.remove();
        } catch {
          // already gone
        }
        this.markers.delete(id);
      }
    }
  }

  private updateCooldowns(game: Game, viewer: Actor, player: Player): void {
    for (const a of viewer.character.abilities) {
      const rem = viewer.cooldowns.remaining(a.id, game.now);
      const ticks = rem === Infinity ? 0 : Math.min(32767, Math.round(rem));
      const last = this.lastCooldown.get(a.id) ?? 0;
      // Restart the overlay when a new cooldown starts or changes by more than half a second.
      if ((ticks > 0 && Math.abs(ticks - (last - 2)) > 10) || (ticks === 0 && last > 0)) {
        try {
          player.startItemCooldown(`${abilityItemId(viewer.character.id, a.id)}`, ticks);
        } catch {
          // category unknown on this client
        }
      }
      this.lastCooldown.set(a.id, ticks);
    }
  }

  clear(player: Player | undefined): void {
    for (const m of this.markers.values()) {
      try {
        m.remove();
      } catch {
        // ignore
      }
    }
    this.markers.clear();
    try {
      if (this.objective?.isValid) world.scoreboard.removeObjective(this.objective);
      else {
        const old = world.scoreboard.getObjective(SIDEBAR_ID);
        if (old) world.scoreboard.removeObjective(old);
      }
    } catch {
      // ignore
    }
    this.objective = null;
    this.sidebarLabels.clear();
    this.flashes.clear();
    this.lastCooldown.clear();
    if (player?.isValid) player.onScreenDisplay.setActionBar("");
  }
}
