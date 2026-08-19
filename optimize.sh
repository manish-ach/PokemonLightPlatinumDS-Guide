#!/bin/bash
# Screenshot derivatives: 640w + 1280w WebP. Source JPEGs stay untouched as the archive.
set -e
SRC=pictures; OUT=pictures/opt
mkdir -p "$OUT"
count=0
find "$SRC" -type f \( -iname '*.jpg' -o -iname '*.jpeg' \) ! -path "$OUT/*" | while read -r f; do
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
