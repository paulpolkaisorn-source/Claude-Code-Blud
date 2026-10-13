import sys, os, pickle, numpy as np
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); S = os.path.dirname(HERE)
sys.path.insert(0, HERE)
F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
def label(im, t):
    d = ImageDraw.Draw(im); d.rectangle((0, 0, 12 * len(t) + 16, 30), fill=(0, 0, 0)); d.text((6, 3), t, font=F, fill=(255, 255, 0)); return im
def sheet(paths, labels, out, cols=2, scale=0.5):
    ims = [label(Image.open(p).convert('RGB').resize((int(1280 * scale), int(768 * scale))), l) for p, l in zip(paths, labels)]
    w, h = ims[0].size; rows = (len(ims) + cols - 1) // cols
    sh = Image.new('RGB', (w * cols, h * rows))
    for i, im in enumerate(ims): sh.paste(im, ((i % cols) * w, (i // cols) * h))
    sh.save(out); return out
if __name__ == '__main__':
    tag, scene = sys.argv[1], sys.argv[2]
    extra = sys.argv[3:]
    p = [f'{S}/scenes/{scene}_input.png', f'{S}/results/{tag}/{scene}_after.png'] + [f'{S}/results/{e}/{scene}_after.png' for e in extra]
    sheet(p, ['BEFORE (input)', f'AFTER {tag}'] + extra, f'{S}/results/{tag}/{scene}_sheet.png', cols=2, scale=0.75 if not extra else 0.5)
