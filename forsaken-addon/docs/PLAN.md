# FORSAKEN: Bedrock Edition — Plan

Unofficial fan project. Not affiliated with or endorsed by the FORSAKEN developers or Roblox.

## Targets (looked up 2026-10-01, see DECISIONS.md for sources)

| Item | Value | Source |
|---|---|---|
| Minecraft Bedrock stable | 1.26.50 (1.26.50.4, released 2026-09-15) | `Mojang/bedrock-samples` `version.json` |
| `min_engine_version` | `[1, 26, 50]` | matches the script module versions below |
| `@minecraft/server` | 2.10.0 (npm `latest`; its `rc` builds were `2.10.0-rc.1.26.50-preview.*`) | `npm view @minecraft/server dist-tags` |
| `@minecraft/server-ui` | 2.2.0 (npm `latest`) | `npm view @minecraft/server-ui dist-tags` |
| Entity JSON `format_version` | 1.26.50 | official schema folder `metadata/json_schemas/server/entity/1.26.50` |
| Item JSON `format_version` | 1.26.30 | official schema folder `server/item/1.26.30` |
| Block JSON `format_version` | 1.26.20 | official schema folder `server/block/1.26.20` |

No Beta APIs, no experimental toggles.

## Architecture

```
          ┌───────────────────────── pure TypeScript (unit-tested) ─────────────────────────┐
data/*.json ─► characters/ (loader + schema check) ─► Game (core/game.ts)                 │
                                                       ├─ Actors (entities/actor.ts): HP, shield layers, stamina,
                                                       │    statuses (entities/statuses.ts), cooldowns, speed rules
                                                       ├─ damage pipeline (entities/damage.ts)
                                                       ├─ ability engine (abilities/engine.ts) + 20 kits (abilities/kits/*)
                                                       ├─ timeline/scheduler (core/scheduler.ts): windups, channels, dashes
                                                       ├─ projectiles, traps, minions, zones (abilities/objects.ts)
                                                       ├─ generators, round clock, LMS, win rules (world/generators.ts, core/round.ts)
                                                       ├─ arena layout + nav grid + A* (world/layout.ts, world/nav.ts)
                                                       ├─ bots (bots/*): perception, survivor/killer state machines, per-character hooks
                                                       └─ FX queue (core/fx.ts): particles, sounds, titles, markers
          └───────────────────────────────────────────────────────────────────────────────────┘
          ┌──────────────────── Minecraft adapter (*.mc.ts, never imported by tests) ───────────┐
            main.ts ─ event wiring (scriptEventReceive, itemUse, playerSwingStart, entityHurt before, ...)
            mc/bodies.mc.ts  Player and bot bodies (position, facing, movement attribute, steering)
            mc/fx.mc.ts      drains the FX queue into particles / sounds / TextPrimitive aura markers
            mc/hud.mc.ts     actionbar + sidebar
            ui/menus.mc.ts   ActionFormData menus, results form
            world/builder.mc.ts  time-sliced arena build/teardown (system.runJob), ticking area
            mc/match.mc.ts   match lifecycle, player snapshot/restore, cleanup
          └───────────────────────────────────────────────────────────────────────────────────┘
```

Rule enforced by `npm run validate`: only `src/main.ts` and files named `*.mc.ts` may import `@minecraft/*`; tests never import `*.mc.ts`.

## Milestones

| # | Content | Output |
|---|---|---|
| M0 | Versions, layout, build/typecheck/validate/test, packaging, hello-world script, wiki reconciliation | PLAN.md, RISKS.md |
| M1 | Spike: bot movement/pathing, entity properties for skins, virtual HP, sprint gating, speed control, item-use events | DECISIONS.md |
| M2 | Config/scale, state machine, statuses, damage, stamina, cooldowns, ability engine, hit helpers | unit tests green |
| M3 | Arena builder, generators, spawns, timer, win conditions, cleanup | 3 back-to-back simulated matches |
| M4 | Menus, hotbar items, HUD, results, spectator on death | |
| M5 | 8 killers + 12 survivors with passives/abilities/statuses | per-character tests + manual steps |
| M6 | Bot entities, perception, movement, survivor/killer AI, hooks, difficulty, stuck recovery | |
| M7 | Skins/icons, sounds, particles, lang, perf, docs, README | |
| M8 | Final audit | AUDIT.md |

## Key risks (details and fallbacks in RISKS.md)

1. Nothing can be run inside Minecraft here; all in-game behaviour is unverified.
2. Player movement-speed attribute writes and hunger-based sprint lock are community-known techniques, not documented guarantees.
3. Script-steered bots (velocity impulses) instead of native AI goals.
4. `TextPrimitive` aura markers are new stable API; HUD callouts are the fallback channel.
5. FORSAKEN kits use Roblox-only UI (puzzles, QTEs, cursor targeting); each has a documented Minecraft substitute.
