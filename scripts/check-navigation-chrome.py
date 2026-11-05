#!/usr/bin/env python3
"""Catch disappearing Android main-tab buttons in a native device recording.

Open the signed-in app on Home with English labels and light appearance first.
Use fictional QA data: the recording includes the rendered screen contents.
Requires ffmpeg. Device input and capture use the command returned by
``device_open``. Settings must remain visible while switching main tabs.
"""
import argparse
import json
import statistics
import subprocess
import sys
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('device_command')
parser.add_argument('--output', default='build/qa/navigation-chrome')
parser.add_argument('--all-tabs', action='store_true')
parser.add_argument('--collection', action='store_true', help='Switch Plan, Stays and Notes inside a collection')
parser.add_argument('--button-label', default='Settings',
                    help='Home button to track; it must stay visible throughout the selected sequence')
args = parser.parse_args()
Path(args.output).parent.mkdir(parents=True, exist_ok=True)


def run(*command, structured=False):
    result = subprocess.run(
        [args.device_command, *command, *(['--json'] if structured else [])],
        text=True, capture_output=True, timeout=40,
    )
    if result.returncode:
        raise RuntimeError(result.stderr or result.stdout)
    return json.loads(result.stdout)['data'] if structured else result.stdout


def snapshot():
    return run('snapshot', '--raw', structured=True)['nodes']


button = next(node for node in snapshot()
                if node.get('label') == args.button_label and 63 < node.get('rect', {}).get('y', 999) < 250)
rect = button['rect']
x, y = max(0, int(rect['x'] - 8)), max(0, int(rect['y'] - 8))
width, height = int(rect['width'] + 16), int(rect['height'] + 16)
video = args.output + '.mp4'
tabs = (['Stays', 'Notes', 'Plan'] * 2 if args.collection else
        ['Places', 'Home', 'Collections', 'Places', 'World', 'Home'] if args.all_tabs else
        ['Places', 'Home'] * 3)
run('record', 'start', '--scope', 'device', video)
try:
    for name in tabs:
        tab = next(node for node in snapshot()
                   if node.get('label') == name and node.get('roleDescription') == 'Tab')
        run('press', '@' + tab['ref'])
        run('wait', '350')
finally:
    run('record', 'stop')

# Convert to gray *before* cropping: YUV420 would round odd-sized crops and
# misalign the raw frame boundaries, falsely reporting missing buttons.
raw = subprocess.check_output([
    'ffmpeg', '-v', 'error', '-i', video,
    '-vf', f'format=gray,crop={width}:{height}:{x}:{y}', '-f', 'rawvideo', '-',
])
area = width * height
counts = [sum(value < 100 for value in raw[offset:offset + area])
          for offset in range(0, len(raw) - area + 1, area)]
assert counts, 'The recording contains no frames'
reference = statistics.median(counts)
missing = [index for index, count in enumerate(counts) if count < max(20, reference * .4)]
result = {
    'video': video,
    'frames': len(counts),
    'button_label': args.button_label,
    'icon_median_pixels': reference,
    'missing_icon_frames': len(missing),
    'first_missing_frame': missing[0] if missing else None,
    'crop': [x, y, width, height],
}
Path(args.output + '.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
if missing:
    subprocess.run([
        'ffmpeg', '-v', 'error', '-y', '-i', video,
        '-vf', f'select=eq(n\\,{missing[0]})', '-frames:v', '1', args.output + '-missing.png',
    ], check=True)
    print(f'FAIL: {args.button_label} button disappears while switching main tabs')
    sys.exit(1)
print(f'PASS: {args.button_label} button stays visible across main-tab switches')
