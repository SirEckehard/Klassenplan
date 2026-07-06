// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { IconContext } from '@phosphor-icons/react';
import '@/index.css';
// Side-effect import: registers the module-level beforeinstallprompt listener
// as part of the entry chunk. This replaces the former inline script in
// index.html, which the production CSP (script-src 'self') blocked.
import '@/hooks/useInstallPrompt';
import { i18nReady } from '@/i18n';
import RootErrorBoundary from '@/components/RootErrorBoundary';
import { ToastProvider } from '@/components/ui/feedback/ToastProvider';
import { SeatingPlanGeneratorProvider } from '@/contexts/SeatingPlanContext';
import { PerformanceMonitoringProvider } from '@/hooks/usePerformanceMonitoring';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';
import { runMigration } from '@/utils/migration/migrationService';
import { logInfo, logWarn, logError } from '@/utils';
import App from './App';

// Apply stored theme preference on load
const storedTheme = localStorage.getItem(LOCAL_STORAGE_KEYS.theme);
if (storedTheme === 'dark') {
  document.documentElement.classList.add('dark');
}

// Run migration and initialize performance monitoring before app startup
async function initializeApp() {
  // Wait for the active language bundle before first render to prevent a flash
  // of German fallback content for non-German users.
  await i18nReady;

  try {
    const migrationResult = await runMigration();

    if (migrationResult.success) {
      const { stats } = migrationResult;
      if (stats.classroomScene || stats.templates > 0 || stats.savedPlans > 0) {
        logInfo(
          '🎉 Migration abgeschlossen',
          {
            classroomScene: stats.classroomScene,
            templates: stats.templates,
            savedPlans: stats.savedPlans,
          },
          'index',
        );
      }
    } else {
      logWarn(
        '⚠️ Migration mit Fehlern',
        { errors: migrationResult.errors },
        'index',
      );
    }
  } catch (error) {
    // Migration failures should not block app startup
    logError(
      '❌ Migration fehlgeschlagen, App wird trotzdem gestartet',
      { error },
      'index',
    );
  }

  // Start the application
  const container = document.getElementById('root');
  if (!container) throw new Error('Root element #root not found');

  createRoot(container).render(
    <React.StrictMode>
      <IconContext.Provider value={{ weight: 'regular' }}>
        <BrowserRouter>
          <RootErrorBoundary>
            <SeatingPlanGeneratorProvider>
              <PerformanceMonitoringProvider>
                <ToastProvider>
                  <App />
                </ToastProvider>
              </PerformanceMonitoringProvider>
            </SeatingPlanGeneratorProvider>
          </RootErrorBoundary>
        </BrowserRouter>
      </IconContext.Provider>
    </React.StrictMode>,
  );
}

// Initialize the app
initializeApp();
