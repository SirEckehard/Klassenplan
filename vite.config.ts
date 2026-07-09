// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/// <reference types="vitest" />
/// <reference types="vite/client" />
import { defineConfig } from 'vitest/config';
import type { PreRenderedChunk, PreRenderedAsset } from 'rolldown';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import viteCompression from 'vite-plugin-compression';
import path from 'path';
import { fileURLToPath } from 'node:url';
import type { PluginOption } from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));

const SINGLE_QUOTE = String.fromCharCode(39);
const wrapInSingleQuotes = (value: string) =>
  SINGLE_QUOTE + value + SINGLE_QUOTE;

const resolveTailwindcssPlugin = async (): Promise<PluginOption> => {
  const module = await import('@tailwindcss/vite').catch(() => null);
  const pluginFactory = module?.default;

  if (typeof pluginFactory === 'function') {
    return pluginFactory();
  }

  return {
    name: 'tailwindcss-missing-plugin',
  };
};
const tailwindcss = await resolveTailwindcssPlugin();
const isProductionBuild = process.env.NODE_ENV === 'production';

export default defineConfig({
  plugins: [
    tailwindcss,
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'brand/master/klassenplan-mark.svg',
        'brand/master/klassenplan-mark-dark.svg',
        'brand/favicon/favicon-32.png',
        'brand/favicon/favicon-16.png',
        'brand/favicon/favicon.ico',
        'brand/favicon/favicon-16-dark.png',
        'brand/favicon/favicon-32-dark.png',
        'brand/favicon/favicon-48-dark.png',
        'brand/ios/apple-touch-icon-180.png',
        'brand/ios/apple-touch-icon-180-dark.png',
        'brand/android/android-chrome-maskable-192.png',
        'brand/android/android-chrome-maskable-512.png',
        'brand/android/android-chrome-maskable-192-dark.png',
        'brand/android/android-chrome-maskable-512-dark.png',
        'brand/app-store/app-store-1024-dark.png',
        'preview/01_Klassenliste.avif',
        'preview/01_Klassenliste_dark.avif',
        'preview/02_Editor.avif',
        'preview/02_Editor_dark.avif',
        'preview/03_Sitzplan.avif',
        'preview/03_Sitzplan_dark.avif',
        'preview/04_Sitzkreis.avif',
        'preview/04_Sitzkreis_dark.avif',
        'preview/05_Export_Sitzplan.avif',
        'preview/05_Export_Sitzplan_dark.avif',
        'preview/06_Export_Sitzkreis.avif',
        'preview/06_Export_Sitzkreis_dark.avif',
      ],
      manifest: {
        id: '/',
        name: 'Klassenplan',
        short_name: 'Klassenplan',
        description:
          'Intelligente Sitzpläne für Schulen - effizient und datenschutzkonform',
        theme_color: '#1B4965',
        background_color: '#1B4965',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        lang: 'de',
        dir: 'ltr',
        categories: ['education', 'productivity'],
        shortcuts: [
          {
            name: 'Generator',
            short_name: 'Generator',
            description: 'Direkt zum Sitzplan-Generator',
            url: '/generator',
            icons: [
              {
                src: 'brand/android/android-chrome-maskable-192.png',
                sizes: '192x192',
                type: 'image/png',
              },
            ],
          },
          {
            name: 'Export',
            short_name: 'Export',
            description: 'Sitzplan exportieren und drucken',
            url: '/export',
            icons: [
              {
                src: 'brand/android/android-chrome-maskable-192.png',
                sizes: '192x192',
                type: 'image/png',
              },
            ],
          },
        ],
        screenshots: [
          {
            src: 'preview/03_Sitzplan.webp',
            sizes: '2970x2180',
            type: 'image/webp',
            form_factor: 'wide',
            label: 'Sitzplan-Editor mit Sitzordnung',
          },
          {
            src: 'preview/05_Export_Sitzplan.webp',
            sizes: '2970x2180',
            type: 'image/webp',
            form_factor: 'wide',
            label: 'Export und Druckansicht des Sitzplans',
          },
        ],
        icons: [
          {
            src: 'brand/favicon/favicon-32.png',
            sizes: '32x32',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'brand/android/android-chrome-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'brand/android/android-chrome-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'brand/android/android-chrome-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'brand/android/android-chrome-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'brand/master/klassenplan-mark.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'brand/android/android-chrome-maskable-192-dark.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'brand/android/android-chrome-maskable-512-dark.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Use production mode for optimized bundles; fall back to dev mode locally
        mode: isProductionBuild ? 'production' : 'development',
        // registerType is 'prompt': the new service worker must wait until the
        // user confirms via ReloadPrompt (updateServiceWorker(true) sends
        // SKIP_WAITING). skipWaiting/clientsClaim would activate it instantly
        // and contradict that model.
        skipWaiting: false,
        clientsClaim: false,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.destination === 'font' &&
              url.pathname.startsWith('/fonts/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'local-fonts-cache-v1',
              expiration: {
                maxEntries: 16,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ request, url }) =>
              request.destination === 'image' &&
              url.pathname.startsWith('/preview/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'preview-images-cache-v1',
              expiration: {
                maxEntries: 48,
                maxAgeSeconds: 60 * 60 * 24 * 90,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: !isProductionBuild,
        type: 'module',
      },
    }),
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
      // HTML is deliberately excluded: scripts/prerender.mjs rewrites every
      // HTML file after the build, so a precompressed copy made here would go
      // stale and nginx (brotli_static on) would serve the pre-prerender shell
      // instead. nginx compresses HTML on the fly via `brotli on`.
      filter: /\.(js|mjs|json|css|svg)$/i,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
    // Canonical origin, baked in at build time. Deriving it from
    // window.location.origin emits localhost URLs while prerendering and
    // staging-host URLs on preview deploys. The same SITE_URL variable drives
    // the sitemap and IndexNow scripts.
    'import.meta.env.VITE_SITE_URL': JSON.stringify(
      (process.env.SITE_URL ?? 'https://klassenplan.de').replace(/\/$/, ''),
    ),
  },
  server: {
    port: 3000,
    open: true,
    headers: {
      'Content-Security-Policy': [
        'default-src ' + wrapInSingleQuotes('self'),
        'script-src ' +
          wrapInSingleQuotes('self') +
          ' ' +
          wrapInSingleQuotes('unsafe-inline'),
        'style-src ' +
          wrapInSingleQuotes('self') +
          ' ' +
          wrapInSingleQuotes('unsafe-inline'),
        'font-src ' + wrapInSingleQuotes('self') + ' data:',
        'img-src ' +
          wrapInSingleQuotes('self') +
          ' data: blob: https://pics.paypal.com https://www.paypal.com https://www.paypalobjects.com',
        'connect-src ' + wrapInSingleQuotes('self') + ' ws: wss:',
        'worker-src ' + wrapInSingleQuotes('self') + ' blob:',
        'frame-ancestors ' + wrapInSingleQuotes('none'),
        'base-uri ' + wrapInSingleQuotes('self'),
        'form-action ' + wrapInSingleQuotes('self') + ' https://www.paypal.com',
        'object-src ' + wrapInSingleQuotes('none'),
      ].join('; '),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy':
        'geolocation=(), microphone=(), camera=(), browsing-topics=(), interest-cohort=()',
    },
  },
  build: {
    target: 'esnext',
    minify: 'oxc',
    sourcemap: false,
    // @ts-expect-error -- 'oxc' is supported by rolldown-vite at runtime but not yet in typedefs
    cssMinify: 'oxc',
    modulePreload: true,
    emptyOutDir: true,
    rolldownOptions: {
      output: {
        // No manualChunks: forcing group names made Rolldown merge the shared
        // app core into a "pdf-utils" chunk and created a vendor -> pdf-vendor
        // edge that pulled jspdf into every page load. Automatic splitting
        // keeps the lazily imported code (jspdf, routes) out of the entry graph.
        chunkFileNames: (chunkInfo: PreRenderedChunk) => {
          if (chunkInfo.facadeModuleId?.includes('node_modules')) {
            return 'vendor/[name]-[hash].js';
          }
          return 'chunks/[name]-[hash].js';
        },
        assetFileNames: (assetInfo: PreRenderedAsset) => {
          const fileName =
            typeof assetInfo.name === 'string'
              ? assetInfo.name
              : (assetInfo as { names?: string[] }).names?.[0] || 'asset';

          if (fileName.endsWith('.css')) {
            return 'css/[name]-[hash].css';
          }
          return 'assets/[name]-[hash][extname]';
        },
        entryFileNames: 'entry/[name]-[hash].js',
      },
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        unknownGlobalSideEffects: false,
      },
    },
    chunkSizeWarningLimit: 400,
    assetsInlineLimit: 4096,
    reportCompressedSize: true,
    cssCodeSplit: true,
  },
  worker: {
    format: 'es',
    rolldownOptions: {
      output: {
        entryFileNames: 'workers/[name]-[hash].js',
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
  },
});
