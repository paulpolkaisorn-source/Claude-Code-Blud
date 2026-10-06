#!/usr/bin/env python3
"""Render a motion-graphics GIF that fits the ROG Strix SCAR 18 AniMe Vision stripe.

  python render.py --scene scene.json --out lid.gif
  python render.py --effect glitch_text -p text=GG -p intensity=0.8 --duration 3 --out gg.gif
  python render.py --list                      # effect catalogue with all params

Writes:
  <out>.gif          -> import this into Armoury Crate > AniMe Vision > Animation Mode
  <out>_preview.gif  -> simulation on the ~810 LEDs (what the lid will really show)
  <out>_sheet.png    -> contact sheet of preview frames (open it to eyeball the result)
  <out>_seg<N>.gif   -> with --split, every segment as its own GIF (one per Armoury Crate slot)
and prints a validation report. See references/scene-format.md for the scene JSON.
"""
import argparse
import json
import os
import sys

sys.dont_write_bytecode = True   # don't leave __pycache__ in the user's folder (custom effects)

import numpy as np  # noqa: E402

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lidgif import Stripe, blend, save_gif, scale  # noqa: E402
from lidgif.effects import EFFECTS, Ctx, catalogue  # noqa: E402
from lidgif.preview import make_preview  # noqa: E402
from validate import validate  # noqa: E402


def _layers(seg):
    if "layers" in seg:
        return seg["layers"]
    return [{"effect": seg["effect"], "params": seg.get("params", {})}]


def render_scene(scene, stripe):
    """Returns (frames, fps, segment_ranges) - ranges are (start, end) frame indices."""
    fps = float(scene.get("fps", 20))
    seed = int(scene.get("seed", 7))
    post = scene.get("post", {})
    frames, ranges = [], []
    for si, seg in enumerate(scene["segments"]):
        dur = float(seg.get("duration", 3.0))
        n = max(1, int(round(dur * fps)))
        effs = []
        for li, L in enumerate(_layers(seg)):
            name = L["effect"]
            if name not in EFFECTS:
                raise SystemExit(f"unknown effect '{name}'. Known: {', '.join(EFFECTS)}")
            # every layer gets its own context so layers (even two copies of one
            # custom effect) never share state; "seed" on a layer re-rolls its randomness
            ctx = Ctx(stripe, fps, n, dur, int(L.get("seed", seed + si * 101 + li * 17)))
            effs.append((EFFECTS[name](ctx, **L.get("params", {})), L.get("blend", "max"), float(L.get("opacity", 1.0))))
        fi, fo = float(seg.get("fade_in", 0)), float(seg.get("fade_out", 0))
        start = len(frames)
        for i in range(n):
            t = i / n
            canvas = stripe.new_canvas()
            for eff, mode, op in effs:
                clear = eff.clear(i, t)       # black backing behind text, if asked for
                if clear is not None:
                    if eff.SPACE == "strip":
                        clear = stripe.strip_to_canvas(clear)
                    canvas = blend(canvas, clear, "subtract")
                img = eff.frame(i, t)
                if eff.SPACE == "strip":
                    img = stripe.strip_to_canvas(img)
                canvas = blend(canvas, img, mode, op)
            k = 1.0
            ts = i / fps
            if fi > 0 and ts < fi:
                k = min(k, ts / fi)
            if fo > 0 and ts > dur - fo:
                k = min(k, max(0.0, (dur - ts) / fo))
            if k < 1:
                canvas = scale(canvas, k)
            frames.append(stripe.finalize(canvas, levels=post.get("levels"),
                                          gamma=float(post.get("gamma", 1.0)),
                                          brightness=float(post.get("brightness", 1.0))))
        ranges.append((start, len(frames)))
    return frames, fps, ranges


def _parse_param(kv):
    k, _, v = kv.partition("=")
    try:
        return k, json.loads(v)
    except json.JSONDecodeError:
        return k, v


def _report(path, stripe):
    ok = True
    for r in validate(path, stripe):
        tag = "PASS" if r["passed"] else ("FAIL" if r["hard"] else "WARN")
        ok &= r["passed"] or not r["hard"]
        print(f"  [{tag}] {r['check']}: {r['detail']}")
    return ok


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--scene", help="scene JSON file")
    ap.add_argument("--effect", help="quick single-effect render")
    ap.add_argument("-p", "--param", action="append", default=[], help="effect param key=value (with --effect)")
    ap.add_argument("--duration", type=float, default=3.0)
    ap.add_argument("--fps", type=float, default=20)
    ap.add_argument("--out", default="lid.gif")
    ap.add_argument("--stripe", help="alternate stripe.json")
    ap.add_argument("--no-preview", action="store_true")
    ap.add_argument("--sheet-frames", type=int, default=12,
                    help="frames on the contact sheet (evenly spaced + the biggest visual changes)")
    ap.add_argument("--split", action="store_true",
                    help="also write each segment as its own GIF (<out>_seg1.gif ...)")
    ap.add_argument("--constant-timing", action="store_true",
                    help="keep every frame separate (no merging of identical frames)")
    ap.add_argument("--list", action="store_true", help="print the effect catalogue")
    a = ap.parse_args()

    if a.list:
        print(catalogue())
        return
    if a.scene:
        with open(a.scene, encoding="utf-8") as f:
            scene = json.load(f)
    elif a.effect:
        scene = {"fps": a.fps, "segments": [{"duration": a.duration, "effect": a.effect,
                                             "params": dict(_parse_param(p) for p in a.param)}]}
    else:
        ap.error("give --scene or --effect (or --list)")

    stripe = Stripe(a.stripe)
    frames, fps, ranges = render_scene(scene, stripe)
    out = a.out if a.out.lower().endswith(".gif") else a.out + ".gif"
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    const = a.constant_timing or scene.get("constant_timing", False)
    durs = save_gif(frames, out, fps, const)
    print(f"wrote {out}  ({len(frames)} frames, {sum(durs) / 1000:.2f}s @ {fps:g} fps, "
          f"{stripe.W}x{stripe.H}, {os.path.getsize(out) // 1024} KB)")
    base = out[:-4]
    if not a.no_preview:
        n = make_preview(frames, durs, stripe, base + "_preview.gif", base + "_sheet.png", a.sheet_frames)
        print(f"wrote {base}_preview.gif and {base}_sheet.png  (simulated {n} LEDs)")
    ok = _report(out, stripe)
    if a.split and len(ranges) > 1:
        for k, (s0, s1) in enumerate(ranges, 1):
            p = f"{base}_seg{k}.gif"
            save_gif(frames[s0:s1], p, fps, const)
            print(f"wrote {p}  (segment {k}: {(s1 - s0) / fps:.2f}s)")
            ok &= _report(p, stripe)
    lit = np.mean([np.asarray(f)[stripe.mask_np].mean() for f in frames]) / 255
    print(f"  average stripe brightness {lit:.0%}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    try:
        main()
    except BrokenPipeError:      # output piped into head etc.
        sys.stderr.close()
