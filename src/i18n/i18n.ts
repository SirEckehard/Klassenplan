// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
// Imported from the logger module directly: the '@/utils' barrel would anchor
// the algorithm and schema modules in the initial load (see src/index.tsx).
import { logWarn } from '@/utils/logging/logger.client';

// DE is the fallback language — always bundled statically, but for the
// changelog (`ensureChangelogLoaded`).
import commonDe from './locales/de/common.json';
import toastDe from './locales/de/toast.json';
import pagesDe from './locales/de/pages.json';
import generatorDe from './locales/de/generator.json';
import studentsDe from './locales/de/students.json';

const EAGER_NAMESPACES = [
  'common',
  'toast',
  'pages',
  'generator',
  'students',
] as const;
const NAMESPACES = [...EAGER_NAMESPACES, 'changelog'] as const;

/**
 * The URL decides the language: `/en` and everything below it is English, every
 * other path German (decision 0011). `LanguageWrapper` enforces the same rule
 * after navigation.
 *
 * This used to come from i18next-browser-languagedetector (stored preference,
 * then browser language). The detector cached its result — `de-DE` — before the
 * `=== 'de'` check below ran, so every first visit loaded the English bundle,
 * rendered the German start page in English and switched back a frame later:
 * a visible flash, a layout shift and six wasted requests.
 */
export function languageForPath(pathname: string): 'de' | 'en' {
  return /^\/en(\/|$)/.test(pathname) ? 'en' : 'de';
}

const initialLanguage =
  typeof window !== 'undefined'
    ? languageForPath(window.location.pathname)
    : 'de';

// Exported promise that resolves once the active-language bundle is ready.
// Await this before rendering to avoid a flash of the fallback (German) language.
let resolveReady!: () => void;
export const i18nReady = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

i18next
  // Pass i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    // German is bundled, so i18next starts on it; English switches in below
    // once its bundle has loaded.
    lng: 'de',
    resources: {
      de: {
        common: commonDe,
        toast: toastDe,
        pages: pagesDe,
        generator: generatorDe,
        students: studentsDe,
      },
    },
    fallbackLng: 'de',
    defaultNS: 'common',
    ns: NAMESPACES,

    interpolation: {
      // React already escapes values
      escapeValue: false,
    },

    react: {
      useSuspense: false,
    },
  });

// Lazy-load EN resources on demand. Vite splits these into a separate chunk;
// in PWA mode the service worker caches all chunks on first load so offline
// use is unaffected. Idempotent: the bundle is only fetched and added once.
let enLoadPromise: Promise<void> | null = null;
export function ensureEnglishLoaded(): Promise<void> {
  if (enLoadPromise) return enLoadPromise;
  enLoadPromise = Promise.all([
    import('./locales/en/common.json'),
    import('./locales/en/toast.json'),
    import('./locales/en/pages.json'),
    import('./locales/en/generator.json'),
    import('./locales/en/students.json'),
  ]).then(([common, toast, pages, generator, students]) => {
    const modules = [common, toast, pages, generator, students];
    EAGER_NAMESPACES.forEach((ns, i) => {
      // Dynamic JSON imports return { default: <json> } — extract the payload.
      const data = (modules[i] as { default?: object }).default ?? modules[i];
      i18next.addResourceBundle('en', ns, data, true, false);
    });
  });
  return enLoadPromise;
}

/**
 * The changelog holds the text of every release — the largest namespace, and
 * read by two views only: /changelog and the notice after an update. It is
 * fetched when one of them asks (`useChangelogReady`) rather than with every
 * page. German comes along with English, being the fallback. A failed fetch
 * is forgotten, so the next view to ask tries again.
 */
const changelogLoads = new Map<'de' | 'en', Promise<void>>();
function loadChangelog(language: 'de' | 'en'): Promise<void> {
  const pending = changelogLoads.get(language);
  if (pending) return pending;
  const load = (
    language === 'en'
      ? import('./locales/en/changelog.json')
      : import('./locales/de/changelog.json')
  )
    .then((module) => {
      const data = (module as { default?: object }).default ?? module;
      i18next.addResourceBundle(language, 'changelog', data, true, false);
    })
    .catch((error: unknown) => {
      changelogLoads.delete(language);
      throw error;
    });
  changelogLoads.set(language, load);
  return load;
}

export function ensureChangelogLoaded(language: string): Promise<void> {
  const loads = [loadChangelog('de')];
  if (language === 'en') loads.push(loadChangelog('en'));
  return Promise.all(loads).then(() => undefined);
}

if (initialLanguage === 'en') {
  void ensureEnglishLoaded()
    .then(() => i18next.changeLanguage('en'))
    .then(resolveReady)
    .catch((error: unknown) => {
      // Rendering in German beats not rendering at all.
      logWarn('Failed to preload English bundle', { error }, 'i18n');
      resolveReady();
    });
} else {
  // German bundle is already loaded — signal ready immediately.
  resolveReady();
}

export default i18next;
