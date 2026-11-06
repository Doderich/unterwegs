#!/usr/bin/env python3
"""Generate the app icon, Android adaptive icon, splash images and favicon from one drawing.

The mark: a folded paper map whose panels show a sunset landscape, with a road winding through the hills
towards the sun. It stands on a plain paper-white plate (black in the dark appearance; staging: amber). The iOS Icon Composer documents `assets/unterwegs.icon`
and `assets/unterwegs-staging.icon` hold the mark as layers, so iOS can apply its glass and dark appearances; they
can be opened and refined in Icon Composer (Xcode → Open Developer Tool). Rasters are rendered with `sips` (macOS).

    python3 scripts/generate-icons.py
"""
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
IMAGES = ASSETS / 'images'

PAPER, NIGHT = '#FBF8F4', '#050909'  # background: light appearance, dark appearance
AMBER = '#F59E0B'  # staging, so the two apps are told apart on the home screen
# The map at sunset (light) and by moonlight (dark appearance, dark splash screen)
DAY = {'sky': ('#E9BE8C', '#FAE8D4'), 'sun': '#FAEBD8', 'road': '#FAEBD8', 'hills': '#428E8B', 'fold': '#7A4A1A'}
MOON = {'sky': ('#0B2E39', '#12404D'), 'sun': '#E9CFA7', 'road': '#E9CFA7', 'hills': '#2E6B73', 'fold': '#000000'}

# Geometry on a 1024 canvas
MAP = 'M85 255 L335 160 L515 255 L755 160 L935 255 L935 865 L755 775 L545 870 L335 775 L85 870 Z'
MAP_CENTRE = (510, 515)  # centre of the map's bounding box (85–935 × 160–870)
FOLDS = ['M335 160 L515 255 L545 870 L335 775 Z', 'M755 160 L935 255 L935 865 L755 775 Z']
HILL_LINE = 'M60 535 L225 460 L310 500 L465 405 L585 468 C 610 445, 650 445, 690 470 L815 385 L960 450 V1024 H60 Z'
ROAD_PATH = (
    'M40 780 C 160 700, 420 710, 445 665 C 465 625, 370 610, 390 575 C 415 530, 690 535, 778 505 '
    'C 790 495, 770 480, 700 468 L 690 474 C 730 490, 725 500, 690 508 C 600 528, 520 540, 515 565 '
    'C 510 590, 640 610, 615 680 C 595 740, 450 790, 405 820 L 40 1000 Z'
)
SUN_CIRCLE = (730, 415, 140)
SCALE = 0.86  # the map on the icon plate


