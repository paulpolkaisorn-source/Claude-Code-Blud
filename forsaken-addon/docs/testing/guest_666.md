# Guest 666: manual in-game checks

Setup: play as Guest 666 against 2–3 bot survivors. Hotbar: 1 = Carving Slash, 2 = Demonic Pursuit, 3 = Infernal Cry, 4 = Blood Rush / Blood Hunt, 5 = Eviscerate. The Blood Rush slot shows `Blood x/200`.

## Bloodhound (passive)
- [ ] Blood starts at 0/200.
- [ ] Any damage you deal gives the survivor Hemorrhage, and their max HP shrinks over time.
- [ ] A Hemorrhaged survivor drops Blood Orbs: one per 10 s sprinting outside a chase, one per 35 s walking in a chase, one per 25 s sprinting in a chase.
- [ ] Walking over an orb gives +15 Blood, takes 3 s off every running cooldown, and plays a pickup sound. Orbs vanish after 30 s.
- [ ] A kill gives +30 Blood, or +50 if Demonic Pursuit killed.

## Sense of Fear (passive)
- [ ] Your reveals are red and also put Marked on the survivor. An Undetectable survivor still shows.

## Hellforged Will (passive)
- [ ] Enemy debuffs and stuns on you last 25% less, and 50% less during Blood Hunt. Stuns still add the normal 0.6 s killer recovery.
- [ ] Your own penalties, such as Eviscerate's Slowness, are not shortened.

## Manic Fixation (passive)
- [ ] With a survivor highlighted by Infernal Cry or Blood Rush, being within 30 studs of them or running at them ramps your speed up over about 3 s.
- [ ] The bonus reaches +10%, or +15% if that survivor is out of chase range.
- [ ] Turning away, or the highlight running out, drops the bonus at once.

## Carving Slash (slot 1)
- [ ] 20 damage to every survivor in reach after 0.3 s. A blocking Guest 1337 can block it.
- [ ] +10 Blood per survivor hit. The cooldown is 2 s.

## Eviscerate (slot 5)
- [ ] It is refused below 10 Blood ("needs 10 Blood"). Otherwise it costs 10 Blood and lunges into a bite.
- [ ] A hit deals 10 (blockable by Guest 1337), adds a Hemorrhage stack, gives +15 Blood, halves the remaining cooldown (about 4 s), and gives you Slowness I for 1 s.
- [ ] A miss gives Slowness I for 2 s and the full 8 s cooldown.

## Demonic Pursuit (slot 2)
- [ ] Press it to start charging: crouched, semi-transparent, slowed, stamina frozen. The slot shows `CHARGE 1/3` to `3/3`.
- [ ] Press again to leap. It leaps by itself after 2 s.
- [ ] Touching a survivor during the leap pins both of you. Five slashes over 2 s deal 26/33/40 total by charge level. The survivor gets a Hemorrhage stack, you get +20 Blood, and you are invincible and stun-immune during the pin.
- [ ] The survivor is then thrown to your left, and you stay rooted about 3 s more. The cooldown is 30 s.
- [ ] Missing, hitting a wall or being stunned while charging gives a 15 s cooldown.
- [ ] During Blood Hunt the pin deals +0.4 per max-HP point the target lost to Hemorrhage.

## Infernal Cry (slot 3)
- [ ] There is a 0.7 s windup (you turn transparent), then a roar in a cone ahead, blocked by walls.
- [ ] Each survivor hit is turned to face you, gets Blindness II for 4 s, and is Marked and highlighted for 12 s.
- [ ] A Hemorrhaged survivor hit drops 2 orbs.
- [ ] During Blood Hunt: hits deal 10, Blindness lasts 6 s, and you get Speed I for 3 s and Strength I for 8 s. The cone is 10% smaller.

## Blood Rush / Blood Hunt (slot 4)
- [ ] Blood Rush: after a 4 s windup, every survivor is Marked and highlighted, for 5 s up close up to 20 s at 200 studs or more. The cooldown is 30 s.
- [ ] At full Blood the slot shows `HUNT READY` and is usable even if Blood Rush was on cooldown. Pressing it starts a 3 s cry audible to everyone.
- [ ] Blood Hunt lasts 25 s:
  - [ ] Every cooldown resets. You move +4% faster and your terror radius is halved.
  - [ ] Everyone gets red fog.
  - [ ] Survivors flash red every 5 s. Hemorrhaged ones flash white every 2.5 s.
  - [ ] The timer drains at half speed while a survivor is within chase range.
  - [ ] The round clock cannot end the round.
  - [ ] The slot shows `HUNT Ns`, and Blood Rush is disabled.
- [ ] A kill during the hunt resets cooldowns and adds 15 s, then 13 s, then 11 s and so on.
- [ ] When the hunt ends, Blood is set to 0, max Blood rises by 50, the fog clears, and Blood Rush gets a 30 s cooldown.
- [ ] During Last Man Standing it cannot start (the slot does Blood Rush instead). An active hunt is cut to 6 s.
