import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// DE is the fallback language — always bundled statically
import commonDe from './locales/de/common.json';
import toastDe from './locales/de/toast.json';
import pagesDe from './locales/de/pages.json';
import generatorDe from './locales/de/generator.json';
import studentsDe from './locales/de/students.json';
import changelogDe from './locales/de/changelog.json';

const NAMESPACES = [
  'common',
  'toast',
  'pages',
  'generator',
  'students',
  'changelog',
] as const;

// Exported promise that resolves once the active-language bundle is ready.
// Await this before rendering to avoid a flash of the fallback (German) language.
let resolveReady!: () => void;
export const i18nReady = new Promise<void>((resolve) => {
  resolveReady = resolve;
});

i18next
  // Detect user language from browser/localStorage
  .use(LanguageDetector)
  // Pass i18n instance to react-i18next
  .use(initReactI18next)
  // Initialize i18next
  .init({
    resources: {
      de: {
        common: commonDe,
        toast: toastDe,
        pages: pagesDe,
        generator: generatorDe,
        students: studentsDe,
        changelog: changelogDe,
      },
    },
    fallbackLng: 'de',
    defaultNS: 'common',
    ns: NAMESPACES,

    // Language detection options
    detection: {
      // localStorage first, then browser - LanguageWrapper handles URL-based detection
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'klassenplan-language',
    },

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
    import('./locales/en/changelog.json'),
  ]).then(([common, toast, pages, generator, students, changelog]) => {
    const modules = [common, toast, pages, generator, students, changelog];
    NAMESPACES.forEach((ns, i) => {
      // Dynamic JSON imports return { default: <json> } — extract the payload.
      const data = (modules[i] as { default?: object }).default ?? modules[i];
      i18next.addResourceBundle('en', ns, data, true, false);
    });
  });
  return enLoadPromise;
}

const storedLang = (() => {
  try {
    return typeof window !== 'undefined'
      ? localStorage.getItem('klassenplan-language')
      : null;
  } catch {
    return null;
  }
})();
const browserLang =
  typeof navigator !== 'undefined'
    ? (navigator.language?.slice(0, 2) ?? null)
    : null;
const detectedLang = storedLang ?? browserLang ?? 'de';

if (detectedLang !== 'de') {
  void ensureEnglishLoaded()
    // Use exact 'en' key (matching the bundle) to guarantee a language-changed
    // event fires even when i18next already reports language as 'en-US' etc.
    .then(() => i18next.changeLanguage('en'))
    .then(resolveReady)
    .catch(resolveReady);
} else {
  // German bundle is already loaded — signal ready immediately.
  resolveReady();
}

export default i18next;
