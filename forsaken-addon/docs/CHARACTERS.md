# Characters

_Generated from `data/killers.json` and `data/survivors.json` by `tools/gen-characters-doc.mjs`; edit the data, not this file._

Unofficial fan project. Not affiliated with or endorsed by the FORSAKEN developers or Roblox.

## Sources and conventions

- Values come from the FORSAKEN wiki (forsaken2024.fandom.com), character pages and the Status Effects page, read on 2026-10-01 through the public MediaWiki API (the HTML pages answer 403 to automated clients).
- Where the wiki differs from the task brief, the wiki wins (DECISIONS.md D20). Each difference is listed under **Changes from the brief** for that character.
- **[assumed]**: no FORSAKEN source; chosen by us and tunable in the data files. **[undocumented]**: the wiki marks the value as player-observed rather than official.
- Units: distances in studs × 0.36 = blocks; speeds in studs/s relative to the survivor sprint of 26 studs/s (= vanilla sprint, 5.612 blocks/s); seconds, HP, damage and stamina 1:1 (DECISIONS.md D21, D22).
- Daemon is an original killer designed for this addon (no FORSAKEN source).

## Roster

| Character | Team / role | HP | Walk / sprint (studs/s) | Stamina | Terror radius | [assumed] | [undocumented] |
|---|---|---|---|---|---|---|---|
| Slasher | Killer | 2000 | 9 / 28 | 110 (−9.5/s, +21/s) | 62.5 | 7 | 4 |
| c00lkidd | Killer | 1000 | 7.75 / 28 | 110 (−9.5/s, +21/s) | 75 | 11 | 4 |
| John Doe | Killer | 2300 | 9 / 27.25 | 110 (−9.5/s, +21/s) | 60 | 14 | 2 |
| 1x1x1x1 | Killer | 102550 | 8 / 27 | 110 (−9.5/s, +21/s) | 75 | 9 | 2 |
| Noli | Killer | 2222 | 8 / 27.5 | 110 (−9.5/s, +21/s) | 100 | 20 | 1 |
| Guest 666 | Killer | 2750 | 9 / 27 | 110 (−9.5/s, +21/s) | 112.5 | 18 | 2 |
| Nosferatu | Killer | 1750 | 7.5 / 27.5 | 110 (−9.5/s, +21/s) | 75 | 21 | 1 |
| Daemon (original) | Killer | 2000 | 9 / 27.5 | 110 (−9.5/s, +21/s) | 70 | 1 | 0 |
| Noob | Survivalist | 100 | 12 / 26 | 100 (−10/s, +20/s) | — | 2 | 0 |
| 007n7 | Survivalist | 100 | 12 / 26 | 100 (−10/s, +20/s) | — | 3 | 1 |
| Veeronica | Survivalist | 100 | 12 / 26 | 100 (−10/s, +20/s) | — | 4 | 3 |
| Guest 1337 | Sentinel | 110 | 12 / 26 | 100 (−10/s, +20/s) | — | 6 | 4 |
| Shedletsky | Sentinel | 100 | 12 / 26 | 100 (−10/s, +20/s) | — | 1 | 2 |
| Chance | Sentinel | 80 | 12 / 26 | 100 (−10/s, +20/s) | — | 4 | 1 |
| Two Time | Sentinel / Survivalist | 80 | 12 / 26 | 100 (−10/s, +20/s) | — | 7 | 4 |
| Jane Doe | Sentinel / Support | 60 | 12 / 26 | 100 (−10/s, +20/s) | — | 11 | 1 |
| Elliot | Support | 80 | 12 / 26 | 100 (−10/s, +20/s) | — | 2 | 1 |
| Builderman | Support | 90 | 12 / 26 | 100 (−10/s, +20/s) | — | 4 | 2 |
| Dusekkar | Support | 90 | 12 / 26 | 100 (−10/s, +20/s) | — | 2 | 0 |
| Taph | Support | 100 | 12 / 26 | 100 (−10/s, +20/s) | — | 3 | 0 |

## Global switches (data/config.json)

