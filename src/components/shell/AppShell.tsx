// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import SeatingPlanHeader from '@/components/SeatingPlanGenerator/SeatingPlanHeader';
import AppStatusBar from '@/components/shell/AppStatusBar';

/**
 * The workspace frame: one header on top, one status bar at the bottom, the
 * active layer in between.
 *
 * Both bars are sticky rather than fixed, so the document keeps its normal
 * scroll and the adaptive-height machinery in the student list and the sidebar
 * goes on working untouched. The page footer stays below the shell.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SeatingPlanHeader />
      <main id="main" tabIndex={-1} className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
      <AppStatusBar />
    </div>
  );
}
