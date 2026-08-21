#!/bin/bash
# Screenshot derivatives: 640w + 1280w WebP. Source JPEGs stay untouched as the archive.
set -e
SRC=pictures; OUT=pictures/opt
mkdir -p "$OUT"
count=0
# PNGs too: a <picture> does not fall back to its <img> once a <source> is
# chosen, so a missing .webp derivative renders as a broken image, not the PNG.
find "$SRC" -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) \
  ! -path "$OUT/*" ! -path "$SRC/items/*" ! -path "$SRC/MedalIcons/*" | while read -r f; do
  rel="${f#$SRC/}"; base="${rel%.*}"; safe="${base//\//__}"
  mkdir -p "$OUT"
  for w in 640 1280; do
    cwebp -quiet -q 78 -resize $w 0 "$f" -o "$OUT/${safe}-${w}.webp" 2>/dev/null || \
    cwebp -quiet -q 78 "$f" -o "$OUT/${safe}-${w}.webp"
  done
  count=$((count+1))
done
echo "derivatives:"; ls "$OUT" | wc -l
echo "source jpg total:"; find "$SRC" -type f \( -iname '*.jpg' -o -iname '*.jpeg' \) ! -path "$OUT/*" -exec du -ck {} + | tail -1
echo "webp total:"; du -ck "$OUT" | tail -1
