#!/usr/bin/env python3
import os,re,io,json,time,math,subprocess,urllib.parse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
import requests
from PIL import Image, ImageOps, ImageDraw, ImageFont
import numpy as np

OUT=Path("build"); OUT.mkdir(exist_ok=True)
SIZE=1080; FPS=30
s=requests.Session()
s.headers.update({"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36","Referer":"https://cults3d.com/","Accept":"image/avif,image/webp,image/apng,image/*,*/*;q=0.8"})

def req(url):
    last=None
    for trial in range(4):
        try:
            r=s.get(url,timeout=32);r.raise_for_status()
            return r
        except Exception as e:
            last=e;time.sleep(1+trial*2)
    raise Exception(str(last))
def full(u):
    if "/https://fbi.cults3d.com/" in u:
        return "https://fbi.cults3d.com/"+u.split("/https://fbi.cults3d.com/",1)[1]
    if u.startswith("//"):return "https:"+u
    return u
def gallery(url):
    from bs4 import BeautifulSoup
    from urllib.parse import unquote
    slug=url.rstrip("/").split("/")[-1]
    variants=[
        url,
        "https://www.3dgo.app/models/cults3d/"+slug,
        "https://3dgo.app/models/cults3d/"+slug,
        "https://r.jina.ai/https://cults3d.com/en/3d-model/art/"+slug,
        "https://polyzon.org/model/cults3d/c3d-"+slug,
    ]
    ret=[]
    for page in variants:
        try:
            html=req(page).text
            soup=BeautifulSoup(html,"html.parser")
            found=[]
            for e in soup.find_all(["img","source","meta"]):
                for key in ["data-src","data-original","data-zoom","data-image","data-lazy-src","src","content","srcset"]:
                    v=e.get(key,"")
                    if not v:continue
                    if key=="srcset":v=v.split(",")[-1].strip().split(" ")[0]
                    if "illustration-file" in v and ".mp4" not in v.lower():
                        found.append(v)
            for v in re.findall(r'https?:(?:\\?/\\?/|//)[^\s"<>]+?(?:\.png|\.jpg|\.jpeg|\.webp)',html,flags=re.I):
                found.append(v.replace("\\/","/"))
            for v in re.findall(r'https?://[^\s\)\]\"<>]+?(?:\.png|\.jpg|\.jpeg|\.webp)',html,flags=re.I):
                found.append(v)
            for v in re.findall(r'(?i)https?%3A%2F%2F[^\s"<>]+?%(?:2E|2e)(?:png|jpg|jpeg|webp)',html):
                found.append(unquote(v))
            found=[full(unquote(x.replace("&amp;","&").replace("\\/","/"))) for x in found if "illustration-file" in x]
            print("GALLERY_SCAN",page,"html",len(html),"candidates",len(found),found[:2],flush=True)
            ret+=found
        except Exception as e:print("GALLERY_SCAN_FAILED",page,str(e)[:120],flush=True)
        if ret:break
    seen=set();res=[]
    for u in ret:
        u=u.split(" ")[0]
        if u not in seen and "illustration-file" in u and re.search(r'\.(png|jpe?g|webp)(?:\?|$)',u,re.I):
            res.append(u);seen.add(u)
    return res

def retrieve(item,idx):
    path=OUT/f"{idx:02d}.jpg"
    if path.exists() and path.stat().st_size>50000:return str(path)
    src=full(item.get("imageUrl",""))
    urls=([src] if re.search(r'\.(png|jpe?g|webp)(?:\?|$)',src,re.I) else [])
    if not urls:
        urls=gallery(item["url"])
    errors=[]
    for url in urls:
        try:
            b=req(url).content
            im=Image.open(io.BytesIO(b));im.load();im=ImageOps.exif_transpose(im).convert("RGB")
            if min(im.size)<700:raise Exception("below original-quality threshold "+str(im.size))
            im.save(path,quality=97,subsampling=0)
            print(idx,item["title"],im.size,"bytes",len(b),flush=True)
            return str(path)
        except Exception as e:errors.append(str(e)[:120])
    if len(urls)==1:
        try:
            for url in gallery(item["url"]):
                if url in urls:continue
                try:
                    b=req(url).content;im=Image.open(io.BytesIO(b));im.load()
                    if min(im.size)<700:continue
                    ImageOps.exif_transpose(im).convert("RGB").save(path,quality=97,subsampling=0)
                    print(idx,item["title"],im.size,"fallback",len(b),flush=True)
                    return str(path)
                except Exception as e:errors.append(str(e)[:120])
        except Exception as e:errors.append("gallery "+str(e)[:120])
    raise Exception(f"Failed {idx} {item['title']} {item['url']} {errors[:3]}")
data=req("https://raw.githubusercontent.com/cyberpop3d/shop/main/data/cults-collections.json").json()["collections"]
items=[]
for month in ("2026-09","2026-10","2026-11"):
    for x in reversed(data[month]):items.append(x)
items.append({"title":"Broly Multipart No-AMS","url":"https://cults3d.com/en/3d-model/art/broly-multipart-no-ams","imageUrl":""})
assert len(items)==38,len(items)

