"""Make the smaller shop cover files for every story (Speed, Nov 2026).

Run from the repo root after adding or replacing a story cover:

    python3 tools/make_cover_sizes.py

For each story-assets/<story>/cover.jpg and cover-ar.jpg (1200x1200) it writes any size that is missing (delete a size file to rebuild it after replacing a cover):
  cover-600.jpg / cover-ar-600.jpg    600px JPG  (story cards)
  cover-900.webp / cover-ar-900.webp  900px WebP (sharp phone screens and the story page's main cover)
The shop and the SEO layer list all three sizes; if one is missing the browser falls back to the main file.
"""
import glob, os
from PIL import Image

for src in sorted(glob.glob('story-assets/*/cover.jpg') + glob.glob('story-assets/*/cover-ar.jpg')):
    im = None
    for size, ext, opts in ((600, '-600.jpg', dict(quality=82, optimize=True, progressive=True)), (900, '-900.webp', dict(quality=74, method=6))):
        out = src[:-4] + ext
        if os.path.exists(out):  # delete a size file to rebuild it after replacing a cover
            continue
        im = im or Image.open(src).convert('RGB')
        im.resize((size, size), Image.LANCZOS).save(out, 'JPEG' if ext.endswith('.jpg') else 'WEBP', **opts)
        print('wrote', out, os.path.getsize(out) // 1024, 'KB')
