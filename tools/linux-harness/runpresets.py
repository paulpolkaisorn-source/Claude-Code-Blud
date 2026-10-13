import sys, os, json, configparser, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
from runtest import run
from sheet import sheet
S = os.path.dirname(HERE)
P = '/home/user/Claude-Code-Blud/Unishade/presets'
eff = None
allrep = {}
for pn in ['GrandMaster_Balanced', 'GrandMaster_Ultra', 'GrandMaster_Reality']:
    cp = configparser.ConfigParser(); cp.optionxform = str
    cp.read_string('[_]\n' + open(f'{P}/{pn}.ini').read())
    assert cp['_']['Techniques'] == 'GrandMaster@GrandMaster.fx'
    ov = {k: float(v) for k, v in cp['GrandMaster.fx'].items()}
    rep, eff = run(pn, 'linear', ov, None, frames=16, effect=eff)
    allrep[pn] = rep
json.dump(allrep, open(f'{S}/results/presets_metrics.json', 'w'), indent=1)
for sc in ['floor', 'water', 'sky', 'ui', 'texture', 'neon']:
    sheet([f'{S}/scenes/{sc}_input.png'] + [f'{S}/results/{p}/{sc}_after.png' for p in ['GrandMaster_Balanced', 'GrandMaster_Ultra', 'GrandMaster_Reality']],
          ['OFF (input)', 'Balanced', 'Ultra', 'Reality'], f'{S}/results/final_{sc}.png', cols=2, scale=0.5)
print('| scene | preset | mean RGB in | mean RGB out | edge energy in→out | halo mean / p99.9 | flicker (dither on) |')
print('|---|---|---|---|---|---|---|')
for pn, rep in allrep.items():
    for sc, r in rep.items():
        print(f"| {sc} | {pn.split('_')[1]} | {r['mean_rgb_in']} | {r['mean_rgb_out']} | {r['edge_energy_in']:.4f}→{r['edge_energy_out']:.4f} (+{100*(r['edge_energy_out']/r['edge_energy_in']-1):.0f}%) | {r['halo_mean']:.4f} / {r['halo_p999']:.3f} | {r['temporal_flicker_mean']:.2f} |")
