"""Simulate how a GIF looks on the ~810 LEDs of the lid stripe.

The real AniMe Vision samples the imported image at each LED position, so a
preview that does the same shows what survives (thin lines and small text
vanish, bold shapes read). Produces an animated preview GIF and a contact
sheet PNG (a grid of frames) that an agent can open as an image to check work.
"""
import math

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont


def led_points(stripe):
    """Hex-packed LED centres inside the stripe polygon, horizontal rows."""
    p = stripe.pitch
    rh = p * math.sqrt(3) / 2
    pts = []
    m = stripe.mask_np
    row = 0
    y = rh / 2
    while y < stripe.H:
        x = (p / 2) if row % 2 == 0 else p
        while x < stripe.W:
            xi, yi = int(x), int(y)
            if m[yi, xi]:
                pts.append((x, y))
            x += p
        y += rh
        row += 1
    return pts


def render_leds(frame, stripe, pts, scale=2, margin=24):
    p = stripe.pitch
    blur = frame.filter(ImageFilter.BoxBlur(max(1, int(p * 0.35))))
    a = np.asarray(blur)
    W, H = stripe.W * scale + 2 * margin, stripe.H * scale + 2 * margin
    out = Image.new("L", (W, H), 12)
    d = ImageDraw.Draw(out)
    poly = [(x * scale + margin, y * scale + margin) for x, y in stripe.poly]
    d.polygon(poly, outline=55)
    r = p * 0.36 * scale
    for x, y in pts:
        v = int(a[min(int(y), stripe.H - 1), min(int(x), stripe.W - 1)])
        c = 30 + v * (255 - 30) // 255
        cx, cy = x * scale + margin, y * scale + margin
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=c)
    return out


def make_preview(frames, durations, stripe, gif_path, sheet_path, sheet_frames=8):
    pts = led_points(stripe)
    leds = [render_leds(f, stripe, pts) for f in frames]
    leds[0].save(gif_path, save_all=True, append_images=leds[1:], duration=durations, loop=0)
    # contact sheet
    n = len(leds)
    k = min(sheet_frames, n)
    ke = max(2, (2 * k + 2) // 3)                       # evenly spaced share
    idx = set(int(round(j * (n - 1) / max(1, ke - 1))) for j in range(min(ke, n)))
    # ...plus the frames with the biggest change from the previous one, so short
    # flashes and glitch hits show up on the sheet.
    diffs = [(float(np.abs(np.asarray(frames[j], np.int16) - np.asarray(frames[j - 1], np.int16)).mean()), j)
             for j in range(1, n)]
    bright = [(float(np.asarray(f).mean()), j) for j, f in enumerate(frames)]
    idx.add(max(bright)[1])                             # the peak frame (e.g. top of a pulse)
    for _, j in sorted(diffs, reverse=True):
        if len(idx) >= k:
            break
        if all(abs(j - q) > 1 for q in idx):
            idx.add(j)
    idx = sorted(idx)
    cols = 4 if len(idx) > 4 else len(idx)
    rows = math.ceil(len(idx) / cols)
    tw, th = leds[0].width // 2, leds[0].height // 2
    sheet = Image.new("L", (cols * tw, rows * (th + 18)), 0)
    d = ImageDraw.Draw(sheet)
    f = ImageFont.load_default()
    t_ms = np.cumsum([0] + list(durations))
    for j, fi in enumerate(idx):
        im = leds[fi].resize((tw, th), Image.LANCZOS)
        x, y = (j % cols) * tw, (j // cols) * (th + 18)
        sheet.paste(im, (x, y + 18))
        d.text((x + 4, y + 3), f"frame {fi}  t={t_ms[fi] / 1000:.2f}s", fill=200, font=f)
    sheet.save(sheet_path)
    return len(pts)
