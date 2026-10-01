// Pure HUD text composition (actionbar lines, sidebar rows). The adapter only displays the strings.
import type { Game } from "../core/game";
import type { Actor } from "../entities/actor";
import { abilityHudText } from "../abilities/engine";
import { statusDef } from "../entities/statuses";
import { arrowFor, bar, clock, roman } from "../util/format";
import { angleBetween2D, dist2D, flat, sub } from "../util/vec";
import { config } from "../core/config";
import { generatorsDone } from "../world/generators";
import { flaggedInRange } from "../abilities/kits/daemon";

export interface HudLines {
  lines: string[];
  /** Strength of the terror-radius cue 0..1 (0 = outside). */
  terror: number;
}

const GLITCH_CHARS = "#%&?@$*";

function scramble(text: string, seed: number): string {
  let s = seed;
  return text.replace(/[0-9]/g, () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return GLITCH_CHARS[s % GLITCH_CHARS.length];
  });
}

/** Direction arrow + distance from `viewer` to `target` ("▲ 23m"). */
export function callout(viewer: Actor, targetPos: { x: number; y: number; z: number }): string {
  const rel = angleBetween2D(flat(viewer.facing), flat(sub(targetPos, viewer.pos)));
  return `${arrowFor(rel)} ${Math.round(dist2D(viewer.pos, targetPos))}m`;
}

export function composeHud(game: Game, viewer: Actor, flashes: string[] = []): HudLines {
  const lines: string[] = [];
  const now = game.now;
  const r = game.round;
  const gens = game.generators.filter((g) => !g.fake);
  const done = generatorsDone(game.generators);
  const alive = game.aliveSurvivors().length;
  const hallu = viewer.statuses.level("hallucination");
  // Hallucination I+: the timer shown is wrong (wiki).
  let timeLeft = r.timeLeft;
  if (hallu >= 1 && viewer.team === "survivor") timeLeft = Math.max(0, timeLeft + Math.sin(now / 37) * 40 + 25);
  const phaseText = game.phase === "HEAD_START" ? `§eHEAD START ${clock((game.headStartEndTick - now) / 20)}` : `§c⏱ ${clock(timeLeft)}`;
  const lms = r.lms ? " §4§lLMS§r" : "";
  const bh = game.killer?.flags.has("bloodHunt") ? " §4BLOOD HUNT" : "";
  lines.push(`${phaseText}${lms}${bh} §7| §e⚡ ${done}/${gens.length} §7| §f☺ ${alive} alive`);

  // Health / stamina / shields
  if (viewer.alive) {
    // Noli's hallucinations fake damage (positive) and fake heals (negative); the real HP is unchanged.
    const fake = viewer.res.fakeDamage ?? 0;
    const shownHp = Math.min(Math.round(viewer.maxHp), Math.max(0, Math.ceil(viewer.hp - fake)));
    const shield = viewer.shieldTotal();
    let hp = `§cHP ${shownHp}/${Math.round(viewer.maxHp)}${shield > 0.5 ? ` §b+${Math.round(shield)}` : ""}`;
    let st = `§aSTA ${bar(viewer.stamina / viewer.staminaMax, 10, "█", "░")} ${Math.round(viewer.stamina)}${viewer.exhausted ? " §6EXHAUSTED" : ""}`;
    const glitch = viewer.statuses.level("glitched");
    if (glitch > 0 && config().statusTuning.glitchedHudScramble) {
      hp = scramble(hp, now + glitch);
      st = glitch >= 2 ? "§a§kSTA ##########" : scramble(st, now * 3);
    }
    lines.push(`${hp} §7| ${st}`);
  } else {
    lines.push("§7☠ Spectating — you were eliminated");
  }

  // Abilities
  if (viewer.alive) {
    const parts = viewer.character.abilities.map((a) => abilityHudText(game, viewer, a).label);
    lines.push(parts.join(" §8|§r "));
  }

  // Statuses (visible ones)
  const sts = viewer.statuses
    .all()
    .filter((s) => !statusDef(s.id).hidden && !s.data?.hidden && s.endTick > now)
    .map((s) => {
      const d = statusDef(s.id);
      const left = s.endTick === Infinity ? "" : ` ${((s.endTick - now) / 20).toFixed(1)}s`;
      return `§${d.color}${d.hud}${d.maxLevel > 1 ? " " + roman(s.level) : ""}${left}`;
    });
  if (viewer.isStunned(now)) sts.unshift(`§e§lSTUNNED ${((viewer.stunnedUntil - now) / 20).toFixed(1)}s`);
  if (sts.length) lines.push(sts.join(" §8·§r "));

  // Channel / repair progress
  if (viewer.channel) {
    const ch = viewer.channel;
    const f = (now - ch.startTick) / Math.max(1, ch.endTick - ch.startTick);
    lines.push(`§d${ch.label} §f▕${bar(f, 16, "█", "░")}▏`);
  } else if (viewer.repairing) {
    const g = game.generators.find((x) => x.id === viewer.repairing);
    if (g) lines.push(`§eRepairing §f▕${bar(g.progress / g.layers, 16, "█", "░")}▏ §7${Math.floor(g.progress)}/${g.layers}`);
  }

  // Aura callouts
  const seen: string[] = [];
  for (const t of game.actors) {
    if (t === viewer || !t.alive) continue;
    const rv = game.revealsFor(viewer, t);
    if (rv.length === 0) continue;
    const marked = rv.some((x) => x.marked) || t.statuses.has("marked");
    seen.push(`${marked ? "§c" : t.team === "killer" ? "§4" : "§e"}◆ ${t.isMinion ? t.displayName : t.character.name} ${callout(viewer, t.pos)}`);
    if (seen.length >= 4) break;
  }
  if (seen.length) lines.push(seen.join("  "));
  // Daemon's Uptime: Flagged survivors within range are listed on his HUD.
  if (viewer.alive && viewer.character.id === "daemon") {
    const flagged = flaggedInRange(game, viewer).slice(0, 4);
    if (flagged.length) lines.push(flagged.map((t) => `§a⚑ ${t.character.name} ${Math.ceil(t.hp)}hp ${callout(viewer, t.pos)}`).join("  "));
  }

  // Terror radius cue (survivors, not Oblivious)
  let terror = 0;
  const k = game.killer;
  if (viewer.team === "survivor" && viewer.alive && k && k.alive && !viewer.statuses.has("oblivious")) {
    const tr = game.terrorRadius(k);
    const d = dist2D(viewer.pos, k.pos);
    if (d <= tr) {
      terror = 1 - d / tr;
      const hearts = terror > 0.66 ? "§4♥♥♥" : terror > 0.33 ? "§c♥♥" : "§7♥";
      lines.push(`${hearts} §7TERROR`);
    }
  }
  for (const f of flashes) lines.push(f);
  return { lines, terror };
}

/** Sidebar rows: survivors with their HP (score) — dead ones at 0. */
export function sidebarRows(game: Game): Array<{ label: string; score: number }> {
  const rows: Array<{ label: string; score: number }> = [];
  const k = game.killer;
  if (k) rows.push({ label: `§4☗ ${k.character.name}${k.isBot ? " §7[BOT]" : ""}`, score: Math.max(0, Math.ceil(k.hp)) });
  for (const s of game.allSurvivors()) {
    rows.push({ label: `${s.alive ? "§a●" : "§8✖"} ${s.character.name}${s.isBot ? " §7[BOT]" : ""}`, score: s.alive ? Math.max(0, Math.ceil(s.hp)) : 0 });
  }
  return rows;
}
