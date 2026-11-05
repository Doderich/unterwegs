#!/usr/bin/env python3
"""Detect a tab's header lagging behind its content in a native recording.

Record Home/Places switches with check-navigation-chrome.py (English, light,
1080x2400 portrait). Supply one settled Home frame and one settled Places frame
from that recording. Both references must show fully loaded content at the top.
Requires ffmpeg. Record only public/demo or fictional data. Pixel regions cover
only the title and top list content, excluding clock, tab animation and photos.
"""
import argparse
import json
import subprocess
import sys

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('video')
parser.add_argument('home_frame', type=int)
parser.add_argument('places_frame', type=int)
args = parser.parse_args()
raw = subprocess.check_output([
    'ffmpeg', '-v', 'error', '-i', args.video,
    '-vf', 'scale=270:600,format=gray', '-f', 'rawvideo', '-',
])
size = 270 * 600
frames = [raw[index:index + size] for index in range(0, len(raw) - size + 1, size)]
references = [frames[args.home_frame], frames[args.places_frame]]


def crop(frame, x, y, width, height):
    return b''.join(frame[row * 270 + x:row * 270 + x + width] for row in range(y, y + height))


def difference(left, right):
    return sum(abs(a - b) for a, b in zip(left, right)) / len(left)


regions = {'title': (8, 22, 127, 26), 'body': (8, 62, 252, 98)}
classes, margins = {}, {}
for key, region in regions.items():
    templates = [crop(reference, *region) for reference in references]
    assert difference(*templates) > 2, f'{key}: references must show two distinct, settled tabs'
    classes[key], margins[key] = [], []
    for frame in frames:
        pixels = crop(frame, *region)
        scores = [difference(pixels, template) for template in templates]
        classes[key].append(scores.index(min(scores)))
        margins[key].append(abs(scores[0] - scores[1]))

# Ignore ambiguous transitional pixels; fail when both regions clearly identify
# different tabs. A missing-header check remains separate in the capture script.
bad = [index for index in range(len(frames))
       if classes['title'][index] != classes['body'][index]
       and margins['title'][index] > 2 and margins['body'][index] > 2]
print(json.dumps({'frames': len(frames), 'mismatched_header_content_frames': len(bad), 'indices': bad}))
if bad:
    subprocess.run([
        'ffmpeg', '-v', 'error', '-y', '-i', args.video,
        '-vf', f'select=eq(n\\,{bad[0]})', '-frames:v', '1', args.video + '.mismatch.png',
    ], check=True)
sys.exit(bool(bad))
