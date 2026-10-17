# Lunar surface data

Credit: NASA's Scientific Visualization Studio; LRO LROC camera and LOLA laser altimeter teams. CGI Moon Kit visualizer Ernie Wright (USRA), scientist Noah Petro (NASA/GSFC).

Source and full credits: https://svs.gsfc.nasa.gov/4720

- `lunar-albedo.jpg`: unmodified 2025 2048×1024 natural-color map, downloaded from https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg
- `lunar-elevation.png`: lossless channel packing of the unsigned 1440×720 LOLA elevation map from https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_4_uint.tif

Elevation decoding: `(red_byte * 256 + green_byte) * 0.5 - 10000` meters relative to the 1737.4 km reference radius. Regenerate with `python3 scripts/build-lunar-terrain.py /path/to/ldem_4_uint.tif` (Pillow required). The raw TIFF is not needed at runtime. Longitude zero is at the center of both maps; north is at the top.

NASA describes the color maps as optimized for aesthetics, rather than scientific measurement. Lighting in this preview is an approximation, not a calibrated photometric simulation. Terrain normals and nearby shadow tracing use the actual elevation scale, without exaggeration; coarse map resolution limits small crater detail. A fixed near-side view and approximate lunar pole rotation are used; precise libration and eclipses are not modeled.
