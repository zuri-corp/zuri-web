from PIL import Image,ImageDraw,ImageFont
import cv2,numpy as np,math,json
from pathlib import Path
OUT=Path(__file__).parent
W,H=720,1280;FPS=12;DURATION=7.5
BG='#0c1420';PANEL='#122b2a';CARD='#1e4240';TEXT='#f5faf9';MUTED='#b9d0cd';ACC='#8df1df'
fontdir=Path('C:/Windows/Fonts')
def f(n,bold=False):return ImageFont.truetype(str(fontdir/('segoeuib.ttf' if bold else 'segoeui.ttf')),n)
def rr(d,box,fill,r=20,outline=None):d.rounded_rectangle(box,r,fill=fill,outline=outline,width=1)
def txt(d,xy,t,size=24,color=TEXT,bold=False):d.text(xy,t,font=f(size,bold),fill=color)
def wrap(d,text,width,size=25):
 words=text.split();lines=[];line=''
 for word in words:
  trial=(line+' '+word).strip()
  if d.textlength(trial,font=f(size))>width and line:lines.append(line);line=word
  else:line=trial
 if line:lines.append(line)
 return lines
def para(d,xy,text,width,size=25,color=TEXT,bold=False):
 x,y=xy
 for line in wrap(d,text,width,size):txt(d,(x,y),line,size,color,bold);y+=size*1.4
 return y
def button(d,y,label,primary=True,x=131,w=458):
 rr(d,(x,y,x+w,y+53),ACC if primary else CARD,16);txt(d,(x+17,y+10),label,22,'#103833' if primary else TEXT,True)
def field(d,y,label,value=''):
 txt(d,(137,y),label,19,MUTED,True);rr(d,(132,y+29,588,y+82),CARD,14);txt(d,(148,y+41),value,22)
def art(d,box,tone=0):
 x,y,x2,y2=box;rr(d,box,['#24494b','#303b62','#524153'][tone%3],17)
 d.ellipse((x2-135,y+15,x2-38,y+112),fill=['#e8bf7b','#b3a5ed','#94d9ce'][tone%3])
 d.polygon([(x,y2),(x,y2-45),(x+125,y+55),(x+245,y2-25),(x2,y+85),(x2,y2)],fill=['#326c66','#50618c','#826076'][tone%3])
 d.line((x,y2-15,x2,y2-15),fill='#8df1df',width=3)
def phone(d):
 rr(d,(106,278,614,1076),'#050b12',37, '#385451');rr(d,(117,291,603,1065),PANEL,28)
 txt(d,(140,304),'Aura',26,ACC,True);d.ellipse((556,307,581,332),fill='#4e4268')
 d.line((119,346,602,346),fill='#274541',width=1)
def nav(d,active='Spaces'):
 rr(d,(132,985,588,1046),'#234844',22)
 for i,name in enumerate(['Feed','Spaces','Societies','Find']):
  x=142+i*111
  if name==active:rr(d,(x-2,992,x+104,1038),'#37645e',14)
  txt(d,(x+6,1005),name,17,TEXT if name==active else MUTED,True)
scenes=[
 ('YOUR PLACES. YOUR POSSIBILITIES.','Meet Spaces','Find a place, explore what it offers, and take your next step.',(360,670)),
 ('01 / DISCOVER','Find your kind of place','Open Aura, then Spaces. Search by name, location or what you need.',(355,404)),
 ('02 / EXPLORE','Get to know a Space','Open a Space to see its introduction, location, offerings and activity.',(480,628)),
 ('03 / OFFERINGS','See what is on offer','Browse an offering, review the details and price, then prepare a request.',(360,823)),
 ('04 / ENQUIRE','Start with a question','Ask about availability or explain what you need. Requests stay as local drafts in this preview.',(360,839)),
 ('05 / CREATE','Give your place a presence','Open Your Spaces & management. Add your photo, identity and location, then save your draft.',(360,917)),
 ('06 / CUSTOMER VIEW','See it through their eyes','From your Space Wall, choose Preview as a customer. Review the experience before enabling your local listing.',(360,539)),
 ('MAKE ROOM FOR POSSIBILITY','Explore. Connect. Create.','Your next place is in Aura. Open Spaces and find a possibility worth following.',(360,636))]

