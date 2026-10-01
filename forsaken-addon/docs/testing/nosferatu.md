# Nosferatu: manual in-game checks

Setup: play as Nosferatu against 2–3 bot survivors. Hotbar: 1 = Lacerate / Dive, 2 = Bloodhook, 3 = Cataclysm, 4 = Hunter's Feast, 5 = Ascension.

## Levitation (passive)
- [ ] You make no footstep sounds (flag `silent`).

## Lacerate (slot 1)
- [ ] 24 damage after 0.3 s. A blocking Guest 1337 can block it. The cooldown is 1.85 s.

## Bloodhook (slot 2)
- [ ] There is a 0.9 s windup, then a chain (red particle line) flies up to about 41 blocks (115 studs). Walls stop it.
- [ ] A miss gives a 20 s cooldown. A stun during the windup gives 20 s too.
- [ ] A close hit (24 studs or less, about 8.6 blocks) deals 15. The survivor is dragged to you and kicked back for +3.
- [ ] A far hit deals 15 and starts a "TUG OF WAR" title on both screens. The slot shows `TUG k-s`. Both sides spam JUMP.
  - [ ] While you press at least as fast as the survivor, they slide toward you at 16 studs/s. While they press faster, they stop.
  - [ ] Reeling them in, or leading on total presses when the 3 s end, yanks them in front of you for +25 (40 total).
  - [ ] If the survivor wins, they are freed in place and you are Helpless for 0.75 s.
  - [ ] A stun on you frees them.
- [ ] After any landed pull: Helpless for 2 s, Slowness II for 1 s, and the 24 s cooldown.

## Cataclysm (slot 3)
- [ ] You dash forward for 1.25 s with Invisibility IV, leaving blood puddles.
- [ ] About 2 s after the press you snap back to the start and explode. Enemies within about 5 blocks take 10. You are stun-immune for 0.5 s.
- [ ] Puddles last 12 s. Touching one gives Bleeding II for 5 s, Slowness I for 6 s, and a 6 s highlight for you, at most once every 5 s per survivor.

## Hunter's Feast (slot 4)
- [ ] There is a 0.23 s windup, then a slow bat orb. Press again once to turn it toward where you look, 3x faster. The cooldown starts at once.
- [ ] A hit deals 5 and gives Oblivious and Creatures for 10 s (+25% damage taken, bat sound). The target is highlighted for 10 s.
- [ ] After a hit, you get Invisibility V and Undetectable for 10 s. Using any ability, Lacerate included, removes both.
- [ ] Cataclysm used while invisible keeps its own Invisibility IV.
- [ ] The 16 s cooldown starts when the orb hits, hits a wall, expires after 10 s, or is redirected.

## Ascension (slot 5)
- [ ] You hop up into bat form for up to 10 s, with a loud bat cue. The adapter handles flight: flap with jump.
- [ ] Bat form gives:
  - [ ] about 2.1x speed
  - [ ] invincibility and stun immunity
  - [ ] all survivors highlighted
  - [ ] frozen stamina
  - [ ] a halved terror radius
- [ ] Bloodhook, Cataclysm and Hunter's Feast are refused with "bat form".
- [ ] Pressing again (dismount), or the 10 s timeout, returns you to normal with Slowness III and Helpless for 4 s. Stamina regenerates at once. The 32 s cooldown starts.
- [ ] Dive (slot 1 in bat form): a 0.6 s windup, then a dive toward the crosshair. The dismount press is ignored meanwhile.
  - [ ] On a hit you revert with no penalty. The survivor is pinned, bitten for 5, then tossed 0.8 s later for 5 up to 30, depending on dive time (max at 0.55 s).
  - [ ] On a miss (1.5 s, a wall, or landing): 20 self-damage, then Slowness III and Helpless for 3 s.
