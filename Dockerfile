# Stage 1: Build
# Debian rather than Alpine: the build prerenders every route in a real
# Chromium (scripts/prerender.mjs) and Playwright does not support Alpine.
# Only this stage grows — stage 2 copies nothing but /app/dist.
FROM node:26-bookworm-slim AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json .npmrc ./

# Install dependencies
RUN npm ci

# Chromium for the prerender step; the version is pinned by @playwright/test in
# the lockfile. Kept above `COPY . .` so it survives source-only changes.
RUN npx playwright install --with-deps chromium

# Copy source code
COPY . .

# Build production bundle, prerender every route, then verify the output.
# SITE_URL is baked into canonical/hreflang/og:url at build time.
ARG SITE_URL=https://klassenplan.de
ENV SITE_URL=${SITE_URL}
# The operator's own Impressum and Datenschutzerklärung (see .env.example).
# Left empty, the build keeps the legal pages of klassenplan.de — and the
# image takes them when it starts instead (decision 0048). Given here, the
# texts of klassenplan.de stay out of the bundle altogether.
ARG IMPRINT_URL=
ARG PRIVACY_URL=
ENV IMPRINT_URL=${IMPRINT_URL} PRIVACY_URL=${PRIVACY_URL}
# The operator's contact address for the contact page and the error reports.
# Left empty, both write to the maintainer of klassenplan.de; the image takes
# one when it starts too.
ARG CONTACT_EMAIL=
ENV CONTACT_EMAIL=${CONTACT_EMAIL}
RUN npm run build:static

# Stage 2: Production
# Alpine, with nginx and its Brotli modules from the SAME Alpine repository
# (main), so their versions always match. Never the official `nginx:*` image:
# it ships an nginx of its own that the distributions' Brotli module packages
# do not install against — what broke the build in June 2026. Pinned to one
# Alpine branch, which gets security fixes for about two years: move to the
# next branch deliberately, about once a year (docs/SECURITY.md).
FROM alpine:3.24

# nginx and the Brotli modules (dynamic compression + serving precompressed
# .br files); BusyBox's wget does the health check. Forward nginx's
# access/error logs to the container's stdout/stderr. /var/lib/nginx, the
# prefix the modules and the log are reached through, opens to every user, so
# the image runs under any unprivileged one (OpenShift assigns its own). The
# package's user `nginx` is checked against the numbers `USER` names below.
RUN apk add --no-cache nginx nginx-mod-http-brotli \
    && ln -sf /dev/stdout /var/log/nginx/access.log \
    && ln -sf /dev/stderr /var/log/nginx/error.log \
    && chmod 755 /var/lib/nginx \
    && [ "$(id -u nginx):$(id -g nginx)" = "100:101" ]

# The build, unchanged. On every start the entrypoint copies it to nginx's
# root and gives the copy the operator's SITE_URL, IMPRINT_URL, PRIVACY_URL
# and CONTACT_EMAIL from the environment (decision 0048) — no build of one's
# own needed for that.
COPY --from=builder /app/dist /usr/share/klassenplan/site
# Executable in the repository; COPY keeps the mode (no BuildKit needed).
COPY scripts/configure-instance.sh /usr/local/bin/configure-instance
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint

# Copy nginx configuration. Our main configuration replaces Alpine's: no
# `user`, pid and temporary files below /tmp. It includes
# /etc/nginx/modules/*.conf (the Brotli load_module directives, dropped in by
# the apk package above) and /etc/nginx/http.d/*.conf in its http block, where
# our server block replaces the default one.
COPY nginx-main.conf /etc/nginx/nginx.conf
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf

# Without root: nginx's own user, by number so that Kubernetes'
# `runAsNonRoot` can verify it. It owns nothing — the entrypoint and nginx
# write below /tmp alone — so any other unprivileged user runs the image too.
USER 100:101

# Health check - verify nginx is responding. 127.0.0.1, not localhost:
# BusyBox's wget tries ::1 first, where nginx does not listen.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1

# An unprivileged port: a user without root may not bind 80 everywhere.
EXPOSE 8080

# Configure the copy, then start nginx
ENTRYPOINT ["docker-entrypoint"]
CMD ["nginx", "-g", "daemon off;"]
