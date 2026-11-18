#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Eike Schäfer
#
# Gives a built Klassenplan its operator: the address it is served under, the
# operator's own Impressum and Datenschutzerklärung, and the contact address
# (decision 0048). The published image runs it on every start, on a fresh
# copy of the build; the release archive ships it for a web server of one's
# own.
#
#   SITE_URL=https://klassenplan.example.org \
#   IMPRINT_URL=https://example.org/impressum \
#   PRIVACY_URL=https://example.org/datenschutz \
#   CONTACT_EMAIL=klassenplan@example.org \
#   sh configure-instance.sh <the built site>
#
# Every variable is optional; one left unset keeps what the build has. Run it
# once on an unchanged build: it replaces the build's own values, which a
# second run no longer finds.
#
# POSIX sh, sed and awk only — the image has no Node, and a Mac's sed is not
# GNU's.
set -eu

DIR=${1:?usage: configure-instance.sh <directory of the built site>}
INSTANCE="$DIR/.instance"

fail() {
  printf 'configure-instance: %s\n' "$1" >&2
  exit 1
}

[ -f "$INSTANCE/build.env" ] ||
  fail "$DIR is no Klassenplan build (.instance/build.env missing)"

BUILD_SITE_URL=$(sed -n 's/^BUILD_SITE_URL=//p' "$INSTANCE/build.env")
BUILD_CONTACT_EMAIL=$(sed -n 's/^BUILD_CONTACT_EMAIL=//p' "$INSTANCE/build.env")
BUILD_IMPRINT_URL=$(sed -n 's/^BUILD_IMPRINT_URL=//p' "$INSTANCE/build.env")
BUILD_PRIVACY_URL=$(sed -n 's/^BUILD_PRIVACY_URL=//p' "$INSTANCE/build.env")

SITE_URL=${SITE_URL:-}
IMPRINT_URL=${IMPRINT_URL:-}
PRIVACY_URL=${PRIVACY_URL:-}
CONTACT_EMAIL=${CONTACT_EMAIL:-}

# A value lands in HTML attributes and in JavaScript template literals, so
# what could leave either is refused rather than escaped: quotes, angle
# brackets, backslashes, backticks, `$`, whitespace — and `|`, the sed
# delimiter below.
URL_CHARS='[A-Za-z0-9._~:/?#@!&()*+,;=%-]'

check_url() {
  value=$2
  [ -z "$value" ] && return 0
  printf '%s' "$value" | grep -Eq "^https?://${URL_CHARS}+\$" ||
    fail "$1 must be an absolute http(s) URL without quotes or spaces: \"$value\""
}

check_url SITE_URL "$SITE_URL"
check_url IMPRINT_URL "$IMPRINT_URL"
check_url PRIVACY_URL "$PRIVACY_URL"
if [ -n "$CONTACT_EMAIL" ]; then
  printf '%s' "$CONTACT_EMAIL" |
    grep -Eq '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' ||
    fail "CONTACT_EMAIL must be an email address: \"$CONTACT_EMAIL\""
fi
# One address per page, no trailing slash (decision 0029).
SITE_URL=${SITE_URL%/}

# Literal text for sed: the pattern's metacharacters, the replacement's `&`
# and `\`, and the delimiter.
pattern() { printf '%s' "$1" | sed 's/[][\.*^$|/]/\\&/g'; }
replacement() { printf '%s' "$1" | sed 's/[\&|]/\\&/g'; }

# The text files of the build; precompressed copies are not among them.
text_files() {
  find "$DIR" -type f \( -name '*.html' -o -name '*.js' -o -name '*.xml' \
    -o -name '*.txt' -o -name '*.json' -o -name '*.webmanifest' \) |
    grep -v '/\.instance/build\.env$' || true
}

# Replaces `from` by `to` in `file`. A changed file loses its .br and .gz,
# which still hold the old text; nginx compresses it as it serves it.
replace_in() {
  file=$1
  grep -qF -- "$2" "$file" || return 0
  sed "s|$(pattern "$2")|$(replacement "$3")|g" "$file" >"$file.kp-tmp"
  mv "$file.kp-tmp" "$file"
  rm -f "$file.br" "$file.gz"
}

