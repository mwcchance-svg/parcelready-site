#!/usr/bin/env python3
"""Convert the site's cover PNGs to WebP derivatives (Beacon fix
spec 23). Covers render at card width (~430px) and pack-page width
(~560px); the 1600px masters are far heavier than the display needs.
Each assets/covers/<name>.png gets an 800x450 WebP at quality 85
beside it (~36 KB against ~120-140 KB), legibility verified on the
data tables. The PNGs stay in place as the fallback and as the
Gumroad upload source. Run after copying fresh covers into the site:
    python3 scripts/make_cover_webp.py
Run from the parcelready-site root."""
import os

from PIL import Image

COVERS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                      "assets", "covers")


def main():
    total_png = total_webp = 0
    for name in sorted(os.listdir(COVERS)):
        if not name.endswith(".png"):
            continue
        src = os.path.join(COVERS, name)
        dst = os.path.join(COVERS, name[:-4] + ".webp")
        im = Image.open(src).convert("RGB")
        if im.width > 800:
            im = im.resize((800, round(im.height * 800 / im.width)), Image.LANCZOS)
        im.save(dst, "WEBP", quality=85, method=6)
        total_png += os.path.getsize(src)
        total_webp += os.path.getsize(dst)
        print(f"{name}: {os.path.getsize(src)//1024} KB -> {os.path.getsize(dst)//1024} KB")
    print(f"TOTAL: {total_png//1024} KB PNG -> {total_webp//1024} KB WebP")


if __name__ == "__main__":
    main()
