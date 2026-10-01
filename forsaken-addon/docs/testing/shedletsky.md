# Shedletsky: manual in-game checks

Setup: play as Shedletsky against a bot killer. Hotbar: 2 = Slash, 3 = Fried Chicken.

## Slash (slot 2)
- [ ] Press it. A 0.55 s windup with RES (II): hits during the windup do 40% less damage.
- [ ] You are slowed 75% for 1.4 s.
- [ ] A killer in front within ~2.6 blocks (about a 100° arc) takes 30 damage and is stunned 3 s (3.6 s with recovery).
- [ ] The hitbox stays for 0.4 s after the swing. A killer stepping in right then is still hit, but only once.
- [ ] A stun during the windup cancels the swing.
- [ ] An invincible killer (e.g. ENRAGED Slasher) takes nothing and is not stunned.
- [ ] Killer-side objects in the arc (traps/minion objects) take 30 damage.
- [ ] Cooldown is 40 s.

## Fried Chicken (slot 3)
- [ ] At full HP it is refused ("full HP").
- [ ] When hurt: +5 HP at once, then 25 more over 10 s. You are slowed 75% for 3 s.
- [ ] The slot shows the charges left (x2 → x1 → x0). Cooldown is 70 s.
- [ ] After two uses it is refused for the rest of the round ("no chicken left").
- [ ] A hit of 5+ damage stops the healing over time. Smaller hits do not.
