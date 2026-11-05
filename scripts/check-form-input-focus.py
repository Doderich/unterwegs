#!/usr/bin/env python3
"""Assert that an unsaved form input retains focus after the first letter and more typing.

Open the form before running. This replaces the target's draft text, never saves it.
Pass the device-bound agent-device executable and input testID.
"""
import argparse
import json
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('device_command')
parser.add_argument('input_id')
parser.add_argument('--cycles', type=int, default=5)
args = parser.parse_args()


def run(*command, structured=False):
    result = subprocess.run(
        [args.device_command, *command, *(['--json'] if structured else [])],
        capture_output=True, text=True, timeout=40,
    )
    if result.returncode:
        raise RuntimeError(result.stderr or result.stdout)
    return json.loads(result.stdout)['data'] if structured else result.stdout


def assert_focused(expected):
    snapshot = run('snapshot', '--raw', structured=True)
    field = next((node for node in snapshot['nodes']
                  if node.get('identifier') == args.input_id and node.get('editable')), None)
    assert field, f'FAIL: {args.input_id} disappeared'
    assert field.get('focused'), f'FAIL: {args.input_id} lost focus after typing {expected!r}'
    assert field.get('value') == expected, f'FAIL: {args.input_id} did not retain the typed text'


selector = f'id="{args.input_id}"'
run('wait', selector, '10000')
for cycle in range(args.cycles):
    run('fill', selector, '')
    run('press', selector)
    run('type', 'A')
    assert_focused('A')
    run('type', 'bcdef', '--delay-ms', '80')
    assert_focused('Abcdef')
    print(f'PASS: {args.input_id} cycle {cycle + 1}: first letter and continued typing retain focus', flush=True)
