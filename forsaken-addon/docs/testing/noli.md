# Noli: manual in-game checks

Setup: play as Noli against 2–3 bot survivors with Noli's fake generators enabled. Hotbar: 1 = Stab, 2 = Void Rush, 3 = Nova, 4 = Observant. At round start Void Rush shows 10 s and Observant 25 s.

## Hallucinations (passive)
- [ ] A survivor with Hallucination has a purple aura only you can see. Level III is darker than level I. The aura goes when the status ends (20 s) or when an Undetectable survivor hides it.
- [ ] Level I: no world objects. The victim's HUD shows the fakes: wrong timer and generator count.
- [ ] Level II: a pizza prop appears about 4 blocks from the victim. Other survivors walk through it. When the victim touches it, it vanishes with an eat sound, real HP stays the same, and the victim's HUD shows +20 (never above max). Another fake pizza can appear 8 s later.
- [ ] Level III: a silent "Noli" mirage spawns behind the victim and chases only that survivor at 22 studs/s.
- [ ] Each mirage swing (every 1.5 s) takes 15 off the victim's HUD HP only. Real HP, repairs and channels are untouched, there is no speed boost, and the displayed HP stops at 0 while the victim lives. Each swing lengthens Hallucination by 2 s.
- [ ] Any survivor hit or stun on the mirage destroys it and ends the victim's Hallucination.
- [ ] When Hallucination ends, the HUD HP snaps back to real HP, the mirage and pizza vanish, and a purple ☻ title flashes for the victim.

## Prankster (passive)
- [ ] Two extra generators exist. Each finished layer on one gives the repairer +1 Hallucination with a glitch sound. Finishing all of it gives Hallucination III, shows "It was fake.", and the generator resets.

## Stab (slot 1)
- [ ] 25 damage after a 0.35 s windup. The cooldown is 1.8 s.
- [ ] Stabbing a hallucinating survivor removes every stack, despawns their mirage and reverts their HUD fakes.
- [ ] A blocking Guest 1337 can block it (kind basic).

## Void Rush (slot 2)
- [ ] Press it: about 1 s of slowed preparation, then a fast rush (void particles). The view steers it, sharply at first, then much less after about 1.1 s. Stamina does not regenerate during the rush.
- [ ] Press again during the preparation: no rush, 1.2 s cooldown. A stun during the preparation does the same.
- [ ] Hit a survivor without Hallucination II: they take 10 and get Hallucination II, and Noli stops. Press again after about 0.85 s, within 2 s of the hit, to re-rush. Without a press, the 20 s cooldown starts at 2 s.
- [ ] Hit a survivor at Hallucination II or higher: a slam deals 40 + 3.5 per re-rush, plus 3.5 per extra survivor hit earlier. Their Hallucination is cleared and the move ends.
- [ ] Rushing through two survivors: both take 10, and only the closer one gets Hallucination II.
- [ ] A survivor at 10 HP or less dies on contact and the rush continues.
- [ ] Crashing into a wall, or pressing again mid-rush, gives Slowness V for 1.5 s. The cooldown is 20 s.

## Nova (slot 3)
- [ ] Press it: a 0.7 s windup, then the Voidstar flies forward. A stun during the windup means no throw and a 0.3 s cooldown.
- [ ] On a survivor or wall it implodes over about 9 blocks. Survivors inside take 15, are pulled toward the centre, and get Slowness that is stronger near the centre (up to III for 2 s).
- [ ] Press again while it flies: it detonates early with a smaller radius (about 4.7 blocks). It also implodes small when its 3 s life ends.
- [ ] The 12 s cooldown starts only after the implosion.

## Observant (slot 4)
- [ ] Look toward a generator more than 18 blocks (50 studs) away and press. Noli freezes in a 1.45 s stance, all generators sparkle for him, and particles warn above the target.
- [ ] Noli teleports next to the generator closest to his view direction, fake ones included. Nearer generators are skipped. With none far enough, the press is refused without a cooldown.
- [ ] After arrival, survivors more than 20 / 50 / 100 studs away get Hallucination I / II / III. Survivors within 19 studs get none. Noli is stun-immune for 2 s. The cooldown is 30 s.
- [ ] Pressing again during the stance, or being stunned, cancels it with a 15 s cooldown.
