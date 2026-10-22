# reads Sylphy's art/*.png at build time -> trimmed, resized, mirrored-to-face-right WebP in public/art + sizes.json
from PIL import Image; import json, os
M={"car":"car","van":"van","lorry":"lorry","bus":"bus","moto":"motorcycle"}; M.update({k:f for k,f in {"fire":"fire","amb":"ambulance","tow":"tow","taxi":"taxi"}.items() if os.path.exists(f"art/{f}.png")}); os.makedirs("public/art",exist_ok=True); out={}
for k,f in M.items():
  im=Image.open(f"art/{f}.png").convert("RGBA"); im=im.crop(im.getchannel("A").getbbox())
  if k not in ("fire","amb","tow","taxi"): im=im.transpose(Image.FLIP_LEFT_RIGHT)
  w=min(440,im.width); im=im.resize((w,round(im.height*w/im.width)),Image.LANCZOS)
  im.save(f"public/art/{k}.webp","WEBP",quality=82,method=6); out[k]=[im.width,im.height]
json.dump(out,open("public/art/sizes.json","w")); json.dump(out,open("src/artsizes.json","w")); print(out)
# Build My Car: slice Sylphy's car into body / roof / wheel layers (same frame, mirrored like car.webp)
from PIL import ImageDraw
src=Image.open("art/car.png").convert("RGBA"); src=src.crop(src.getchannel("A").getbbox())
WH=[(443,485,84),(765,432,76),(112,492,64)]; CUT=242
def layer(mask):
  o=Image.new("RGBA",src.size,(0,0,0,0)); o.paste(src,(0,0),Image.composite(src.getchannel("A"),Image.new("L",src.size,0),mask)); return o
def save(im,n):
  im=im.transpose(Image.FLIP_LEFT_RIGHT).resize((440,round(src.height*440/src.width)),Image.LANCZOS); im.save(f"public/art/{n}.webp","WEBP",quality=85,method=6)
full=Image.new("L",src.size,255); wm=Image.new("L",src.size,0); d=ImageDraw.Draw(wm)
for x,y,r in WH: d.ellipse((x-r,y-r,x+r,y+r),fill=255)
from PIL import ImageChops
top=Image.new("L",src.size,0); ImageDraw.Draw(top).rectangle((0,0,src.width,CUT),fill=255)
body=layer(ImageChops.subtract(ImageChops.subtract(full,top),wm))
well=Image.new("RGBA",src.size,(0,0,0,0)); dw=ImageDraw.Draw(well)
for x,y,r in WH: dw.ellipse((x-r*.96,y-r*.96,x+r*.96,y+r*.96),fill=(70,62,58,235))
well.putalpha(ImageChops.multiply(well.getchannel('A'),ImageChops.subtract(full,top)))
body=Image.alpha_composite(well,body)
save(body,"car_body"); save(layer(top),"car_roof")
for i,(x,y,r) in enumerate(WH):
  m=Image.new("L",src.size,0); ImageDraw.Draw(m).ellipse((x-r,y-r,x+r,y+r),fill=255); m=ImageChops.subtract(m,top); save(layer(m),f"car_w{i}")
x,y,r=WH[0]; wi=src.crop((x-r,y-r,x+r,y+r)); mk=Image.new("L",wi.size,0); ImageDraw.Draw(mk).ellipse((2,2,2*r-2,2*r-2),fill=255); wi.putalpha(ImageChops.multiply(wi.getchannel("A"),mk)); wi.resize((160,160),Image.LANCZOS).save("public/art/wheel.webp","WEBP",quality=85)
# every other painted asset -> public/art/<name>.webp, listed in src/artlist.json (loaded on demand by pic())
import glob
SKIP={"car","van","lorry","bus","motorcycle","fire","ambulance","tow","taxi","preview","preview-helpers","style-ref"}
RIGHT=set()
lst={}
for f in sorted(glob.glob("art/*.png")+glob.glob("art/*.jpg")):
  n=os.path.splitext(os.path.basename(f))[0]
  if n in SKIP or "preview" in n: continue
  im=Image.open(f).convert("RGBA"); bg=n.startswith("bg-") or f.endswith(".jpg") or n in ("bedtime-bg",)
  if not bg and im.getchannel("A").getbbox(): im=im.crop(im.getchannel("A").getbbox())
  if n.startswith(("bedtime-","sleepy-")) and not bg and n not in RIGHT: im=im.transpose(Image.FLIP_LEFT_RIGHT)
  mx=1920 if bg else 700; s=min(1,mx/max(im.size)); im=im.resize((round(im.width*s),round(im.height*s)),Image.LANCZOS)
  (im.convert("RGB") if bg else im).save(f"public/art/{n}.webp","WEBP",quality=80,method=6); lst[n]=[im.width,im.height]
json.dump(lst,open("src/artlist.json","w"))
