"""Render the English edition of the Taiwan outlook cover from scratch.

Run: uv run --with pillow python scripts/render-taiwan-outlook-cover-en.py
Mirrors the zh cover's layout (kicker / title / subtitle / tagline / legend /
chart / footnotes) with English copy; chart geometry and data identical to
render-taiwan-outlook-cover.py.
"""
from pathlib import Path
import json, math
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
data = json.loads((root / 'src/data/taiwan-outlook/evidence.json').read_text())
S = 2
template = Image.open(root / 'src/assets/images/taiwan-japan-warning/cover.png').convert('RGB')
background = template.getpixel((0, 0))
im = Image.new('RGB', (1200 * S, 630 * S), background)
d = ImageDraw.Draw(im)
ink, muted, grid = '#18181b', '#6b6b73', '#dedee2'
REG = '/System/Library/Fonts/Supplemental/Arial.ttf'
BOLD = '/System/Library/Fonts/Supplemental/Arial Bold.ttf'

def font(size, bold=False):
    return ImageFont.truetype(BOLD if bold else REG, int(size * S))

def txt(x, y, text, size=24, fill=ink, bold=False, anchor='lt', tracking=0):
    f = font(size, bold)
    if tracking:
        cx = x * S
        for ch in text:
            d.text((cx, y * S), ch, font=f, fill=fill, anchor=anchor)
            cx += d.textlength(ch, font=f) + tracking * S
    else:
        d.text((x * S, y * S), text, font=f, fill=fill, anchor=anchor)

def line(points, fill=ink, width=2):
    d.line([(x * S, y * S) for x, y in points], fill=fill, width=int(width * S))

def dashed(a, b, fill, width=3, dash=7, gap=7):
    dx, dy = b[0] - a[0], b[1] - a[1]
    length = math.hypot(dx, dy)
    if not length:
        return
    for start in range(0, math.ceil(length), dash + gap):
        end = min(length, start + dash)
        line([(a[0] + dx * start / length, a[1] + dy * start / length),
              (a[0] + dx * end / length, a[1] + dy * end / length)], fill, width)

def diamond(x, y, fill):
    pts = [((x + a) * S, (y + b) * S) for a, b in [(0, -7), (7, 0), (0, 7), (-7, 0)]]
    d.polygon(pts, fill=background, outline=fill, width=2 * S)

# ---- editorial copy -------------------------------------------------------
txt(62, 47, 'R E S E A R C H   N O T E   /   2 0 2 6 . 1 0', 15, muted)
txt(58, 92, 'A Countdown Clock Amid Prosperity', 46, ink, bold=True)
txt(60, 172, "Will Taiwan repeat Japan's lost three decades?", 26, ink, bold=True)
txt(61, 232, 'Capital is moving. Where will the next generation of capability live?', 19, muted)

# ---- legend ---------------------------------------------------------------
line([(600, 304), (640, 304)], ink, 3)
txt(652, 304, 'Outward investment', 17, ink, anchor='lm')
line([(848, 304), (888, 304)], '#9f9fa9', 3)
txt(900, 304, 'Inbound into Taiwan', 17, '#8a8a92', anchor='lm')

# ---- chart (identical geometry/data to the zh cover) ----------------------
latest = data['taiwanPartial']['approval']
annual = [row for row in data['taiwan'] if row['year'] >= 2016]
values = [(r['year'], r['approvedOut'], r['approvedIn']) for r in annual] + \
         [(2026, latest['outward'], latest['inward'])]
L, R, T, B = 100, 1091, 330, 530
xx = lambda i: L + i * (R - L) / (len(values) - 1)
yy = lambda v: B - v / 75 * (B - T)
d.rectangle((xx(9.5) * S, T * S, 1168 * S, B * S), fill='#ededf0')
for v in [0, 25, 50, 75]:
    line([(L, yy(v)), (1168, yy(v))], grid, 1)
    txt(64, yy(v), str(v), 16, muted, anchor='lm')
for col, color in [(1, ink), (2, '#9f9fa9')]:
    pts = [(xx(i), yy(v[col])) for i, v in enumerate(values)]
    line(pts[:-1], color, 3 if col == 1 else 2)
    dashed(pts[-2], pts[-1], color, 3 if col == 1 else 2, 3, 5)
    for x, y in pts[:-1]:
        d.ellipse(((x - 3) * S, (y - 3) * S, (x + 3) * S, (y + 3) * S), fill=color)
    diamond(*pts[-1], color)
    txt(R + 15, pts[-1][1], f'{values[-1][col]:.2f}', 17, color, bold=True, anchor='lm')
txt(L, 548, '2016', 16, muted)
for year in [2024, 2025, 2026]:
    txt(xx(year - 2016), 548, str(year), 16, ink if year == 2026 else muted, anchor='mt')
txt(R, 570, 'Jan-Aug', 15, ink, anchor='mt')
txt(L, 578, '◊ 2026 = Jan-Aug cumulative, not annualized; approval amounts do not equal relocated capacity.', 14.5, muted)
txt(L, 600, 'Taiwan approved investment · outward excludes mainland China · US$ billions', 14.5, muted)

output = root / 'src/assets/images/taiwan-japan-warning/cover-2026-ytd-en.png'
im.resize(template.size, Image.Resampling.LANCZOS).save(output, optimize=True)
print(output)
