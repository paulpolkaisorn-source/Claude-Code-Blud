# Elliot: manual in-game checks

Setup: play as Elliot against any bot killer. Hotbar: 2 = Pizza Throw, 3 = Rush Hour.

## Pizza Throw (slot 2)
- [ ] Press: a pizza lands about 5 blocks in front of you and stays for 15 s.
- [ ] You can't pick up your own pizza.
- [ ] A hurt bot survivor walks over and picks it up: it heals 5 at once and 15 more over 5 s.
- [ ] Survivors near the pizza (about 70 blocks) see heart particles above it.
- [ ] Each repaired generator (by anyone) adds 2 to the over-time healing (max +10): after 2 generators a pizza heals 5 + 19.
- [ ] Taking 5 or more damage while healing cancels the rest.
- [ ] Veeronica can't be healed by it.
- [ ] Cooldown 30 s.

## Rush Hour (slot 3)
- [ ] You start with 1 charge (HUD shows `x1`, plus `NEAR` when the killer is within about 30 blocks). Each pizza another survivor eats adds a charge (max 3).
- [ ] Far from the killer: pressing gives Speed I for 4 s and keeps your charges.
- [ ] Near the killer: all charges are spent for Speed equal to the number of charges, for 4 s (no extra on-hit speed meanwhile).
- [ ] With 2 or more charges you also get Exhausted II for 4 s after the speed ends.

## Order Up! (passive)
- [ ] After any generator is finished, a new pizza heals 2 more over time than before (up to +10).

## Deliverer's Resolve (passive)
- [ ] When another survivor takes damage, you see their aura (label through walls) for 12 s.

## Bot Elliot (play as the killer)
- [ ] It throws pizzas to hurt survivors near it and uses Rush Hour while you chase it.
