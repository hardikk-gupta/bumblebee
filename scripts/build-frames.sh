#!/usr/bin/env bash
# Turn one or more video clips into scroll-scrub frame sequences.
#
#   scripts/build-frames.sh [--delogo x:y:w:h] [--width 1920] SEGMENT [SEGMENT ...]
#
# SEGMENT is  path.mp4[::start[:end[:fps]]]   (seconds; fps defaults to the source rate)
#   e.g.  drive.mp4::0:24:12   transform.mp4::3.9:8.04:24
#
# Segments are joined in order. Writes:
#   frames/desktop/f_0001.webp ...  (--width wide, default 1920 or source width if smaller)
#   frames/mobile/f_0001.webp  ...  (720 wide)
#   frames/manifest.json            ({count, width, height, segments:[{src, start, count}]})
# --delogo blurs out a watermark box given in SOURCE pixel coordinates (applied to every segment).
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
[[ $# -ge 1 ]] || { echo "usage: $0 [--delogo x:y:w:h] [--width N] clip.mp4[::start[:end[:fps]]] ..." >&2; exit 1; }

first="${1%%::*}"
SRC_W=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$first")
SRC_H=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$first")
[[ -n "$WIDTH" ]] || WIDTH=$(( SRC_W < 1920 ? SRC_W : 1920 ))

INPUTS=(); GRAPH=""; LABELS=""; i=0; SEGS=()
for spec in "$@"; do
  path="${spec%%::*}"; opts=""; [[ "$spec" == *::* ]] && opts="${spec#*::}"
  IFS=: read -r start end fps <<<"$opts"
  src_fps=$(ffprobe -v error -select_streams v:0 -show_entries stream=r_frame_rate -of csv=p=0 "$path")
  src_fps=$(python3 -c "print(round(eval('$src_fps')))")
  fps="${fps:-$src_fps}"
  trim=""
  if [[ -n "$start" || -n "$end" ]]; then
    trim="trim=start=${start:-0}${end:+:end=$end},"
  fi
  pre=""
  [[ -n "$DELOGO" ]] && { IFS=: read -r dx dy dw dh <<<"$DELOGO"; pre="delogo=x=$dx:y=$dy:w=$dw:h=$dh,"; }
  INPUTS+=(-i "$path")
  # setpts after fps gives every segment one frame per tick, so concat + passthrough
  # writes each sampled frame exactly once.
  GRAPH+="[$i:v]${trim}${pre}scale=${SRC_W}:${SRC_H}:force_original_aspect_ratio=increase,crop=${SRC_W}:${SRC_H},fps=${fps},setpts=N/(${fps}*TB),setsar=1[v$i];"
  LABELS+="[v$i]"; SEGS+=("$path|$fps"); i=$((i+1))
done
GRAPH+="${LABELS}concat=n=$i:v=1:a=0,split=2[a][b];[a]scale=${WIDTH}:-2:flags=lanczos[d];[b]scale=720:-2:flags=lanczos[m]"

rm -rf frames/desktop frames/mobile; mkdir -p frames/desktop frames/mobile
ffmpeg -v error -y "${INPUTS[@]}" -filter_complex "$GRAPH" -fps_mode passthrough \
  -map "[d]" -c:v libwebp -quality 78 -compression_level 6 frames/desktop/f_%04d.webp \
  -map "[m]" -c:v libwebp -quality 70 -compression_level 6 -fps_mode passthrough frames/mobile/f_%04d.webp

# Count frames per segment by running each one alone (cheap: null output).
SEG_JSON=""; offset=0; k=0
for spec in "$@"; do
  path="${spec%%::*}"; opts=""; [[ "$spec" == *::* ]] && opts="${spec#*::}"
  IFS=: read -r start end fps <<<"$opts"
  fps="${SEGS[$k]#*|}"
  trim=""; [[ -n "$start" || -n "$end" ]] && trim="trim=start=${start:-0}${end:+:end=$end},"
  n=$(ffmpeg -v error -i "$path" -vf "${trim}fps=${fps}" -f null - -progress pipe:1 2>/dev/null | awk -F= '/^frame=/{f=$2} END{print f}')
  SEG_JSON+="${SEG_JSON:+,}{\"src\":\"$(basename "$path")\",\"fps\":$fps,\"start\":$offset,\"count\":$n}"
  offset=$((offset + n)); k=$((k+1))
done

COUNT=$(ls frames/desktop | wc -l)
H=$(( WIDTH * SRC_H / SRC_W ))
printf '{"count":%d,"width":%d,"height":%d,"segments":[%s]}\n' "$COUNT" "$WIDTH" "$H" "$SEG_JSON" > frames/manifest.json
echo "frames: $COUNT  ($(du -sh frames/desktop | cut -f1) desktop, $(du -sh frames/mobile | cut -f1) mobile)"
cat frames/manifest.json
