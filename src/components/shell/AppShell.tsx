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
 * From `lg` up the frame is the window itself: it takes the viewport's height
 * and gives the scrolling to the three columns between the two bars, so the
 * bars, the toolbar and the inspector stay where a teacher left them. Nothing
 * is centred in a column of its own — the toolbar and the inspector are the
 * margins, which is the whole reason they sit at the edges.
 *
 * Below `lg` it stays an ordinary document: the layer stacks, the page scrolls,
 * and the adaptive-height machinery in the student list and the sidebar goes on
 * working untouched. The page footer follows the shell there; on the workspace
 * its entries hang in the header menu instead (`HeaderAppMenu`).
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
            className="flex min-h-screen flex-col lg:h-dvh lg:min-h-0 lg:overflow-hidden"
            style={{ '--shell-bottom-inset': '3.25rem' } as React.CSSProperties}
          >
            <SeatingPlanHeader />
            <main
              id="main"
              tabIndex={-1}
              className="flex flex-1 flex-col px-4 py-6 lg:min-h-0 lg:flex-row lg:p-0"
            >
              <div className="flex min-w-0 flex-1 flex-col lg:min-h-0">
                {children}
              </div>
              <Inspector />
            </main>
            <AppStatusBar />
          </div>
        </StatusBarSlotProvider>
      </ClassDialogsProvider>
    </InspectorProvider>
  );
}
