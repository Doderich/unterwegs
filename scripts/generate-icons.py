#!/usr/bin/env python3
"""Generate the app icon, Android adaptive icon, splash images and favicon from one drawing.

The mark: a desk globe, tilted like the Earth, with a small flag stuck into it. Monochrome; the colours per
appearance (light, dark, clear, tinted) live in the iOS Icon Composer document `assets/unterwegs.icon`, which can
be opened and refined in Icon Composer (Xcode → Open Developer Tool). Rasters are rendered with `sips` (macOS).

    python3 scripts/generate-icons.py
"""
import json
import math
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ICON = ROOT / 'assets' / 'unterwegs.icon'
IMAGES = ROOT / 'assets' / 'images'

INK = '#1C1C1E'
NIGHT_TOP, NIGHT_BOTTOM = '#2C2C2E', '#050505'
DAY_TOP, DAY_BOTTOM = '#FFFFFF', '#E5E5EA'

# Geometry on a 1024 canvas
C = (502, 472)
R = 220
TILT = 23  # axial tilt, north pole leans right
VIEW = math.radians(18)  # seen slightly from above: parallels curve
RING = R + 52
GLYPH_CENTRE = (503.5, 510.5)  # centre of the mark's bounding box (216–791 × 162–859)


def point(angle, radius):
    return C[0] + radius * math.cos(math.radians(angle)), C[1] + radius * math.sin(math.radians(angle))


