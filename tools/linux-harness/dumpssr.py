import sys, os, pickle, numpy as np, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from fxrun import Effect
from PIL import Image
S = os.path.dirname(HERE); W, H = 1280, 768
sc = pickle.load(open(f'{S}/scenes/scenes.pkl', 'rb'))
scene = sys.argv[1]; ov = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
v = sc[scene]
e = Effect(f'{S}/out/gm', W, H)
inp = np.dstack([v['color'], np.full((H, W), 255, np.uint8)])
out, rb = e.run(inp, v['depth']['linear'], 'GrandMaster', ov, frames=4, readback=['V__GM_SSRTex', 'V__GM_SSRResTex'])
for n in ['V__GM_SSRTex', 'V__GM_SSRResTex']:
    a = rb[n].astype(np.float32)
    rgb = a[..., :3] / (1 + 0.75 * a[..., :3].max(-1, keepdims=True))
    rgb = np.clip(rgb, 0, 1) ** (1 / 2.2)
    al = np.clip(a[..., 3:4], 0, 1)
    img = np.hstack([rgb, np.repeat(al, 3, -1)])
    Image.fromarray((img * 255).astype(np.uint8)).save(f'{S}/results/{scene}_{n[5:]}.png')
print('ok')
