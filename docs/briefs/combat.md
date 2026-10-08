GOAL: attacks, supers, projectiles, damage, ammo, regen. API: ARCHITECTURE.md "combat"; stats: BRAWLERS/RULES.
FILES: src/combat/combat.js, src/combat/projectiles.js, src/combat/supers.js, tests/unit/combat.test.mjs.
ATTACKS (alive, ammo≥1, attackCooldown≤0 → ammo-=1, attackCooldown=RULES.minAttackGap, revealTimer=RULES.revealAfterAttack, combatTimer=0):
- spread: N pellets across spread; bolt: single. Stop at blocksShot tiles; hit first enemy; max range.
- lob: target=pos+dir*max(1.5,range*aimLen); parabolic arc ignores walls; AoE on landing + EV.EXPLOSION.
- beam: instant segment (raycast-clipped, width): damages enemies, heals allies (not self); 0.12s visual.
SUPERS (superCharge≥1 → 0, EV.SUPER_USED): dash (dashTimer, dashV; damage+knockback each enemy once; destroyWalls on path), rail (pierces brawlers+walls, destroys walls on path), cluster (big lob, destroyWalls(blastRadius), bomblets scatter), totem (zone at aim point: heal allies/damage enemies per second).
CHARGE: superCharge += (damage+heal)/superCost, clamp 1; EV.SUPER_READY at 1.
RELOAD: +1 ammo per reload seconds. REGEN: combatTimer>regenDelay → heal regenRate*maxHp/s.
KNOCKBACK/STUN decay, moved via arena.moveCircle. DEATH: hp≤0 once → alive=false, EV.DEATH, HIT.killed; update b.stats. Skip dead targets.
POOL: 160 projectiles, zero allocation. VISUALS (≤8 draw calls): InstancedMesh pellets/bolts (emissive, instanceColor), bombs + shadow blobs, beam/rail stretched quads, totem mesh + ring; render(alpha) interpolates.
TESTS (Node, stub arena): each attack kind hits target; wall blocks bolt; lob clears walls; ammo/reload timing; super fill + SUPER_READY; regen after 3s; single DEATH; rail pierces 2; dash knockback; pool doesn't grow.
