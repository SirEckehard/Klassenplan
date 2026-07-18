# Stage 1: Build
# Debian rather than Alpine: the build prerenders every route in a real
# Chromium (scripts/prerender.mjs) and Playwright does not support Alpine.
# Only this stage grows — stage 2 copies nothing but /app/dist.
FROM node:24-bookworm-slim AS builder

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
RUN npm run build:static

# Stage 2: Production
# Use a plain Debian slim base and install nginx + the Brotli modules from the
# SAME Debian repository, so their package revisions always match. The official
# `nginx:*` image ships a self-built nginx that Debian's module packages
# (libnginx-mod-http-brotli-*) do not install against.
FROM debian:trixie-slim

# nginx, the Brotli modules (dynamic compression + serving precompressed .br
# files), and curl (for the health check), all from one repo.
# Remove Debian's default site so the conf.d server block below is the only
# one answering on port 80, and forward nginx's access/error logs to the
# container's stdout/stderr.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       nginx libnginx-mod-http-brotli-filter libnginx-mod-http-brotli-static curl \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default \
    && ln -sf /dev/stdout /var/log/nginx/access.log \
    && ln -sf /dev/stderr /var/log/nginx/error.log

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration. Debian's main nginx.conf includes
# /etc/nginx/conf.d/*.conf (server blocks) and /etc/nginx/modules-enabled/*.conf
# (the Brotli load_module directives, dropped in by the apt packages above).
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf

# Health check - verify nginx is responding
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
