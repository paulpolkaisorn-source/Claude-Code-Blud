import sys, os, json, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from runtest import run
from PIL import Image
S = os.path.dirname(HERE)
base = {"GM_SSR_Enable": False, "GM_AO_Enable": False, "GM_Detail_Enable": False, "GM_Haze_Enable": False, "GM_Dither": False}
eff = None
_, eff = run('bs_off', 'linear', dict(base, GM_Bloom_Enable=False), ['sky', 'ui', 'floor'], frames=3, effect=eff)
for st, cons, thr in [(0.18, 0.6, 0.85), (0.35, 0.5, 0.85), (0.5, 0.5, 0.85), (0.5, 0.5, 0.8), (0.7, 0.6, 0.85)]:
    tag = f'bs_{st}_{cons}_{thr}'
    rep, eff = run(tag, 'linear', dict(base, GM_Bloom_Strength=st, GM_Bloom_Conserve=cons, GM_Bloom_Threshold=thr), ['sky', 'ui', 'floor'], frames=3, effect=eff)
    out = []
    for sc in ['sky', 'ui', 'floor']:
        a = np.array(Image.open(f'{S}/results/{tag}/{sc}_after.png')).astype(float)
        b = np.array(Image.open(f'{S}/results/bs_off/{sc}_after.png')).astype(float)
        d = (a - b).mean(-1)
        if sc == 'sky':
            yy, xx = np.mgrid[0:768, 0:1280]; r = np.hypot(xx - 754, yy - 243)
            out.append('sun ring0-40 %+.1f 40-80 %+.1f 80-160 %+.1f' % (d[r < 40].mean(), d[(r >= 40) & (r < 80)].mean(), d[(r >= 80) & (r < 160)].mean()))
        out.append('%s mean %+.2f' % (sc, d.mean()))
        if sc == 'ui':
            out.append('shop contrast %.4f' % rep['ui']['shop_panel_contrast_out'])
    print(tag, ' | '.join(out))
