"""Update only the original cover's chart, not its editorial layout or copy.

Run: python scripts/render-taiwan-outlook-cover.py /path/to/NotoSansTC.ttf
Requires Pillow. Exact values come from the same snapshot as the React charts.
The original cover.png is an immutable template; outside CHART_BOX pixels must
remain identical, including the title, subtitle, legend and original footer.
"""
from pathlib import Path
import json, math, sys
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'src/data/taiwan-outlook/evidence.json').read_text())
font_path = sys.argv[1]
S = 2
original = Image.open(root / 'src/assets/images/taiwan-japan-warning/cover.png').convert('RGB')
assert original.size == (1200, 630), 'Inspect template before changing its dimensions'
CHART_BOX = (60, 320, 1175, 593)
background = original.getpixel((0, 0))
im = Image.new('RGB', (1200*S, 630*S), background)
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
 d.polygon(pts,fill=background,outline=fill,width=2*S)
latest=data['taiwanPartial']['approval']
annual=[row for row in data['taiwan'] if row['year'] >= 2016]
# Preserve the original chart's USD billions unit and 2016 starting year.
values=[(r['year'],r['approvedOut'],r['approvedIn']) for r in annual]+[(2026,latest['outward'],latest['inward'])]
L,R,T,B=100,1091,330,530
xx=lambda i:L+i*(R-L)/(len(values)-1)
yy=lambda v:B-v/75*(B-T)
d.rectangle((xx(9.5)*S,T*S,1168*S,B*S),fill='#ededf0')
for v in [0,25,50,75]:
 line([(L,yy(v)),(1168,yy(v))],grid,1)
 txt(64,yy(v),str(v),16,muted,anchor='lm')
for col,color in [(1,ink),(2,'#9f9fa9')]:
 pts=[(xx(i),yy(v[col])) for i,v in enumerate(values)]
 line(pts[:-1],color,3 if col==1 else 2)
 dashed(pts[-2],pts[-1],color,3 if col==1 else 2,3,5)
 for x,y in pts[:-1]:d.ellipse(((x-3)*S,(y-3)*S,(x+3)*S,(y+3)*S),fill=color)
 diamond(*pts[-1],color)
 txt(R+15,pts[-1][1],f'{values[-1][col]:.2f}',17,color,550,anchor='lm')
txt(L,548,'2016',16,muted)
for year in [2024,2025,2026]:
 txt(xx(year-2016),548,str(year),16,ink if year==2026 else muted,anchor='mt')
txt(R,570,'1–8 月',15,ink,500,anchor='mt')
txt(L,575,'◇ 2026 為 1–8 月累計，未年化；核准金額不等於產能。',15,muted)
output=root/'src/assets/images/taiwan-japan-warning/cover-2026-ytd.png'
chart = im.resize(original.size,Image.Resampling.LANCZOS)
original.paste(chart.crop(CHART_BOX), CHART_BOX)
original.save(output,optimize=True)
print(output)
