"""Global constants: output format, palette, rig proportions."""

W, H = 1920, 1080          # reference resolution (all layout is authored for this)
FPS = 60
DURATION = 120.0
NFRAMES = int(round(FPS * DURATION))
AUDIO_SR = 48000

# Glow layer is rendered at 1/GLOW_DIV resolution, blurred and added back.
GLOW_DIV = 4

# Rig proportions (world units; 1 unit == 1 px at zoom 1 in the reference frame)
SPINE = 54.0
NECK = 9.0
HEAD_R = 15.5
UARM = 36.0
FARM = 36.0
THIGH = 49.0
SHIN = 49.0
LIMB_W = 8.5
TORSO_W = 10.0

# Fighter palettes (RGB 0..1)
def rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))

YIN = dict(
    name='Yin',
    body=rgb('#07060b'),
    back=rgb('#2c2838'),
    outline=rgb('#b69cff'),
    outline_a=0.42,
    eye=rgb('#e9ddff'),
    energy=rgb('#8f55ff'),
    energy2=rgb('#ff4fd8'),
    core=rgb('#12051f'),
    ribbon=rgb('#6d2fd6'),
)
YANG = dict(
    name='Yang',
    body=rgb('#fbf8f0'),
    back=rgb('#cfc9c0'),
    outline=rgb('#241a10'),
    outline_a=0.55,
    eye=rgb('#ffb52e'),
    energy=rgb('#ffc94a'),
    energy2=rgb('#fff2c4'),
    core=rgb('#ffffff'),
    ribbon=rgb('#f2a531'),
)
