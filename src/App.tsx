// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Footer from '@/components/Footer';
import CookieConsent from '@/components/CookieConsent';
import ScrollToTop from '@/components/ScrollToTop';
import PageSkeleton from '@/components/ui/feedback/PageSkeleton';
import ReloadPrompt from '@/components/pwa/ReloadPrompt';
import InstallPrompt from '@/components/pwa/InstallPrompt';
import OfflineIndicator from '@/components/ui/feedback/OfflineIndicator';
import DownloadConfirmationHost from '@/components/ui/modals/DownloadConfirmationHost';
import CsvFormatHelpHost from '@/components/ui/modals/CsvFormatHelpHost';
import { preloadLikelyRoutes } from '@/pages/routePreloader';
import { ensureEnglishLoaded, languageForPath } from '@/i18n/i18n';
import {
  Changelog,
  Datenschutz,
  Export,
  FAQ,
  Feedback,
  Impressum,
  NameGame,
  NotFound,
  Present,
  SeatingPlanGenerator,
  StartPage,
  Support,
} from '@/pages/lazyPages';

/**
 * Wrapper component that syncs the URL language parameter with i18n.
 * Only '/en' prefix is supported; all other paths default to German.
 */
function LanguageWrapper() {
  const location = useLocation();
  const { i18n } = useTranslation();

  // Same rule the i18n module applies before the first render
  const isEnglishPath = languageForPath(location.pathname) === 'en';

  useEffect(() => {
    // Only switch to English if /en prefix is present
    if (isEnglishPath && i18n.language !== 'en') {
      void ensureEnglishLoaded().then(() => i18n.changeLanguage('en'));
    } else if (!isEnglishPath && i18n.language !== 'de') {
      // Default to German for all other cases
      i18n.changeLanguage('de');
    }
  }, [isEnglishPath, i18n]);

  return <Outlet />;
}

/**
 * Route definitions shared between default and /en paths.
 */
function AppRoutes() {
  return (
    <>
      <Route index element={<StartPage />} />
      <Route path="generator" element={<SeatingPlanGenerator />} />
      <Route path="export" element={<Export />} />
      <Route path="present" element={<Present />} />
      <Route path="namensspiel" element={<NameGame />} />
      <Route path="impressum" element={<Impressum />} />
      <Route path="datenschutz" element={<Datenschutz />} />
      <Route path="feedback" element={<Feedback />} />
      <Route path="faq" element={<FAQ />} />
      <Route path="changelog" element={<Changelog />} />
      <Route path="support" element={<Support />} />
      <Route path="*" element={<NotFound />} />
    </>
  );
}

export default function App() {
  const location = useLocation();
  const { t } = useTranslation('common');

  // Surfaces that carry no page footer: the fullscreen ones (presentation,
  // name game), where the footer and its "clear all data" action are out of
  // place, and the workspace, which runs at viewport height from `lg` up and
  // offers the same entries in its header menu (`HeaderAppMenu`).
  const hidesFooter = [
    '/present',
    '/en/present',
    '/namensspiel',
    '/en/namensspiel',
    '/generator',
    '/en/generator',
  ].includes(location.pathname);

  // Route preloading for better perceived performance
  React.useEffect(() => {
    preloadLikelyRoutes(location.pathname);
  }, [location.pathname]);

  return (
    // `html, body` already carry --surface-page and --text-page.
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        {t('skipToContent')}
      </a>
      <ScrollToTop />
      <ReloadPrompt />
      <InstallPrompt />
      <OfflineIndicator />
      <DownloadConfirmationHost />
      <CsvFormatHelpHost />
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          {/* German routes (default, no prefix) */}
          <Route element={<LanguageWrapper />}>{AppRoutes()}</Route>
          {/* English routes (/en prefix) */}
          <Route path="en" element={<LanguageWrapper />}>
            {AppRoutes()}
          </Route>
        </Routes>
      </Suspense>

      {!hidesFooter && <Footer />}
      <CookieConsent />
    </div>
  );
}
