# Builderman: manual in-game checks

Setup: `/scriptevent forsaken:quickstart survivor builderman`. Hotbar: 2 = Sentry, 3 = Dispenser, 4 = Carry / Place.

## Sentry (slot 2)
- [ ] Press it, facing open floor. You hammer for 6 s (no sprint), then a Sentry appears about 4 studs in front. Cooldown is 45 s, starting when it is built.
- [ ] Walk away or take damage during the 6 s. The build is cancelled with no cooldown.
- [ ] Facing a wall at point-blank, it is refused ("no room in front").
- [ ] The killer within 65 studs and in sight: one shot per second (particle line). Each shot gives Slowness II 1 s, Bleeding II 2 s and about 0.65 damage.
- [ ] It keeps working on ENRAGED Slasher.
- [ ] Stand between the Sentry and the killer. Your body blocks the shots.
- [ ] It does not shoot through walls or beyond 65 studs.
- [ ] Build a second Sentry. The first one disappears.
- [ ] Try building a Dispenser near your Sentry. It is refused ("too close to a Sentry (125 studs)").
- [ ] The killer can destroy it (30 HP, two Slasher slashes).

## Dispenser (slot 3)
- [ ] Build it (6 s, same rules). Hurt survivors within 16 studs (including you) heal 1 HP/s, with a heart ring every 2 s.
- [ ] A survivor using Ghostburger or Crouch (Undetectable) is not healed.
- [ ] 15 HP: one Slasher slash (20) destroys it.
- [ ] No other building may be within 60 studs of it.

## Carry / Place (slot 4, toggle)
- [ ] Next to your building (within 10 studs), press it. The building rides on your head and stops working. You are 10% slower and cannot sprint.
- [ ] Nothing nearby: refused ("no building nearby").
- [ ] Take a 10+ damage hit while carrying. The building is destroyed.
- [ ] Press again. It is set down in front of you and starts working after 1 s. The spacing rules apply here too.
- [ ] While carrying, Sentry and Dispenser are refused ("carrying a building").