# CyberPOP's own live catalog already selects the first STILL after a video.
# It calls the owner's Cults3D GraphQL catalog and returns original upload URLs.
try:
    live=req("https://cyberpopstudio.com/api/cults-public?limit=50").json()
    if not live.get("ok"):raise Exception("live catalog returned "+str(live)[:400])
    byslug={urllib.parse.urlparse(x.get("url") or "").path.rstrip("/").split("/")[-1]:x for x in live.get("results",[])}
    print("LIVE_CATALOG",len(byslug),"items",flush=True)
    for i,item in enumerate(items):
        key=urllib.parse.urlparse(item.get("url") or "").path.rstrip("/").split("/")[-1]
        match=byslug.get(key)
        if match and match.get("imageUrl") and (not item.get("imageUrl") or item["imageUrl"].lower().endswith(".mp4")):
            item["imageUrl"]=match["imageUrl"]
            print("LIVE_IMAGE",i+1,item["title"],item["imageUrl"],flush=True)
except Exception as e:print("LIVE_CATALOG_ERROR",repr(e),flush=True)
(OUT/"manifest.json").write_text(json.dumps(items,indent=2))
results=[None]*len(items);errors=[]
with ThreadPoolExecutor(max_workers=5) as pool:
    futs={pool.submit(retrieve,x,i+1):i for i,x in enumerate(items)}
    for f in as_completed(futs):
        i=futs[f]
        try:results[i]=f.result()
        except Exception as e:
            print("ERROR",repr(e),flush=True)
            errors.append(str(e))
if errors:
    (OUT/"errors.txt").write_text("\n".join(errors))
    raise RuntimeError(f"{len(errors)} originals missing: "+str(errors))
print("All 38 full-resolution images acquired; rendering",flush=True)

def sq(path):
    img=Image.open(path).convert("RGB")
    return np.asarray(ImageOps.fit(img,(SIZE,SIZE),method=Image.Resampling.LANCZOS,centering=(0.5,0.5)),dtype=np.uint8)

# temporary custom outro: replaced by exact provided jpeg in local finishing step
outro=Image.new("RGB",(SIZE,SIZE),(14,13,24))
d=ImageDraw.Draw(outro)
font="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
F=ImageFont.truetype(font,110)
def center_text(y,t,ft,color):
    box=d.textbbox((0,0),t,font=ft)
    d.text(((SIZE-(box[2]-box[0]))/2,y),t,font=ft,fill=color)
center_text(360,"CYBERPOP",F,(248,249,249))
center_text(500,"3D",ImageFont.truetype(font,130),(238,12,129))
center_text(760,"Cults3D    |    PATREON",ImageFont.truetype(font,40),(243,243,245))
end=np.asarray(outro,dtype=np.uint8)

angles=(np.arctan2(np.arange(SIZE,dtype=np.float32)[:,None]-SIZE/2,np.arange(SIZE,dtype=np.float32)[None,:]-SIZE/2)+math.pi/2)%(math.pi*2)
center=(SIZE//2,SIZE//2)
def clock(a,b,p):
    import cv2
    frame=np.where((angles < 2*math.pi*p)[:,:,None],b,a).copy()
    ang=-math.pi/2+2*math.pi*p
    tip=(int(center[0]+SIZE*.68*math.cos(ang)),int(center[1]+SIZE*.68*math.sin(ang)))
    cv2.line(frame,center,tip,(180,180,190),2,cv2.LINE_AA)
    cv2.circle(frame,center,7,(238,238,238),-1,cv2.LINE_AA)
    cv2.circle(frame,center,3,(31,30,31),-1,cv2.LINE_AA)
    return frame
frames=[sq(x) for x in results]
durations=np.linspace(1.32,0.47,38)
total=sum(round(x*FPS) for x in durations)+60
# Raw frames streamed to ffmpeg, no large temporary source MP4
video=OUT/"CyberPOP_38_silent.mp4"
cmd=["ffmpeg","-y","-hide_banner","-loglevel","error","-f","rawvideo","-pixel_format","rgb24","-video_size",f"{SIZE}x{SIZE}","-framerate",str(FPS),"-i","pipe:0","-an","-c:v","libx264","-preset","veryfast","-crf","19","-pix_fmt","yuv420p","-movflags","+faststart",str(video)]
p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
for i,fr in enumerate(frames):
    n=round(durations[i]*FPS);tr=min(5,n//2) if i else 0
    if i:
        for k in range(tr):p.stdin.write(clock(frames[i-1],fr,(k+1)/(tr+1)).tobytes())
    for k in range(n-tr):p.stdin.write(fr.tobytes())
for k in range(5):p.stdin.write(clock(frames[-1],end,(k+1)/6).tobytes())
for k in range(55):p.stdin.write(end.tobytes())
p.stdin.close();rc=p.wait()
assert rc==0,rc
# Short per-transition mechanical tick, subtle sound design
import wave
rng=np.random.default_rng(27);sr=44100
tframe=round(total*sr/FPS);a=np.zeros(tframe,dtype=np.float32)
pos=0
for dur in durations:
    offset=int(pos/FPS*sr)
    tt=np.arange(1800,dtype=np.float32)/sr
    tick=(rng.standard_normal(len(tt))*.12+np.sin(2*np.pi*1550*tt)*.09)*np.exp(-140*tt)
    n=min(len(tt),len(a)-offset)
    if n>0:a[offset:offset+n]+=tick[:n]
    pos+=round(dur*FPS)
with wave.open(str(OUT/"ticks.wav"),"wb") as wav:
    wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(sr);wav.writeframes((np.clip(a,-.9,.9)*32767).astype("<i2").tobytes())
output=OUT/"CyberPOP_38_Clock_Showcase.mp4"
subprocess.run(["ffmpeg","-y","-hide_banner","-loglevel","error","-i",str(video),"-i",str(OUT/"ticks.wav"),"-c:v","copy","-c:a","aac","-b:a","128k","-shortest","-movflags","+faststart",str(output)],check=True)
print("SUCCESS",output,output.stat().st_size,"duration seconds",total/FPS,flush=True)