- `oneXOneHpOverride` = none: the wiki gives 1x1x1x1 102550 HP; set a number (the brief's fallback was 2500) to override it.
- `twoTimeVariant` = "oblation": "oblation" is Two Time's current wiki kit (Oblation / Ritual / Pray); "undying_devotion" switches to the oldest kit (one passive revive, no usable abilities).
- Match, combat, stamina and status tuning without a FORSAKEN source (all [assumed]): `match.layerSecondsSolo`, `match.itemSpawnMin`, `match.itemSpawnMax`, `combat.onHitSpeedLevel`, `combat.onHitSpeedSeconds`, `combat.limpSpeedMultiplier`, `stamina.sprintUnlockAt`, `stamina.regenDelayPerSprintSecond`, `stamina.regenDelayMax`, `statusTuning.bleedingDpsPerLevel`, `statusTuning.poisonDps`, `statusTuning.hemorrhageMaxHpLossPerSecondPerLevel`, `statusTuning.hemorrhageMaxLossPerLevel`, `statusTuning.hemorrhageRecoveryPerSecond`, `statusTuning.glitchedHudScramble`, `bots`.
- Status effects: 30 definitions from the wiki's Status Effects page; `flagged` is original (Daemon).

## Killers

### Slasher

Machete melee killer whose Raging Pace turns every swing into a lunge.

- Killer · Stealth / Ambusher · difficulty 2/5
- HP 2000 · walk 9 · sprint 28 · stamina 110 (−9.5/s, +21/s) · terror radius 62.5 studs

**Passives**

- **Final Chapter**: Gains Resistance IV for 10 s after being stunned.

**Abilities** (hotbar slot = FORSAKEN key order; slot 1 is the killer basic attack)

| Slot | Ability | Input | Cooldown | What it does |
|---|---|---|---|---|
| 1 | Slash | tap | 1.9 s | 20 damage + Bleeding I (5 s). Hits several survivors. ENRAGED: lunges 19 studs, 25 damage, 0.8 s cooldown. |
| 2 | Behead | tap | 18 s | Heavy swing: 25 damage + Helpless 8 s (35 while ENRAGED). Lunges if moving. Slowness I 2 s on Slasher, hit or miss. |
| 3 | Gashing Wound | tap | 32 s | Grab combo: 2 machete strikes, chainsaw slash, 2 stabs, kick. 50 total (70 ENRAGED). Locks one survivor; stun-immune during and 1.5 s after. Immobile 4.5 s. |
| 4 | Raging Pace | tap | 30 s | ENRAGED for 14 s: speed 19, no sprint, nearest survivor revealed 14 s, unstunnable, ignores attacks (except Subspace Tripmine and Sentry). Stamina caps at 70 over 6.5 s. Ends when another ability is used. |

**Changes from the brief (wiki wins)**

- HP 1250 -> 2000 (wiki: raised in update 5.0.0 'Azure's Wrath').
- Terror radius 60 [assumed] -> 62.5 studs (wiki).
- Walk speed 9 and stamina 110 / drain 9.5 / regen 21 now from the wiki (brief assumed 110).
- New passive Final Chapter (Resistance IV 10 s after a stun, update 5.0.0); the brief said 'no passive'.
- Slash ENRAGED cooldown 1 s -> 0.8 s.
- Behead cooldown 18.5 s -> 18 s; damage 20 -> 25.
- Gashing Wound damage split: 20/20/20/10/10/20 % (wiki) instead of 20/20/10 %; 4.5 s immobile after use.
- Raging Pace invulnerability lingers 1.5 s after ENRAGED ends; Builderman's Sentry also still hits.

**[assumed] values**: `abilities.slash.halfAngle` = 40; `abilities.behead.rangeStuds` = 8; `abilities.behead.halfAngle` = 55; `abilities.behead.movingLungeStuds` = 8; `abilities.behead.immobileSeconds` = 0.3; `abilities.gashing_wound.halfAngle` = 35; `abilities.gashing_wound.hitInterval` = 0.5

**[undocumented] values** (player-observed on the wiki): `abilities.behead.windup` = 0.45; `abilities.gashing_wound.windup` = 0.33; `abilities.gashing_wound.endlagSeconds` = 4.5; `abilities.raging_pace.stunImmuneDelay` = 0.3

**Bot behaviour**: Raging Pace when the chased survivor is low on stamina; Behead against Sentinels; Gashing Wound on cornered or exhausted targets.

### c00lkidd

Hacker kid with a wall-piercing projectile, a flaming dash and pizza-bot minions.

- Killer · Versatile / Area denial · difficulty 3/5
- HP 1000 · walk 7.75 · sprint 28 · stamina 110 (−9.5/s, +21/s) · terror radius 75 studs

**Abilities** (hotbar slot = FORSAKEN key order; slot 1 is the killer basic attack)

| Slot | Ability | Input | Cooldown | What it does |
|---|---|---|---|---|
| 1 | Tag | tap | 2 s | Punch: 26.5 damage. |
| 2 | Corrupt Nature | tap | 12 s | Slow spinning projectile through walls and survivors: 15 damage, Slowness I 4 s, aura revealed 10 s. |
| 3 | Walkspeed Override | tap | 20 s | Stand still 0.5 s, then dash at speed 90 for 1.34 s. Hitting a survivor: 32 damage, Burning I 8 s, knockback, aura 10 s, 3 s i-frames. |
| 4 | Pizza Delivery | tap | 50 s | Summons 2 pizza bots that hunt the nearest survivors: 15 damage + Burning I, Slowness II 3 s, aura 15 s. Bots have 20 HP and last 35 s. |

**Changes from the brief (wiki wins)**

- Basic attack is named Tag on the wiki (brief: Punch).
- Terror radius 60 [assumed] -> 75 studs; walk speed 7.75 (wiki).
- Walkspeed Override: Burning I 8 s (brief: 10 s); also knockback, 3 s i-frames and a 0.5 s stand-still windup.
- Pizza Delivery: bots have 20 HP, last 35 s, apply Slowness II 3 s.

**[assumed] values**: `abilities.tag.halfAngle` = 40; `abilities.corrupt_nature.projectileStudsPerSecond` = 40; `abilities.corrupt_nature.lifeSeconds` = 4; `abilities.corrupt_nature.radiusStuds` = 4; `abilities.walkspeed_override.crashSlowSeconds` = 1.5; `abilities.walkspeed_override.turnRateDegPerTick` = 4; `abilities.walkspeed_override.hitRadiusStuds` = 5; `abilities.pizza_delivery.burnSeconds` = 3; `abilities.walkspeed_override.crashMoveMul` = 0.3; `abilities.walkspeed_override.hitSlowMul` = 0.5; `abilities.pizza_delivery.windupMoveMul` = 0.5

**[undocumented] values** (player-observed on the wiki): `abilities.walkspeed_override.iframesSeconds` = 3; `abilities.pizza_delivery.windup` = 2.5; `abilities.pizza_delivery.minionHp` = 20; `abilities.walkspeed_override.hitSlowSeconds` = 0.25

**Bot behaviour**: Corrupt Nature through walls at revealed or heard survivors; Walkspeed Override to close gaps in straight lines; Pizza Delivery early to cover distance.

### John Doe

Corrupted account that leaves damaging trails, spike walls and shadow traps.

- Killer · Trapper / Set-play · difficulty 5/5
- HP 2300 · walk 9 · sprint 27.25 · stamina 110 (−9.5/s, +21/s) · terror radius 60 studs

**Passives**

- **Natural Malevolence**: A 48-stud corruption trail follows him; stepping on it gives Corrupted II for 3 s. Touching him hurts.
- **Unstoppable**: If stunned while casting Corrupt Energy or 404 Error: stun capped at 2 s, then Speed I for 3 s (+1 s per living Sentinel), that ability's cooldown halved, negative statuses halved while boosted.

**Abilities** (hotbar slot = FORSAKEN key order; slot 1 is the killer basic attack)

| Slot | Ability | Input | Cooldown | What it does |
|---|---|---|---|---|
| 1 | Slash | tap | 1.7 s | 28 damage — the highest basic attack. |
| 2 | Corrupt Energy | toggle | 12 s | A wall of 31 spikes erupts ahead for 14 s: 11 damage (max 2 hits per survivor), Corrupted II 5 s when standing on them, Speed I 7 s for John on hit. Press again to retract. |
| 3 | Digital Footprint | tap | 3 s | Three stomps create a shadow trap (max 3). Trigger: John Speed I 10 s; survivor Slowness II + Corrupted I 10 s; both see each other. |
| 4 | 404 Error | tap | 20 s | Arm pulses twice, then every living survivor's aura is revealed for 6 s. Heavily slowed and cannot sprint while casting. |

**Changes from the brief (wiki wins)**

- Slash 28 damage, cooldown 1.8 s -> 1.7 s.
- Corrupt Energy cooldown 18 s -> 12 s; 11 damage, 2 hits max, can be retracted.
- Digital Footprint: survivor gets Slowness II (brief: 20% slow) and Corrupted I for 10 s.
- 404 Error: 6 s reveal (unchanged), but John is slowed and cannot sprint while casting.

**[assumed] values**: `passives.natural_malevolence.trailLifeSeconds` = 6; `passives.natural_malevolence.contactDamage` = 5; `passives.natural_malevolence.contactCooldown` = 1; `abilities.slash.halfAngle` = 40; `abilities.corrupt_energy.wallLengthStuds` = 36; `abilities.corrupt_energy.windup` = 0.3; `abilities.digital_footprint.stompSeconds` = 1.2; `abilities.digital_footprint.mutualRevealSeconds` = 6; `abilities.digital_footprint.radiusStuds` = 6; `abilities.error_404.windup` = 1; `abilities.error_404.selfMoveMul` = 0.3; `abilities.corrupt_energy.eruptSeconds` = 0.6; `abilities.corrupt_energy.spikeRadiusStuds` = 1.5; `abilities.corrupt_energy.rehitSeconds` = 0.5

**[undocumented] values** (player-observed on the wiki): `abilities.error_404.selfMoveMul` = 0.3; `abilities.corrupt_energy.activateDelay` = 0.045

**Bot behaviour**: Places shadow traps on chokepoints near active generators before engaging; Corrupt Energy walls across loops; 404 Error when it has no target.

### 1x1x1x1

Exploiter legend that poisons and glitches survivors, then raises them as zombies.

- Killer · Ranged / Attrition · difficulty 4/5
- HP 102550 · walk 8 · sprint 27 · stamina 110 (−9.5/s, +21/s) · terror radius 75 studs

**Abilities** (hotbar slot = FORSAKEN key order; slot 1 is the killer basic attack)

| Slot | Ability | Input | Cooldown | What it does |
|---|---|---|---|---|
| 1 | Slash | tap | 1.75 s | 20 damage + Glitched I and Poisoned I for 5 s. |
| 2 | Mass Infection | tap | 15 s | 1.7 s windup, then a shockwave (104 studs/s for 6 s): 30 damage (+10 vs Glitched). Up close: +25, Glitched II, Poisoned V; far: Glitched I + Poisoned I. Hit survivors revealed 12 s. |
| 3 | Entanglement | tap | 15 s | Thrown sword (125 studs/s, 1 s): 10 damage, aura 12 s, Helpless + Glitched II 6 s, Slowness X 1 s, pulls the survivor toward him (50% harder if Glitched). |
| 4 | Unstable Eye | tap | 25 s | 1.5 s startup, then all survivors revealed 8 s; Speed II 1.5 s and Blindness III 7 s on himself. |
| 5 | Rejuvenate the Rotten | tap | 30 s | Needs a charge (1 per kill, max 1). Raises killed survivors as zombies (25 HP): Poisoned I + Glitched I 8 s and aura 8 s on contact; 5 damage to Glitched survivors. |

**Changes from the brief (wiki wins)**

- HP: the brief assumed 2500 because '102,550' looked like a typo; the wiki confirms 102,550 (infobox, Statistics table and trivia; unchanged through 60+ edits after update 5.0.0). Data uses 102,550; set config.oneXOneHpOverride = 2500 for the brief's fallback.
- Terror radius 75 studs; walk 8 (Statistics table says 8.5).
- No passive any more: Slash itself applies Poison + Glitched.
- Mass Infection: 30 universal damage (+10 vs Glitched), close hits +25 with Glitched II / Poisoned V, far hits Glitched I / Poisoned I.
- Entanglement: Helpless + Glitched II 6 s, Slowness X 1 s, pull (+50% if Glitched).
- Unstable Eye: Speed II 1.5 s and Blindness III 7 s on himself; starts the round on a 12.5 s cooldown.
- Rejuvenate the Rotten: needs a kill charge; zombies have 25 HP and can only kill Glitched survivors.

**[assumed] values**: `abilities.slash.halfAngle` = 40; `abilities.mass_infection.waveHalfWidthStuds` = 20; `abilities.mass_infection.closeRangeStuds` = 15; `abilities.entanglement.pullBlocks` = 4; `abilities.rejuvenate_the_rotten.zombieSpeedStuds` = 14; `abilities.rejuvenate_the_rotten.hitCooldown` = 1.5; `abilities.rejuvenate_the_rotten.windup` = 3.5; `abilities.entanglement.radiusStuds` = 1.5; `abilities.rejuvenate_the_rotten.wanderStuds` = 20

**[undocumented] values** (player-observed on the wiki): `abilities.mass_infection.revealSeconds` = 12; `abilities.mass_infection.closeSpeedLevel` = 1

**Bot behaviour**: Keeps Poison/Glitch pressure with Slash and Mass Infection; Entanglement to pull runners; raises zombies as soon as it has a charge; Unstable Eye when it lost everyone.

### Noli

Void entity that dashes, implodes and fills survivors' heads with hallucinations.

- Killer · Rushdown / Deception · difficulty 5/5
- HP 2222 · walk 8 · sprint 27.5 · stamina 110 (−9.5/s, +21/s) · terror radius 100 studs

**Passives**

- **Hallucinations**: Abilities apply Hallucination (max III, 20 s). Noli sees hallucinating survivors. Level n gives n fakes; III spawns a Noli mirage whose hits are fake.
- **Prankster**: Fake generators spawn at unused spots. Finishing a puzzle on one adds a Hallucination stack; finishing it gives Hallucination III.

**Abilities** (hotbar slot = FORSAKEN key order; slot 1 is the killer basic attack)

| Slot | Ability | Input | Cooldown | What it does |
|---|---|---|---|---|
| 1 | Stab | tap | 1.8 s | Shadow stab: 25 damage. Removes all Hallucination stacks from the target. |
| 2 | Void Rush | charge | 20 s | Prepare 1 s, then rush for 3.5 s (press again to stop). Hit: 10 damage + Hallucination II, re-rush window. Hit on Hallucination II+: slam for 10 + 30 + 3.5 per re-rush. Survivors at 10 HP or less die. No stamina regen while rushing. |
| 3 | Nova | toggle | 12 s | Throws the Voidstar (0.7 s windup). On a survivor or wall it implodes: pulls nearby survivors in, 15 damage, decaying slow. Press again to detonate early (smaller). |
| 4 | Observant | tap | 30 s | Teleports to the generator closest to where he looks (not within 50 studs) after 1.45 s. Survivors further than 20/50/100 studs get Hallucination I/II/III; within 19 studs none. |

**Changes from the brief (wiki wins)**

- HP 2222 confirmed (raised from 1111 in 5.0.0). Terror radius 100 studs.
- Void Rush cooldown 20 s (brief assumed 18 s); starts the round at 10 s.
- Nova cooldown 12 s after detonation (brief assumed 20 s).
- Observant cooldown 30 s, starts the round at 25 s (brief assumed 25 s).
- Prankster: 2 fake generators (Objectives page); each finished puzzle on a fake adds a Hallucination stack, a full fake gives III.

**[assumed] values**: `passives.hallucinations.mirageSpeedStuds` = 22; `passives.hallucinations.mirageHitCooldown` = 1.5; `abilities.stab.halfAngle` = 35; `abilities.void_rush.rushStudsPerSecond` = 40; `abilities.void_rush.crashSlowLevel` = 5; `abilities.void_rush.turnRateDegPerTick` = 3; `abilities.void_rush.hitRadiusStuds` = 5; `abilities.nova.projectileStudsPerSecond` = 50; `abilities.nova.lifeSeconds` = 3; `abilities.nova.smallRadiusStuds` = 13; `abilities.nova.pullBlocks` = 3; `abilities.nova.slowLevel` = 3; `abilities.nova.slowSeconds` = 2; `abilities.observant.stunImmuneSeconds` = 2; `passives.hallucinations.mirageSpawnStuds` = 20; `passives.hallucinations.mirageHitExtendSeconds` = 2; `passives.hallucinations.fakeHeal` = 20; `passives.hallucinations.fakePizzaStuds` = 12; `passives.hallucinations.fakePizzaIntervalSeconds` = 8; `abilities.void_rush.prepareMoveMul` = 0.5

**[undocumented] values** (player-observed on the wiki): `abilities.void_rush.earlyTurnSeconds` = 1.12

**Bot behaviour**: Void Rush to open chases and slam hallucinating survivors; Nova at groups or walls near survivors; Observant to the busiest generator far away.

### Guest 666

Demonic guest that farms Blood from bleeding survivors until Blood Hunt.

- Killer · Burst / Snowball · difficulty 3/5
- HP 2750 · walk 9 · sprint 27 · stamina 110 (−9.5/s, +21/s) · terror radius 112.5 studs

**Passives**

- **Manic Fixation**: Up to +10% speed while running at (or within 30 studs of) a highlighted survivor; +15% if that survivor is not being chased.
- **Hellforged Will**: Negative statuses and stuns on Guest 666 last 25% less (50% during Blood Hunt).
- **Bloodhound**: Attacks apply Hemorrhage. Hemorrhaged survivors drop Blood Orbs (15 Blood, -3 s to all his cooldowns). Blood 0-200; kills +30 (+50 with Demonic Pursuit).
- **Sense of Fear**: His reveals apply Marked (red), which bypasses Undetectable.

**Abilities** (hotbar slot = FORSAKEN key order; slot 1 is the killer basic attack)

| Slot | Ability | Input | Cooldown | What it does |
|---|---|---|---|---|
| 1 | Carving Slash | tap | 2 s | 20 damage to every survivor in reach, +10 Blood per hit. |
| 2 | Demonic Pursuit | charge | 30 s | Charge (press again to leap). Pins a survivor for 5 slashes and a throw: 26/33/40 by charge, Hemorrhage, +20 Blood. Blood Hunt: +0.4 per unhealable HP. |
| 3 | Infernal Cry | tap | 20 s | Aimed roar: forces survivors to face him, Blindness II 4 s, Marked 12 s; Hemorrhaged ones drop 2 orbs. Blood Hunt: 10 damage, Speed I 3 s + Strength I 8 s for him. |
| 4 | Blood Rush / Blood Hunt | tap | 30 s | Blood Rush (4 s windup): marks every survivor for 5-20 s by distance. At full Blood it becomes Blood Hunt: 25 s, cooldowns reset, +4% speed, terror radius halved, survivors flash every 5 s, kills extend it 15 s; the clock cannot run out. |
| 5 | Eviscerate | tap | 8 s | Costs 10 Blood: lunging bite, 10 damage + Hemorrhage, +15 Blood and half cooldown on hit; Slowness I 2 s on a miss. |

**Changes from the brief (wiki wins)**

- HP 2750 (wiki table; the brief used 2500).
- Terror radius 112.5 studs (brief: 80); walk 9, sprint 27.
- Blood max 200 (grows +50 after each Blood Hunt); Blood Hunt triggers at full Blood (brief assumed max 100).
- Blood Hunt is no longer stun-immune; Hellforged Will goes to 50% instead.
- Eviscerate moved to hotbar slot 5 (it is a held extension of the basic attack in FORSAKEN).
- Infernal Cry and reveals apply Marked (red) which bypasses Undetectable.

**[assumed] values**: `passives.manic_fixation.rampSeconds` = 3; `passives.bloodhound.orbLifeSeconds` = 30; `passives.bloodhound.chaseRangeStuds` = 60; `abilities.carving_slash.halfAngle` = 45; `abilities.demonic_pursuit.maxChargeSeconds` = 2; `abilities.demonic_pursuit.leapStudsPerSecond` = [60, 75, 90]; `abilities.demonic_pursuit.leapSeconds` = 0.8; `abilities.demonic_pursuit.slashInterval` = 0.4; `abilities.demonic_pursuit.hitRadiusStuds` = 5; `abilities.infernal_cry.rangeStuds` = 60; `abilities.infernal_cry.halfAngle` = 35; `abilities.blood_rush.killExtendDecay` = 2; `abilities.eviscerate.halfAngle` = 35; `abilities.eviscerate.lungeStuds` = 8; `abilities.demonic_pursuit.chargeMoveMul` = 0.5; `abilities.demonic_pursuit.chargeInvisLevel` = 2; `abilities.blood_rush.flashRevealSeconds` = 1; `abilities.blood_rush.hemoFlashSeconds` = 2.5

**[undocumented] values** (player-observed on the wiki): `abilities.demonic_pursuit.throwStuds` = 20; `abilities.demonic_pursuit.endlagSeconds` = 3

**Bot behaviour**: Builds Blood with Carving Slash/Eviscerate, collects orbs, Infernal Cry at groups, Blood Rush to find survivors, Blood Hunt as soon as Blood is full.

### Nosferatu

Silent vampire with a chain hook, blood trails and a bat form.

- Killer · Ambush / Stealth / Zoner · difficulty 4/5
- HP 1750 · walk 7.5 · sprint 27.5 · stamina 110 (−9.5/s, +21/s) · terror radius 75 studs

**Passives**

- **Levitation**: Levitates: no footstep sounds.

**Abilities** (hotbar slot = FORSAKEN key order; slot 1 is the killer basic attack)

| Slot | Ability | Input | Cooldown | What it does |
|---|---|---|---|---|
| 1 | Lacerate / Dive | tap | 1.85 s | Claw slash, 24 damage. In bat form: Dive — bite 5 + toss 5-30 by dive time (max at 0.55 s); a miss costs 20 HP, Slowness III + Helpless 3 s. |
| 2 | Bloodhook | tap | 24 s | Chain hook (0.9 s windup, ~115 studs): 15 damage and grab. Close (<=24 studs): drag + kick for 3. Far: tug-of-war (spam jump); win = +25 damage. |
| 3 | Cataclysm | tap | 22 s | Invisible dash drawing a blood line, then snaps back and explodes (10 damage). Puddles (12 s) apply Bleeding II 5 s + Slowness I 6 s and highlight 6 s. |
| 4 | Hunter's Feast | toggle | 16 s | Bat orb (press again to redirect once, 3x faster). Hit: 5 damage, Oblivious + Creatures 10 s, highlight 10 s. Nosferatu gains Invisibility V + Undetectable 10 s (lost when he uses an ability). |
| 5 | Ascension | toggle | 32 s | Bat form up to 10 s: flight (jump to flap), ~2x speed, invincible, all survivors highlighted, smaller terror radius. Press again to dismount; any exit without a dive: Slowness III + Helpless 4 s. |

**Changes from the brief (wiki wins)**

- HP 1750 (brief used 1700). Terror radius 75 studs (brief assumed 60).
- Bloodhook cooldown 24 s (brief: 30 s, 20 s on miss); far pulls use a tug-of-war (jump spam) instead of Roblox's timed prompt.
- Cataclysm puddles: Bleeding II 5 s + Slowness I 6 s (brief: Slowness II).
- Hunter's Feast can be redirected once; self Invisibility V (brief: IV) + Undetectable 10 s.
- Ascension: invincible, highlights all survivors; Dive is its basic attack; exiting without a dive gives Slowness III + Helpless 4 s.

**[assumed] values**: `abilities.lacerate.halfAngle` = 40; `abilities.lacerate.diveStudsPerSecond` = 60; `abilities.lacerate.diveMaxSeconds` = 1.5; `abilities.lacerate.hitRadiusStuds` = 5; `abilities.bloodhook.projectileStudsPerSecond` = 150; `abilities.bloodhook.tugSeconds` = 3; `abilities.cataclysm.dashStudsPerSecond` = 45; `abilities.cataclysm.explosionRadiusStuds` = 14; `abilities.cataclysm.puddleRadiusStuds` = 3; `abilities.hunters_feast.projectileStudsPerSecond` = 35; `abilities.ascension.flapStrength` = 0.55; `abilities.ascension.hoverHeight` = 3; `abilities.ascension.terrorMul` = 0.5; `abilities.lacerate.pinSeconds` = 0.8; `abilities.lacerate.tossStuds` = 15; `abilities.lacerate.lingerStunImmuneSeconds` = 0.5; `abilities.bloodhook.dragStudsPerSecond` = 60; `abilities.bloodhook.kickStuds` = 8; `abilities.bloodhook.tugWindowSeconds` = 0.5; `abilities.bloodhook.lingerStunImmuneSeconds` = 0.5; `abilities.cataclysm.lingerStunImmuneSeconds` = 0.5

**[undocumented] values** (player-observed on the wiki): `abilities.ascension.speedMul` = 2.1

**Bot behaviour**: Hunter's Feast to approach unseen, Bloodhook at mid range, Cataclysm through loops, Ascension to close long gaps and dive.

### Daemon

ORIGINAL KILLER (not from FORSAKEN): a runaway background process with a blinking cursor for a face. **Original character for this addon.**

- Killer · Tracker / Area controller · difficulty 3/5
- HP 2000 · walk 9 · sprint 27.5 · stamina 110 (−9.5/s, +21/s) · terror radius 70 studs

**Passives**

- **Uptime**: Survivors Daemon damages are Flagged for 20 s: shown on his HUD within 40 blocks, and he moves 5% faster toward the nearest Flagged survivor.

**Abilities** (hotbar slot = FORSAKEN key order; slot 1 is the killer basic attack)

| Slot | Ability | Input | Cooldown | What it does |
|---|---|---|---|---|
| 1 | Ping | tap | 1.8 s | 22 damage and Flagged. |
| 2 | Fork | tap | 28 s | Spawns 2 decoy child processes that sprint in straight lines for 6 s. Touching a survivor: 10 damage + Flagged, then the decoy vanishes. Decoys carry Daemon's name tag. |
| 3 | Segfault | tap | 22 s | Ground slam, 8-block radius: 18 damage, Slowness II 3 s, Helpless I 2 s. |
| 4 | Kill -9 | tap | 60 s | Targets a Flagged survivor within 6 blocks at <= 35% HP: 1.2 s channel, then instant elimination. A stun cancels it (cooldown 20 s). |

**Changes from the brief (wiki wins)**

- Original design for this addon (brief §4.3); every number is [original design], balanced against the 2026 roster.

**[assumed] values**: `passives.uptime.towardHalfAngle` = 45

**Bot behaviour**: Flags everyone it can (Ping, Fork, Segfault) and saves Kill -9 for weak Flagged survivors.

## Survivors

### Noob

Classic noob with a cola, a stone-skin potion and a burger that makes him vanish.

- Survivalist · Evasion / self-buffs · difficulty 3/5
- HP 100 · walk 12 · sprint 26 · stamina 100 (−10/s, +20/s) · limps when hurt

**Abilities** (hotbar slot = FORSAKEN key order; slot 1 is the killer basic attack)

| Slot | Ability | Input | Cooldown | What it does |
|---|---|---|---|---|
| 2 | Bloxy Cola | tap | 50 s | Drink 2.5 s (-10% speed, no sprint): Speed I 10 s and removes Slowness. |
| 3 | Slateskin Potion | toggle | 46 s | Drink 1.5 s: Slateskin III for 6 s (120 overheal, -45% speed, many status immunities). Recast after 2.5 s to end early. Ends with Speed II 2 s (Speed I if cancelled). Cooldown starts after the effect. |
| 4 | Ghostburger | tap | 40 s | Eat 2 s (-20% speed, no sprint): Undetectable and Invisibility IV for 10 s. |

**Changes from the brief (wiki wins)**

- Bloxy Cola cooldown 50 s (brief assumed 45 s); Speed I 10 s.
- Slateskin Potion: Slateskin III (120 overheal) for 6 s, cooldown 46 s starting after the effect; the brief's '2 uses per round' and Slateskin II +80 are outdated.
- Ghostburger: Undetectable + Invisibility IV for 10 s, cooldown 40 s (brief: 55 s).

**[assumed] values**: `abilities.slateskin_potion.endSpeedSeconds` = 2; `abilities.slateskin_potion.hitPriority` = 2

**Bot behaviour**: Cola when chased with low stamina; Slateskin when below 50% HP and the killer is close; Ghostburger when cornered.

### 007n7

Exploiter turned survivor: clones, a teleport GUI and remote control of his decoys.

- Survivalist · Decoys / escape · difficulty 4/5
- HP 100 · walk 12 · sprint 26 · stamina 100 (−10/s, +20/s) · limps when hurt

**Passives**

- **DEX**: Always sees the furthest survivor spawn point.

**Abilities** (hotbar slot = FORSAKEN key order; slot 1 is the killer basic attack)

| Slot | Ability | Input | Cooldown | What it does |
|---|---|---|---|---|
| 2 | Clone | tap | 27 s | Spawns a clone (10 s, his current HP) that follows the Inject mode; 007n7 gets Invisibility IV + Undetectable for 5 s (and a hidden 3 s Helpless). |
| 3 | c00lgui | tap | 50 s | Channel 5.5 s at -85% speed, then teleport to the DEX spawn. Damage or starting a generator cancels it. |
| 4 | Inject | tap | 0 s — cycles the clone mode | Cycles the mode future clones use: Aimless (wander), Pathfind (walk to the DEX spawn), Cursor (run where he looks). |

**Changes from the brief (wiki wins)**

- Clone cooldown 27 s (brief: 40 s); 007n7 gets Invisibility IV + Undetectable 5 s (brief: ~4 s) and no self-Slowness.
- c00lgui: 5.5 s channel at -85% speed, cooldown 50 s (brief: 6 s standing still, 60 s).
- Inject has no cooldown (brief: 0.75 s).

**[assumed] values**: `abilities.c00lgui.lateWindowSeconds` = 0.5; `abilities.clone.cloneSpeedStuds` = 26; `abilities.clone.stackRadiusStuds` = 5

**[undocumented] values** (player-observed on the wiki): `abilities.clone.helplessSeconds` = 3

**Bot behaviour**: Clone when the killer is within ~10 blocks (Pathfind mode leads it away); c00lgui when idle and out of sight.

### Veeronica

TV-headed robot skater: sprays graffiti zones and skates through them; heals only from her battery.

- Survivalist · Mobility / self-sufficient · difficulty 3/5
- HP 100 · walk 12 · sprint 26 · stamina 100 (−10/s, +20/s) · limps when hurt

**Passives**

- **Metal Frame**: Cannot be healed by anything except her battery. Battery starts at 30%, +8% per generator puzzle; 100% = 50 HP (2% per HP).

**Abilities** (hotbar slot = FORSAKEN key order; slot 1 is the killer basic attack)

| Slot | Ability | Input | Cooldown | What it does |
|---|---|---|---|---|
| 2 | Vandalism | toggle | 0.7 s | Spray graffiti on a wall you face (5 s, stand still). Max 3; each makes a 12x30x12-stud zone only she sees. The killer can destroy graffiti (5 HP). |
| 3 | Sk8 | toggle | 0.5 s | Start inside a graffiti zone: skate at 1.15x sprint speed, 1.35x stamina drain, limited steering. Jump near a wall to Trick (+4 stamina, crash immunity). Crashing: 5 damage + Slowness IV 2.5 s. |
| 4 | Broadcast | tap | 0.5 s | Cycles the Sk8 collision mode: Phase (pass through the killer: Resistance II 3 s + Speed II 1.5 s, +15% battery), Bumper (knock the killer back, 5 damage, +15% battery, 20 s lockout), Mobile (better steering after tricks). |
| 5 | Activate Battery | toggle | 75 s | Heals 1 HP/s from the battery (2% per HP) until full, empty, or damaged. 1 s cooldown if used at full HP or 0%. |

**Changes from the brief (wiki wins)**

- HP 100 confirmed (brief: [assumed] 100).
- Battery: starts at 30%, +8% per generator puzzle, 50 HP at 100%; heals 1 HP/s.
- Activate Battery cooldown 75 s; Vandalism max 3 graffiti, 5 s spray.
- Broadcast modes per the wiki; Phase gives Resistance II 3 s + Speed II 1.5 s (brief: Resistance I + Speed IV).

**[assumed] values**: `abilities.sk8.turnRateDegPerTick` = 3; `abilities.broadcast.bumperKnockbackBlocks` = 4; `abilities.sk8.mobileTurnRateDegPerTick` = 7; `abilities.sk8.heavySlowMul` = 0.6

**[undocumented] values** (player-observed on the wiki): `passives.metal_frame.costPerHp` = 2; `abilities.broadcast.bumperDamage` = 5; `abilities.activate_battery.healPerSecond` = 1

**Bot behaviour**: Sprays graffiti near generators and loops; skates on graffiti when chased; uses the battery when safe and hurt.

### Guest 1337

Ex-soldier guest: blocks basic attacks, then parry-punches the killer into a stun.

- Sentinel · Parry / counter · difficulty 4/5
- HP 110 · walk 12 · sprint 26 · stamina 100 (−10/s, +20/s) · limps when hurt

**Passives**

- **Made to Last**: +10 max HP (included).
- **Self Sacrifice**: When survivors are stacked, Guest takes the hit (higher still while blocking).

**Abilities** (hotbar slot = FORSAKEN key order; slot 1 is the killer basic attack)

| Slot | Ability | Input | Cooldown | What it does |
|---|---|---|---|---|
| 2 | Block | tap | 27 s | Resistance V 1 s, -50% speed 1.75 s. Blocking a basic attack: +10 overheal (max 30), Speed I 2 s, Strength I 5 s, killer slowed 30% 1 s, Punch reset and Parry Punch ready. Blocking another ability breaks the block (-40% damage, Resistance II 3 s). |
| 3 | Charge | tap | 40 s | Shoulder dash 1.5 s (no stamina regen). Hit the killer: 5 damage, 6-11 stud knockback, Resistance III 0.5 s; 20 s per-killer lockout. Miss: Slowness II for 3-15 s by distance. |
| 4 | Punch | tap | 55 s | 0.6 s windup: 25 damage, Helpless + Slowness I 2 s, knockback. After a successful Block it becomes Parry Punch: 35 damage (42 with Strength), 2 s stun. |

**Changes from the brief (wiki wins)**

- Revamped in update 4.1.6 (May 2026) and tuned again by 5.0.0: HP 110 (Made to Last +10, brief: +15 / 115).
- Block only fully blocks basic attacks; success grants overheal, Strength I and a Parry Punch (brief: Resistance V + Slowness IV 2 s, Punch charges).
- Charge: 5 damage + knockback, 20 s per-killer lockout (brief: 15 HP on chained charges).
- Regular Punch no longer stuns; Parry Punch stuns 2 s. Punch has a 55 s cooldown (brief: charge-based).

**[assumed] values**: `abilities.block.parryWindowSeconds` = 3; `abilities.charge.studsPerSecond` = 32; `abilities.charge.hitRadiusStuds` = 4; `abilities.punch.rangeStuds` = 7; `abilities.punch.halfAngle` = 45; `abilities.charge.turnRateDegPerTick` = 2

**[undocumented] values** (player-observed on the wiki): `abilities.block.strengthLevel` = 1; `abilities.block.failLockSeconds` = 2; `abilities.charge.lockoutSeconds` = 20; `abilities.charge.missMax` = 15

**Bot behaviour**: Blocks when the killer winds up a basic attack nearby (with reaction delay), Parry Punch right after, Charge to peel the killer off allies.

### Shedletsky

Former Roblox admin with a sword stun and fried chicken heals.

- Sentinel · Burst stun · difficulty 2/5
- HP 100 · walk 12 · sprint 26 · stamina 100 (−10/s, +20/s) · limps when hurt

**Abilities** (hotbar slot = FORSAKEN key order; slot 1 is the killer basic attack)

| Slot | Ability | Input | Cooldown | What it does |
|---|---|---|---|---|
| 2 | Slash | tap | 40 s | 0.55 s windup with Resistance II, then a sword arc: 30 damage and a 3 s stun. Slowed 75% for 1.4 s. |
| 3 | Fried Chicken | tap | 70 s | 2 per round: heal 5 now + 25 over 10 s; slowed 75% for 3 s. Not at full HP; 5+ damage cancels the healing. |

**Changes from the brief (wiki wins)**

- Slash cooldown 40 s (brief: 4 s), 30 damage + 3 s stun with Resistance II during the windup.
- Fried Chicken heals 5 + 25 over 10 s (brief: +35).

**[assumed] values**: `abilities.slash.halfAngle` = 50

**[undocumented] values** (player-observed on the wiki): `abilities.slash.rangeStuds` = 6; `abilities.fried_chicken.cancelDamage` = 5

**Bot behaviour**: Slashes the killer when close and facing him; eats chicken when safe below 65% HP.

### Chance

Gambler: coin flips build charges for a revolver that might stun the killer — or explode.

- Sentinel · Gamble · difficulty 4/5
- HP 80 · walk 12 · sprint 26 · stamina 100 (−10/s, +20/s) · limps when hurt

**Passives**

- **Unpredictable Fate**: Max HP is random between 70 and 90 each round.

**Abilities** (hotbar slot = FORSAKEN key order; slot 1 is the killer basic attack)

| Slot | Ability | Input | Cooldown | What it does |
|---|---|---|---|---|
| 2 | Coin Flip | tap | 1.75 s | Heads: +1 charge to every other ability (max 3). Tails: +1 Vulnerable tier for 15 s. Each tails in a row adds +2.5% heads chance. |
| 3 | One Shot | tap | 45 s | 1 s windup. Success (50/70/90% at 1/2/3 charges): 50 damage, stun 1-4 s by distance (90 studs). Misfire: nothing. Explosion: 25 self-damage, gun breaks until Hat Fix, nearby killer stunned 5 s. Uses all charges. |
| 4 | Reroll | tap | 20 s | New max HP = random 55-120 x (1 + 0/5/10% at 1/2/3 charges), cap 130; keeps the HP percentage. Uses all charges. |
| 5 | Hat Fix | tap | 60 s | Needs 3 charges: resets Vulnerable, repairs a broken One Shot. Uses all charges. |

**Changes from the brief (wiki wins)**

- Role: Sentinel only (wiki character page: 'a Sentinel Survivor'); the brief listed a Sentinel vs Survivalist conflict.
- There are no dice: the kit is Coin Flip / One Shot / Reroll / Hat Fix with shared charges (brief: d4 roll).
- Max HP random 70-90 at round start; Reroll 55-120 (+bonus), cap 130; stamina is fixed at 100.
- Tails gives Vulnerable (+20% damage taken per tier), not Weakness.
- One Shot at 0 charges is not described by the wiki: 30% success / 35% misfire / 35% explosion [assumed] (extrapolated from the +20%/-10% per charge rule).

**[assumed] values**: `abilities.one_shot.successChance` = [0.3, 0.5, 0.7, 0.9]; `abilities.one_shot.explodeChance` = [0.35, 0.25, 0.15, 0.05]; `abilities.coin_flip.headsChance` = 0.5; `abilities.one_shot.aimHalfAngle` = 25

**[undocumented] values** (player-observed on the wiki): `abilities.one_shot.knockbackStuds` = 5

**Bot behaviour**: Flips coins while abilities are on cooldown, fires One Shot when the killer is in range with 2+ charges, Hat Fix when Vulnerable is high or the gun broke.

### Two Time

Cultist with a sacrificial dagger who can come back once from a ritual circle.

- Sentinel / Survivalist · Backstabs / second life · difficulty 4/5
- HP 80 · walk 12 · sprint 26 · stamina 100 (−10/s, +20/s) · limps when hurt

**Passives**

- **Oblation**: Damaging the killer fills Oblation (front stab +20%, backstab +40%). With a full meter and a Ritual placed, a lethal hit starts a second life at the Ritual: 50 HP, +40% stamina, cleared statuses, 2 s invincible, Speed II 6 s, Vulnerable V 12 s.

**Abilities** (hotbar slot = FORSAKEN key order; slot 1 is the killer basic attack)

| Slot | Ability | Input | Cooldown | What it does |
|---|---|---|---|---|
| 2 | Sacrificial Dagger | tap | 30 s | 0.25 s windup, Resistance I 0.7 s. Front: 10 damage + Slowness II + Helpless 1 s. Backstab: 20 damage + 2 s stun. While crouched: 22-stud lunge, backstab stun 3.5 s. |
| 3 | Crouch | toggle | 35 s | Up to 15 s: Undetectable + Invisibility III, walk 10 / run 20, building up to +40% running at the killer over 4 s. Leaving within 30 studs of the killer gives Speed II 1 s. |
| 4 | Pray | toggle | none — needs a Ritual | Kneel at your Ritual and turn Oblation into HP (1 HP per 2%). |
| 5 | Ritual | tap | once per round | 4 s windup: carves your respawn point. Required for the second life. In LMS the second life triggers in place even without a full meter. |

**Changes from the brief (wiki wins)**

- Current kit (wiki, July 2026 rework): Oblation, Sacrificial Dagger, Crouch, Pray, Ritual. The brief's default 'Oblation' version is kept and updated: second life 50 HP (brief: 40), backstab stuns, Pray added.
- 'Undying Devotion' is the oldest (2025) kit; still available via config.twoTimeVariant = "undying_devotion" (40 HP revive, Speed II 6 s, 1.5 s invincible, Vulnerable V 12 s).
- Dagger damage 10 front / 20 back (brief: 25).

**[assumed] values**: `passives.oblation.crouchBackFill` = 60; `abilities.sacrificial_dagger.halfAngle` = 45; `abilities.pray.percentPerSecond` = 20; `abilities.pray.rangeStuds` = 10; `abilities.sacrificial_dagger.crouchLungeSeconds` = 0.35; `abilities.sacrificial_dagger.crouchEndlagSeconds` = 0.5; `abilities.crouch.rampHalfAngle` = 60

**[undocumented] values** (player-observed on the wiki): `abilities.sacrificial_dagger.rangeStuds` = 6; `abilities.crouch.walk` = 10; `abilities.crouch.sprint` = 20; `abilities.ritual.windup` = 4

**Bot behaviour**: Places the Ritual early near the spawn side, crouches to approach, backstabs when the killer is turned away, prays when safe.

### Jane Doe

Crystal-throwing sentinel who marks the killer with Resonance, then stuns with her hatchet.

- Sentinel / Support · Resonance stuns · difficulty 3/5
- HP 60 · walk 12 · sprint 26 · stamina 100 (−10/s, +20/s) · limps when hurt

**Passives**

- **Digital Footprint**: Sees the killer's footprints: red, then yellow, then gone.
- **Shatterpoint**: Extra 20-30 HP pool that takes 40% less damage. Only her landed abilities restore it. At 0 it is locked for 40 s, then returns with 5.

**Abilities** (hotbar slot = FORSAKEN key order; slot 1 is the killer basic attack)

| Slot | Ability | Input | Cooldown | What it does |
|---|---|---|---|---|
| 2 | Crystal Pitch | charge | 16 s | Charge up to 2 s (-30% speed), throw an arcing crystal that explodes. Survivor: Purified I 3 s, +2 SHP. Killer: +1 Resonance (II from 110+ studs), +3 SHP, but Jane is revealed 3 s. |
| 3 | Hatchet | tap | 35 s | 0.75 s windup, lunge, 25 damage (10 vs John Doe). No Resonance: Helpless I + Slowness II 2 s, +5 SHP. Resonance I/II/III: stun 2.5/3.5/4.5 s, +10/20/30 SHP; consumes Resonance. |

**Changes from the brief (wiki wins)**

- Shatterpoint returns with 5 SHP after the 40 s lockout (wiki undocumented).
- Resonance lasts 30 s (not stated in the brief).
- Hatchet: 10 damage against John Doe.

**[assumed] values**: `passives.digital_footprint.lifeSeconds` = 6; `passives.digital_footprint.everySeconds` = 0.5; `abilities.crystal_pitch.minStudsPerSecond` = 40; `abilities.crystal_pitch.maxStudsPerSecond` = 90; `abilities.crystal_pitch.minRadiusStuds` = 5; `abilities.crystal_pitch.maxRadiusStuds` = 10; `abilities.crystal_pitch.gravity` = 0.02; `abilities.crystal_pitch.launchPitchDegrees` = 12; `abilities.hatchet.lungeStuds` = 12; `abilities.hatchet.halfAngle` = 45; `abilities.hatchet.lungeSeconds` = 0.3

**[undocumented] values** (player-observed on the wiki): `passives.shatterpoint.recoverAmount` = 5

**Bot behaviour**: Pitches crystals at the killer from range to build Resonance, Hatchet when Resonance >= 1, pitches at hurt allies for Purified.

### Elliot

Pizza delivery boy: throws healing pizzas and rushes allies out of danger.

- Support · Healer · difficulty 2/5
- HP 80 · walk 12 · sprint 26 · stamina 100 (−10/s, +20/s) · limps when hurt

**Passives**

- **Order Up!**: Each repaired generator adds +2 pizza healing (max +10).
- **Deliverer's Resolve**: Sees the aura of any survivor who takes damage for 12 s.

**Abilities** (hotbar slot = FORSAKEN key order; slot 1 is the killer basic attack)

| Slot | Ability | Input | Cooldown | What it does |
|---|---|---|---|---|
| 2 | Pizza Throw | tap | 30 s | Throws a pizza: whoever picks it up heals 5 + 15 over time (+2 per generator). Lasts 15 s; Elliot cannot eat his own. Not for Veeronica. |
| 3 | Rush Hour | tap | 30 s | Charges from healing others (start 1, max 3). Near the killer (85 studs): spends all for Speed (level = charges) 4 s; 2+ charges also give Exhausted II 4 s after. |

**Changes from the brief (wiki wins)**

- HP 80 (brief: [assumed] 100).
- Pizza heals 5 + 15 over time, +2 per generator up to +10 (brief: 35 HP, +5% per task); cooldown 30 s (brief: 45 s); lasts 15 s.
- Rush Hour is a charge-based speed burst near the killer (brief: speed charge from eating pizza).

**[assumed] values**: `abilities.pizza_throw.hotSeconds` = 5; `abilities.pizza_throw.throwStuds` = 30

**[undocumented] values** (player-observed on the wiki): `abilities.pizza_throw.cancelDamage` = 5

**Bot behaviour**: Throws pizza at any ally below 60% HP in range; Rush Hour when chased with charges.

### Builderman

Roblox's builder: a slowing sentry and a healing dispenser he can carry around.

- Support · Constructs · difficulty 3/5
- HP 90 · walk 12 · sprint 26 · stamina 100 (−10/s, +20/s) · limps when hurt

**Abilities** (hotbar slot = FORSAKEN key order; slot 1 is the killer basic attack)

| Slot | Ability | Input | Cooldown | What it does |
|---|---|---|---|---|
| 2 | Sentry | tap | 45 s | Build for 6 s (damage cancels). 30 HP turret shooting the killer within 65 studs: Slowness II 1 s, Bleeding II 2 s and ~0.65 damage per shot. One per Builderman. |
| 3 | Dispenser | tap | 45 s | Build for 6 s. 15 HP; heals survivors within 16 studs by 1 HP/s. One per Builderman. |
| 4 | Carry / Place | toggle | 0 s | Pick up a nearby building (inactive while carried, -10% speed, no sprint; 10+ damage destroys it). Press again to place it. |

**Changes from the brief (wiki wins)**

- One Sentry and one Dispenser per Builderman (brief: up to 9 sentries / 14 dispensers).
- Sentry: Slowness II 1 s per shot (brief: Slowness 2 s), 30 HP, 65-stud range; Dispenser heals 1 HP/s in 16 studs (brief: 0.9 HP/s).
- New third ability Carry / Place.

**[assumed] values**: `abilities.carry.pickupStuds` = 10; `abilities.carry.reactivateSeconds` = 1; `abilities.sentry.placeStuds` = 4; `abilities.dispenser.placeStuds` = 4

**[undocumented] values** (player-observed on the wiki): `abilities.sentry.bleedLevel` = 2; `abilities.sentry.damage` = 0.65

**Bot behaviour**: Builds the Sentry at a chokepoint near the generator he works on, the Dispenser near hurt allies.

### Dusekkar

Staff-wielding mage who shields allies through walls and zaps the killer.

- Support · Protection · difficulty 5/5
- HP 90 · walk 12 · sprint 26 · stamina 100 (−10/s, +20/s) · limps when hurt

**Passives**

- **Levitation**: No footstep sounds; unaffected by John Doe's trail.

**Abilities** (hotbar slot = FORSAKEN key order; slot 1 is the killer basic attack)

| Slot | Ability | Input | Cooldown | What it does |
|---|---|---|---|---|
| 2 | Spawn Protection | charge | 35 s | Channel a shield on the ally you look at (95 studs, through walls) for up to 3.5 s: Resistance IV and one lethal hit nullified. Dusekkar is slowed 30%. Same ally only every 30 s. |
| 3 | Plasma Beam | tap | 28 s | 2 s windup (-25% speed), then a 75-stud beam through walls. Killer: Slowness I 4 s. One survivor: Speed I 3 s + 25 overheal (decays). |

**Changes from the brief (wiki wins)**

- Spawn Protection: Resistance IV for up to 3.5 s (brief: 8 s) and it nullifies one lethal hit.
- Plasma Beam: Slowness I 4 s on the killer (brief: Slowness II 3 s); survivors get Speed I 3 s + 25 overheal (wiki page; Statistics says 30). Cooldown 28 s (brief: 20 s).

**[assumed] values**: `abilities.spawn_protection.aimHalfAngle` = 20; `abilities.plasma_beam.beamRadius` = 2

**Bot behaviour**: Spawn Protection on a chased ally in view; Plasma Beam on the killer during chases.

### Taph

Trap-maker with alarm tripwires and a reality-bending Subspace Tripmine.

- Support · Traps · difficulty 2/5
- HP 100 · walk 12 · sprint 26 · stamina 100 (−10/s, +20/s) · limps when hurt

**Abilities** (hotbar slot = FORSAKEN key order; slot 1 is the killer basic attack)

| Slot | Ability | Input | Cooldown | What it does |
|---|---|---|---|---|
| 2 | Tripwire | tap | 25 s | Place a wire (max 3, arms in 1.5 s, 10 HP). The killer crossing it is revealed to all survivors for 8 s and gets Slowness II 4 s. |
| 3 | Subspace Tripmine | tap | 40 s | Throw a near-invisible mine. A killer within 19 studs sets it off 0.5 s later: Helpless I 3 s, Subspaced III 6 s, Weakness V 6 s. Attacked first: only Subspaced I. Self-destructs after 50 s; -10 s cooldown when it hits. |

**Changes from the brief (wiki wins)**

- Tripwire gives Slowness II 4 s and reveals the killer to all survivors 8 s; it never expires (fades over 150 s) — brief said ~80 s.
- Subspace Tripmine: trigger range 19 studs (brief 16), Helpless I 3 s (brief 5 s) + Subspaced III + Weakness V 6 s; self-detonates after 50 s (brief 35 s).

**[assumed] values**: `abilities.subspace_tripmine.throwStuds` = 12; `abilities.subspace_tripmine.blastStuds` = 19; `abilities.tripwire.placeStuds` = 4

**Bot behaviour**: Tripwires on approach routes to the generator he works on, mines near occupied generators.
