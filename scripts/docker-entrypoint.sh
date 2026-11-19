#!/bin/sh
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Eike Schäfer
#
# Start of the published image: a fresh copy of the build is given the
# operator's address, legal pages and contact from the environment
# (SITE_URL, IMPRINT_URL, PRIVACY_URL, CONTACT_EMAIL; decision 0048), then
# nginx serves it. From the unchanged build every time, so a restart with
# other values starts from what was built, not from the last start.
#
# Everything it and nginx write lies below /tmp (nginx-main.conf), the one
# place an unprivileged user may write — and the one to mount as a tmpfs when
# the container's file system is read-only.
set -eu

BUILD=/usr/share/klassenplan/site
ROOT=/tmp/klassenplan/site

mkdir -p /tmp/nginx
rm -rf "$ROOT"
mkdir -p "$ROOT"
cp -R "$BUILD/." "$ROOT/"
configure-instance "$ROOT"

exec "$@"
