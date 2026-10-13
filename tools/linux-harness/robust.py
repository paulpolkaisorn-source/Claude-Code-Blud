import sys, os, json, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from runtest import run
from PIL import Image
S = os.path.dirname(HERE)
eff = None
names = ['floor', 'water', 'neon']
res = {}
for dm in ['linear', 'disparity', 'linear_inverted']:
    rep, eff = run(f'rob_{dm}', dm, {"GM_Dither": False}, names, frames=24, effect=eff)
    for n in names:
        st = rep[n]['stats']
        res[(dm, n)] = st
        print(f'{dm:16s} {n:6s} polarity={st[0][0]:+.0f} response={st[4][0]:+.0f} (score {st[4][1]:+.3f}) floorN=({st[5][0]:.2f},{st[5][1]:.2f},{st[5][2]:.2f}) conf={st[5][3]:.2f} meanRGB {rep[n]["mean_rgb_out"]} flicker {rep[n]["temporal_flicker_mean"]:.4f}/{rep[n]["temporal_flicker_max"]}')
# image similarity between encodings
for n in names:
    a = np.array(Image.open(f'{S}/results/rob_linear/{n}_after.png')).astype(float)
    for dm in ['disparity', 'linear_inverted']:
        b = np.array(Image.open(f'{S}/results/rob_{dm}/{n}_after.png')).astype(float)
        print(f'{n}: linear vs {dm}: mean abs diff {np.abs(a-b).mean():.3f}')
