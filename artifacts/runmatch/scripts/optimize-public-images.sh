#!/usr/bin/env bash
set -euo pipefail

# Regenerate committed delivery assets from the original photography.
# Requires ImageMagick with JPEG and WebP support.
images="$(cd "$(dirname "$0")/../src/assets/images" && pwd)"
mkdir -p "$images/optimized"
for name in hero-bg avatar-f avatar-m; do
  if [[ "$name" == hero-bg ]]; then
    widths=(640 1024 1408)
  else
    widths=(320 640 960)
  fi
  for width in "${widths[@]}"; do
    magick "$images/$name.png" -resize "${width}x>" -strip \
      -quality 78 -define webp:method=6 "$images/optimized/$name-$width.webp"
    magick "$images/$name.png" -resize "${width}x>" -strip \
      -sampling-factor 4:2:0 -interlace Plane -quality 80 \
      "$images/optimized/$name-$width.jpg"
  done
done
