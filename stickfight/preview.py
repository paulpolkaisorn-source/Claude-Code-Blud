import cairo
from compose import render_frame
from env import W, H


def sheet(sc, times_v, path, cols=4, cw=480, ch=270, label=True):
    rows = (len(times_v) + cols - 1) // cols
    out = cairo.ImageSurface(cairo.FORMAT_RGB24, cols * cw, rows * ch)
    c = cairo.Context(out)
    c.set_source_rgb(0, 0, 0)
    c.paint()
    for n, tv in enumerate(times_v):
        i = min(int(round(tv * 60)), sc.nframes - 1)
        s = render_frame(sc, i)
        c.save()
        c.translate((n % cols) * cw, (n // cols) * ch)
        c.scale(cw / W, ch / H)
        pat = cairo.SurfacePattern(s)
        pat.set_filter(cairo.FILTER_BEST)
        c.set_source(pat)
        c.paint()
        c.restore()
        if label:
            c.set_source_rgb(1, 1, 0)
            c.set_font_size(16)
            c.move_to((n % cols) * cw + 6, (n // cols) * ch + 18)
            c.show_text('%.2f w%.2f' % (tv, sc.frames[i]['w']))
    out.write_to_png(path)


def frame(sc, tv, path):
    i = min(int(round(tv * 60)), sc.nframes - 1)
    render_frame(sc, i).write_to_png(path)
