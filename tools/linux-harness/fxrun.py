"""Headless executor for ReShade FX effects (via fxdump GLSL output) on Mesa llvmpipe.

Usage (as module): run_effect(module_dir, color_rgb_u8, depth_f32, technique, overrides, frames)
Conventions: images are numpy arrays, row 0 = top of screen (D3D convention).
"""
import json, os, re, numpy as np, moderngl

FMT = {  # reshadefx texture_format -> (components, moderngl dtype)
    61: (1, 'f1'), 54: (1, 'f2'), 56: (1, 'f2'), 41: (1, 'f4'),
    49: (2, 'f1'), 34: (2, 'f2'), 35: (2, 'f2'), 16: (2, 'f4'),
    28: (4, 'f1'), 10: (4, 'f2'), 11: (4, 'f2'), 2: (4, 'f4'),
    24: (4, 'f2'), 26: (4, 'f2'),
}

class Effect:
    def __init__(self, mod_dir, width, height, ctx=None):
        self.ctx = ctx or moderngl.create_standalone_context(backend='egl', require=430)
        self.dir = mod_dir
        self.m = json.load(open(os.path.join(mod_dir, 'module.json')))
        self.W, self.H = width, height
        ctx = self.ctx
        self.tex = {}
        for t in self.m['textures']:
            if t['semantic'] == 'COLOR':
                tx = ctx.texture((width, height), 4, dtype='f1')
                self.color_name = t['unique_name']
            elif t['semantic'] == 'DEPTH':
                tx = ctx.texture((width, height), 1, dtype='f4')
                self.depth_name = t['unique_name']
            else:
                comps, dt = FMT[t['format']]
                tx = ctx.texture((t['width'], t['height']), comps, dtype=dt)
                if t['levels'] > 1:
                    tx.build_mipmaps(0, t['levels'] - 1)
                tx.write(np.zeros((t['height'], t['width'], comps), dtype={'f1': np.uint8, 'f2': np.float16, 'f4': np.float32}[dt]).tobytes())
            tx.repeat_x = tx.repeat_y = False
            self.tex[t['unique_name']] = (tx, t)
        self.bb = ctx.texture((width, height), 4, dtype='f1')
        self.samplers = []
        for s in self.m['samplers']:
            sm = ctx.sampler()
            lin_min = (s['filter'] & 0x10) != 0
            lin_mag = (s['filter'] & 0x04) != 0
            lin_mip = (s['filter'] & 0x01) != 0
            mn = (moderngl.LINEAR if lin_min else moderngl.NEAREST)
            tinfo = self.tex[s['texture']][1]
            if tinfo['levels'] > 1 and tinfo['semantic'] == '':  # mip filter only on complete mip chains
                mn = {(False, False): moderngl.NEAREST_MIPMAP_NEAREST, (True, False): moderngl.LINEAR_MIPMAP_NEAREST,
                      (False, True): moderngl.NEAREST_MIPMAP_LINEAR, (True, True): moderngl.LINEAR_MIPMAP_LINEAR}[(lin_min, lin_mip)]
            sm.filter = (mn, moderngl.LINEAR if lin_mag else moderngl.NEAREST)
            rep = s['address_u'] in (1, 2)
            sm.repeat_x = rep; sm.repeat_y = s['address_v'] in (1, 2)
            if s['address_u'] == 4 or s['address_v'] == 4:
                sm.border_color = (0, 0, 0, 0)
            if s['srgb']:
                print('warning: srgb sampler not emulated', s['name'])
            self.samplers.append((sm, s))
        self.programs = {}
        self.ubo = ctx.buffer(reserve=max(16, (self.m['total_uniform_size'] + 15) // 16 * 16))
        self.uvals = {}
        for u in self.m['uniforms']:
            if 'init' in u:
                self.uvals[u['name']] = u['init']
        self.vao = ctx.vertex_array(self.program_for('PostProcessVS', None) if False else None, []) if False else None
        self.frame = 0
        self.fbos = {}

    def glsl(self, ep):
        src = open(os.path.join(self.dir, ep + '.glsl')).read()
        return src

    def program_for(self, vs, ps):
        key = (vs, ps)
        if key not in self.programs:
            vsrc = self.glsl(vs)
            psrc = self.glsl(ps)
            prog = self.ctx.program(vertex_shader=vsrc, fragment_shader=psrc)
            vao = self.ctx.vertex_array(prog, [])
            self.programs[key] = (prog, vao)
        return self.programs[key]

    def set_uniforms(self, overrides):
        buf = bytearray(self.ubo.size)
        for u in self.m['uniforms']:
            a = u['annotations']
            name = u['name']
            if name in overrides:
                v = overrides[name]
            elif 'source' in a:
                src = a['source']
                v = {'framecount': self.frame, 'timer': self.frame * 16.6667, 'frametime': 16.6667}.get(src, 0)
            else:
                v = self.uvals.get(name, 0)
            v = np.atleast_1d(np.array(v, dtype=np.float64)).ravel()
            n = u['rows'] * max(1, u['cols']) * max(1, u['array'])
            if v.size < n:
                v = np.resize(v, n)
            if u['base'] == 'float':
                b = v.astype(np.float32).tobytes()
            elif u['base'] == 'uint':
                b = v.astype(np.uint32).tobytes()
            else:
                b = v.astype(np.int32).tobytes()
            if u['array'] > 1 or u['cols'] > 1:
                raise NotImplementedError('array/matrix uniforms not supported: ' + name)
            off = u['offset']
            buf[off:off + len(b)] = b[:u['size']]
        self.ubo.write(bytes(buf))

    def fbo_for(self, rts):
        key = tuple(rts)
        if key not in self.fbos:
            atts = [self.bb] if not rts else [self.tex[r][0] for r in rts]
            self.fbos[key] = self.ctx.framebuffer(color_attachments=atts)
        return self.fbos[key]

    def copy_bb_to_color(self):
        self.ctx.copy_framebuffer(self.tex[self.color_name][0], self.fbo_for([]))

    def run(self, color_u8, depth_f32, technique, overrides=None, frames=1, readback=None, timing=None):
        overrides = overrides or {}
        ctx = self.ctx
        tech = [t for t in self.m['techniques'] if t['name'] == technique][0]
        outs = {}
        for f in range(frames):
            self.tex[self.color_name][0].write(np.ascontiguousarray(color_u8).tobytes())
            if hasattr(self, 'depth_name'):
                self.tex[self.depth_name][0].write(np.ascontiguousarray(depth_f32.astype(np.float32)).tobytes())
            self.bb.write(np.ascontiguousarray(color_u8).tobytes())
            self.set_uniforms(overrides)
            self.ubo.bind_to_uniform_block(0)
            import time as _t
            for pi, p in enumerate(tech['passes']):
                if timing is not None: ctx.finish(); _t0 = _t.perf_counter()
                prog, vao = self.program_for(p['vs'], p['ps'])
                for b in p['bindings']:
                    sm, s = self.samplers[b['sampler']]
                    tx = self.tex[s['texture']][0]
                    tx.use(location=b['binding'])
                    sm.use(location=b['binding'])
                fbo = self.fbo_for(p['rts'])
                fbo.use()
                if p['rts']:
                    t0 = self.tex[p['rts'][0]][0]
                    w, h = t0.size
                else:
                    w, h = self.W, self.H
                if p['vp_w']:
                    w, h = p['vp_w'], p['vp_h']
                ctx.viewport = (0, 0, w, h)
                if p['clear']:
                    fbo.clear(0, 0, 0, 0)
                if p['blend']:
                    ctx.enable(moderngl.BLEND)
                    bf = {0: moderngl.ZERO, 1: moderngl.ONE, 3: moderngl.SRC_COLOR, 4: moderngl.ONE_MINUS_SRC_COLOR,
                          5: moderngl.DST_COLOR, 6: moderngl.ONE_MINUS_DST_COLOR, 7: moderngl.SRC_ALPHA,
                          8: moderngl.ONE_MINUS_SRC_ALPHA, 9: moderngl.DST_ALPHA, 10: moderngl.ONE_MINUS_DST_ALPHA}
                    ctx.blend_func = (bf[p['src_blend']], bf[p['dst_blend']])
                else:
                    ctx.disable(moderngl.BLEND)
                vao.render(mode=moderngl.TRIANGLES, vertices=p['num_vertices'])
                if p['rts'] and p['gen_mips']:
                    for r in p['rts']:
                        tx, ti = self.tex[r]
                        if ti['levels'] > 1:
                            tx.build_mipmaps(0, ti['levels'] - 1)
                if not p['rts']:
                    self.copy_bb_to_color()
                if timing is not None:
                    ctx.finish(); timing.setdefault(p['name'] or p['ps'], []).append(_t.perf_counter() - _t0)
            ctx.finish()
            self.frame += 1
        res = np.frombuffer(self.fbo_for([]).read(components=4, dtype='f1'), dtype=np.uint8).reshape(self.H, self.W, 4)
        if readback:
            for name in readback:
                tx, ti = self.tex[name]
                comps, dt = FMT[ti['format']]
                npdt = {'f1': np.uint8, 'f2': np.float16, 'f4': np.float32}[dt]
                arr = np.frombuffer(tx.read(), dtype=npdt).reshape(tx.size[1], tx.size[0], comps)
                outs[name] = arr
        return res, outs
