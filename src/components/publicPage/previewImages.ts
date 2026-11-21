// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import previewImages from '@/data/previewImages.json';

/**
 * The start page's screenshots in `public/preview/`: the carousel's slides
 * (`HeroMockup`) and the close-ups beside the sections (`PreviewDetail`). Each
 * comes per language (de/en) and theme (light/dark), e.g.
 * `03_sitzplan_de_dark.avif`, plus downscaled copies such as
 * `03_sitzplan_de_dark-960.avif` (`npm run generate:preview-images`).
 */
export function previewBase(slug: string, lang: 'de' | 'en', dark: boolean) {
  return `/preview/${slug}_${lang}_${dark ? 'dark' : 'light'}`;
}

/**
 * One file of a screenshot. The screenshots keep their names when they are
 * re-shot while nginx and the service worker cache them as if they never
 * changed, so the URL carries the set's version
 * (`npm run generate:preview-images`): new screenshots are new URLs, and no
 * cache can answer with the old picture.
 */
export function previewUrl(base: string, ext: 'avif' | 'webp', width?: number) {
  const suffix = width === undefined ? '' : `-${width}`;
  return `${base}${suffix}.${ext}?v=${previewImages.version}`;
}

/** Downscaled copies plus the full-size file as the largest candidate. */
export function previewSrcSet(base: string, width: number) {
  return [
    ...previewImages.variantWidths
      .filter((w) => w < width)
      .map((w) => `${previewUrl(base, 'avif', w)} ${w}w`),
    `${previewUrl(base, 'avif')} ${width}w`,
  ].join(', ');
}

/**
 * The WebP fallback for a browser without AVIF (Safari 16.4 to 17 on macOS 11
 * and 12) comes in one width only, the full size for a narrower screenshot.
 */
export function previewWebpUrl(base: string, width: number) {
  const { webpWidth } = previewImages;
  return previewUrl(base, 'webp', webpWidth < width ? webpWidth : undefined);
}
