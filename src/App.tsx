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
import { preloadLikelyRoutes } from '@/utils/performance/routePreloader';
import { lazyWithRetry } from '@/utils/performance/lazyWithRetry';
import { ensureEnglishLoaded } from '@/i18n/i18n';

// Performance monitoring components (lazy loaded)
const LazyPerformanceTools = lazyWithRetry(
  () => import('@/components/ui/performance/LazyPerformanceTools'),
);

// Lazy load route components for better performance
const StartPage = lazyWithRetry(() => import('@/pages/StartPage'));
const SeatingPlanGenerator = lazyWithRetry(
  () => import('@/components/SeatingPlanGenerator/SeatingPlanGenerator'),
);
const Export = lazyWithRetry(() => import('@/pages/Export'));
const Present = lazyWithRetry(() => import('@/pages/Present'));
const Impressum = lazyWithRetry(() => import('@/pages/Impressum'));
const Datenschutz = lazyWithRetry(() => import('@/pages/Datenschutz'));
const Feedback = lazyWithRetry(() => import('@/pages/Feedback'));
const FAQ = lazyWithRetry(() => import('@/pages/FAQ'));
const Changelog = lazyWithRetry(() => import('@/pages/Changelog'));
const Support = lazyWithRetry(() => import('@/pages/Support'));
const NotFound = lazyWithRetry(() => import('@/pages/NotFound'));

/**
 * Wrapper component that syncs the URL language parameter with i18n.
 * Only '/en' prefix is supported; all other paths default to German.
 */
function LanguageWrapper() {
  const location = useLocation();
  const { i18n } = useTranslation();

  // Detect if URL starts with /en
  const isEnglishPath =
    location.pathname === '/en' || location.pathname.startsWith('/en/');

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
  const [showPerformanceDashboard, setShowPerformanceDashboard] =
    React.useState(false);

  // The present view is a fullscreen presentation surface; the global footer
  // (and its "clear all data" action) is out of place there.
  const isPresentRoute =
    location.pathname === '/present' || location.pathname === '/en/present';

  // Route preloading for better perceived performance
  React.useEffect(() => {
    preloadLikelyRoutes(location.pathname);
  }, [location.pathname]);

  // Global event listeners for performance dashboard
  React.useEffect(() => {
    const handleOpenDashboard = () => setShowPerformanceDashboard(true);
    const handleCloseDashboard = () => setShowPerformanceDashboard(false);
    const handleToggleDashboard = () =>
      setShowPerformanceDashboard((prev) => !prev);

    window.addEventListener('openPerformanceDashboard', handleOpenDashboard);
    window.addEventListener('closePerformanceDashboard', handleCloseDashboard);
    window.addEventListener(
      'togglePerformanceDashboard',
      handleToggleDashboard,
    );

    return () => {
      window.removeEventListener(
        'openPerformanceDashboard',
        handleOpenDashboard,
      );
      window.removeEventListener(
        'closePerformanceDashboard',
        handleCloseDashboard,
      );
      window.removeEventListener(
        'togglePerformanceDashboard',
        handleToggleDashboard,
      );
    };
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 dark:text-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        {t('skipToContent')}
      </a>
      <ScrollToTop />
      <ReloadPrompt />
      <InstallPrompt />
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

      {/* Performance monitoring components (development only) */}
      <Suspense fallback={null}>
        <LazyPerformanceTools
          showDashboard={showPerformanceDashboard}
          onCloseDashboard={() => setShowPerformanceDashboard(false)}
        />
      </Suspense>

      {!isPresentRoute && <Footer />}
      <CookieConsent />
    </div>
  );
}
