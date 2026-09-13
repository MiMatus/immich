#!/usr/bin/env bash
# Regenerate every Pixalery raster asset (web + mobile) from design/pixalery/*.svg.
#
#   design/pixalery/scripts/generate-brand-assets.sh [all|svg|raster|verify]
#
# Requirements: docker (librsvg via alpine, the only renderer that handles the gradients
# AND keeps transparency), ImageMagick 7 (`magick`, PNG/ICO work only - never SVG),
# python3. macOS `qlmanage` and ImageMagick's built-in SVG renderer are NOT used: the
# former flattens onto white, the latter renders the gradients black.
#
# The native Android/iOS PNGs written here are authoritative; flutter_launcher_icons /
# flutter_native_splash configs stay valid but are not required.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DESIGN="$(dirname "$HERE")"
REPO="$(cd "$DESIGN/../.." && pwd)"
WEB="$REPO/web/static"
MOBILE="$REPO/mobile"
RES="$MOBILE/android/app/src/main/res"
IOS="$MOBILE/ios/Runner/Assets.xcassets"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

ICON_FILL=0.78      # opaque icons (iOS, Play, apple-touch): matches Immich's ~77 %
ADAPTIVE_FILL=0.78  # Android adaptive foreground (108 dp layer, 66 dp safe zone)
MASKABLE_FILL=0.62  # PWA maskable icons (80 % safe circle)
ANDROID12_FILL=0.667
SPLASH_FILL=1.0
NOTIF_FILL=0.9
WHITE="#ffffff"
DPIS="mdpi:1 hdpi:1.5 xhdpi:2 xxhdpi:3 xxxhdpi:4"  # macOS ships bash 3.2: no associative arrays

log() { printf '\033[1;34m[brand]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[brand] %s\033[0m\n' "$*" >&2; exit 1; }
png_opts=(-strip -depth 8 -define png:exclude-chunk=date,time)

# fit SRC OUT SIZE FILL BG [opaque]  (square)   /  fitwh SRC OUT W H FILL BG [opaque]
fit() { fitwh "$1" "$2" "$3" "$3" "$4" "$5" "${6:-}"; }
fitwh() {
  local src=$1 out=$2 w=$3 h=$4 fill=$5 bg=$6 opaque=${7:-}
  [[ $src == *.png ]] || die "fit: refusing non-PNG input $src"
  local cw ch; cw=$(python3 -c "print(round($w*$fill))"); ch=$(python3 -c "print(round($h*$fill))")
  mkdir -p "$(dirname "$out")"
  if [[ -n $opaque ]]; then
    magick "$src" -filter Lanczos -resize "${cw}x${ch}" -background "$bg" -gravity center -extent "${w}x${h}" \
      -alpha remove -alpha off "${png_opts[@]}" "PNG24:$out"
  else
    magick "$src" -filter Lanczos -resize "${cw}x${ch}" -background none -gravity center -extent "${w}x${h}" \
      "${png_opts[@]}" "PNG32:$out"
  fi
}

# tint FILE COLOR: force every pixel's RGB to COLOR, keep alpha (single-colour masks)
tint() { magick "$1" -channel RGB -fill "$2" -colorize 100 +channel "${png_opts[@]}" "PNG32:$1"; }

step_svg() {
  log "composing SVGs"
  python3 "$HERE/compose-svg.py"
  for f in "$DESIGN"/pixalery-*.svg; do xmllint --noout "$f"; done
}

