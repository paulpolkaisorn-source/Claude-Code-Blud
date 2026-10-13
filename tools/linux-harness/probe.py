import sys, os, pickle, numpy as np, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from fxrun import Effect
S = os.path.dirname(HERE); W, H = 1280, 768
sc = pickle.load(open(f'{S}/scenes/scenes.pkl', 'rb'))
scene = sys.argv[1]; dm = sys.argv[2]; pts = json.loads(sys.argv[3]); ov = json.loads(sys.argv[4]) if len(sys.argv) > 4 else {}
v = sc[scene]
e = Effect(f'{S}/out/gm', W, H)
inp = np.dstack([v['color'], np.full((H, W), 255, np.uint8)])
names = ['V__GM_SSRTex', 'V__GM_SSRResTex', 'V__GM_GeoQTex', 'V__GM_Geo2QTex', 'V__GM_DepthSTex', 'V__GM_CompQTex']
out, rb = e.run(inp, v['depth'][dm], 'GrandMaster', ov, frames=4, readback=names)
for (x, y) in pts:
    print(f'--- full-res ({x},{y}) input rgb {v["color"][y, x]} out {out[y, x, :3]} true z {v["z"][y, x]:.2f} depth {v["depth"][dm][y, x]:.4f}')
    for n in names:
        a = rb[n]; hh, ww = a.shape[:2]
        print(f'   {n[5:]:12s}', np.round(a[int(y * hh / H), int(x * ww / W)].astype(float), 4))
np.save(f'{S}/results/probe_ssr.npy', rb['V__GM_SSRTex'].astype(np.float32))
np.save(f'{S}/results/probe_geo.npy', rb['V__GM_GeoQTex'].astype(np.float32))
np.save(f'{S}/results/probe_depthS.npy', rb['V__GM_DepthSTex'].astype(np.float32))
