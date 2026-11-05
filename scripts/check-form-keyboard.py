#!/usr/bin/env python3
"""Device regression check: focus the last input in an unsaved new-collection form.

Pass the device-bound agent-device executable returned by device_open and the app id.
Requires a signed-in debug build connected to Metro. Creates no server data.
"""
import argparse
import json
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('device_command')
parser.add_argument('app_id')
args = parser.parse_args()


def run(*command, structured=False):
    result = subprocess.run(
        [args.device_command, *command, *(['--json'] if structured else [])],
        capture_output=True, text=True, check=True, timeout=40,
    )
    return json.loads(result.stdout)['data'] if structured else result.stdout


run('open', args.app_id, 'unterwegs://collection-edit')
run('wait', 'role="text-field"', '10000')
run('wait', 'stable', '1000', '10000')
before = run('snapshot', '--raw', structured=True)
if before.get('keyboard', {}).get('kind') == 'visible':
    run('back', '--settle')
    run('wait', '500')
    before = run('snapshot', '--raw', structured=True)
for attempt in range(6):
    inputs = [n for n in before['nodes'] if n.get('bundleId') == args.app_id and n.get('editable')
              and n.get('identifier') == 'collection-link' and n.get('hittable')]
    if inputs:
        break
    run('scroll', 'down', '0.3', '--settle')
    before = run('snapshot', '--raw', structured=True)
assert inputs, 'Link input not found in the new-collection form'
print('Focusing link at', inputs[-1]['rect'])
run('press', '@' + inputs[-1]['ref'], '--settle')
after = run('snapshot', '--raw', structured=True)
keyboard = after.get('keyboard', {})
assert keyboard.get('kind') == 'visible', 'Keyboard did not open; check would be inconclusive'
focused = [n for n in after['nodes'] if n.get('bundleId') == args.app_id and n.get('editable') and n.get('focused') and n.get('identifier') == 'collection-link']
assert focused, 'FAIL: focused app input is hidden behind the keyboard'
keyboard_top = keyboard['frame']['y']
for node in focused:
    rect = node['rect']
    bottom = rect['y'] + rect['height']
    assert node.get('visibleToUser') and bottom <= keyboard_top, (
        f'FAIL: input bottom {bottom}px is below keyboard top {keyboard_top}px'
    )
    print(f'PASS: focused input bottom {bottom}px is above keyboard top {keyboard_top}px')

run('back', '--settle')
closed = run('snapshot', '--raw', structured=True)
assert closed.get('keyboard', {}).get('kind') == 'absent', 'FAIL: keyboard reopened after dismissal'
print('PASS: dismissing the keyboard does not refocus the first input')
