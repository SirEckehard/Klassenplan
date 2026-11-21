// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { useIsDarkMode } from '@/hooks/useIsDarkMode';
import { previewBase, previewUrl } from '@/components/publicPage/previewImages';

interface PreviewDetailProps {
  /** The close-ups in `public/preview/`, stacked; one is shown at a time. */
  slugs: readonly string[];
  /** The index of the one shown. */
  current?: number;
}

/**
 * A close-up of the app beside a section of the start page, from `lg` up:
 * a whole piece of the window — a table, a card, a list — never a part of
 * one. It takes the space the section's claim leaves in its column, down to
 * the end of the list beside it, so the section grows no taller for it, and
 * stands in the middle of that space at the size the app draws it, or
 * smaller where the space is smaller; it is never cut. Each file is a
 * picture of twice its size on screen (`capture-preview-screenshots.mjs`),
 * which the `2x` candidates tell the browser. The words stand beside it, so
 * the picture is decoration for assistive technology. Several close-ups
 * cross-fade.
 */
export default function PreviewDetail({
  slugs,
  current = 0,
}: PreviewDetailProps) {
  const { i18n } = useTranslation();
  const isDark = useIsDarkMode();
  const lang = i18n.language.startsWith('de') ? 'de' : 'en';

  return (
    <div
      className="relative mt-8 hidden min-h-40 flex-1 lg:block"
      aria-hidden="true"
    >
      {slugs.map((slug, index) => {
        const base = previewBase(slug, lang, isDark);
        const webp = previewUrl(base, 'webp');
        return (
          <picture key={slug}>
            <source
              srcSet={`${previewUrl(base, 'avif')} 2x`}
              type="image/avif"
            />
            <img
              src={webp}
              srcSet={`${webp} 2x`}
              alt=""
              loading="lazy"
              decoding="async"
              className={`absolute inset-0 m-auto max-h-full max-w-full rounded-xl border border-(--border-card) transition-opacity duration-300 ${
                index === current ? 'opacity-100' : 'opacity-0'
              }`}
            />
          </picture>
        );
      })}
    </div>
  );
}
