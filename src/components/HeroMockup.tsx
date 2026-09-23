// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useDialogA11y } from '@/hooks/ui/useDialogA11y';
import { useDialogLayer } from '@/hooks/ui/useDialogLayer';
import { usePrefersReducedMotion } from '@/hooks/ui/usePrefersReducedMotion';
import previewImages from '@/data/previewImages.json';
import { panelSurfaceClass, quietIconButtonClass } from '@/utils';
import {
  CaretLeftIcon,
  CaretRightIcon,
  ArrowsOutIcon,
  PauseIcon,
  PlayIcon,
  XIcon,
} from '@phosphor-icons/react';

// Slide slugs map to the preview assets in `public/preview/`, which are
// provided per language (de/en) and theme (light/dark), e.g.
// `03_sitzplan_de_dark.avif`, plus downscaled copies such as
// `03_sitzplan_de_dark-960.avif` (`npm run generate:preview-images`).
// `labelKey` resolves the localized caption; `width` and `height` are the
// nominal size of the full-size files (a few masters differ by some pixels).
const SLIDES = [
  {
    slug: '01_schuelerliste',
    labelKey: 'startPage.previewSlides.schuelerliste',
    width: 2880,
    height: 1920,
  },
  {
    slug: '02_editor',
    labelKey: 'startPage.previewSlides.editor',
    width: 2880,
    height: 1920,
  },
  {
    slug: '03_sitzplan',
    labelKey: 'startPage.previewSlides.sitzplan',
    width: 2880,
    height: 1920,
  },
  {
    slug: '04_sitzkreis',
    labelKey: 'startPage.previewSlides.sitzkreis',
    width: 2880,
    height: 1920,
  },
  {
    slug: '05_praesentation',
    labelKey: 'startPage.previewSlides.praesentation',
    width: 1424,
    height: 2236,
  },
  {
    slug: '06_export',
    labelKey: 'startPage.previewSlides.export',
    width: 2880,
    height: 1920,
  },
];

/** The slide area is `aspect-3/2`. */
const SLOT_ASPECT = 3 / 2;
/**
 * The slot's rendered width. From `lg` up it takes seven of the start page's
 * twelve columns (`max-w-6xl`, `gap-12`): 652px once the page has reached its
 * full width at 1200px, 7/12 of the viewport less the gutters below that.
 * Under `lg` it spans the page less its `px-4` gutters.
 */
const SLOT_WIDTH_XL = 652;
const slotWidths = (share: number) =>
  [
    `(min-width: 1200px) ${Math.ceil(SLOT_WIDTH_XL * share)}px`,
    `(min-width: 1024px) calc((58.4vw - 48px) * ${share.toFixed(3)})`,
    `calc((100vw - 2rem) * ${share.toFixed(3)})`,
  ].join(', ');

