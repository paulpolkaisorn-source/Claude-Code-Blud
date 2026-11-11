#!/usr/bin/env bash
# Usage: tools/process_sfx.sh <raw_dir> <out_dir>
# Trims leading silence, normalizes loudness, adds a short fade-out, encodes mono MP3.
set -euo pipefail
RAW="$1"; OUT="$2"; mkdir -p "$OUT"
for f in "$RAW"/*.mp3; do
  n=$(basename "$f" .mp3)
  case "$n" in
    win|lose|siren|finalwave|swarm|boost|boom) BR=64k; LUFS=-16 ;;
    *) BR=56k; LUFS=-14 ;;
  esac
  ffmpeg -v error -y -i "$f" -af "silenceremove=start_periods=1:start_threshold=-45dB,loudnorm=I=$LUFS:TP=-1.5:LRA=11,areverse,silenceremove=start_periods=1:start_threshold=-50dB,afade=t=in:d=0.03,areverse,afade=t=in:d=0.003" -ac 1 -ar 44100 -b:a $BR "$OUT/$n.mp3"
  printf "%-10s %6s bytes  %ss\n" "$n" "$(stat -c%s "$OUT/$n.mp3")" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/$n.mp3")"
done
