# Slasher: manual in-game checks

Setup: play as Slasher (`/scriptevent forsaken:quickstart killer slasher normal`). Hotbar: 1 = Slash (left-click), 2 = Behead, 3 = Gashing Wound, 4 = Raging Pace. Abilities are refused during the 10 s head start ("head start").

## Slash (slot 1, left-click)
- [ ] Swing at air: the swing animation and sound play and the 1.9 s cooldown overlay appears.
- [ ] Hit a survivor in front of you (about 2.7 blocks): 20 damage and BLEED I on them for 5 s; they get a short speed boost.
- [ ] Two survivors standing together in front of you are both hit by one swing.
- [ ] A survivor behind you is not hit.

## Behead (slot 2)
- [ ] Press while standing still: a heavier swing after about 0.45 s; a hit does 25 and gives the survivor HELPLESS for 8 s (their abilities are refused).
- [ ] Press while running: you lunge forward a short way before the hit.
- [ ] Hit or miss, Slasher gets Slowness I for 2 s and freezes very briefly. Cooldown 18 s.

## Gashing Wound (slot 3)
- [ ] Press next to a survivor: they are locked in place and take six hits (about 50 total) over about 3 s.
- [ ] Slasher can't be stunned during the combo and for 1.5 s after it.
- [ ] Slasher is frozen for 4.5 s after using it, hit or miss. Cooldown 32 s.

## Raging Pace (slot 4)
- [ ] Press: ENRAGED for 14 s. You can't sprint but walk fast (about the survivor sprint speed × 0.73).
- [ ] The nearest survivor gets a red label above them that you see through walls, for 14 s.
- [ ] Stamina drops toward 70 over 6.5 s.
- [ ] While ENRAGED, Slash lunges forward, does 25 and has a 0.8 s cooldown.
- [ ] Survivor stuns and attacks don't affect you (from 0.3 s after use), except Taph's Subspace Tripmine and Builderman's Sentry.
- [ ] Using Behead or Gashing Wound ends ENRAGED at once; the hit immunity lingers 1.5 s.
- [ ] Cooldown 30 s.

## Final Chapter (passive)
- [ ] Get stunned (for example by Shedletsky's Slash or Chance's One Shot). After the stun, RES IV shows on the HUD for 10 s and damage you take is greatly reduced.

## Bot Slasher (play as a survivor against it)
- [ ] It patrols generators, chases you when it sees you, and swings when close.
- [ ] It uses Raging Pace when you are low on stamina or the chase drags on, Behead on Sentinels, and Gashing Wound on exhausted or hurt survivors.