render_masters() {
  log "rendering masters with librsvg (docker alpine)"
  docker run --rm -v "$DESIGN:/in:ro" -v "$TMP:/out" alpine:3.20 sh -ec '
    apk add --no-cache rsvg-convert >/dev/null 2>&1
    r() { rsvg-convert "$@"; }
    r -w 4096 -h 4096 /in/pixalery-mark-icon.svg          -o /out/icon.png
    r -w 6076                /in/pixalery-logo-inline-light.svg  -o /out/inline-light.png
    r -w 6076                /in/pixalery-logo-inline-dark.svg   -o /out/inline-dark.png
    r -w 5174                /in/pixalery-wordmark-light.svg     -o /out/word-light.png
    r -w 5174                /in/pixalery-wordmark-dark.svg      -o /out/word-dark.png
    r -w 1024 -h 1024        /in/pixalery-glyph-mono.svg         -o /out/mono.png
    r -w 2560 -h 1280        /in/pixalery-feature-panel.svg      -o /out/feature-panel.png
    r -w 2048 -h 1000        /in/pixalery-feature-graphic.svg    -o /out/feature-graphic.png
  '
  for f in icon inline-light inline-dark word-light word-dark mono feature-panel feature-graphic; do
    [[ -s $TMP/$f.png ]] || die "render failed: $f"
  done
}

step_raster() {
  render_masters
  local I="$TMP/icon.png" M="$TMP/mono.png"

  log "web/static"
  for s in 16 32 48; do fit "$I" "$TMP/favicon-$s.png" "$s" 1.0 none; done
  magick "$TMP/favicon-16.png" "$TMP/favicon-32.png" "$TMP/favicon-48.png" "$WEB/favicon.ico"
  cp "$DESIGN/pixalery-mark-icon.svg" "$WEB/icon.svg"
  fit "$I" "$WEB/apple-icon-180.png" 180 "$ICON_FILL" "$WHITE" opaque
  fit "$I" "$WEB/manifest-icon-192.maskable.png" 192 "$MASKABLE_FILL" "$WHITE" opaque
  fit "$I" "$WEB/manifest-icon-512.maskable.png" 512 "$MASKABLE_FILL" "$WHITE" opaque
  magick "$TMP/feature-panel.png" -filter Lanczos -resize 1280x640 -alpha off "${png_opts[@]}" "PNG24:$WEB/feature-panel.png"
  magick "$TMP/inline-light.png" -filter Lanczos -resize 600x147 "${png_opts[@]}" "PNG32:$WEB/pixalery-logo-inline-light.png"

  log "mobile/assets"
  local A="$MOBILE/assets"
  fit "$I" "$A/immich-logo.png" 2366 0.96 none
  fit "$I" "$A/immich-logo-w-bg.png" 2366 "$ICON_FILL" "$WHITE" opaque
  fit "$I" "$A/immich-logo-android-adaptive-icon.png" 324 "$ADAPTIVE_FILL" none
  fit "$I" "$A/immich-splash.png" 320 "$SPLASH_FILL" none
  fit "$I" "$A/immich-splash-android12.png" 1152 "$ANDROID12_FILL" none
  cp "$DESIGN/pixalery-mark-icon.svg" "$A/immich-logo.svg"
  cp "$DESIGN/pixalery-logo-inline-light.svg" "$A/immich-logo-inline-light.svg"
  cp "$DESIGN/pixalery-logo-inline-dark.svg" "$A/immich-logo-inline-dark.svg"
  fitwh "$TMP/inline-light.png" "$A/immich-logo-inline-light.png" 3038 742 1.0 none
  fitwh "$TMP/inline-dark.png" "$A/immich-logo-inline-dark.png" 3038 742 1.0 none
  fitwh "$TMP/word-light.png" "$A/immich-text-light.png" 2587 645 1.0 none; tint "$A/immich-text-light.png" "#2b2d2e"
  fitwh "$TMP/word-dark.png" "$A/immich-text-dark.png" 2587 645 1.0 none; tint "$A/immich-text-dark.png" "#fafafa"
  fitwh "$I" "$TMP/logo-json.png" 640 320 1.0 none
  python3 - "$TMP/logo-json.png" "$A/immich-logo.json" <<'PY'
import base64, json, sys
json.dump({"content": base64.b64encode(open(sys.argv[1], "rb").read()).decode()}, open(sys.argv[2], "w"))
PY

  log "android res"
  for dm in $DPIS; do
    local d=${dm%%:*} m=${dm##*:}
    local px; px=$(python3 -c "print(round(48*$m))")
    # legacy launcher: white disc + mark
    fit "$I" "$TMP/l-$d.png" "$px" "$ICON_FILL" none
    magick -size "${px}x${px}" xc:none -fill "$WHITE" -draw "circle $((px/2)),$((px/2)) $((px/2)),0" \
      "$TMP/l-$d.png" -gravity center -composite "${png_opts[@]}" "PNG32:$RES/mipmap-$d/ic_launcher.png"
    fit "$I" "$RES/mipmap-$d/ic_launcher_foreground.png" "$(python3 -c "print(round(108*$m))")" "$ADAPTIVE_FILL" none
    fit "$I" "$RES/drawable-$d/splash.png" "$(python3 -c "print(round(80*$m))")" "$SPLASH_FILL" none
    local a12; a12=$(python3 -c "print(round(288*$m))")
    fit "$I" "$RES/drawable-$d/android12splash.png" "$a12" "$ANDROID12_FILL" none
    fit "$I" "$RES/drawable-night-$d/android12splash.png" "$a12" "$ANDROID12_FILL" none
    fit "$M" "$RES/drawable-$d/notification_icon.png" "$(python3 -c "print(round(24*$m))")" "$NOTIF_FILL" none
    tint "$RES/drawable-$d/notification_icon.png" "$WHITE"
  done
  for store in "$MOBILE/android/metadata/en-US/images" "$MOBILE/android/fastlane/metadata/android/en-US/images"; do
    fit "$I" "$store/icon.png" 512 "$ICON_FILL" "$WHITE" opaque
    magick "$TMP/feature-graphic.png" -filter Lanczos -resize 1024x500 -alpha off "${png_opts[@]}" "PNG24:$store/featureGraphic.png"
  done

  log "ios"
  local sizes
  sizes=$(python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print(' '.join(sorted({i['filename'] for i in d['images'] if 'filename' in i}, key=lambda f:int(f.split('.')[0]))))" "$IOS/AppIcon.appiconset/Contents.json")
  for f in $sizes; do fit "$I" "$IOS/AppIcon.appiconset/$f" "${f%.png}" "$ICON_FILL" "$WHITE" opaque; done
  fit "$I" "$IOS/LaunchImage.imageset/LaunchImage.png" 80 "$SPLASH_FILL" none
  fit "$I" "$IOS/LaunchImage.imageset/LaunchImage@2x.png" 160 "$SPLASH_FILL" none
  fit "$I" "$IOS/LaunchImage.imageset/LaunchImage@3x.png" 240 "$SPLASH_FILL" none
}

expect() { # expect FILE WxH [opaque|alpha]
  local f=$1 dims=$2 mode=${3:-}
  [[ -s $f ]] || die "missing $f"
  local got; got=$(magick identify -format '%wx%h' "$f")
  [[ $got == "$dims" ]] || die "$f: expected $dims got $got"
  case $mode in
    opaque) [[ $(magick identify -format '%[channels]' "$f") == srgb* && $(magick identify -format '%[channels]' "$f") != *a* ]] || die "$f: must have no alpha channel" ;;
    alpha)  [[ $(magick identify -format '%[opaque]' "$f") == False ]] || die "$f: expected transparency" ;;
  esac
}

