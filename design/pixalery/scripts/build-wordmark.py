#!/usr/bin/env python3
"""Outline the "pixalery" wordmark (Nunito Light) into design/pixalery/pixalery-wordmark.svg.

The brand poster uses <text font-family="Nunito" font-weight="300" font-size="169"
letter-spacing="-3.3">pixalery</text>. SVGs referenced from <img>, flutter_svg or e-mail
clients cannot load web fonts, so the glyphs are converted to a single <path> once and
the result is committed. Only rerun this when the wordmark itself changes.

Requirements (scratch venv, not committed):  pip install fonttools uharfbuzz
Font: Nunito[wght].ttf from https://github.com/google/fonts/tree/main/ofl/nunito (OFL 1.1).
Usage: build-wordmark.py /path/to/Nunito[wght].ttf [output.svg]
"""

import io
import sys
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

TEXT = "pixalery"
WEIGHT = 300
FONT_SIZE = 169  # poster font-size
LETTER_SPACING = -3.3  # poster letter-spacing at FONT_SIZE
OUT_DEFAULT = Path(__file__).resolve().parents[1] / "pixalery-wordmark.svg"


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    font_path = Path(sys.argv[1])
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else OUT_DEFAULT

    font = TTFont(font_path)
    if "fvar" in font:
        font = instantiateVariableFont(font, {"wght": WEIGHT}, inplace=False)
    upem = font["head"].unitsPerEm
    tracking = LETTER_SPACING / FONT_SIZE * upem  # font units

    buf_bytes = io.BytesIO()
    font.save(buf_bytes)
    hb_face = hb.Face(buf_bytes.getvalue())
    hb_font = hb.Font(hb_face)
    hb_font.scale = (upem, upem)
    buf = hb.Buffer()
    buf.add_str(TEXT)
    buf.guess_segment_properties()
    hb.shape(hb_font, buf, {"kern": True, "liga": True})

    glyph_order = font.getGlyphOrder()
    glyph_set = font.getGlyphSet()
    svg_pen = SVGPathPen(glyph_set, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
    bounds_pen = BoundsPen(glyph_set)

    x = 0.0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = glyph_order[info.codepoint]
        transform = (1, 0, 0, -1, x + pos.x_offset, -pos.y_offset)  # flip y (SVG y grows down)
        glyph_set[name].draw(TransformPen(svg_pen, transform))
        glyph_set[name].draw(TransformPen(bounds_pen, transform))
        x += pos.x_advance + tracking

    xmin, ymin, xmax, ymax = bounds_pen.bounds
    d = svg_pen.getCommands()
    w, h = xmax - xmin, ymax - ymin
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="{xmin:.2f} {ymin:.2f} {w:.2f} {h:.2f}" '
        f'data-font="Nunito Light (OFL 1.1)" data-upem="{upem}" data-baseline="0" '
        f'data-advance="{x - tracking:.2f}" data-text="{TEXT}">'
        f'<path fill="#000000" d="{d}"/></svg>\n'
    )
    out_path.write_text(svg)
    print(f"wrote {out_path} viewBox={xmin:.1f} {ymin:.1f} {w:.1f} {h:.1f} (font units, upem={upem})")


if __name__ == "__main__":
    main()
