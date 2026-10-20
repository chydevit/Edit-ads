# Sourced helpers: two-pass loudnorm to -14 LUFS / -1.5 dBTP, and a loudness readout.
master() {   # master <in.mp4> <out.mp4>
  local J g
  J="$(ffmpeg -hide_banner -i "$1" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')"
  g() { echo "$J" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
  ffmpeg -v error -y -i "$1" -c:v copy -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(g input_i):measured_TP=$(g input_tp):measured_LRA=$(g input_lra):measured_thresh=$(g input_thresh):offset=$(g target_offset):linear=true" \
    -ar 48000 -c:a aac -b:a 256k -movflags +faststart "$2"
}
report() { echo "$(basename "$1")  $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$1" | awk '{printf "%d:%02d", $1/60, $1%60}')  $(ffmpeg -hide_banner -i "$1" -af ebur128 -f null - 2>&1 | grep -E '^\s+I:' | tr -s ' ')"; }
