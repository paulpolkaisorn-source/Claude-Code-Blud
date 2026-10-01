// Renders the model's Fx queue in Minecraft.
import { CameraShakeType, Dimension, MolangVariableMap, Player, world, type Entity } from "@minecraft/server";
import type { FxEvent, Rgb } from "../core/fx";
import { add, len, scale, sub, type Vec3 } from "../util/vec";

export interface FxTargets {
  /** Player for an actor id (only the human). */
  player(actorId: string): Player | undefined;
  /** Entity for an actor id (players and bots). */
  entity(actorId: string): Entity | undefined;
  /** Adds a short actionbar line for a player. */
  flash(actorId: string, text: string, ticks: number): void;
  /** Players that should see everything (the human participant). */
  allPlayers(): Player[];
}

const MAX_LINE_POINTS = 40;

function colorMap(c?: Rgb): MolangVariableMap | undefined {
  if (!c) return undefined;
  const m = new MolangVariableMap();
  m.setColorRGB("variable.color", { red: c[0], green: c[1], blue: c[2] });
  return m;
}

function particle(dim: Dimension, id: string, pos: Vec3, color: Rgb | undefined, viewers: Player[] | undefined): void {
  const vars = colorMap(color);
  try {
    if (viewers) for (const p of viewers) p.spawnParticle(id, pos, vars);
    else dim.spawnParticle(id, pos, vars);
  } catch {
    // unloaded chunk or invalid particle: harmless
  }
}

export function renderFx(dim: Dimension, events: FxEvent[], t: FxTargets): void {
  for (const ev of events) {
    try {
      switch (ev.t) {
        case "sound": {
          if (ev.to) {
            for (const id of ev.to) t.player(id)?.playSound(ev.id, { location: ev.pos, volume: ev.volume, pitch: ev.pitch });
          } else dim.playSound(ev.id, ev.pos, { volume: ev.volume, pitch: ev.pitch });
          break;
        }
        case "particle":
          particle(dim, ev.id, ev.pos, ev.color, ev.to ? (ev.to.map((id) => t.player(id)).filter(Boolean) as Player[]) : undefined);
          break;
        case "line": {
          const d = sub(ev.to, ev.from);
          const l = len(d);
          const n = Math.min(MAX_LINE_POINTS, Math.max(1, Math.floor(l / Math.max(0.2, ev.step))));
          const viewers = ev.viewers ? (ev.viewers.map((id) => t.player(id)).filter(Boolean) as Player[]) : undefined;
          for (let i = 0; i <= n; i++) particle(dim, ev.id, add(ev.from, scale(d, i / n)), ev.color, viewers);
          break;
        }
        case "ring": {
          const viewers = ev.viewers ? (ev.viewers.map((id) => t.player(id)).filter(Boolean) as Player[]) : undefined;
          const pts = Math.min(MAX_LINE_POINTS, ev.points);
          for (let i = 0; i < pts; i++) {
            const a = (i / pts) * Math.PI * 2;
            particle(dim, ev.id, { x: ev.center.x + Math.cos(a) * ev.radius, y: ev.center.y, z: ev.center.z + Math.sin(a) * ev.radius }, ev.color, viewers);
          }
          break;
        }
        case "title":
          for (const id of ev.to) t.player(id)?.onScreenDisplay.setTitle(ev.title, { subtitle: ev.subtitle, fadeInDuration: ev.fadeIn, stayDuration: ev.stay, fadeOutDuration: ev.fadeOut });
          break;
        case "message":
          if (ev.to === "all") for (const p of t.allPlayers()) p.sendMessage(ev.text);
          else for (const id of ev.to) t.player(id)?.sendMessage(ev.text);
          break;
        case "flash":
          for (const id of ev.to) t.flash(id, ev.text, ev.ticks);
          break;
        case "effect": {
          const e = t.entity(ev.actorId);
          if (!e?.isValid) break;
          if (ev.remove) e.removeEffect(ev.effect);
          else e.addEffect(ev.effect, Math.max(1, Math.round(ev.seconds * 20)), { amplifier: Math.max(0, ev.amplifier), showParticles: false });
          break;
        }
        case "fog": {
          const p = t.player(ev.actorId);
          if (!p) break;
          const tag = `forsaken_${ev.fogId.split(":")[1]}`;
          if (ev.on) p.fogSettings.push(ev.fogId, tag);
          else p.fogSettings.remove(tag);
          break;
        }
        case "shake":
          t.player(ev.actorId)?.camera.addShake({ intensity: ev.intensity, duration: ev.seconds, type: CameraShakeType.Rotational });
          break;
        case "fade":
          t.player(ev.actorId)?.camera.fade({ fadeColor: { red: ev.color[0], green: ev.color[1], blue: ev.color[2] }, fadeTime: { fadeInTime: ev.seconds / 3, holdTime: ev.seconds / 3, fadeOutTime: ev.seconds / 3 } });
          break;
      }
    } catch (e) {
      // A single failing effect must never break the tick.
      if (world.getDynamicProperty("forsaken:debug") === true) console.warn(`[forsaken] fx ${ev.t} failed: ${String(e)}`);
    }
  }
}
