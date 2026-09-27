// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ensureChangelogLoaded } from '@/i18n';
import { logWarn } from '@/utils';

/**
 * Whether the changelog's texts are there in the active language. They are
 * not bundled with the app (`ensureChangelogLoaded`), so a view that reads
 * them asks here and waits: rendering before they arrive would show raw keys.
 *
 * A failed fetch still reports ready. Raw keys beat an empty page, and the
 * service worker has the file cached for every visit after the first.
 * `wanted` false fetches nothing — the update notice asks only once it has
 * something to say.
 */
export function useChangelogReady(wanted = true): boolean {
  const { i18n } = useTranslation();
  const language = i18n.language === 'en' ? 'en' : 'de';
  const [readyFor, setReadyFor] = useState<string | null>(() =>
    i18n.hasResourceBundle(language, 'changelog') ? language : null,
  );

  useEffect(() => {
    if (!wanted) return;
    let cancelled = false;
    const settle = () => {
      if (!cancelled) setReadyFor(language);
    };
    ensureChangelogLoaded(language)
      .then(settle)
      .catch((error: unknown) => {
        logWarn('Changelog texts failed to load', { error }, 'i18n');
        settle();
      });
    return () => {
      cancelled = true;
    };
  }, [language, wanted]);

  return readyFor === language;
}
