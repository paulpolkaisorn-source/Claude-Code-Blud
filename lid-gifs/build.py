#!/usr/bin/env python3
"""Render the lid GIFs with the bundled engine, then run the checks.

    python build.py                       # all three
    python build.py heartbeat_reactor     # just one

Each <name>.json is a one-layer scene that runs <name>.py (the animation code,
all timings and brightness levels at its top). Writes <name>.gif (import this),
<name>_preview.gif (LED simulation), <name>_sheet.png and <name>_keyframes.png.
"""
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
NAMES = ["glitch_meltdown", "heartbeat_reactor", "boss_fight_hud"]


def main():
    names = sys.argv[1:] or NAMES
    render = os.path.join(HERE, "engine", "scripts", "render.py")
    ok, rendered = True, []
    for name in names:
        print(f"\n### rendering {name}")
        r = subprocess.run([sys.executable, render, "--scene", name + ".json", "--out", name + ".gif",
                            "--sheet-frames", "16"], cwd=HERE)
        if r.returncode == 0:
            rendered.append(name)
        else:
            ok = False
            print(f"### {name}: render FAILED - not verified (the old .gif, if any, is stale)")
    if rendered:
        r = subprocess.run([sys.executable, os.path.join(HERE, "verify.py"), *rendered], cwd=HERE)
        ok &= r.returncode == 0
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
