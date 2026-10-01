// Visual/audio side effects produced by the pure model and drained by the Minecraft adapter each tick.
import type { Vec3 } from "../util/vec";
import { config } from "./config";

export type Rgb = [number, number, number];

export type FxEvent =
  | { t: "sound"; id: string; pos: Vec3; volume: number; pitch: number; to?: string[] }
  | { t: "particle"; id: string; pos: Vec3; color?: Rgb; to?: string[] }
  | { t: "line"; id: string; from: Vec3; to: Vec3; step: number; color?: Rgb; viewers?: string[] }
  | { t: "ring"; id: string; center: Vec3; radius: number; points: number; color?: Rgb; viewers?: string[] }
  | { t: "title"; to: string[]; title: string; subtitle?: string; fadeIn: number; stay: number; fadeOut: number }
  | { t: "message"; to: string[] | "all"; text: string }
  | { t: "flash"; to: string[]; text: string; ticks: number }
  | { t: "effect"; actorId: string; effect: string; seconds: number; amplifier: number; remove?: boolean }
  | { t: "fog"; actorId: string; fogId: string; on: boolean }
  | { t: "shake"; actorId: string; intensity: number; seconds: number }
  | { t: "fade"; actorId: string; seconds: number; color: Rgb };

export class Fx {
  events: FxEvent[] = [];

  drain(): FxEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  /** Plays a sound from data/config.json `sounds` by key (or a raw id). */
  sound(key: string, pos: Vec3, opts: { to?: string[]; volume?: number; pitch?: number } = {}): void {
    const def = config().sounds[key];
    const id = def ? def.id : key;
    this.events.push({ t: "sound", id, pos, volume: opts.volume ?? def?.volume ?? 1, pitch: opts.pitch ?? def?.pitch ?? 1, to: opts.to });
  }

  /** Spawns a particle from data/config.json `particles` by key (or a raw id). */
  particle(key: string, pos: Vec3, opts: { to?: string[]; color?: Rgb } = {}): void {
    const id = config().particles[key] ?? key;
    this.events.push({ t: "particle", id, pos, color: opts.color, to: opts.to });
  }

  line(key: string, from: Vec3, to: Vec3, step = 0.6, opts: { color?: Rgb; viewers?: string[] } = {}): void {
    const id = config().particles[key] ?? key;
    this.events.push({ t: "line", id, from, to, step, color: opts.color, viewers: opts.viewers });
  }

  ring(key: string, center: Vec3, radius: number, points = 16, opts: { color?: Rgb; viewers?: string[] } = {}): void {
    const id = config().particles[key] ?? key;
    this.events.push({ t: "ring", id, center, radius, points, color: opts.color, viewers: opts.viewers });
  }

  title(to: string[], title: string, subtitle?: string, stay = 40, fadeIn = 5, fadeOut = 10): void {
    if (to.length) this.events.push({ t: "title", to, title, subtitle, fadeIn, stay, fadeOut });
  }

  message(to: string[] | "all", text: string): void {
    this.events.push({ t: "message", to, text });
  }

  /** Short-lived extra actionbar line (e.g. "BLOCKED!"). */
  flash(to: string[], text: string, ticks = 30): void {
    if (to.length) this.events.push({ t: "flash", to, text, ticks });
  }

  effect(actorId: string, effect: string, seconds: number, amplifier = 0): void {
    this.events.push({ t: "effect", actorId, effect, seconds, amplifier });
  }

  clearEffect(actorId: string, effect: string): void {
    this.events.push({ t: "effect", actorId, effect, seconds: 0, amplifier: 0, remove: true });
  }

  fog(actorId: string, fogKey: string, on: boolean): void {
    const fogId = config().fog[fogKey] ?? fogKey;
    this.events.push({ t: "fog", actorId, fogId, on });
  }

  shake(actorId: string, intensity: number, seconds: number): void {
    this.events.push({ t: "shake", actorId, intensity, seconds });
  }

  fade(actorId: string, seconds: number, color: Rgb = [0, 0, 0]): void {
    this.events.push({ t: "fade", actorId, seconds, color });
  }
}
