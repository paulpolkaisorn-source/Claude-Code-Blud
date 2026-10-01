# Taph: manual in-game checks

Setup: `/scriptevent forsaken:quickstart survivor taph`. Hotbar: 2 = Tripwire, 3 = Subspace Tripmine. The Tripwire slot shows wires placed (x/3); the Tripmine slot shows the active mine's self-destruct timer.

## Tripwire (slot 2)
- [ ] Press it. Two stakes appear about 4 studs in front, with an 8-stud wire across your facing. Cooldown is 25 s.
- [ ] Survivors see a faint particle line on the wire. The killer sees only the stakes.
- [ ] The killer crossing it in the first 1.5 s: nothing (not armed).
- [ ] The killer crossing it after that: "Tripwire!" for every survivor, the killer's red outline for 8 s (even through walls), and Slowness II for 4 s. The wire is used up.
- [ ] Place a 4th wire. The oldest one disappears.
- [ ] The killer can break a wire by attacking it (10 HP) without setting it off.
- [ ] With two Taphs alive: a 6.5 s reveal and 2.5 s Slowness.
- [ ] A wire never expires. After 150 s its particles just show less often.

## Subspace Tripmine (slot 3)
- [ ] Press it. The mine lands about 12 studs ahead. Thrown at a wall, it lands before the wall. Cooldown is 40 s.
- [ ] Survivors see a faint purple marker. Everyone sees a purple glow and hears a sound every 13 s.
- [ ] The killer comes within 19 studs: a click, then 0.5 s later the blast: Helpless 3 s, Subspaced III 6 s (pink screen, camera jerks) and Weakness V 6 s.
- [ ] Your Tripmine cooldown drops by 10 s when it hits the killer.
- [ ] Stand inside the blast yourself. You get the same effects.
- [ ] It also works on ENRAGED Slasher.
- [ ] The killer attacks the mine first: only Subspaced I.
- [ ] Left alone, it explodes by itself after 50 s.
- [ ] With two Taphs alive: every effect is 2 s shorter.

## Death
- [ ] When Taph is eliminated, all his wires and mines disappear.
