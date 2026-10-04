import sys
from PIL import Image
# usage: sbs.py outDir id [more ids]  -> outDir/sbs_<ids>.png  (reference | render rows)
out=sys.argv[1]; ids=sys.argv[2:]
rows=[]
for i in ids:
    ref=Image.open(f'refs/{i}.webp').convert('RGBA')
    bg=Image.new('RGBA',ref.size,(255,255,255,255)); bg.alpha_composite(ref); ref=bg.convert('RGB')
    r=Image.open(f'{out}/render_{i}.png').convert('RGB')
    ref=ref.resize(r.size,Image.LANCZOS)
    row=Image.new('RGB',(r.width*2,r.height),'white'); row.paste(ref,(0,0)); row.paste(r,(r.width,0)); rows.append(row)
W=max(x.width for x in rows); H=sum(x.height for x in rows)
c=Image.new('RGB',(W,H),'white'); y=0
for x in rows: c.paste(x,(0,y)); y+=x.height
c.save(f'{out}/sbs_{"_".join(ids)}.png'); print(c.size)
