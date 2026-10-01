# c00lkidd: manual test

Setup: open the Forsaken Menu (hotbar slot 9), pick **c00lkidd** as the killer, add 3+ bot survivors and start. Wait out the 10 s head start. Slot 1 = Tag, 2 = Corrupt Nature, 3 = Walkspeed Override, 4 = Pizza Delivery. To check numbers, watch the survivor HP shown on the HUD/sidebar (they start at their character's HP, for example Elliot 80).

## Tag (slot 1, left-click swing)
- [ ] Swing at a survivor next to you. They lose **26.5 HP** after a very short windup (0.1 s). The item shows a 2 s cooldown.
- [ ] Swing from about 3 blocks away. It misses: Tag has the shortest reach in the game.

## Corrupt Nature (slot 2)
- [ ] Use it facing a survivor about 10 blocks away with a wall in between. A spinning gray cube (smoke trail) flies slowly forward, **through the wall**, and hits them for **15**.
- [ ] Line up two survivors one behind the other. The cube goes **through the first** and hits both.
- [ ] Each victim gets **Slowness I for 4 s** (HUD `SLOW`), and you see their aura (label through walls) for **10 s**.
- [ ] Cooldown is 12 s.

## Walkspeed Override (slot 3)
- [ ] Press it. You are rooted for **0.5 s** ("cl1ck 4 SPEED!1!!" flashes), then you dash very fast forward for about 1.3 s with a fire trail.
- [ ] Turn your camera during the dash. The dash bends slowly toward where you look (it cannot turn sharply).
- [ ] Hold a Slowness or Speed status while dashing: the dash speed does not change.
- [ ] Dash into a survivor. You stop on contact. They take **32**, get **Burning I for 8 s**, are knocked back in the direction you were dashing, are briefly slowed, and their aura shows for **10 s**. For **3 s** after the hit, survivor attacks do nothing to you.
- [ ] Dash at two survivors standing together. Both are hit.
- [ ] Dash into a wall. You stop with an explosion sound, "CRASH!" flashes, and you are slowed (and cannot sprint) for **1.5 s**.
- [ ] Have a Sentinel bot stun you during the 0.5 s stand-still. No dash happens.
- [ ] During the stand-still and the dash, your other abilities say "busy".

## Pizza Delivery (slot 4)
- [ ] Press it. You are slowed for **2.5 s**, then **2 pizza bots** ("Pizza Delivery" name tag) appear beside you.
- [ ] The bots walk to the nearest survivor. If every survivor is more than about 25 blocks (70 studs) away, they move faster.
- [ ] When a bot touches a survivor, it explodes and disappears. The survivor takes **15**, gets **Burning I** and **Slowness II for 3 s**, and their aura shows for **15 s**.
- [ ] Hit a bot as a survivor (or let a survivor bot punch it). It has **20 HP** and can be destroyed.
- [ ] Give a survivor Undetectable (for example Taph/Noob abilities). The bots ignore them.
- [ ] Bots that never reach anyone vanish after **35 s**.
