// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
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
// `03_sitzplan_de_dark.avif`. `labelKey` resolves the localized caption.
const SLIDES = [
  {
    slug: '01_schuelerliste',
    labelKey: 'startPage.previewSlides.schuelerliste',
  },
  { slug: '02_editor', labelKey: 'startPage.previewSlides.editor' },
  { slug: '03_sitzplan', labelKey: 'startPage.previewSlides.sitzplan' },
  { slug: '04_sitzkreis', labelKey: 'startPage.previewSlides.sitzkreis' },
  {
    slug: '05_praesentation',
    labelKey: 'startPage.previewSlides.praesentation',
  },
  { slug: '06_export', labelKey: 'startPage.previewSlides.export' },
];

const FOCUSABLE_SELECTORS = 'button:not([disabled]), a[href]';

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

const reducedMotionQuery = (): MediaQueryList | null =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => reducedMotionQuery()?.matches ?? false,
  );
  useEffect(() => {
    const query = reducedMotionQuery();
    if (!query) return;
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function slideBase(slug: string, lang: 'de' | 'en', dark: boolean) {
  return `/preview/${slug}_${lang}_${dark ? 'dark' : 'light'}`;
}

export default function HeroMockup() {
  const [current, setCurrent] = useState(2);
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const isDark = useIsDark();
  const prefersReducedMotion = usePrefersReducedMotion();
  const lightboxRef = useRef<HTMLDivElement>(null);
  // Element that had focus before the lightbox opened; focus returns to it on
  // close (WCAG 2.4.3).
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const { t, i18n } = useTranslation('pages');
  const lang = i18n.language.startsWith('de') ? 'de' : 'en';

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

  const openLightbox = () => {
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setLightbox(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = useCallback(() => {
    setLightbox(false);
    document.body.style.overflow = '';
    const restoreTarget = restoreFocusRef.current;
    restoreFocusRef.current = null;
    if (restoreTarget && document.contains(restoreTarget)) {
      restoreTarget.focus();
    }
  }, []);

  useEffect(() => {
    if (!lightbox) return;
    lightboxRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') go(current - 1);
      if (e.key === 'ArrowRight') go(current + 1);
      // Trap focus inside the lightbox dialog
      if (e.key === 'Tab' && lightboxRef.current) {
        const focusable = Array.from(
          lightboxRef.current.querySelectorAll<HTMLElement>(
            FOCUSABLE_SELECTORS,
          ),
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, current, closeLightbox]);

  return (
    <>
      <div
        className="relative flex items-center justify-center"
        role="region"
        aria-roledescription="carousel"
        aria-label={t('startPage.carousel.label')}
      >
        <div className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl overflow-hidden">
          {/* Mac-style chrome */}
          <div
            className="flex items-center gap-1.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2.5"
            aria-hidden="true"
          >
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
            <span className="ml-2 flex-1 rounded bg-gray-200 dark:bg-gray-700 h-3 max-w-40" />
          </div>

          {/* Slides */}
          <div className="group relative aspect-3/2 bg-gray-100 dark:bg-gray-900">
            {SLIDES.map((slide, i) => {
              const b = slideBase(slide.slug, lang, isDark);
              const isActive = i === current;
              return (
                <picture key={slide.slug}>
                  <source srcSet={`${b}.avif`} type="image/avif" />
                  <source srcSet={`${b}.webp`} type="image/webp" />
                  <img
                    src={`${b}.png`}
                    alt={t(slide.labelKey)}
                    aria-hidden={!isActive}
                    loading={isActive ? 'eager' : 'lazy'}
                    decoding="async"
                    fetchPriority={isActive ? 'high' : 'low'}
                    className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-500 ${
                      isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                  />
                </picture>
              );
            })}

            {/* Expand button — revealed on hover, but always visible on touch */}
            <button
              onClick={openLightbox}
              className="absolute top-2 right-2 cursor-pointer rounded-full bg-white/80 dark:bg-gray-800/80 p-1.5 shadow-md opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100 hover:bg-white dark:hover:bg-gray-700"
              title={t('startPage.carousel.expand')}
              aria-label={t('startPage.carousel.expand')}
            >
              <ArrowsOutIcon
                size={14}
                aria-hidden="true"
                className="text-gray-600 dark:text-gray-300"
              />
            </button>

            {/* Prev button */}
            <button
              onClick={() => go(current - 1)}
              aria-label={t('startPage.carousel.previous')}
              className="absolute left-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-white/80 dark:bg-gray-800/80 p-1.5 shadow-md hover:bg-white dark:hover:bg-gray-700 transition"
            >
              <CaretLeftIcon
                size={14}
                aria-hidden="true"
                className="text-gray-600 dark:text-gray-300"
              />
            </button>

            {/* Next button */}
            <button
              onClick={() => go(current + 1)}
              aria-label={t('startPage.carousel.next')}
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-white/80 dark:bg-gray-800/80 p-1.5 shadow-md hover:bg-white dark:hover:bg-gray-700 transition"
            >
              <CaretRightIcon
                size={14}
                aria-hidden="true"
                className="text-gray-600 dark:text-gray-300"
              />
            </button>
          </div>

          {/* Dot navigation + autoplay toggle */}
          <div className="relative flex justify-center items-center gap-1.5 py-2.5">
            {SLIDES.map((slide, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={t('startPage.carousel.goToSlide', {
                  number: i + 1,
                  total: SLIDES.length,
                })}
                aria-current={i === current ? 'true' : undefined}
                className={`h-1.5 cursor-pointer rounded-full transition-all duration-300 ${
                  i === current
                    ? 'w-4 bg-blue-500'
                    : 'w-1.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                }`}
              />
            ))}
            <button
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
              aria-label={
                paused
                  ? t('startPage.carousel.play')
                  : t('startPage.carousel.pause')
              }
              className="absolute right-2 cursor-pointer rounded-full p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition"
            >
              {paused ? (
                <PlayIcon size={12} aria-hidden="true" />
              ) : (
                <PauseIcon size={12} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
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
                  srcSet={`${slideBase(SLIDES[current].slug, lang, isDark)}.avif`}
                  type="image/avif"
                />
                <source
                  srcSet={`${slideBase(SLIDES[current].slug, lang, isDark)}.webp`}
                  type="image/webp"
                />
                <img
                  src={`${slideBase(SLIDES[current].slug, lang, isDark)}.png`}
                  alt={t(SLIDES[current].labelKey)}
                  decoding="async"
                  className="max-h-[80vh] w-full object-contain rounded-xl shadow-2xl"
                />
              </picture>

              {/* Caption */}
              <p className="mt-3 text-sm text-white/70">
                {t(SLIDES[current].labelKey)} &nbsp;·&nbsp; {current + 1} /{' '}
                {SLIDES.length}
              </p>

              {/* Dot navigation */}
              <div className="mt-3 flex items-center gap-2">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => go(i)}
                    aria-label={t('startPage.carousel.goToSlide', {
                      number: i + 1,
                      total: SLIDES.length,
                    })}
                    aria-current={i === current ? 'true' : undefined}
                    className={`h-1.5 cursor-pointer rounded-full transition-all duration-300 ${
                      i === current
                        ? 'w-5 bg-white'
                        : 'w-1.5 bg-white/40 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>

              {/* Prev */}
              <button
                onClick={() => go(current - 1)}
                aria-label={t('startPage.carousel.previous')}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-12 cursor-pointer rounded-full bg-white/10 hover:bg-white/20 p-2.5 transition"
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
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-12 cursor-pointer rounded-full bg-white/10 hover:bg-white/20 p-2.5 transition"
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
                className="absolute -top-3 -right-3 sm:-top-10 sm:-right-10 cursor-pointer rounded-full bg-white/10 hover:bg-white/20 p-2 transition"
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
