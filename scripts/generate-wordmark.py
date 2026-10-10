#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Eike Schäfer
"""
Sets the wordmark "Klassenplan" in Onest Bold and writes it as outlines.

The brand files carry the wordmark as paths, so they render identically with
no font installed, and the app draws the same outlines inline (KpLockup)
instead of live text, so the name does not follow the interface font.

Writes:
  public/brand/wordmark/klassenplan-wordmark.svg   (+ .png at 2x the viewBox)
  public/brand/lockup/klassenplan-lockup.svg       (+ .png, 1200 px wide)
  src/components/kpWordmarkPaths.ts                (outlines for KpLockup)

The lockup keeps its mark: only the wordmark group of the existing SVG is
replaced, and the viewBox widened or narrowed to the new text width.

Usage:
  python3 -m venv /tmp/wm && /tmp/wm/bin/pip install fonttools brotli uharfbuzz
  npm install --no-save @fontsource-variable/onest
  /tmp/wm/bin/python3 scripts/generate-wordmark.py [--font path/to/onest-latin-wght-normal.woff2]
  npm run format   # the generated TypeScript

PNGs need rsvg-convert (brew install librsvg). The font is not a dependency of
the app: it is only read here, which is why it is installed with --no-save.
"""
import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    import uharfbuzz as hb
    from fontTools.pens.boundsPen import BoundsPen
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.ttLib import TTFont
    from fontTools.varLib import instancer
except ImportError as error:  # pragma: no cover - environment hint
    sys.exit(f'Missing Python package ({error.name}); see the usage in this file.')

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_FONT = (
    ROOT
    / 'node_modules/@fontsource-variable/onest/files/onest-latin-wght-normal.woff2'
)
TEXT = 'Klassenplan'
WEIGHT = 700
LETTER_SPACING_EM = -0.015
FILL = '#2563EB'

WORDMARK_SVG = ROOT / 'public/brand/wordmark/klassenplan-wordmark.svg'
WORDMARK_PNG = ROOT / 'public/brand/wordmark/klassenplan-wordmark.png'
LOCKUP_SVG = ROOT / 'public/brand/lockup/klassenplan-lockup.svg'
LOCKUP_PNG = ROOT / 'public/brand/lockup/klassenplan-lockup.png'
PATHS_TS = ROOT / 'src/components/kpWordmarkPaths.ts'

# Geometry of the brand files: the wordmark SVG is 190.4 high with 20 px of
# padding and the baseline at 115.2 at a scale of 0.16; the lockup is 240 high
# with the wordmark group at x = 300 and the baseline at 122.4 at 0.17.
WORDMARK_SCALE, WORDMARK_PAD, WORDMARK_HEIGHT, WORDMARK_BASELINE = 0.16, 20, 190.4, 115.2
LOCKUP_SCALE, LOCKUP_X, LOCKUP_BASELINE = 0.17, 300, 122.4
LOCKUP_GROUP = '<g transform="translate(300, 60.50)">'
LOCKUP_PNG_WIDTH = 1200


def number(value: float) -> str:
    return ('%.3f' % value).rstrip('0').rstrip('.')


def shape(font_path: Path):
    """Instantiate the font at the wordmark's weight and set the text."""
    source = TTFont(str(font_path))
    static = instancer.instantiateVariableFont(source, {'wght': WEIGHT})
    static.flavor = None
    with tempfile.TemporaryDirectory() as tmp:
        ttf = Path(tmp) / 'onest.ttf'
        static.save(str(ttf))
        font = TTFont(str(ttf))
        buffer = hb.Buffer()
        buffer.add_str(TEXT)
        buffer.guess_segment_properties()
        hb.shape(hb.Font(hb.Face(hb.Blob.from_file_path(str(ttf)))), buffer, {'kern': True, 'liga': False})
        units = font['head'].unitsPerEm
        spacing = LETTER_SPACING_EM * units
        order = font.getGlyphOrder()
        glyph_set = font.getGlyphSet()
        placed, cursor = [], 0.0
        for info, position in zip(buffer.glyph_infos, buffer.glyph_positions):
            placed.append((order[info.codepoint], cursor + position.x_offset))
            cursor += position.x_advance + spacing
        total = cursor - spacing  # no trailing letter-spacing
        outlines = {}
        for name, _ in placed:
            if name in outlines:
                continue
            pen = SVGPathPen(glyph_set, ntos=lambda v: number(v))
            glyph_set[name].draw(pen)
            outlines[name] = pen.getCommands()
        cmap = font.getBestCmap()
        tops = {}
        for char in 'Kl':
            bounds = BoundsPen(glyph_set)
            glyph_set[cmap[ord(char)]].draw(bounds)
            tops[char] = bounds.bounds[3]
        top = 0
        for char in TEXT:
            bounds = BoundsPen(glyph_set)
            glyph_set[cmap[ord(char)]].draw(bounds)
            top = max(top, bounds.bounds[3])
    return {
        'units': units,
        'total': total,
        'placed': placed,
        'outlines': outlines,
        'chars': [(char, name) for char, (name, _) in zip(TEXT, placed)],
        'top': top,
        'tops': tops,
    }


