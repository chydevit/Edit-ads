#!/usr/bin/env python3
"""Contact sheet of one settled frame per slide, taken from the RENDERED file.

usage: storyboard.py <film.mp4> <slides.json> <overlap_frames>   -> <film>-storyboard.jpg
Check this image (not the code) before calling a film done: wrapped headlines, cropped
screenshots and leaked private data all show up here.
"""
import json, os, subprocess, sys, tempfile

film, slides_path, overlap = sys.argv[1], sys.argv[2], int(sys.argv[3])
slides = json.load(open(slides_path))["slides"]
tmp = tempfile.mkdtemp()
at = 0
for i, s in enumerate(slides):
    t = (at + s["dur"] * 0.62) / 30
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-ss", f"{t:.2f}", "-i", film, "-frames:v", "1",
                    "-vf", "scale=640:-1", f"{tmp}/{i:03d}.png"], check=True)
    at += s["dur"] - overlap
rows = (len(slides) + 3) // 4
out = os.path.splitext(film)[0] + "-storyboard.jpg"
subprocess.run(f'ffmpeg -loglevel error -y -pattern_type glob -i "{tmp}/*.png" -vf tile=4x{rows}:padding=6 -frames:v 1 "{out}"',
               shell=True, check=True)
print("storyboard:", out)
