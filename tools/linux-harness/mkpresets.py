"""Generate the three GrandMaster presets (ReShade preset INI format) from the compiled module."""
import json, os, sys
S = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
m = json.load(open(f'{S}/out/gm/module.json'))
OUT = '/home/user/Claude-Code-Blud/Unishade/presets'
uniforms = [u for u in m['uniforms'] if 'source' not in u['annotations']]
defaults = {u['name']: u['init'][0] for u in uniforms}
types = {u['name']: u['base'] for u in uniforms}

PRESETS = {
    # cheap and clean: most of the look for the least cost
    'GrandMaster_Balanced': dict(
        GM_Quality=0, GM_SSR_Strength=2.0, GM_SSR_F0=0.08, GM_AO_Strength=0.4,
        GM_Sharpen=0.4, GM_MicroContrast=0.35, GM_LocalContrast=0.15,
        GM_Bloom_Strength=0.3, GM_Vibrance=0.15, GM_Contrast=0.06, GM_Haze_Strength=0.05),
    # maximum effect: polished floors, strong detail, generous glow
    'GrandMaster_Ultra': dict(
        GM_Quality=2, GM_SSR_Strength=2.8, GM_SSR_F0=0.12, GM_SSR_Gloss=0.75, GM_SSR_Env=0.5,
        GM_AO_Strength=0.6, GM_Sharpen=0.6, GM_MicroContrast=0.55, GM_LocalContrast=0.25,
        GM_Bloom_Strength=0.45, GM_Bloom_Radius=0.5, GM_Vibrance=0.22, GM_Contrast=0.1, GM_Haze_Strength=0.08),
    # believable: physical F0, energy-conserving glow, restrained colour, aerial haze
    'GrandMaster_Reality': dict(
        GM_Quality=1, GM_SSR_Strength=1.6, GM_SSR_F0=0.05, GM_SSR_Gloss=0.65, GM_SSR_Env=0.35,
        GM_AO_Strength=0.5, GM_Sharpen=0.35, GM_MicroContrast=0.3, GM_LocalContrast=0.2,
        GM_Bloom_Strength=0.25, GM_Bloom_Conserve=0.8, GM_Bloom_Adapt=0.8,
        GM_Vibrance=0.08, GM_Saturation=0.98, GM_Contrast=0.08, GM_HighlightDesat=0.7,
        GM_Haze_Strength=0.06, GM_Haze_Start=0.6, GM_NeutralProtect=1.0, GM_SkinProtect=0.9),
}

def fmt(name, v):
    if types[name] == 'float':
        return ('%.6f' % float(v)).rstrip('0').rstrip('.') if '.' in ('%.6f' % float(v)) else str(v)
    return str(int(v))

for pname, ov in PRESETS.items():
    for k in ov:
        assert k in defaults, k
    vals = dict(defaults); vals.update(ov)
    lines = ['Techniques=GrandMaster@GrandMaster.fx', 'TechniqueSorting=GrandMaster@GrandMaster.fx', '', '[GrandMaster.fx]']
    for u in sorted(uniforms, key=lambda u: u['name']):
        v = vals[u['name']]
        if types[u['name']] == 'float':
            s = '%.6f' % float(v)
        else:
            s = str(int(v))
        lines.append(f"{u['name']}={s}")
    with open(f'{OUT}/{pname}.ini', 'w', newline='\r\n') as f:
        f.write('\n'.join(lines) + '\n')
    print('wrote', pname, len(uniforms), 'uniforms')
