import sys
from pathlib import Path

import yaml
from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parents[1]
DST = ROOT / 'assets' / 'img' / 'blog'
SIZES = (800, 1600)
MAX_BYTES = 600 * 1024


def main(src_dir):
    photos = ROOT / '_data' / 'photos.yml'
    meta = yaml.safe_load(photos.read_text()) if photos.exists() else {}
    for src in sorted(Path(src_dir).glob('b-*/*')):
        if src.suffix.lower() not in {'.jpg', '.jpeg', '.png'}:
            continue
        key = f'{src.parent.name}/{src.stem}'
        im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
        (DST / src.parent.name).mkdir(parents=True, exist_ok=True)
        for w in SIZES:
            out = im.copy()
            out.thumbnail((w, w * 4))
            path = DST / f'{key}-{w}.jpg'
            for q in (80, 74, 68, 62):
                out.save(path, quality=q, optimize=True, progressive=True)
                if path.stat().st_size <= MAX_BYTES:
                    break
            if w == SIZES[-1]:
                meta[key] = {'w': out.width, 'h': out.height}
    photos.write_text(yaml.safe_dump(meta, sort_keys=True))
    print(f'{len(meta)} photos in {photos.name}')


if __name__ == '__main__':
    main(sys.argv[1])
