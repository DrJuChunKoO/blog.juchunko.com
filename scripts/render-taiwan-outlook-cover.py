"""Render the data-based cover: python scripts/render-taiwan-outlook-cover.py /path/to/NotoSansTC.ttf
Requires Pillow. Values are read from the same evidence snapshot as the React charts.
"""
from pathlib import Path
import json, math, sys
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'src/data/taiwan-outlook/evidence.json').read_text())
font_path = sys.argv[1]
S = 2
im = Image.new('RGB', (1600*S, 840*S), '#f8f8f8')
d = ImageDraw.Draw(im)
ink, muted, grid = '#18181b', '#6b6b73', '#dedee2'
def font(size, weight=450):
 f = ImageFont.truetype(font_path, int(size*S))
 try: f.set_variation_by_axes([weight])
 except (AttributeError, OSError): pass
 return f
def txt(x,y,text,size=24,fill=ink,weight=450,anchor='lt'):
 d.text((x*S,y*S),text,font=font(size,weight),fill=fill,anchor=anchor)
def line(points,fill=ink,width=2):
 d.line([(x*S,y*S) for x,y in points],fill=fill,width=int(width*S))
def dashed(a,b,fill,width=3,dash=7,gap=7):
 dx,dy=b[0]-a[0],b[1]-a[1]; length=math.hypot(dx,dy)
 if not length: return
 for start in range(0,math.ceil(length),dash+gap):
  end=min(length,start+dash)
  line([(a[0]+dx*start/length,a[1]+dy*start/length),(a[0]+dx*end/length,a[1]+dy*end/length)],fill,width)
def diamond(x,y,fill):
 pts=[((x+a)*S,(y+b)*S) for a,b in [(0,-7),(7,0),(0,7),(-7,0)]]
 d.polygon(pts,fill='#f8f8f8',outline=fill,width=3*S)
latest=data['taiwanPartial']['approval']
annual=data['taiwan']
values=[(r['year'],r['approvedOut']*10,r['approvedIn']*10) for r in annual]+[(2026,latest['outward']*10,latest['inward']*10)]
txt(72,40,'THE TAIWAN CLOCK  /  2026.10',22,muted)
txt(72,92,'八個月，已超過前兩年各自全年',64,weight=650)
txt(74,190,'2026 年 1–8 月 · 核准對外投資',27,muted)
txt(70,234,f"{latest['outward']*10:.2f}",72,weight=650)
txt(333,275,'億美元',28)
txt(980,194,f"2024 全年   {annual[-2]['approvedOut']*10:.2f} 億",26,muted)
txt(980,241,f"2025 全年   {annual[-1]['approvedOut']*10:.2f} 億",26,muted)
L,R,T,B=98,1416,353,674
xx=lambda i:L+i*(R-L)/(len(values)-1)
yy=lambda v:B-v/700*(B-T)
d.rectangle((xx(10.55)*S,T*S,1530*S,B*S),fill='#ededf0')
txt(L,317,'億美元',21,muted)
line([(748,327),(790,327)],ink,4);txt(803,313,'核准對外投資',22)
dashed((1086,327),(1128,327),muted,3);txt(1141,313,'核准僑外來台',22,muted)
for v in [0,200,400,600]:
 line([(L,yy(v)),(1530,yy(v))],grid,1)
 txt(L-18,yy(v),str(v),22,muted,anchor='rm')
for col,color in [(1,ink),(2,muted)]:
 pts=[(xx(i),yy(v[col])) for i,v in enumerate(values)]
 if col==1: line(pts[:-1],color,4)
 else:
  for a,b in zip(pts[:-2],pts[1:-1]): dashed(a,b,color,3,8,6)
 dashed(pts[-2],pts[-1],color,4 if col==1 else 3,3,7)
 for x,y in pts[:-1]:d.ellipse(((x-3)*S,(y-3)*S,(x+3)*S,(y+3)*S),fill=color)
 diamond(*pts[-1],color)
 txt(R+18,pts[-1][1]-1,f'{values[-1][col]:.2f}',25,color,650,anchor='lm')
for year in [2015,2018,2021,2024,2025,2026]:
 txt(xx(year-2015),693,str(year),23,ink if year==2026 else muted,anchor='mt')
txt(R,726,'1–8 月',23,ink,550,anchor='mt')
txt(72,765,'◇ 2026 為已公布的累計金額，未年化；點線區分部分年度。',22,muted)
txt(72,801,'來源：經濟部投審司。2015–2025 為全年；不含另列對中國大陸投資與陸資來台。',21,muted)
output=root/'src/assets/images/taiwan-japan-warning/cover-2026-ytd.png'
im.resize((1600,840),Image.Resampling.LANCZOS).save(output,optimize=True)
print(output)
