# John Doe: manual test

Setup: open the Forsaken Menu, pick **John Doe** as the killer, add bot survivors (include at least one Sentinel such as Shedletsky or Guest 1337, plus Dusekkar) and start. Slot 1 = Slash, 2 = Corrupt Energy, 3 = Digital Footprint, 4 = 404 Error.

## Natural Malevolence (passive)
- [ ] Walk around. Dark sculk particles mark a trail behind you that is about 17 blocks (48 studs) long. The oldest part disappears as you keep walking. Stand still and the whole trail fades within about 6 s.
- [ ] A survivor crossing the trail gets **Corrupted II** (HUD `CORRUPT`, about 2.5 HP/s, cannot kill) that lasts **3 s** after they step off.
- [ ] **Dusekkar** walks over the trail without getting Corrupted.
- [ ] Let a survivor bump into you (or stun you up close). They take **5** damage, at most once per second.

## Slash (slot 1)
- [ ] Swing at a survivor 2–3 blocks away. After a 0.4 s windup they lose **28 HP**. Cooldown 1.7 s.

## Corrupt Energy (slot 2)
- [ ] Press it in an open area. After a short punch (0.3 s) a line of spike props rises forward from you, about 13 blocks long (31 spikes).
- [ ] While the spikes rise, turn your camera. The rest of the wall follows your view, so the line bends.
- [ ] Aim the wall at a wall of the arena. The spikes stop at the wall.
- [ ] A survivor in the path takes **11**, and you get **Speed I for 7 s**. A survivor who walks into the standing wall is hit again (11), but never more than **2 hits per wall**.
- [ ] Survivors standing in the spikes get **Corrupted II for 5 s**.
- [ ] Survivor bots walk around the wall instead of through it.
- [ ] Press slot 2 again right after the spikes rise: nothing happens (cooldown). From **4.5 s** after they finish rising the HUD shows `RETRACT`. Press again and all spikes sink at once.
- [ ] If you do not retract, the spikes sink after **14 s**.

## Unstoppable (passive)
- [ ] Have a Sentinel stun you during 404 Error's windup. The stun lasts at most **2 s** (plus the normal 0.6 s killer recovery), 404 Error's cooldown becomes **10 s**, and when the stun ends you roar and get **Speed I for 3 s + 1 s per living Sentinel**.
- [ ] Same for Corrupt Energy, during its windup or while its spikes are still rising. The wall stops growing and Corrupt Energy's cooldown becomes **6 s**.
- [ ] While that Speed lasts, any slow/debuff a survivor puts on you lasts **half** as long.
- [ ] Get stunned during Digital Footprint or while idle. You get the full stun and no Unstoppable.

## Digital Footprint (slot 3)
- [ ] Press it. You stomp three times (1.2 s, rooted), and a shadow trap appears under you. You alone see it, as a ring of sculk particles. Survivors see nothing. The stomp is audible only within about 32 blocks (90 studs).
- [ ] Make four traps. The oldest one disappears (max 3).
- [ ] Walk a survivor into a trap. The trap is used up. The survivor gets **Slowness II + Corrupted I for 10 s**, you get **Speed I for 10 s**, and you each see the other's aura for **6 s**.

## 404 Error (slot 4)
- [ ] Press it. Your arm pulses twice over **1 s**, during which you are heavily slowed (30%) and cannot sprint.
- [ ] Afterwards every living survivor's aura is visible to you for **6 s**. Undetectable survivors are not shown.
