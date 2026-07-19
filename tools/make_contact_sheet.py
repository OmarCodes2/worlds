from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

src = Path("tmp/worlds_ui_render")
files = sorted(src.glob("page-*.png"), key=lambda p: int(p.stem.split("-")[1]))
thumb_w = 255
thumb_h = 330
label_h = 24
cols = 4
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * thumb_w, rows * (thumb_h + label_h)), "#d9d9d9")
draw = ImageDraw.Draw(sheet)
for idx, path in enumerate(files):
    im = Image.open(path).convert("RGB")
    im.thumbnail((thumb_w - 10, thumb_h - 10))
    x = (idx % cols) * thumb_w + (thumb_w - im.width) // 2
    y = (idx // cols) * (thumb_h + label_h) + 5
    sheet.paste(im, (x, y))
    draw.text(((idx % cols) * thumb_w + 8, y + thumb_h), f"PAGE {idx + 1}", fill="#111111")
sheet.save(src / "contact-sheet.png", quality=92)
print((src / "contact-sheet.png").resolve())
