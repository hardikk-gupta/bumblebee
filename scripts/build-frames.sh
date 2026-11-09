#!/usr/bin/env bash
# Turn one or more video clips into scroll-scrub frame sequences.
#
#   scripts/build-frames.sh [--delogo x:y:w:h] [--width 1920] clip1.mp4 [clip2.mp4 ...]
#
# Clips are joined in order. Writes:
#   frames/desktop/f_0001.webp ...  (--width wide, default 1920 or source width if smaller)
#   frames/mobile/f_0001.webp  ...  (720 wide)
#   frames/manifest.json            ({count, fps, width, height})
# --delogo blurs out a watermark box given in SOURCE pixel coordinates.
set -euo pipefail
cd "$(dirname "$0")/.."

DELOGO=""; WIDTH=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --delogo) DELOGO="$2"; shift 2 ;;
    --width)  WIDTH="$2";  shift 2 ;;
    *) break ;;
  esac
done
[[ $# -ge 1 ]] || { echo "usage: $0 [--delogo x:y:w:h] [--width N] clip.mp4 [...]" >&2; exit 1; }

SRC_W=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$1")
SRC_H=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$1")
FPS=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$1")
FPS=$(python3 -c "print(round(eval('$FPS')))")
[[ -n "$WIDTH" ]] || WIDTH=$(( SRC_W < 1920 ? SRC_W : 1920 ))

# Build one filter graph: per-clip normalise (+ optional delogo), then concat.
INPUTS=(); GRAPH=""; LABELS=""; i=0
for clip in "$@"; do
  INPUTS+=(-i "$clip")
  pre=""
  [[ -n "$DELOGO" ]] && { IFS=: read -r dx dy dw dh <<<"$DELOGO"; pre="delogo=x=$dx:y=$dy:w=$dw:h=$dh,"; }
  GRAPH+="[$i:v]${pre}scale=${SRC_W}:${SRC_H}:force_original_aspect_ratio=increase,crop=${SRC_W}:${SRC_H},fps=${FPS},setsar=1[v$i];"
  LABELS+="[v$i]"; i=$((i+1))
done
GRAPH+="${LABELS}concat=n=$i:v=1:a=0,split=2[a][b];[a]scale=${WIDTH}:-2:flags=lanczos[d];[b]scale=720:-2:flags=lanczos[m]"

rm -rf frames/desktop frames/mobile; mkdir -p frames/desktop frames/mobile
ffmpeg -v error -y "${INPUTS[@]}" -filter_complex "$GRAPH" \
  -map "[d]" -c:v libwebp -quality 78 -compression_level 6 frames/desktop/f_%04d.webp \
  -map "[m]" -c:v libwebp -quality 70 -compression_level 6 frames/mobile/f_%04d.webp

COUNT=$(ls frames/desktop | wc -l)
H=$(( WIDTH * SRC_H / SRC_W ))
printf '{"count":%d,"fps":%d,"width":%d,"height":%d}\n' "$COUNT" "$FPS" "$WIDTH" "$H" > frames/manifest.json
echo "frames: $COUNT  ($(du -sh frames/desktop | cut -f1) desktop, $(du -sh frames/mobile | cut -f1) mobile)"
cat frames/manifest.json
