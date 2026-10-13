"""Run GrandMaster on the synthetic scenes and compute before/after metrics.

usage: python3 runtest.py <tag> [depth_mode] [json-overrides] [scenes,...]
"""
import sys, os, json, pickle, time, numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from fxrun import Effect

S = os.path.dirname(HERE)
W, H = 1280, 768


def luma(a):
    a = a.astype(np.float32) / 255.0
    return a[..., 0] * 0.2126 + a[..., 1] * 0.7152 + a[..., 2] * 0.0722


def grad_energy(L):
    gx = np.abs(np.diff(L, axis=1))[:-1, :]
    gy = np.abs(np.diff(L, axis=0))[:, :-1]
    return float(np.mean(np.sqrt(gx * gx + gy * gy)))


def box_minmax(L, r):
    from numpy.lib.stride_tricks import sliding_window_view
    p = np.pad(L, r, mode='edge')
    win = sliding_window_view(p, (2 * r + 1, 2 * r + 1))
    return win.min(axis=(-1, -2)), win.max(axis=(-1, -2))


def halo_metric(Lin, Lout, r=3, edge_thr=0.25):
    """Overshoot of output luma beyond the input's local [min,max] near strong edges
    (ringing / halo indicator). Returns (mean overshoot, 99.9th pct) over edge pixels."""
    mn, mx = box_minmax(Lin, r)
    edge = (mx - mn) > edge_thr
    over = np.maximum(Lout - mx, 0) + np.maximum(mn - Lout, 0)
    if edge.sum() == 0:
        return 0.0, 0.0
    return float(over[edge].mean()), float(np.percentile(over[edge], 99.9))


def run(tag, depth_mode='linear', overrides=None, names=None, frames=8, effect=None):
    sc = pickle.load(open(os.path.join(S, 'scenes/scenes.pkl'), 'rb'))
    names = names or list(sc.keys())
    outdir = os.path.join(S, 'results', tag)
    os.makedirs(outdir, exist_ok=True)
    eff = effect or Effect(os.path.join(S, 'out/gm'), W, H)
    report = {}
    for n in names:
        v = sc[n]
        inp = np.dstack([v['color'], np.full((H, W), 255, np.uint8)])
        depth = v['depth'][depth_mode]
        eff.frame = 0
        # reset all render targets between scenes (fresh history)
        for name, (tx, ti) in eff.tex.items():
            if ti['semantic'] == '':
                from fxrun import FMT
                comps, dt = FMT[ti['format']]
                tx.write(np.zeros((ti['height'], ti['width'], comps), dtype={'f1': np.uint8, 'f2': np.float16, 'f4': np.float32}[dt]).tobytes())
        t0 = time.time()
        out, _ = eff.run(inp, depth, 'GrandMaster', overrides or {}, frames=frames - 1)
        out2, rb = eff.run(inp, depth, 'GrandMaster', overrides or {}, frames=1,
                           readback=['V__GM_SSRResTex', 'V__GM_GeoQTex', 'V__GM_StatsTex', 'V__GM_U1Tex', 'V__GM_CompQTex'])
        dt = (time.time() - t0) / frames
        o = out2[..., :3]
        Image.fromarray(o).save(os.path.join(outdir, f'{n}_after.png'))
        Lin, Lout = luma(v['color']), luma(o)
        diff = np.abs(o.astype(np.int16) - v['color'].astype(np.int16)).astype(np.float32)
        Image.fromarray(np.clip(diff * 4, 0, 255).astype(np.uint8)).save(os.path.join(outdir, f'{n}_diff_x4.png'))
        stab = np.abs(out2[..., :3].astype(np.int16) - out[..., :3].astype(np.int16))
        nan_bad = {k: int((~np.isfinite(a.astype(np.float32))).sum()) for k, a in rb.items()}
        hm, h999 = halo_metric(Lin, Lout)
        r = dict(
            mean_rgb_in=v['color'].reshape(-1, 3).mean(0).round(2).tolist(),
            mean_rgb_out=o.reshape(-1, 3).mean(0).round(2).tolist(),
            edge_energy_in=round(grad_energy(Lin), 5), edge_energy_out=round(grad_energy(Lout), 5),
            mean_abs_diff=round(float(diff.mean()), 3),
            halo_mean=round(hm, 5), halo_p999=round(h999, 4),
            temporal_flicker_mean=round(float(stab.mean()), 4), temporal_flicker_max=int(stab.max()),
            nonfinite=nan_bad, stats=rb['V__GM_StatsTex'][0].astype(float).round(3).tolist(),
            sec_per_frame_llvmpipe=round(dt, 2),
        )
        if v.get('ui_mask') is not None:
            m = v['ui_mask']
            r['ui_mean_abs_diff'] = round(float(diff[m].mean()), 3)
            r['nonui_mean_abs_diff'] = round(float(diff[~m].mean()), 3)
            # text contrast inside the white shop panel
            x0, y0, x1, y1 = v['ui_boxes']['shop']
            pin, pout = Lin[y0:y1, x0:x1], Lout[y0:y1, x0:x1]
            r['shop_panel_contrast_in'] = round(float(np.percentile(pin, 99) - np.percentile(pin, 1)), 4)
            r['shop_panel_contrast_out'] = round(float(np.percentile(pout, 99) - np.percentile(pout, 1)), 4)
            r['shop_panel_max_abs_diff'] = int(diff[y0:y1, x0:x1].max())
        report[n] = r
        print(n, json.dumps(r))
    json.dump(report, open(os.path.join(outdir, 'metrics.json'), 'w'), indent=1)
    return report, eff


if __name__ == '__main__':
    tag = sys.argv[1]
    dm = sys.argv[2] if len(sys.argv) > 2 else 'linear'
    ov = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
    names = sys.argv[4].split(',') if len(sys.argv) > 4 else None
    run(tag, dm, ov, names)
