#!/usr/bin/env python3
"""Check the inline Markdown field of a form through the real native field.

Open an unsaved form whose Markdown section is visible and empty (e.g. "Neuer Ort") before running. Changes only
the form's local draft and never presses the form's Save. Pass the executable returned by device_open.
"""
import argparse
import json
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('device_command')
args = parser.parse_args()


def run(*command, structured=False):
    result = subprocess.run(
        [args.device_command, *command, *(['--json'] if structured else [])],
        capture_output=True, text=True, timeout=40,
    )
    if result.returncode:
        raise RuntimeError(result.stderr or result.stdout)
    return json.loads(result.stdout)['data'] if structured else result.stdout


def snapshot():
    return run('snapshot', '--raw', structured=True)


def field(data, identifier):
    return next((n for n in data['nodes'] if n.get('identifier') == identifier), None)


def assert_input(expected):
    node = field(snapshot(), 'markdown-field-input')
    assert node, 'FAIL: the field is not in editing state'
    assert node.get('value') == expected, f'FAIL: expected {expected!r}, got {node.get("value")!r}'
    assert node.get('focused'), 'FAIL: the field lost focus while formatting or typing'


def press(identifier):
    # iOS also reports the SwiftUI wrapper of a toolbar button under the same id: narrow to the button there.
    try:
        run('press', f'id="{identifier}"', '--settle')
    except RuntimeError as error:
        if 'Candidates' not in str(error):
            raise
        run('press', f'id="{identifier}" role="button"', '--settle')


def edit():
    press('markdown-field-edit')
    run('wait', 'id="markdown-field-input"', '10000')


edit()
run('fill', 'id="markdown-field-input"', '')
press('markdown-bold')
run('type', 'Tickets', '--delay-ms', '80')
assert_input('**Tickets**')
print('PASS: Bold at the end of the text selects the placeholder; typing replaces it and keeps focus', flush=True)

press('markdown-done')
run('wait', 'id="markdown-field-edit"', '10000')
assert field(snapshot(), 'markdown-field-input') is None, 'FAIL: Fertig did not return to the formatted view'
print('PASS: Fertig returns to the formatted view', flush=True)

edit()
assert_input('**Tickets**')
press('markdown-italic')
run('type', 'abholen', '--delay-ms', '80')
assert_input('**Tickets***abholen*')
print('PASS: reopening keeps the draft and continues at the end; nothing saved to the server', flush=True)
press('markdown-done')
