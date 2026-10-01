# Design

Unofficial fan project. Not affiliated with or endorsed by the FORSAKEN developers or Roblox.

## 1. Layers

| Layer | Files | Imports Minecraft? |
|---|---|---|
| Data | `data/*.json` (roster, statuses, config) | no |
| Game model | `src/core`, `src/entities`, `src/abilities`, `src/characters`, `src/world`, `src/bots`, `src/ui/*.ts` (formatting) | **no** — unit-tested |
| Adapter | `src/main.ts`, `src/**/*.mc.ts` | yes |

The model reaches Minecraft only through:
- `Body` (per actor): `read()` → `BodyState`, `teleport`, `impulse`, `drive`, `setFacing`.
- `WorldPorts`: `createBotBody`, `createProp`, `setGeneratorBlock`, `openDoor`.
- `Fx` queue: sounds, particles, lines/rings, titles, messages, vanilla effects, fog, camera shake.

## 2. Tick order (`Game.tick`, 20 Hz)

1. `syncBodies()` — every actor's `state` (position, facing, sprint input, sneaking, speed).
2. `scheduler.run()` — windups, delayed hits, timed effects.
3. Head start → round transition.
4. Per living actor: prune hooks → statuses (damage over time, expiry) → shields (decay) → channel checks → forced movement (dashes) → kit `tick` → `tick` hooks → speeds (`computeSpeeds`) → stamina (`updateStamina`).
5. World objects (`update`, expiry).
6. Reveals pruned.
7. Round only: generators (who repairs, progress, layers, completion), clock, Last Man Standing, win check.

The adapter then: applies movement (player attribute / bot steering), drains `Fx`, refreshes HUD and aura markers.

## 3. Damage pipeline (`entities/combat.ts`)

`game.damage(target, amount, source, { kind, abilityId, tags, canKill, floor, bypassInvincible, ignoreResistance })`

1. Dead / `invulnerableUntil` / `invincible` status → cancelled (unless `bypassInvincible`; damage over time and self damage ignore invulnerability).
2. Source: Strength/Weakness multiplier, then `beforeDealDamage` hooks.
3. Target `beforeTakeDamage` hooks (Block, ENRAGED immunity, Spawn Protection...). Hooks may cancel or change `ev.amount` / `ev.multiplier`.
4. Resistance (−20 %/level, V = immune) vs Vulnerable (+20 %/level, cancels Resistance level for level), Creatures ×1.25; Burning is nullified by any Resistance; Purified reduces one hit.
5. Shield layers in order (overheal, Slateskin, Shatterpoint with 40 % reduction that damage over time skips).
6. HP with floors (Bleeding 10, Poison/Corrupted 1 via `canKill:false`).
7. `lethal` hooks may prevent the death (Two Time second life, Spawn Protection).
8. `afterDamage`: interrupt repair/channels on HP damage, cancel Regeneration over its threshold, survivor on-hit speed boost, `afterTakeDamage` / `afterDealDamage` / `anyDamage` hooks, kill handling.

`kind`: `"basic"` (killer M1s and M1 extensions — what Guest 1337 can block), `"ability"`, `"dot"`, `"self"`, `"minion"`, `"environment"`.
Tags used across kits: `melee`, `projectile`, `aoe`, `grab`, `sentry`, `tripmine` (both also set `bypassInvincible`), `noOnHitSpeed`.

## 4. Statuses (`data/statuses.json`, `entities/statuses.ts`)

Stacking: `max` (keep higher level, longer timer), `add` (levels add, timer refreshes), `add_keep` (levels add, timer kept — Bleeding), `replace`. Apply with `game.status(target, id, level, seconds, source, { mode?, data? })`.
Immunities: Slateskin list, Subspaced can't be reapplied, `invincible` blocks enemy debuffs, `modifyStatus` hooks (Hellforged Will, Unstoppable).
Stuns: `game.stun(target, seconds, source)` — stun immunity 4 s + 3 s per extra living Sentinel, killers +0.6 s recovery and invulnerable for stun + 1 s, cancels windups (`stunCancels`), channels and dashes; `modifyStun` / `afterStunned` hooks; `stun_immune` status blocks.

## 5. Kits (`src/abilities/kits/<id>.ts`)

```ts
export const xKit: Kit = {
  id: "x",                         // = character id in data
  init(actor, game) {},            // resources (actor.res), passive hooks (actor.addHooks)
  tick(actor, game) {},            // per-tick passive logic
  cooldownFor(actor, abilityId, base, game) { return base; }, // variants (ENRAGED, Blood Hunt)
  abilities: {
    ability_id: {
      can(ctx) { return true | "reason"; },
      use(ctx) { /* return false = failed (no cooldown); { noCooldown: true } = start it yourself; { cooldown: s } */ },
      release(ctx) {},             // charge/toggle second press; active when ctx.data.active === true (or isActive)
      isActive(ctx) { return bool; },
      hud(ctx) { return "x2"; },   // HUD suffix
      ignoresHelpless: false,
      usableWhileRepairing: false,
      usableWhileChanneling: false, // presses during a windup are refused ("busy") unless this or a release
    },
  },
};
```