def path_elements(data, scale: float, baseline: float, indent: str):
    elements = []
    for name, x in data['placed']:
        d = data['outlines'][name]
        if not d:
            continue
        elements.append(
            f'{indent}<path d="{d}" transform="translate({x * scale:.2f}, {baseline:.2f}) '
            f'scale({scale:.4f}, {-scale:.4f})" fill="{FILL}"/>'
        )
    return elements


def write_wordmark(data):
    width = data['total'] * WORDMARK_SCALE + 2 * WORDMARK_PAD
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.2f} {WORDMARK_HEIGHT:.2f}" role="img" aria-label="Klassenplan">',
        '  <title>Klassenplan</title>',
        f'  <g transform="translate({WORDMARK_PAD}, {WORDMARK_PAD})">',
        *path_elements(data, WORDMARK_SCALE, WORDMARK_BASELINE, '    '),
        '  </g>',
        '</svg>',
        '',
    ]
    WORDMARK_SVG.write_text('\n'.join(lines), encoding='utf-8')
    return width


def write_lockup(data):
    source = LOCKUP_SVG.read_text(encoding='utf-8')
    if LOCKUP_GROUP not in source:
        sys.exit(f'The wordmark group {LOCKUP_GROUP!r} is missing from {LOCKUP_SVG}.')
    head = source[: source.index(LOCKUP_GROUP)]
    width = LOCKUP_X + data['total'] * LOCKUP_SCALE
    head, count = re.subn(r'viewBox="0 0 [\d.]+ ([\d.]+)"', lambda m: f'viewBox="0 0 {width:.2f} {m.group(1)}"', head, count=1)
    if count != 1:
        sys.exit('No viewBox found in the lockup.')
    body = [LOCKUP_GROUP, *path_elements(data, LOCKUP_SCALE, LOCKUP_BASELINE, '    '), '  </g>', '</svg>', '']
    LOCKUP_SVG.write_text(head + '\n'.join(body), encoding='utf-8')
    return width, float(re.search(r'viewBox="0 0 [\d.]+ ([\d.]+)"', head).group(1))


def write_typescript(data):
    def g(value):
        return '%g' % value

    lines = [
        '// SPDX-License-Identifier: AGPL-3.0-or-later',
        '// Copyright (C) 2026 Eike Schäfer',
        '//',
        '// The wordmark "Klassenplan" as outlines of Onest Bold (SIL Open Font License',
        '// 1.1), kerned and set with -1.5 % letter-spacing, in font units (1000 per em,',
        '// y up). The same outlines are in public/brand/wordmark; the app draws them',
        '// instead of live text so the brand name does not follow the interface font.',
        '// Generated by scripts/generate-wordmark.py — do not edit by hand.',
        '',
        f'export const WORDMARK_UNITS_PER_EM = {data["units"]};',
        '/** Total advance of the line, without trailing letter-spacing. */',
        f'export const WORDMARK_WIDTH = {g(data["total"])};',
        '/** Highest point above the baseline (cap height and ascender coincide). */',
        f'export const WORDMARK_TOP = {g(data["top"])};',
        '',
        'export const WORDMARK_GLYPH_PATHS: Record<string, string> = {',
    ]
    seen = set()
    for char, name in data['chars']:
        if char in seen:
            continue
        seen.add(char)
        lines.append(f"  {char}: '{data['outlines'][name]}',")
    lines += [
        '};',
        '',
        '/** Glyphs of "Klassenplan" in order, with the x offset of each in font units. */',
        'export const WORDMARK_GLYPHS: readonly { char: string; x: number }[] = [',
    ]
    for (char, _), (_, x) in zip(data['chars'], data['placed']):
        lines.append(f"  {{ char: '{char}', x: {g(round(x, 1))} }},")
    lines += ['];', '']
    PATHS_TS.write_text('\n'.join(lines), encoding='utf-8')


def rasterize(svg: Path, png: Path, width: int, height: int):
    if not shutil.which('rsvg-convert'):
        print(f'rsvg-convert not found, {png.name} left as it was.')
        return
    subprocess.run(['rsvg-convert', '-w', str(width), '-h', str(height), str(svg), '-o', str(png)], check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--font', type=Path, default=DEFAULT_FONT, help='Onest variable font (woff2 or ttf)')
    args = parser.parse_args()
    if not args.font.exists():
        sys.exit(f'Font not found: {args.font}\nInstall it with: npm install --no-save @fontsource-variable/onest')

    data = shape(args.font)
    print(f'K top {data["tops"]["K"]:g}, l top {data["tops"]["l"]:g} (units of {data["units"]})')
    wordmark_width = write_wordmark(data)
    lockup_width, lockup_height = write_lockup(data)
    write_typescript(data)
    rasterize(WORDMARK_SVG, WORDMARK_PNG, round(wordmark_width * 2), round(WORDMARK_HEIGHT * 2))
    rasterize(LOCKUP_SVG, LOCKUP_PNG, LOCKUP_PNG_WIDTH, round(LOCKUP_PNG_WIDTH * lockup_height / lockup_width))
    print(f'Lockup is {lockup_width:.2f} x {lockup_height:g}: keep og:image:height in index.html and Seo.tsx at '
          f'{round(LOCKUP_PNG_WIDTH * lockup_height / lockup_width)}.')


if __name__ == '__main__':
    main()