function useIsDark() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  );
  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() =>
      setDark(el.classList.contains('dark')),
    );
    observer.observe(el, { attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

function slideBase(slug: string, lang: 'de' | 'en', dark: boolean) {
  return `/preview/${slug}_${lang}_${dark ? 'dark' : 'light'}`;
}

/**
 * One file of a slide. The screenshots keep their names when they are re-shot
 * while nginx and the service worker cache them as if they never changed, so
 * the URL carries the set's version (`npm run generate:preview-images`): new
 * screenshots are new URLs, and no cache can answer with the old picture.
 */
function slideUrl(base: string, ext: 'avif' | 'webp', width?: number) {
  const suffix = width === undefined ? '' : `-${width}`;
  return `${base}${suffix}.${ext}?v=${previewImages.version}`;
}

/** Downscaled copies plus the full-size file as the largest candidate. */
function slideSrcSet(base: string, width: number, ext: 'avif' | 'webp') {
  return [
    ...previewImages.variantWidths
      .filter((w) => w < width)
      .map((w) => `${slideUrl(base, ext, w)} ${w}w`),
    `${slideUrl(base, ext)} ${width}w`,
  ].join(', ');
}

/**
 * The rendered width of a slide. `object-contain` fits portrait screenshots to
 * the slot's height, so they cover only part of its width — without this the
 * browser would pick a candidate for the full slot width.
 */
function slideSizes(width: number, height: number) {
  return slotWidths(Math.min(1, width / height / SLOT_ASPECT));
}

export default function HeroMockup() {
  // The show starts where the app does: with the class list.
  const [current, setCurrent] = useState(0);
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const isDark = useIsDark();
  const prefersReducedMotion = usePrefersReducedMotion();
  // Focus trap, focus restore (WCAG 2.4.3) and scroll lock come from the shared
  // hook. The hand-rolled version this replaces released the scroll lock only
  // in its close handler, so leaving the page with the lightbox open — the
  // browser's back button does exactly that — left the body scroll-locked.
  const lightboxRef = useDialogA11y<HTMLDivElement>({ open: lightbox });
  useDialogLayer(lightbox);
  const { t, i18n } = useTranslation('pages');
  const lang = i18n.language.startsWith('de') ? 'de' : 'en';

  // All slides are stacked inside the viewport, so `loading="lazy"` cannot
  // hold any of them back. Rendering only the visible slide and the next one
  // keeps a first visit at two screenshots instead of six; the next slide is
  // mounted ahead so it has loaded by the time auto-advance fades it in, and a
  // slide once mounted stays so fading back is instant. The set is updated
  // during render (React's "adjusting state on a prop change" pattern) so a
  // newly current slide is never painted without its image.
  const upcoming = (current + 1) % SLIDES.length;
  const [mounted, setMounted] = useState<ReadonlySet<number>>(
    () => new Set([current, upcoming]),
  );
  if (!mounted.has(current) || !mounted.has(upcoming)) {
    setMounted(new Set(mounted).add(current).add(upcoming));
  }

  // Auto-advance pauses on user request, for reduced-motion users
  // (WCAG 2.2.2) and while the lightbox is open.
  useEffect(() => {
    if (paused || prefersReducedMotion || lightbox) return;
    const id = setInterval(
      () => setCurrent((i) => (i + 1) % SLIDES.length),
      4000,
    );
    return () => clearInterval(id);
  }, [tick, paused, prefersReducedMotion, lightbox]);

  const go = (i: number) => {
    setCurrent((i + SLIDES.length) % SLIDES.length);
    setTick((t) => t + 1);
  };

  const openLightbox = () => setLightbox(true);
  const closeLightbox = useCallback(() => setLightbox(false), []);

  // Escape and the arrow keys stay here: `useDialogA11y` leaves dismissal to
  // the caller because not every dialog in this app can be dismissed.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') go(current - 1);
      if (e.key === 'ArrowRight') go(current + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, current, closeLightbox]);

  const slide = SLIDES[current];
  // The caption announces a slide change only when the visitor made it: a
  // rotating carousel that spoke up every four seconds would drown out
  // everything else (WAI-ARIA carousel pattern).
  const rotating = !paused && !prefersReducedMotion;

  return (
    <>
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={t('startPage.carousel.label')}
        className={`${panelSurfaceClass} overflow-hidden`}
      >
        {/* Slides. Nothing floats over the picture: its controls sit in the
            strip below, the way the app keeps its own out of the stage. */}
        <div className="relative aspect-3/2 bg-(--surface-sunken)">
          {SLIDES.map((entry, i) => {
            if (!mounted.has(i)) return null;
            const b = slideBase(entry.slug, lang, isDark);
            const isActive = i === current;
            const sizes = slideSizes(entry.width, entry.height);
            return (
              <picture key={entry.slug}>
                <source
                  srcSet={slideSrcSet(b, entry.width, 'avif')}
                  sizes={sizes}
                  type="image/avif"
                />
                <source
                  srcSet={slideSrcSet(b, entry.width, 'webp')}
                  sizes={sizes}
                  type="image/webp"
                />
                <img
                  src={slideUrl(b, 'webp')}
                  alt={t(entry.labelKey)}
                  aria-hidden={!isActive}
                  loading={isActive ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={isActive ? 'high' : 'low'}
                  className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-500 ${
                    isActive ? 'opacity-100' : 'pointer-events-none opacity-0'
                  }`}
                />
              </picture>
            );
          })}
        </div>

        <div className="flex items-center gap-1 border-t border-(--border-card) py-1 pr-1 pl-4">
          <p
            className="flex min-w-0 flex-1 items-baseline gap-2 text-sm"
            aria-live={rotating ? 'off' : 'polite'}
          >
            <span className="truncate font-medium text-(--text-page)">
              {t(slide.labelKey)}
            </span>
            <span
              className="text-xs tabular-nums text-(--text-muted)"
              aria-hidden="true"
            >
              {current + 1} / {SLIDES.length}
            </span>
            <span className="sr-only">
              {t('startPage.carousel.position', {
                number: current + 1,
                total: SLIDES.length,
              })}
            </span>
          </p>
          <button
            type="button"
            onClick={() => go(current - 1)}
            aria-label={t('startPage.carousel.previous')}
            className={quietIconButtonClass}
          >
            <CaretLeftIcon size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => go(current + 1)}
            aria-label={t('startPage.carousel.next')}
            className={quietIconButtonClass}
          >
            <CaretRightIcon size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            aria-label={
              paused
                ? t('startPage.carousel.play')
                : t('startPage.carousel.pause')
            }
            className={quietIconButtonClass}
          >
            {paused ? (
              <PlayIcon size={16} aria-hidden="true" />
            ) : (
              <PauseIcon size={16} aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={openLightbox}
            title={t('startPage.carousel.expand')}
            aria-label={t('startPage.carousel.expand')}
            className={quietIconButtonClass}
          >
            <ArrowsOutIcon size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
            onClick={closeLightbox}
          >
            <div
              ref={lightboxRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={t(SLIDES[current].labelKey)}
              className="relative flex flex-col items-center max-w-6xl w-full max-h-[90vh] focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Lightbox image */}
              <picture>
                <source
                  srcSet={slideUrl(
                    slideBase(SLIDES[current].slug, lang, isDark),
                    'avif',
                  )}
                  type="image/avif"
                />
                <source
                  srcSet={slideUrl(
                    slideBase(SLIDES[current].slug, lang, isDark),
                    'webp',
                  )}
                  type="image/webp"
                />
                <img
                  src={slideUrl(
                    slideBase(SLIDES[current].slug, lang, isDark),
                    'webp',
                  )}
                  alt={t(SLIDES[current].labelKey)}
                  decoding="async"
                  className="max-h-[80vh] w-full rounded-lg object-contain"
                />
              </picture>

              {/* Caption */}
              <p className="mt-3 text-sm text-white/70">
                {t(SLIDES[current].labelKey)} &nbsp;·&nbsp; {current + 1} /{' '}
                {SLIDES.length}
              </p>

              {/* Dot navigation */}
              <div className="mt-2 flex items-center">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => go(i)}
                    aria-label={t('startPage.carousel.goToSlide', {
                      number: i + 1,
                      total: SLIDES.length,
                    })}
                    aria-current={i === current ? 'true' : undefined}
                    className="group flex h-6 min-w-6 cursor-pointer items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {/* White whatever the theme: the backdrop is black in
                        both, like a photo viewer's. */}
                    <span
                      aria-hidden="true"
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === current
                          ? 'w-5 bg-white'
                          : 'w-1.5 bg-white/40 group-hover:bg-white/70'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Prev */}
              <button
                onClick={() => go(current - 1)}
                aria-label={t('startPage.carousel.previous')}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-12 cursor-pointer rounded-lg bg-white/10 p-2.5 transition hover:bg-white/20"
              >
                <CaretLeftIcon
                  size={20}
                  aria-hidden="true"
                  className="text-white"
                />
              </button>

              {/* Next */}
              <button
                onClick={() => go(current + 1)}
                aria-label={t('startPage.carousel.next')}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-12 cursor-pointer rounded-lg bg-white/10 p-2.5 transition hover:bg-white/20"
              >
                <CaretRightIcon
                  size={20}
                  aria-hidden="true"
                  className="text-white"
                />
              </button>

              {/* Close */}
              <button
                onClick={closeLightbox}
                aria-label={t('startPage.carousel.close')}
                className="absolute -top-3 -right-3 sm:-top-10 sm:-right-10 cursor-pointer rounded-lg bg-white/10 p-2 transition hover:bg-white/20"
              >
                <XIcon size={18} aria-hidden="true" className="text-white" />
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
