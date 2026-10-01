# Daemon (original killer): manual test

Setup: open the Forsaken Menu, pick **Daemon** as the killer, add 3+ bot survivors and start. Slot 1 = Ping, 2 = Fork, 3 = Segfault, 4 = Kill -9. Daemon is drawn 15% taller, with a blinking cursor face.

## Uptime (passive)
- [ ] Any survivor you damage (Ping, Segfault, Fork decoys) gets **Flagged** for **20 s** (HUD `FLAGGED` on them).
- [ ] Your HUD lists Flagged survivors within 40 blocks (the Kill -9 slot shows `n flagged`).
- [ ] Walk straight toward the nearest Flagged survivor and watch your speed: about 5% faster. Walking away removes the bonus.

## Ping (slot 1)
- [ ] Hit a survivor. They lose **22** and become Flagged. Cooldown 1.8 s.

## Fork (slot 2)
- [ ] Press it. Two copies of you, with **your name tag**, sprint away at ±25° from your view direction at your own sprint speed.
- [ ] At a wall they turn instead of getting stuck.
- [ ] A decoy that touches a survivor deals **10**, Flags them, and disappears.
- [ ] Untouched decoys vanish after **6 s**. Survivors can also destroy decoys by hitting them.

## Segfault (slot 3)
- [ ] Press it. After **0.4 s** a slam (explosion and ring) hits every survivor within **8 blocks** that you can see. Each takes **18** and gets **Slowness II for 3 s**, **Helpless for 2 s** (abilities locked), and Flagged.
- [ ] Survivors behind a wall or farther than 8 blocks are not hit.

## Kill -9 (slot 4)
- [ ] Press it with no valid target. It says "no target". A valid target is **Flagged**, within **6 blocks**, at **35% HP or less**, and in sight.
- [ ] With a valid target the HUD shows `» <name>`. Press it. You and the target are both held in place for **1.2 s** (the target sees "kill -9"), then the target is **eliminated** instantly. Cooldown **60 s**.
- [ ] Have a Sentinel stun you during the 1.2 s channel. The target survives, can move again, and Kill -9's cooldown is only **20 s**.
- [ ] A target protected by invulnerability (for example Dusekkar's Spawn Protection) survives.
