// Registry of every character kit. Data-completeness tests assert one kit per roster entry
// and one handler per ability.
import type { Kit, KitRegistry } from "../engine";
import { slasherKit } from "./slasher";
import { elliotKit } from "./elliot";
import { c00lkiddKit } from "./c00lkidd";
import { johnDoeKit } from "./john_doe";
import { oneXKit } from "./1x1x1x1";
import { noliKit } from "./noli";
import { guest666Kit } from "./guest_666";
import { nosferatuKit } from "./nosferatu";
import { daemonKit } from "./daemon";
import { noobKit } from "./noob";
import { n007n7Kit } from "./007n7";
import { veeronicaKit } from "./veeronica";
import { guest1337Kit } from "./guest_1337";
import { shedletskyKit } from "./shedletsky";
import { chanceKit } from "./chance";
import { twoTimeKit } from "./two_time";
import { janeDoeKit } from "./jane_doe";
import { buildermanKit } from "./builderman";
import { dusekkarKit } from "./dusekkar";
import { taphKit } from "./taph";

export const ALL_KITS: Kit[] = [slasherKit, c00lkiddKit, johnDoeKit, oneXKit, noliKit, guest666Kit, nosferatuKit, daemonKit, elliotKit, noobKit, n007n7Kit, veeronicaKit, guest1337Kit, shedletskyKit, chanceKit, twoTimeKit, janeDoeKit, buildermanKit, dusekkarKit, taphKit];

export const KITS: KitRegistry = new Map(ALL_KITS.map((k) => [k.id, k]));
