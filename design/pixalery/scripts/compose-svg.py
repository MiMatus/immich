#!/usr/bin/env python3
"""Derive every Pixalery brand SVG from two hand-maintained sources (stdlib only).

Inputs  (design/pixalery/):  pixalery-mark.svg      the mark, viewBox "40 30 660 660"
                              pixalery-wordmark.svg  outlined "pixalery" (see build-wordmark.py)
Outputs (design/pixalery/):  pixalery-mark-flat.svg          mark without <filter> (flutter_svg / inline HTML safe)
                              pixalery-mark-icon.svg          flat mark, lens centred in the canvas (icon master)
                              pixalery-logo-inline-{light,dark}.svg   mark + wordmark, viewBox 0 0 3038 742
                              pixalery-logo-stacked-{light,dark}.svg  mark above wordmark, viewBox 0 0 741 864
                              pixalery-feature-panel.svg      1280x640 social/OG image (poster background + stacked logo)
                              pixalery-feature-graphic.svg    1024x500 Play Store feature graphic (background + inline logo)
                              pixalery-wordmark-{light,dark}.svg      wordmark alone, themed fill
Run:  python3 design/pixalery/scripts/compose-svg.py
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARK = ROOT / "pixalery-mark.svg"
WORDMARK = ROOT / "pixalery-wordmark.svg"

WORD_LIGHT = "#2b2d2e"  # poster text colour
WORD_DARK = "#fafafa"
LENS = (368.0, 344.0)  # lens centre in mark coordinates
X_HEIGHT = 484.0  # Nunito x-height in font units (upem 1000)
FORBIDDEN = ("<filter", "<text", "<style", "font-family", "<foreignObject")


def load_mark() -> tuple[str, str]:
    svg = MARK.read_text()
    defs = re.search(r"<defs>(.*?)</defs>", svg, re.S).group(1)
    body = svg[svg.index("</defs>") + 7 : svg.rindex("</svg>")]
    # drop the blurred shadow (filter) and the unused background gradient
    defs = re.sub(r"\s*<filter\b.*?</filter>", "", defs, flags=re.S)
    defs = re.sub(r'\s*<linearGradient[^>]*id="bg".*?</linearGradient>', "", defs, flags=re.S)
    body = re.sub(r'\s*<ellipse[^>]*filter="url\(#soft\)"[^>]*>\s*</ellipse>', "", body, flags=re.S)
    body = re.sub(r'\s*<ellipse[^>]*filter="url\(#soft\)"[^>]*/>', "", body, flags=re.S)
    # namespace the gradient ids so several logos can be inlined on one page
    for gid in re.findall(r'id="([^"]+)"', defs):
        defs = defs.replace(f'id="{gid}"', f'id="px-{gid}"')
        body = body.replace(f"url(#{gid})", f"url(#px-{gid})")
    return defs.strip(), body.strip()


def load_wordmark() -> tuple[str, tuple[float, float, float, float]]:
    svg = WORDMARK.read_text()
    vb = tuple(float(v) for v in re.search(r'viewBox="([^"]+)"', svg).group(1).split())
    d = re.search(r' d="([^"]+)"', svg).group(1)
    return d, vb


def svg_doc(view_box: str, defs: str, body: str) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view_box}">\n'
        f"<defs>\n{defs}\n</defs>\n{body}\n</svg>\n"
    )


def write(name: str, content: str) -> None:
    for token in FORBIDDEN:
        assert token not in content, f"{name}: forbidden {token}"
    assert content.count("<svg") == 1, f"{name}: nested <svg>"
    (ROOT / name).write_text(content)
    print("wrote", name)


def main() -> None:
    defs, body = load_mark()
    word_d, (wx, wy, ww, wh) = load_wordmark()

    write("pixalery-mark-flat.svg", svg_doc("40 30 660 660", defs, body))
    # centre the lens: viewBox 660x660 around (368,344)
    write("pixalery-mark-icon.svg", svg_doc(f"{LENS[0] - 330:g} {LENS[1] - 330:g} 660 660", defs, body))

    # ---- inline lockup 3038x742 -------------------------------------------------
    W, H = 3038.0, 742.0
    mark_h = 668.0
    k = mark_h / 660.0
    gap = 120.0
    s = 500.0 / wh  # wordmark ascender-to-descender height = 500 canvas units
    word_w = ww * s
    total = mark_h + gap + word_w
    left = (W - total) / 2
    mark_top = (H - mark_h) / 2
    lens_y = mark_top + (LENS[1] - 30) * k
    word_tx = left + mark_h + gap - wx * s
    word_ty = lens_y + (X_HEIGHT / 2) * s  # baseline so the x-height centre sits on the lens centre
    for theme, fill in (("light", WORD_LIGHT), ("dark", WORD_DARK)):
        inline_body = (
            f'<g transform="translate({left:.2f} {mark_top:.2f}) scale({k:.5f}) translate(-40 -30)">\n{body}\n</g>\n'
            f'<path fill="{fill}" transform="translate({word_tx:.2f} {word_ty:.2f}) scale({s:.5f})" d="{word_d}"/>'
        )
        write(f"pixalery-logo-inline-{theme}.svg", svg_doc(f"0 0 {W:g} {H:g}", defs, inline_body))

    # ---- stacked lockup 741x864 (poster layout without background) ---------------
    fs = 169.0 / 1000.0  # poster font-size 169 at upem 1000
    word_cx = wx + ww / 2
    tx = 370.0 - word_cx * fs
    ty = 762.0
    for theme, fill in (("light", WORD_LIGHT), ("dark", WORD_DARK)):
        stacked_body = f'{body}\n<path fill="{fill}" transform="translate({tx:.2f} {ty:.2f}) scale({fs:.5f})" d="{word_d}"/>'
        write(f"pixalery-logo-stacked-{theme}.svg", svg_doc("0 0 741 864", defs, stacked_body))

    # ---- themed wordmark alone -----------------------------------------------------
    for theme, fill in (("light", WORD_LIGHT), ("dark", WORD_DARK)):
        write(
            f"pixalery-wordmark-{theme}.svg",
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{wx:.2f} {wy:.2f} {ww:.2f} {wh:.2f}">\n'
            f'<path fill="{fill}" d="{word_d}"/>\n</svg>\n',
        )

    # ---- panels with the poster background -------------------------------------------
    bg_defs = (
        '<linearGradient id="px-panel-bg" x1="0" y1="0" x2="0.9" y2="1">'
        '<stop offset="0" stop-color="#fcfcfd"/><stop offset="0.55" stop-color="#edeff1"/>'
        '<stop offset="1" stop-color="#e1e4e8"/></linearGradient>'
    )
    stacked_light = f'{body}\n<path fill="{WORD_LIGHT}" transform="translate({tx:.2f} {ty:.2f}) scale({fs:.5f})" d="{word_d}"/>'
    # 1280x640: stacked logo (741x864) scaled to 600 high, centred
    ps = 600.0 / 864.0
    px = (1280 - 741 * ps) / 2
    panel = (
        '<rect width="1280" height="640" fill="url(#px-panel-bg)"/>\n'
        f'<g transform="translate({px:.2f} 20) scale({ps:.5f})">\n{stacked_light}\n</g>'
    )
    write("pixalery-feature-panel.svg", svg_doc("0 0 1280 640", defs + "\n" + bg_defs, panel))
    # 1024x500: inline logo (3038x742) scaled to 860 wide, centred
    gs = 860.0 / W
    gx, gy = (1024 - W * gs) / 2, (500 - H * gs) / 2
    inline_light = (
        f'<g transform="translate({left:.2f} {mark_top:.2f}) scale({k:.5f}) translate(-40 -30)">\n{body}\n</g>\n'
        f'<path fill="{WORD_LIGHT}" transform="translate({word_tx:.2f} {word_ty:.2f}) scale({s:.5f})" d="{word_d}"/>'
    )
    graphic = (
        '<rect width="1024" height="500" fill="url(#px-panel-bg)"/>\n'
        f'<g transform="translate({gx:.2f} {gy:.2f}) scale({gs:.5f})">\n{inline_light}\n</g>'
    )
    write("pixalery-feature-graphic.svg", svg_doc("0 0 1024 500", defs + "\n" + bg_defs, graphic))


if __name__ == "__main__":
    main()
