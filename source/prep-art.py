# reads Sylphy's art/*.png at build time -> trimmed, resized, mirrored-to-face-right WebP in public/art + sizes.json
from PIL import Image; import json, os
M={"car":"car","van":"van","lorry":"lorry","bus":"bus","moto":"motorcycle"}; os.makedirs("public/art",exist_ok=True); out={}
for k,f in M.items():
  im=Image.open(f"art/{f}.png").convert("RGBA"); im=im.crop(im.getchannel("A").getbbox()).transpose(Image.FLIP_LEFT_RIGHT)
  w=min(440,im.width); im=im.resize((w,round(im.height*w/im.width)),Image.LANCZOS)
  im.save(f"public/art/{k}.webp","WEBP",quality=82,method=6); out[k]=[im.width,im.height]
json.dump(out,open("public/art/sizes.json","w")); json.dump(out,open("src/artsizes.json","w")); print(out)
