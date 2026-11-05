#!/usr/bin/env python3
"""Verify visible iOS sheet rows have separate touch rectangles of at least 44 points.

Open an action sheet or populated place-search sheet. Pass the device-bound
agent-device executable and the testID prefix (sheet-action- or place-result-).
This only reads the native accessibility snapshot.
"""
import argparse
import json
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('device_command')
parser.add_argument('prefix')
args = parser.parse_args()
result = subprocess.run([args.device_command, 'snapshot', '--raw', '--json'],
                        capture_output=True, text=True, check=True, timeout=40)
nodes = json.loads(result.stdout)['data']['nodes']
rows = sorted((node for node in nodes if str(node.get('identifier', '')).startswith(args.prefix)
               and node.get('hittable')), key=lambda node: node['rect']['y'])
assert len(rows) >= 2, 'Check inconclusive: fewer than two visible sheet rows'
for row in rows:
    assert row['rect']['height'] >= 44, f"FAIL: {row['identifier']} has a touch height below 44pt"
for before, after in zip(rows, rows[1:]):
    assert before['rect']['y'] + before['rect']['height'] <= after['rect']['y'] + 1, 'FAIL: sheet rows overlap'
print(f'PASS: {len(rows)} separate sheet rows, all at least 44pt high')
