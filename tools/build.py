#!/usr/bin/env python3
"""Inline every asset into one standalone HTML file.

Usage:  python3 tools/build.py
Reads   src/game.html + assets/{sfx,music,sprites}/*
Writes  clawd-vs-bugs.html  (single file, works offline)

Asset naming:
  assets/sfx/<name>.mp3           e.g. shoot.mp3, boom.mp3 (see SFX list in src/game.html)
  assets/music/<stage>.mp3        menu, first, midA, midB, final
  assets/sprites/u_<unit>.png     e.g. u_shooter.png (Clawd units, facing right, feet at bottom)
  assets/sprites/b_<bug>.png      e.g. b_hard.png    (bugs, facing left, feet at bottom)
Missing assets fall back to the built-in procedural art / synth audio.
"""
import base64, json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
MIME = {'.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
        '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg'}

def pack(sub, exts):
    d = ROOT / 'assets' / sub
    out = {}
    if d.exists():
        for f in sorted(d.iterdir()):
            if f.suffix.lower() in exts:
                out[f.stem] = 'data:%s;base64,%s' % (MIME[f.suffix.lower()], base64.b64encode(f.read_bytes()).decode())
    return out

assets = {'sfx': pack('sfx', {'.mp3', '.ogg', '.m4a'}),
          'music': pack('music', {'.mp3', '.ogg', '.m4a'}),
          'sprites': pack('sprites', {'.png', '.webp', '.jpg'})}
src = (ROOT / 'src' / 'game.html').read_text(encoding='utf-8')
marker = '/*@ASSETS@*/'
assert src.count(marker) == 1, 'asset marker missing'
html = src.replace(marker, 'window.__ASSETS=' + json.dumps(assets, separators=(',', ':')) + ';')
out = ROOT / 'clawd-vs-bugs.html'
out.write_text(html, encoding='utf-8')
print('built %s: %.0f KB  (sfx=%d music=%d sprites=%d)' % (out.name, len(html.encode()) / 1024,
      len(assets['sfx']), len(assets['music']), len(assets['sprites'])))