def svg(body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">{body}</svg>'


def clipped(body, key):
    return f'<defs><clipPath id="map-{key}"><path d="{MAP}"/></clipPath></defs><g clip-path="url(#map-{key})">{body}</g>'


def sky(p=DAY):
    top, bottom = p['sky']
    return (
        f'<defs><linearGradient id="sky" x1="0" x2="0" y1="160" y2="560" gradientUnits="userSpaceOnUse">'
        f'<stop offset="0" stop-color="{top}"/><stop offset="1" stop-color="{bottom}"/></linearGradient></defs>'
        f'<path d="{MAP}" fill="url(#sky)"/>'
    )


def sun(p=DAY):
    x, y, r = SUN_CIRCLE
    return clipped(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{p["sun"]}"/>', 'sun')


def hills(p=DAY):
    return clipped(f'<path d="{HILL_LINE}" fill="{p["hills"]}"/>', 'hills')


def road(p=DAY):
    folds = ''.join(f'<path d="{d}" fill="{p["fold"]}" opacity=".05"/>' for d in FOLDS)
    return clipped(f'<path d="{ROAD_PATH}" fill="{p["road"]}"/>{folds}', 'road')


def silhouette(color):
    """The map in one colour with the sun, the ridge line and the road cut out (Android themed icon)."""
    x, y, r = SUN_CIRCLE
    ridge = HILL_LINE.split(' V')[0]
    return (
        f'<defs><mask id="cut"><path d="{MAP}" fill="#fff"/><circle cx="{x}" cy="{y}" r="{r}" fill="#000"/>'
        f'<path d="{HILL_LINE}" fill="#fff"/><path d="{ridge}" fill="none" stroke="#000" stroke-width="22"/>'
        f'<path d="{ROAD_PATH}" fill="#000"/><path d="M0 0 H1024 V1024 H0 Z {MAP}" fill="#000" fill-rule="evenodd"/>'
        f'</mask></defs>'
        f'<rect width="1024" height="1024" fill="{color}" mask="url(#cut)"/>'
    )


def mark(scale=1.0, body=None, p=DAY):
    """The map centred on the canvas."""
    gx, gy = MAP_CENTRE
    body = body or sky(p) + sun(p) + hills(p) + road(p)
    return f'<g transform="translate(512 512) scale({scale}) translate({-gx} {-gy})">{body}</g>'


def solid(color):
    return f'<rect width="1024" height="1024" fill="{color}"/>'


def srgb(hex_color):
    r, g, b = (int(hex_color[i : i + 2], 16) / 255 for i in (1, 3, 5))
    return f'srgb:{r:.5f},{g:.5f},{b:.5f},1.00000'


def icon_composer(name, light, dark):
    """An Icon Composer document: the background per appearance, the map as layers in its own colours.

    The layers keep their drawn (sunset) colours; the dark appearance repaints them by moonlight."""
    icon = ASSETS / name
    shutil.rmtree(icon, ignore_errors=True)
    (icon / 'Assets').mkdir(parents=True)
    # Icon Composer places layers on the full canvas, so they carry the same scale as the flat icon.
    for layer_name, body in {'sky': sky(), 'sun': sun(), 'hills': hills(), 'road': road()}.items():
        (icon / 'Assets' / f'{layer_name}.svg').write_text(svg(mark(SCALE, body)))

    def layer(layer_name, glass=False):
        moon = MOON[layer_name][-1] if layer_name == 'sky' else MOON[layer_name]
        return {
            'image-name': f'{layer_name}.svg',
            'name': layer_name,
            'glass': glass,
            'fill-specializations': [{'appearance': 'dark', 'value': {'solid': srgb(moon)}}],
        }

    document = {
        'fill-specializations': [
            {'value': {'solid': srgb(light)}},
            {'appearance': 'dark', 'value': {'solid': srgb(dark)}},
        ],
        'groups': [  # topmost first
            {
                'name': 'Map',
                'layers': [layer('road'), layer('hills'), layer('sun', glass=True), layer('sky')],
                'shadow': {'kind': 'neutral', 'opacity': 0.5},
                'translucency': {'enabled': False, 'value': 0.5},
            }
        ],
        'supported-platforms': {'circles': ['watchOS'], 'squares': 'shared'},
    }
    (icon / 'icon.json').write_text(json.dumps(document, indent=2) + '\n')


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
    icon_composer('unterwegs.icon', PAPER, NIGHT)
    icon_composer('unterwegs-staging.icon', AMBER, AMBER)
    raster('icon.png', solid(PAPER) + mark(SCALE), 1024)  # fallback icon (Android legacy, App Store Connect)
    raster('favicon.png', solid(PAPER) + mark(0.92), 48)
    # Android adaptive icon: the map inside the 66 dp safe circle of the 108 dp canvas
    raster('android-icon-foreground.png', mark(0.56), 512)
    raster('android-icon-background.png', solid(PAPER), 512)
    raster('android-icon-monochrome.png', mark(0.56, silhouette('#FFFFFF')), 432)
    raster('splash-icon.png', mark(), 512)
    raster('splash-icon-dark.png', mark(p=MOON), 512)


if __name__ == '__main__':
    main()
