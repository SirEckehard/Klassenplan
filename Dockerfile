# Stage 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json .npmrc ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build production bundle
RUN npm run build

# Stage 2: Production
# Use a plain Alpine base and install nginx + the Brotli module from the SAME
# Alpine repository, so their package revisions always match. The official
# `nginx:*-alpine` image ships a self-built nginx (revision -r1) whose revision
# drifts from Alpine community's nginx-mod-http-brotli (e.g. -r3), which makes
# `apk add nginx-mod-http-brotli` unsatisfiable on top of that image.
FROM alpine:3.21

# nginx, the Brotli module, and curl (for the health check), all from one repo.
# Forward nginx's access/error logs to the container's stdout/stderr.
RUN apk add --no-cache nginx nginx-mod-http-brotli curl \
    && mkdir -p /run/nginx \
    && ln -sf /dev/stdout /var/log/nginx/access.log \
    && ln -sf /dev/stderr /var/log/nginx/error.log

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration. Alpine's main nginx.conf includes
# /etc/nginx/http.d/*.conf (server blocks) and /etc/nginx/modules/*.conf (the
# Brotli load_module directive, dropped in by the apk package above).
COPY nginx.conf /etc/nginx/http.d/default.conf
COPY nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf

# Health check - verify nginx is responding
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
