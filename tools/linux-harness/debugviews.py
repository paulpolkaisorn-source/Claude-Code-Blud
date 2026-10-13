import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from runtest import run
from sheet import sheet, S
scene = sys.argv[1]; dm = sys.argv[2] if len(sys.argv) > 2 else 'linear'
base = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
views = {1: 'depth', 2: 'normals', 3: 'reflmask', 4: 'reflections', 5: 'ao', 6: 'bloom', 7: 'uimask', 8: 'detail', 9: 'rough_water_planar'}
eff = None
for k, n in views.items():
    o = dict(base); o['GM_Debug'] = k
    _, eff = run(f'dbg_{n}', dm, o, [scene], frames=4, effect=eff)
sheet([f'{S}/results/dbg_{n}/{scene}_after.png' for n in views.values()], list(views.values()), f'{S}/results/debug_{scene}.png', cols=3, scale=0.4)
