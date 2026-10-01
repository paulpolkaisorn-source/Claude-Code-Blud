# Veeronica: manual in-game checks

Setup: play as Veeronica against a bot killer. Hotbar: 2 = Vandalism, 3 = Sk8, 4 = Broadcast, 5 = Activate Battery. The battery % shows in the slot 5 suffix.

## Metal Frame (passive)
- [ ] The battery starts at 30%.
- [ ] Each generator layer you finish adds +8%. Others' layers and fake (Noli) generators add nothing.
- [ ] Elliot's pizza, a Medkit, a Builderman dispenser and other survivors' regeneration heal nothing.
- [ ] Overheal shields from others still work.

## Activate Battery (slot 5, toggle)
- [ ] At full HP, or at 0%, pressing does nothing and the cooldown is only 1 s.
- [ ] When hurt: you heal 1 HP per second and the battery drops 2% per HP. The slot shows ACTIVE.
- [ ] It stops at full HP, at 0% (a last 1% still heals 1 HP), on any HP damage (including Bleeding/Burning ticks), or when you press it again. A 75 s cooldown follows.
- [ ] A hit absorbed entirely by overheal does not stop it.
- [ ] Completing a generator layer while it runs does not recharge the battery.

## Vandalism (slot 2, toggle)
- [ ] Face a wall within ~2.5 blocks, roughly head-on, and press. A 5 s "Spraying" bar appears.
- [ ] Moving cancels the spray. Pressing again also cancels it.
- [ ] A graffiti prop appears on the wall when the spray finishes.
- [ ] Every second you see a particle rectangle (~4.3 × 4.3 blocks) around each graffiti. A second client does not see it.
- [ ] Not facing a wall, too far away, or at a steep angle: refused with "face a wall".
- [ ] A spot within ~2.5 blocks of another of your graffiti that you can see: refused with "too close to graffiti". The other side of a wall is allowed.
- [ ] Press while standing next to your own graffiti. It is erased in 0.5 s, with no lockout.
- [ ] Spray a 4th. The oldest one disappears.
- [ ] Have the killer hit a graffiti (5 HP). It breaks, any of your graffiti within ~1.6 blocks break too, and Vandalism goes on a 10 s cooldown.

## Sk8 (slot 3, toggle)
- [ ] Outside a zone, pressing is refused with "not in a graffiti zone". Inside, the slot shows ZONE.
- [ ] Press inside a zone. You skate in the camera direction, faster than sprinting (1.15×).
- [ ] Turning is slow (camera steering).
- [ ] Stamina drains about 13.5/s, and Sk8 ends at 0 with no exhaustion.
- [ ] Skating into a wall costs 5 HP (overheal absorbs it), gives Slowness IV for 2.5 s, and ends Sk8. You cannot restart while that slow lasts.
- [ ] Press Jump with a wall ahead (within ~4.7 blocks) or beside you (~1 block). You hop, gain +4 stamina, move faster in the air for ~1 s, and bounce off a wall instead of crashing for 0.75 s.
- [ ] A Jump with no wall nearby shows red particles and still uses the 1 s trick cooldown.
- [ ] Three tricks in a row add +5% battery.
- [ ] You glow (sparks only you see) while a trick is available.
- [ ] Starting Sk8 shows the zone outline to you and to the killer for 2 s.
- [ ] Press again to stop. A 5 s cooldown follows. Stopping works while Helpless.
- [ ] A stun, or a heavy slow (net Slowness IV or worse, freezes), ends it.

## Broadcast (slot 4)
- [ ] Each press cycles Phase → Bumper → Mobile, and the slot shows the mode. It is refused while skating.
- [ ] Phase: skate into the killer. You pass through and get Resistance II 3 s + Speed II 1.5 s (skating speeds up). Battery +15% once per Sk8.
- [ ] Bumper: skate into the killer. The killer is knocked back and takes 5 damage, you get +15% battery, and Sk8 ends with no self damage. The slot shows the 20 s lockout. Bumping again during the lockout is a normal crash.
- [ ] Mobile: after a trick, turning is much sharper for 2 s. Skating into the killer is a normal crash unless you are trick-immune.
