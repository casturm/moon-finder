"""Convert NASA LOLA unsigned half-meter TIFF to a lossless WebGL texture.

Usage: python3 scripts/build-lunar-terrain.py /path/to/ldem_4_uint.tif
Requires Pillow. Output stores the high and low bytes in red/green, respectively.
No elevation normalization, vertical exaggeration, or lossy conversion is used.
"""
import argparse
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path)
parser.add_argument('--output', type=Path, default=Path('images/lunar-elevation.png'))
args = parser.parse_args()
source = Image.open(args.source)
if source.size != (1440, 720) or source.mode not in ('I;16', 'I;16L', 'I;16B', 'I'):
    raise SystemExit('Expected the NASA 1440×720 unsigned 16-bit LOLA map.')
texture = Image.new('RGB', source.size)
texture.putdata([(int(value) >> 8, int(value) & 255, 0) for value in source.getdata()])
texture.save(args.output, optimize=True)
print(args.output)
