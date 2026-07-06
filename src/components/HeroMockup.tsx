// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  CaretLeftIcon,
  CaretRightIcon,
  ArrowsOutIcon,
  XIcon,
} from '@phosphor-icons/react';

const SLIDES = [
  { base: '/preview/01_Klassenliste', alt: 'Klassenliste' },
  { base: '/preview/02_Editor', alt: 'Klassenraum-Editor' },
  { base: '/preview/03_Sitzplan', alt: 'Sitzplan' },
  { base: '/preview/04_Sitzkreis', alt: 'Sitzkreis' },
  { base: '/preview/05_Export_Sitzplan', alt: 'Export Sitzplan' },
  { base: '/preview/06_Export_Sitzkreis', alt: 'Export Sitzkreis' },
];

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

function slideBase(base: string, dark: boolean) {
  return `${base}${dark ? '_dark' : ''}`;
}

export default function HeroMockup() {
  const [current, setCurrent] = useState(2);
  const [tick, setTick] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const isDark = useIsDark();

  useEffect(() => {
    const id = setInterval(
      () => setCurrent((i) => (i + 1) % SLIDES.length),
      4000,
    );
    return () => clearInterval(id);
  }, [tick]);

  const go = (i: number) => {
    setCurrent((i + SLIDES.length) % SLIDES.length);
    setTick((t) => t + 1);
  };

  const openLightbox = () => {
    setLightbox(true);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = useCallback(() => {
    setLightbox(false);
    document.body.style.overflow = '';
  }, []);

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

  return (
    <>
      <div
        className="relative flex items-center justify-center"
        aria-hidden="true"
      >
        <div className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl overflow-hidden">
          {/* Mac-style chrome */}
          <div className="flex items-center gap-1.5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
            <span className="ml-2 flex-1 rounded bg-gray-200 dark:bg-gray-700 h-3 max-w-40" />
          </div>

          {/* Slides */}
          <div className="group relative aspect-3/2 bg-gray-100 dark:bg-gray-900">
            {SLIDES.map((slide, i) => {
              const b = slideBase(slide.base, isDark);
              const isActive = i === current;
              return (
                <picture key={slide.base}>
                  <source srcSet={`${b}.avif`} type="image/avif" />
                  <source srcSet={`${b}.webp`} type="image/webp" />
                  <img
                    src={`${b}.png`}
                    alt={slide.alt}
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
              className="absolute top-2 right-2 cursor-pointer rounded-full bg-white/80 dark:bg-gray-800/80 p-1.5 shadow-md opacity-0 transition group-hover:opacity-100 pointer-coarse:opacity-100 hover:bg-white dark:hover:bg-gray-700"
              title="Vergrößern"
              aria-label="Vergrößern"
            >
              <ArrowsOutIcon
                size={14}
                className="text-gray-600 dark:text-gray-300"
              />
            </button>

            {/* Prev button */}
            <button
              onClick={() => go(current - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-white/80 dark:bg-gray-800/80 p-1.5 shadow-md hover:bg-white dark:hover:bg-gray-700 transition"
            >
              <CaretLeftIcon
                size={14}
                className="text-gray-600 dark:text-gray-300"
              />
            </button>

            {/* Next button */}
            <button
              onClick={() => go(current + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-full bg-white/80 dark:bg-gray-800/80 p-1.5 shadow-md hover:bg-white dark:hover:bg-gray-700 transition"
            >
              <CaretRightIcon
                size={14}
                className="text-gray-600 dark:text-gray-300"
              />
            </button>
          </div>

          {/* Dot navigation */}
          <div className="flex justify-center items-center gap-1.5 py-2.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                className={`h-1.5 cursor-pointer rounded-full transition-all duration-300 ${
                  i === current
                    ? 'w-4 bg-blue-500'
                    : 'w-1.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                }`}
              />
            ))}
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
              className="relative flex flex-col items-center max-w-6xl w-full max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Lightbox image */}
              <picture>
                <source
                  srcSet={`${slideBase(SLIDES[current].base, isDark)}.avif`}
                  type="image/avif"
                />
                <source
                  srcSet={`${slideBase(SLIDES[current].base, isDark)}.webp`}
                  type="image/webp"
                />
                <img
                  src={`${slideBase(SLIDES[current].base, isDark)}.png`}
                  alt={SLIDES[current].alt}
                  decoding="async"
                  className="max-h-[80vh] w-full object-contain rounded-xl shadow-2xl"
                />
              </picture>

              {/* Caption */}
              <p className="mt-3 text-sm text-white/70">
                {SLIDES[current].alt} &nbsp;·&nbsp; {current + 1} /{' '}
                {SLIDES.length}
              </p>

              {/* Dot navigation */}
              <div className="mt-3 flex items-center gap-2">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => go(i)}
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
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-12 cursor-pointer rounded-full bg-white/10 hover:bg-white/20 p-2.5 transition"
              >
                <CaretLeftIcon size={20} className="text-white" />
              </button>

              {/* Next */}
              <button
                onClick={() => go(current + 1)}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-12 cursor-pointer rounded-full bg-white/10 hover:bg-white/20 p-2.5 transition"
              >
                <CaretRightIcon size={20} className="text-white" />
              </button>

              {/* Close */}
              <button
                onClick={closeLightbox}
                className="absolute -top-3 -right-3 sm:-top-10 sm:-right-10 cursor-pointer rounded-full bg-white/10 hover:bg-white/20 p-2 transition"
              >
                <XIcon size={18} className="text-white" />
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
