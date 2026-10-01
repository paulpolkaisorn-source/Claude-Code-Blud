# Chance: manual in-game checks

Setup: `/scriptevent forsaken:quickstart survivor chance`. Hotbar: 2 = Coin Flip, 3 = One Shot, 4 = Reroll, 5 = Hat Fix. The Coin Flip slot shows your charges and heads chance (e.g. `x1 H52.5%`).

## Unpredictable Fate (passive)
- [ ] Start several rounds. Max HP is different each time, always between 70 and 90, and you start at full HP.

## Coin Flip (slot 2)
- [ ] Press it. A bell sound plays and "HEADS" or "TAILS" flashes. Cooldown is 1.75 s.
- [ ] Heads: charges go up by 1 (shown on slots 2-5), up to 3.
- [ ] Tails: VULN I on the HUD for 15 s. Another tails raises it to II and refreshes the 15 s.
- [ ] Each tails in a row raises the heads chance shown on the slot by 2.5%. Heads resets it to 50%.
- [ ] Let Vulnerable run out, then flip tails again. It comes back one tier higher, not at I.
- [ ] Take a killer hit with Vulnerable II. You lose 40% more HP than usual.

## One Shot (slot 3)
- [ ] Press it. A 1 s windup, then one of three outcomes. All charges are spent, and the cooldown is 45 s.
- [ ] Success, killer close and in front: 50 damage, about a 4 s stun, and a small knockback.
- [ ] Success, killer about 80 studs away: about a 1-1.5 s stun.
- [ ] Success with the killer behind you or out of range: a tracer and "no target".
- [ ] Misfire: a click and smoke. Nothing else happens.
- [ ] Explosion: you lose 25 HP, the slot shows BROKEN, and a killer right next to you is stunned 5 s.
- [ ] With the gun broken, pressing slot 3 is refused ("gun broken").
- [ ] With 3 charges, success happens about 9 times in 10.
- [ ] Get stunned during the windup. Nothing fires.

## Reroll (slot 4)
- [ ] At half HP, press it. Max HP changes (55-120, up to +10% with 3 charges, never above 130) and you stay at about half HP.
- [ ] Charges are spent. Cooldown is 20 s.

## Hat Fix (slot 5)
- [ ] With fewer than 3 charges, it is refused ("needs 3 charges").
- [ ] With 3 charges, Vulnerable disappears, a broken gun is repaired, and charges go to 0. Cooldown is 60 s.
- [ ] The next tails after Hat Fix gives Vulnerable I again.
