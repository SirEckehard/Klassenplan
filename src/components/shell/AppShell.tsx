// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import SeatingPlanHeader from '@/components/SeatingPlanGenerator/SeatingPlanHeader';
import AppStatusBar from '@/components/shell/AppStatusBar';
import Inspector from '@/components/shell/Inspector';
import { InspectorProvider } from '@/contexts/InspectorContext';
import { ClassDialogsProvider } from '@/contexts/ClassDialogsContext';
import { StatusBarSlotProvider } from '@/contexts/StatusBarSlotContext';

/**
 * The workspace frame: one header on top, one status bar at the bottom, the
 * active layer in the middle and the inspector beside it.
 *
 * The bars are sticky rather than fixed, so the document keeps its normal
 * scroll and the adaptive-height machinery in the student list and the sidebar
 * goes on working untouched. The page footer stays below the shell.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <InspectorProvider>
      {/* Creating, renaming and deleting a class is reachable from the header
          on every layer, so the dialogs live above the layer, not inside it. */}
      <ClassDialogsProvider>
        <StatusBarSlotProvider>
          {/* The status bar's height, for the floating controls inside the
              workspace that must stay clear of it (`useFloatingActionOffset`). */}
          <div
            className="flex min-h-screen flex-col"
            style={{ '--shell-bottom-inset': '3.25rem' } as React.CSSProperties}
          >
            <SeatingPlanHeader />
            <main id="main" tabIndex={-1} className="flex-1 px-4 py-6">
              <div className="mx-auto flex max-w-7xl items-start gap-4">
                <div className="min-w-0 flex-1">{children}</div>
                <Inspector />
              </div>
            </main>
            <AppStatusBar />
          </div>
        </StatusBarSlotProvider>
      </ClassDialogsProvider>
    </InspectorProvider>
  );
}
