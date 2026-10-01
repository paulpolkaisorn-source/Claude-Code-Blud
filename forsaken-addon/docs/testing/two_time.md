# Two Time: manual in-game checks

Setup: `/scriptevent forsaken:quickstart survivor two_time`. Hotbar: 2 = Sacrificial Dagger, 3 = Crouch, 4 = Pray, 5 = Ritual. The Pray slot shows the Oblation meter (%). The default kit is `twoTimeVariant: "oblation"` in data/config.json.

## Sacrificial Dagger (slot 2)
- [ ] Stab the killer from the front (within about 6 studs). After 0.25 s: 10 damage, the killer is slowed (Slowness II) and cannot use abilities for 1 s. Oblation +20%.
- [ ] Stab the killer in the back. 20 damage and a 2 s stun. Oblation +40%.
- [ ] You have RES I for 0.7 s and cannot sprint during the stab. Cooldown is 30 s.
- [ ] While crouched, press it from about 6-7 blocks behind the killer. You lunge forward (about 22 studs) and the backstab stuns 3.5 s. Oblation +60%. Crouch ends, and you are rooted briefly after the lunge.
- [ ] Stab the killer while it is stun-immune (just after a stun) or ENRAGED. No Oblation.

## Crouch (slot 3, toggle)
- [ ] Press it. UNDET and INVIS III show on the HUD, you are nearly invisible, and you walk 10 / run 20.
- [ ] Teammates within 100 studs see your outline. The killer's aura reads do not show you.
- [ ] Sprint straight at the killer for 4 s. You get steadily faster (up to +40%). Turning away or getting hit resets the boost.
- [ ] Press again within 30 studs of the killer. Crouch ends and you get Speed II for 1 s.
- [ ] Press again far from the killer. No Speed.
- [ ] Wait 15 s. Crouch ends by itself.
- [ ] The 35 s cooldown starts only when Crouch ends.

## Ritual (slot 5)
- [ ] Press it. You are rooted for 4 s, then a ritual circle appears at your feet. Its particles get denser as Oblation rises.
- [ ] Press it again. It is refused ("once per round").
- [ ] Get stunned during the 4 s. No Ritual, and you can try again.

## Pray (slot 4, toggle)
- [ ] Without a Ritual, it is refused ("needs a Ritual").
- [ ] Far from your Ritual, press it. A line and a particle column show where the Ritual is for 4 s.
- [ ] Standing at the Ritual, hurt, with Oblation: press it. You are rooted and gain 10 HP per second while the meter drains (2% per HP).
- [ ] It stops on its own at full HP or empty Oblation, when you take damage, or when you press again.

## Oblation (passive): second life
- [ ] Fill Oblation to 100% and place a Ritual. Take a lethal hit. You reappear at the Ritual with 50/50 HP, statuses cleared, +40 stamina, Speed II 6 s, Vulnerable V 12 s, and 2 s invincibility. The Ritual is gone, and the clock gains 20 s.
- [ ] Die again. This time you are eliminated (the clock gains only 20 s).
- [ ] With less than 100% Oblation, or without a Ritual (outside LMS), a lethal hit kills you.
- [ ] In Last Man Standing with a Ritual, a lethal hit revives you in place with max HP 110 and 50 HP, with no Vulnerable, even with an empty meter. The Ritual is destroyed.

## Undying Devotion variant
- [ ] Set `"twoTimeVariant": "undying_devotion"` in data/config.json and rebuild. Every ability slot is refused ("Undying Devotion variant").
- [ ] Take a lethal hit. You revive once in place with 40 HP, cleansed, +40 stamina, Speed II 6 s, 1.5 s invincibility and Vulnerable V 12 s. In LMS: max HP 110 and 50 HP.