# A legal page set by URL: its forwarding pages, drawn at build time with
# the placeholder, take the place of klassenplan.de's, and the bundle gets
# the URL for the placeholder. The sitemap drops the page: the operator's
# own is the one to find.
forward_legal() {
  route=$1 token=$2 url=$3 built=$4 variable=$5
  [ -z "$url" ] && return 0
  # A build given the URL forwards already, and only a new build changes it.
  if [ -n "$built" ]; then
    [ "$url" = "$built" ] && return 0
    fail "this build forwards /$route to $built; $variable takes another URL only in a new build"
  fi
  for page in "$route" "en/$route"; do
    template="$INSTANCE/forward/$page/index.html"
    [ -f "$template" ] ||
      fail "no forwarding page for /$page in this build (.instance/forward)"
    cp "$template" "$DIR/$page/index.html"
    rm -f "$DIR/$page/index.html.br" "$DIR/$page/index.html.gz"
  done
  text_files | while IFS= read -r file; do
    replace_in "$file" "$token" "$url"
  done
  if [ -f "$DIR/sitemap.xml" ]; then
    awk -v route="/$route</loc>" '
      /<url>/ { block = $0; inside = 1; next }
      inside { block = block "\n" $0 }
      inside && /<\/url>/ {
        inside = 0
        if (index(block, route) == 0) print block
        next
      }
      !inside { print }
    ' "$DIR/sitemap.xml" >"$DIR/sitemap.xml.kp-tmp"
    mv "$DIR/sitemap.xml.kp-tmp" "$DIR/sitemap.xml"
    rm -f "$DIR/sitemap.xml.br" "$DIR/sitemap.xml.gz"
  fi
}

forward_legal impressum __KP_IMPRINT_URL__ "$IMPRINT_URL" \
  "$BUILD_IMPRINT_URL" IMPRINT_URL
forward_legal datenschutz __KP_PRIVACY_URL__ "$PRIVACY_URL" \
  "$BUILD_PRIVACY_URL" PRIVACY_URL

# klassenplan.de's own Impressum and Datenschutzerklärung name the maintainer
# and keep doing so where they are still served: they are the maintainer's
# pages. Everywhere else the contact is the operator's.
is_maintainers_page() {
  case "$1" in
  */chunks/Impressum-*.js | */chunks/Datenschutz-*.js) return 0 ;;
  "$DIR/impressum/index.html" | "$DIR/en/impressum/index.html")
    [ -z "$IMPRINT_URL$BUILD_IMPRINT_URL" ]
    return
    ;;
  "$DIR/datenschutz/index.html" | "$DIR/en/datenschutz/index.html")
    [ -z "$PRIVACY_URL$BUILD_PRIVACY_URL" ]
    return
    ;;
  esac
  return 1
}

if [ -n "$CONTACT_EMAIL" ] && [ "$CONTACT_EMAIL" != "$BUILD_CONTACT_EMAIL" ]; then
  text_files | while IFS= read -r file; do
    is_maintainers_page "$file" && continue
    replace_in "$file" "$BUILD_CONTACT_EMAIL" "$CONTACT_EMAIL"
  done
fi

# Every `https://klassenplan.de` in a build means "this site": canonical,
# hreflang, Open Graph, structured data, sitemap, robots, llms.txt.
if [ -n "$SITE_URL" ] && [ "$SITE_URL" != "$BUILD_SITE_URL" ]; then
  text_files | while IFS= read -r file; do
    replace_in "$file" "$BUILD_SITE_URL" "$SITE_URL"
  done
fi

printf 'configure-instance: %s\n' \
  "site ${SITE_URL:-$BUILD_SITE_URL}, contact ${CONTACT_EMAIL:-$BUILD_CONTACT_EMAIL}, imprint ${IMPRINT_URL:-bundled}, privacy ${PRIVACY_URL:-bundled}"
