from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "build" / "icon.ico"
SOURCE = ROOT / "public" / "app-icon.png"
SIZE = 256

source = Image.open(SOURCE).convert("RGBA")
side = min(source.size)
left = (source.width - side) // 2
top = (source.height - side) // 2
canvas = source.crop((left, top, left + side, top + side))
canvas = canvas.resize((SIZE, SIZE), Image.Resampling.LANCZOS)

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
canvas.save(
    OUTPUT,
    format="ICO",
    sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
)
print(OUTPUT)