def scene(i):
 im=Image.new('RGB',(W,H),BG);d=ImageDraw.Draw(im)
 txt(d,(48,43),'ZURI',25,ACC,True);txt(d,(518,48),'HOW TO / 01',15,MUTED,True)
 txt(d,(48,112),scenes[i][0],17,ACC,True);para(d,(48,147),scenes[i][1],640,40,TEXT,True)
 phone(d)
 if i in [0,1,7]:
  rr(d,(132,368,588,425),CARD,16);txt(d,(151,385),'Search Spaces' if i!=1 else 'A place to create...',23,MUTED)
  for j,(name,sub) in enumerate([('River House','Gather. Create. Belong.'),('The Workshop','Ideas taking shape.')]):
   y=450+j*232;art(d,(133,y,587,y+146),j);txt(d,(147,y+156),name,25,TEXT,True);txt(d,(147,y+191),sub,18,MUTED)
  nav(d)
  if i==7:
   rr(d,(145,550,575,735),'#132d2beF'[:7],22);txt(d,(178,584),'Find your next Space.',28,ACC,True);txt(d,(178,635),'Aura  /  Spaces',26,TEXT,True)
 elif i==2:
  art(d,(132,366,588,526));txt(d,(137,544),'River House',32,TEXT,True);txt(d,(138,591),'A home for ideas and good company.',20,MUTED)
  button(d,636,'Follow Space',False,w=220);button(d,636,'Enquire',x=368,w=220)
  txt(d,(141,722),'Overview     Offerings     Activity',19,ACC,True)
  rr(d,(132,765,588,929),CARD,20);txt(d,(151,786),'What you can do here',25,TEXT,True);para(d,(151,834),'Explore spaces to meet, make and spend time together.',410,23,MUTED)
 elif i==3:
  txt(d,(138,371),'River House / Offerings',24,TEXT,True);art(d,(133,425,587,650),1)
  txt(d,(151,674),'Creative studio session',27,TEXT,True);txt(d,(151,718),'Review price and booking details',21,MUTED);rr(d,(132,764,588,885),CARD,20);txt(d,(152,783),'A little space to make something.',23);txt(d,(152,829),'View offering details  >',24,ACC,True)
 elif i==4:
  txt(d,(138,370),'Enquire / River House',25,TEXT,True);field(d,430,'What are you planning?','A small creative gathering')
  txt(d,(138,552),'Your question',19,MUTED,True);rr(d,(132,586,588,737),CARD,18);para(d,(149,605),'Do you have space for a small group? What should we know before planning?',416,24)
  button(d,811,'Save enquiry draft');para(d,(139,894),'Saved on this device. No enquiry is sent in this preview.',440,19,MUTED)
 elif i==5:
  txt(d,(138,369),'Create a Space',29,TEXT,True);button(d,423,'+ Add Space photo',False);field(d,502,'Space name','River House');field(d,608,'Category','Creative studio');field(d,714,'Public meeting area','Jinja')
  txt(d,(142,825),'[x] I am authorized to represent this Space',18,MUTED);button(d,891,'Save Space draft')
 elif i==6:
  txt(d,(138,373),'River House',32,TEXT,True);txt(d,(138,420),'Your Space Wall',22,MUTED);rr(d,(132,465,588,503),CARD,13);txt(d,(148,472),'Private draft',19,ACC)
  button(d,519,'Preview as a customer')
  for j,label in enumerate(['Identity & consent','Offerings & availability','Tagged moments & associations']):
   y=610+j*77;rr(d,(132,y,588,y+64),CARD,16);txt(d,(151,y+18),label,21)
  para(d,(139,869),'Previewing does not publish your Space.',440,21,MUTED)
 txt(d,(48,1105),'SPACES / '+str(i+1).zfill(2),16,ACC,True)
 para(d,(48,1141),scenes[i][2],624,25,TEXT)
 txt(d,(48,1244),'Illustrated walkthrough - current device-local preview',14,MUTED)
 return im
bases=[scene(i) for i in range(8)]
for i,im in enumerate(bases):im.save(OUT/f'scene-{i+1:02}.png')
writer=cv2.VideoWriter(str(OUT/'ZURI-Spaces-Guide.webm'),cv2.VideoWriter_fourcc(*'VP80'),FPS,(W,H))
assert writer.isOpened()
for i,base in enumerate(bases):
 for frame in range(int(DURATION*FPS)):
  im=base.copy();d=ImageDraw.Draw(im);t=frame/FPS
  if 2<t<5.8:
   x,y=scenes[i][3];r=18+int(12*(.5+.5*math.sin(t*4)));d.ellipse((x-r,y-r,x+r,y+r),outline=ACC,width=3);d.ellipse((x-5,y-5,x+5,y+5),fill=ACC)
  progress=(i+t/DURATION)/8;d.rectangle((0,0,int(W*progress),4),fill=ACC)
  if frame<5:
   prev=bases[max(i-1,0)] if i else Image.new('RGB',(W,H),BG);im=Image.blend(prev,im,(frame+1)/5)
  writer.write(cv2.cvtColor(np.asarray(im),cv2.COLOR_RGB2BGR))
 writer.release() if False else None
 print('Rendered scene',i+1,flush=True)
writer.release()
cap=cv2.VideoCapture(str(OUT/'ZURI-Spaces-Guide.webm'));frames=int(cap.get(cv2.CAP_PROP_FRAME_COUNT));fps=cap.get(cv2.CAP_PROP_FPS);ok,first=cap.read();cap.set(cv2.CAP_PROP_POS_FRAMES,frames-1);last_ok,last=cap.read();cap.release()
assert ok and last_ok and frames==720
(OUT/'verification.json').write_text(json.dumps({'width':720,'height':1280,'frames':frames,'fps':fps,'seconds':frames/fps,'codec':'VP8','first_frame_readable':ok,'last_frame_readable':last_ok},indent=2))
lines=[]
def stamp(sec):return f'00:{int(sec)//60:02}:{int(sec)%60:02},{int(sec%1*1000):03}'
for i,sc in enumerate(scenes):lines.extend([str(i+1),stamp(i*DURATION)+' --> '+stamp((i+1)*DURATION),sc[2],''])
(OUT/'ZURI-Spaces-Guide.srt').write_text('\n'.join(lines),encoding='utf-8')
(OUT/'README.md').write_text('# ZURI Spaces guide\n\n60-second portrait, captioned silent video. Illustrated screens explain current flows; this is not a live screen recording. Includes discovery, offerings, enquiries, Space creation and customer preview. User records were not used.\n',encoding='utf-8')
print('Verified',frames,'frames',frames/fps,'seconds',flush=True)
