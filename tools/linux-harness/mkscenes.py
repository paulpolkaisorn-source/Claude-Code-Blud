import sys, numpy as np, pickle
sys.path.insert(0, '/tmp/claude-0/-home-user-Claude-Code-Blud/0179b52c-ae76-523d-89d2-22c0939a5857/scratchpad/harness')
from scenes import make_scenes, simulate_unishade_depth
from PIL import Image
W, H = 1280, 768
sc = make_scenes(W, H)
out = {}
for k, v in sc.items():
    Image.fromarray(v['color']).save(f'scenes/{k}_input.png')
    dd = {m: simulate_unishade_depth(v['z'], W, H, mode=m) for m in ('linear', 'disparity', 'linear_inverted')}
    Image.fromarray((dd['linear'] * 255).astype(np.uint8)).save(f'scenes/{k}_depth.png')
    print(k, 'depth(linear) pct', np.percentile(dd['linear'], [5, 50, 85]).round(3), 'sky frac', (dd['linear'] >= 0.985).mean().round(3))
    out[k] = dict(color=v['color'], z=v['z'], depth=dd, ui_mask=v.get('ui_mask'), obj=v['obj'], ui_boxes=v.get('ui_boxes'))
pickle.dump(out, open('scenes/scenes.pkl', 'wb'))
