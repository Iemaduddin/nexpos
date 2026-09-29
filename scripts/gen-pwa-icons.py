"""Generate PWA icons from public/logo.webp. Run: ml\\.venv\\Scripts\\python.exe scripts/gen-pwa-icons.py"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'public' / 'logo.webp'
OUT = ROOT / 'public' / 'icons'
BG = (255, 255, 255, 255)


def main() -> None:
    OUT.mkdir(exist_ok=True)
    logo = Image.open(SRC).convert('RGBA')

    for size in (192, 512):
        logo.resize((size, size), Image.LANCZOS).save(OUT / f'icon-{size}.png')

    # Maskable: logo at 80% centered on a solid background (safe zone).
    canvas = Image.new('RGBA', (512, 512), BG)
    inner = logo.resize((410, 410), Image.LANCZOS)
    canvas.alpha_composite(inner, (51, 51))
    canvas.save(OUT / 'maskable-512.png')

    print('icons written to', OUT)


if __name__ == '__main__':
    main()
