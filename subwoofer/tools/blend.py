import sys
from PIL import Image
# usage: blend.py outDir id  -> outDir/blend_<id>.png : photo | render | 50% blend
out=sys.argv[1]; i=sys.argv[2]
ref=Image.open(f'refs/{i}.webp').convert('RGBA'); bg=Image.new('RGBA',ref.size,(255,255,255,255)); bg.alpha_composite(ref); ref=bg.convert('RGB')
r=Image.open(f'{out}/render_{i}.png').convert('RGB'); ref=ref.resize(r.size,Image.LANCZOS)
bl=Image.blend(ref,r,0.5)
c=Image.new('RGB',(r.width*3,r.height),'white'); c.paste(ref,(0,0)); c.paste(r,(r.width,0)); c.paste(bl,(2*r.width,0)); c.save(f'{out}/blend_{i}.png'); print(c.size)