step_verify() {
  log "verifying"
  cmp -s "$DESIGN/pixalery-mark-icon.svg" "$WEB/icon.svg" || die "icon.svg differs from the icon master"
  expect "$WEB/apple-icon-180.png" 180x180 opaque
  expect "$WEB/manifest-icon-192.maskable.png" 192x192 opaque
  expect "$WEB/manifest-icon-512.maskable.png" 512x512 opaque
  expect "$WEB/feature-panel.png" 1280x640 opaque
  expect "$WEB/pixalery-logo-inline-light.png" 600x147 alpha
  [[ $(magick identify "$WEB/favicon.ico" | wc -l) -eq 3 ]] || die "favicon.ico must hold 3 images"
  local A="$MOBILE/assets"
  expect "$A/immich-logo.png" 2366x2366 alpha
  expect "$A/immich-logo-w-bg.png" 2366x2366 opaque
  expect "$A/immich-logo-android-adaptive-icon.png" 324x324 alpha
  expect "$A/immich-splash.png" 320x320 alpha
  expect "$A/immich-splash-android12.png" 1152x1152 alpha
  expect "$A/immich-logo-inline-light.png" 3038x742 alpha
  expect "$A/immich-logo-inline-dark.png" 3038x742 alpha
  for t in light dark; do
    expect "$A/immich-text-$t.png" 2587x645 alpha
    [[ $(magick "$A/immich-text-$t.png" -alpha off -unique-colors -format %k info:) -eq 1 ]] || die "immich-text-$t.png must be single-colour"
  done
  python3 -m json.tool "$A/immich-logo.json" >/dev/null
  for dm in $DPIS; do
    local d=${dm%%:*} m=${dm##*:} p
    p=$(python3 -c "print(round(48*$m))");  expect "$RES/mipmap-$d/ic_launcher.png" "${p}x${p}" alpha
    p=$(python3 -c "print(round(108*$m))"); expect "$RES/mipmap-$d/ic_launcher_foreground.png" "${p}x${p}" alpha
    p=$(python3 -c "print(round(80*$m))");  expect "$RES/drawable-$d/splash.png" "${p}x${p}" alpha
    p=$(python3 -c "print(round(288*$m))"); expect "$RES/drawable-$d/android12splash.png" "${p}x${p}" alpha; expect "$RES/drawable-night-$d/android12splash.png" "${p}x${p}" alpha
    p=$(python3 -c "print(round(24*$m))");  expect "$RES/drawable-$d/notification_icon.png" "${p}x${p}" alpha
    [[ $(magick "$RES/drawable-$d/notification_icon.png" -alpha off -unique-colors -format %k info:) -eq 1 ]] || die "notification_icon $d must be white-only"
  done
  [[ ! -e $RES/drawable/ic_launcher_foreground.xml ]] || die "stale Immich vector drawable/ic_launcher_foreground.xml still present"
  for store in "$MOBILE/android/metadata/en-US/images" "$MOBILE/android/fastlane/metadata/android/en-US/images"; do
    expect "$store/icon.png" 512x512 opaque; expect "$store/featureGraphic.png" 1024x500 opaque
  done
  python3 - "$IOS/AppIcon.appiconset/Contents.json" <<'PY'
import json, sys, subprocess, os
d = json.load(open(sys.argv[1])); base = os.path.dirname(sys.argv[1])
for f in sorted({i['filename'] for i in d['images'] if 'filename' in i}):
    n = f.split('.')[0]
    out = subprocess.check_output(['magick', 'identify', '-format', '%wx%h %[channels]', os.path.join(base, f)]).decode()
    assert out.startswith(f'{n}x{n} ') and 'a' not in out.split()[1], (f, out)
print('ios icons ok')
PY
  expect "$IOS/LaunchImage.imageset/LaunchImage.png" 80x80 alpha
  expect "$IOS/LaunchImage.imageset/LaunchImage@2x.png" 160x160 alpha
  expect "$IOS/LaunchImage.imageset/LaunchImage@3x.png" 240x240 alpha
  for f in "$RES/mipmap-anydpi-v26/ic_launcher.xml" "$RES/drawable/ic_launcher_monochrome.xml" "$RES/values/colors.xml" \
           "$MOBILE/android/app/src/main/AndroidManifest.xml" "$MOBILE/ios/Runner/Base.lproj/LaunchScreen.storyboard" \
           "$MOBILE/ios/Runner.xcodeproj/xcshareddata/xcschemes/Runner.xcscheme" "$DESIGN"/pixalery-*.svg; do xmllint --noout "$f"; done
  plutil -lint "$MOBILE/ios/Runner/Info.plist" >/dev/null
  python3 -m json.tool "$WEB/manifest.json" >/dev/null
  log "verify OK"
}

case "${1:-all}" in
  svg) step_svg ;;
  raster) step_raster ;;
  verify) step_verify ;;
  all) step_svg; step_raster; step_verify ;;
  *) die "usage: $0 [all|svg|raster|verify]" ;;
esac