def svg(body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">{body}</svg>'


def sphere(color):
    return f'<circle cx="{C[0]}" cy="{C[1]}" r="{R}" fill="{color}"/>'


def grid_lines(color, width=22):
    cx, cy = C
    lines = [f'<line x1="{cx}" y1="{cy - R}" x2="{cx}" y2="{cy + R}"/>']
    for longitude in (32, 62):
        lines.append(f'<ellipse cx="{cx}" cy="{cy}" rx="{R * math.sin(math.radians(longitude)):.1f}" ry="{R}"/>')
    for latitude in (-42, 0, 42):
        r = R * math.cos(math.radians(latitude))
        y = cy - R * math.sin(math.radians(latitude)) * math.cos(VIEW)
        lines.append(f'<path d="M{cx - r:.1f} {y:.1f} A{r:.1f} {r * math.sin(VIEW):.1f} 0 0 0 {cx + r:.1f} {y:.1f}"/>')
    return (
        f'<g transform="rotate({TILT} {cx} {cy})" fill="none" stroke="{color}" stroke-width="{width}" '
        f'stroke-linecap="round">{"".join(lines)}</g>'
    )


def grid(color):
    """Grid as its own layer (Icon Composer), clipped to the sphere."""
    return (
        f'<defs><clipPath id="sphere"><circle cx="{C[0]}" cy="{C[1]}" r="{R}"/></clipPath></defs>'
        f'<g clip-path="url(#sphere)">{grid_lines(color)}</g>'
    )


def stand(color):
    start, end = point(TILT - 90, RING), point(90, RING)  # north pole, round the left side, down to the stem
    base_y = C[1] + R + 150
    return (
        f'<g fill="none" stroke="{color}" stroke-linecap="round">'
        f'<path d="M{start[0]:.1f} {start[1]:.1f} A{RING} {RING} 0 1 0 {end[0]:.1f} {end[1]:.1f}" stroke-width="28"/>'
        f'<path d="M{C[0]} {C[1] + RING:.1f} L{C[0]} {base_y - 6}" stroke-width="28"/>'
        f'<path d="M{C[0] - 100} {base_y} L{C[0] + 100} {base_y}" stroke-width="36"/></g>'
    )


def flag(color):
    foot = point(-38, R - 10)  # stuck into the upper right of the sphere
    x, y = foot[0], foot[1] - 170
    cloth = (
        f'M{x:.1f} {y:.1f} C {x + 40:.1f} {y - 18:.1f}, {x + 80:.1f} {y + 22:.1f}, {x + 124:.1f} {y + 2:.1f} '
        f'L{x + 124:.1f} {y + 80:.1f} C {x + 80:.1f} {y + 100:.1f}, {x + 40:.1f} {y + 60:.1f}, {x:.1f} {y + 78:.1f} Z'
    )
    return (
        f'<line x1="{foot[0]:.1f}" y1="{foot[1]:.1f}" x2="{x:.1f}" y2="{y:.1f}" stroke="{color}" stroke-width="20" '
        f'stroke-linecap="round"/><path d="{cloth}" fill="{color}"/>'
    )


def glyph(color, scale=1.0):
    """The whole mark in one colour with the grid cut out, centred on the canvas."""
    body = (
        f'<defs><mask id="cut"><rect width="1024" height="1024" fill="#fff"/>{grid_lines("#000")}</mask></defs>'
        f'{stand(color)}<g mask="url(#cut)">{sphere(color)}</g>{flag(color)}'
    )
    gx, gy = GLYPH_CENTRE
    return f'<g transform="translate(512 512) scale({scale}) translate({-gx} {-gy})">{body}</g>'


def gradient(top, bottom):
    return (
        f'<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{top}"/>'
        f'<stop offset="1" stop-color="{bottom}"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#bg)"/>'
    )


def srgb(hex_color):
    r, g, b = (int(hex_color[i : i + 2], 16) / 255 for i in (1, 3, 5))
    return f'srgb:{r:.5f},{g:.5f},{b:.5f},1.00000'


def icon_composer():
    shutil.rmtree(ICON, ignore_errors=True)
    (ICON / 'Assets').mkdir(parents=True)
    for name, body in {'flag': flag('#000'), 'grid': grid('#000'), 'globe': sphere('#000'), 'stand': stand('#000')}.items():
        (ICON / 'Assets' / f'{name}.svg').write_text(svg(body))

    def layer(name, light, dark, glass=True):
        fills = [{'value': {'solid': srgb(light)}}, {'appearance': 'dark', 'value': {'solid': srgb(dark)}}]
        return {'image-name': f'{name}.svg', 'name': name, 'fill-specializations': fills, 'glass': glass}

    def group(name, layers):
        return {
            'name': name,
            'layers': layers,
            'shadow': {'kind': 'neutral', 'opacity': 0.5},
            'translucency': {'enabled': True, 'value': 0.3},
        }

    document = {
        'fill-specializations': [
            {'value': {'linear-gradient': [srgb(DAY_TOP), srgb(DAY_BOTTOM)]}},
            {'appearance': 'dark', 'value': {'linear-gradient': [srgb(NIGHT_TOP), srgb(NIGHT_BOTTOM)]}},
        ],
        'groups': [  # topmost first
            group('Flag', [layer('flag', INK, '#FFFFFF')]),
            group('Globe', [layer('grid', '#F2F2F7', INK, glass=False), layer('globe', INK, '#FFFFFF')]),
            group('Stand', [layer('stand', INK, '#FFFFFF')]),
        ],
        'supported-platforms': {'circles': ['watchOS'], 'squares': 'shared'},
    }
    (ICON / 'icon.json').write_text(json.dumps(document, indent=2) + '\n')


def raster(name, body, size):
    with tempfile.TemporaryDirectory() as tmp:
        source = Path(tmp) / 'image.svg'
        source.write_text(svg(body))
        subprocess.run(
            ['sips', '-s', 'format', 'png', '-z', str(size), str(size), str(source), '--out', str(IMAGES / name)],
            check=True,
            capture_output=True,
        )


def main():
    icon_composer()
    night = gradient(NIGHT_TOP, NIGHT_BOTTOM)
    raster('icon.png', night + glyph('#FFFFFF'), 1024)  # fallback icon (Android legacy, App Store Connect)
    raster('favicon.png', night + glyph('#FFFFFF', 0.9), 48)
    # Android adaptive icon: the mark inside the 66 dp safe zone of the 108 dp canvas
    raster('android-icon-foreground.png', glyph('#FFFFFF', 0.62), 512)
    raster('android-icon-background.png', night, 512)
    raster('android-icon-monochrome.png', glyph('#FFFFFF', 0.62), 432)
    raster('splash-icon.png', glyph(INK), 512)
    raster('splash-icon-dark.png', glyph('#FFFFFF'), 512)


if __name__ == '__main__':
    main()