`AbilityCtx`: `game`, `actor`, `def`, `now`, `n(key)` (numeric param, throws if missing), `opt(key, fallback)`, `param<T>(key)`, `data` (per-ability runtime record on the actor).

Useful `Game` API: `damage`, `heal`, `status`, `removeStatus`, `stun`, `shield`, `invulnerable`, `startCooldown`, `interrupt`, `schedule(owner, seconds, fn, {stunCancels})`, `windup(actor, seconds, fn, {abilityId, moveMul, noSprint, frozen, stunCancels, damageCancels, moveCancels, onCancel})`, `dash(...)`, `lunge(actor, studs, seconds)`, `reveal(target, viewers, seconds, {color, marked, source})`, `spawnObject(...)`, `removeObject`, `objectsOf(kind)`, `spawnMinion(...)`, `despawnMinion`, `enemiesOf`, `alliesOf`, `aliveSurvivors`, `nearestEnemy`, `lineOfSight`, `pointInFront`, `terrorRadius`, `fx`.
Helpers in `kits/common.ts`: `swing`, `basicAttack`, `meleeTargets`, `aimedEnemy`, `aimedAlly`, `knockback`, `pull`, `enemiesInRadius`, `enemiesInBox`, `teleportSafe`, `addRes`, `projSpeed`, `blocks`, `placeInFront`, `facingAway`.
Projectiles: `spawnProjectile(game, { owner, kind, pos, vel (blocks/tick), gravity, radius, lifeSeconds, throughWalls, pierce, hit, onHitActor, onHitWall, onExpire })` in `abilities/objects.ts`.

Units: data keeps FORSAKEN units (studs, studs/s, seconds, HP). Kits convert with `studs()` (distances), `projSpeed()` / `game.dash({studsPerSecond})` (speeds), seconds stay seconds.

Bots press abilities through exactly the same `useAbility(game, actor, abilityId)`; aimed abilities read `actor.facing`, which bots set before pressing.

Press rules (`blockReason` in `abilities/engine.ts`, checked in this order): dead, not in a round, killer during the head start, stunned, repairing, Helpless (unless `ignoresHelpless` or releasing), `locked` flag, a running windup (unless releasing or `usableWhileChanneling`), cooldown, then the handler's own `can()`.

## 5b. Bots (`src/bots`)

- `BotDirector` owns one brain per bot. Brains *think* every `bots.thinkIntervalTicks` (5, staggered so bots don't all think on the same tick) and *steer* every tick.
- Perception (`perception.ts`): vision cone (100°, 40 blocks, less with Blindness/Invisibility) plus line of sight, footsteps (rough position; silent, crouching and invisible actors make none), aura reveals given to the bot, and for survivors the terror radius (jittered direction). Memory keeps the last sighting per enemy.
- `KillerBrain`: PATROL (generators weighted by progress) → SEARCH (fresh noises) → CHASE / FINISH (lead the target, sprint management, basic attack when in reach with a per-difficulty swing chance) → RESET after a kill; gives up a chase with no hit for `chaseGiveUpSeconds`.
- `SurvivorBrain`: repair (picks generators by distance, crowding, progress and killer position), evade (samples cells scored by the killer's path distance from a shared distance field minus own distance, openness, dead ends, and a bonus for breaking line of sight), flee hysteresis, heal, pick up map items, hide when everything is repaired; long self-casts are cancelled when the killer shows up.
- Per-character hooks (`hooks.ts`) decide when to press each ability; a hook can redirect the bot with `brain.hookGoal`.
- Movement goes through `Game.navDirection` (A* on the arena grid, re-planned only when stale; doors opened ahead) and stuck recovery (re-path → hop to the next waypoint → teleport to a safe cell).

## 6. Roblox → Minecraft adaptations

| FORSAKEN | Here | Why |
|---|---|---|
| Q/E/R/T keys | Hotbar slots 2–5 (slot 1 = killer basic attack via left-click swing) | No custom keybinds in Bedrock scripting |
| Hold-to-charge (Void Rush, Crystal Pitch, Demonic Pursuit, Spawn Protection, Pray) | Tap to start, tap again to release (auto-release at max) | `itemUse` is the only input that works on every custom item |
| Flow Free generator puzzles | 5 timed layers per generator, sneak while looking at it | Puzzles UI not possible; layers keep the wiki's −3 s per puzzle |
| Bloodhook timed prompt | Tug-of-war: both sides spam jump (`playerButtonInput`); bots press at a difficulty-based rate | Timed prompts need custom UI |
| Cursor targeting (Observant, Spawn Protection, Inject cursor mode) | Crosshair direction (closest target/generator to the view ray) | — |
| Aura outline through walls | `TextPrimitive` label attached to the target (`depthTest=false`) + HUD arrow/distance + particles | No outline shader access |
| Graffiti zones visible only to Veeronica | Particle outline sent only to her (`player.spawnParticle`) | — |
| Screen effects (Glitched, Hallucination fakes, Subspaced) | HUD scrambling, fake timer/HP text, vanilla nausea/darkness/blindness | — |
| Ragdoll / kill animations | Knockback + sounds; spectator mode on death | — |
