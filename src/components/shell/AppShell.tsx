// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import SeatingPlanHeader from '@/components/SeatingPlanGenerator/SeatingPlanHeader';
import AppStatusBar from '@/components/shell/AppStatusBar';
import Inspector from '@/components/shell/Inspector';
import { InspectorProvider } from '@/contexts/InspectorContext';
import { ClassDialogsProvider } from '@/contexts/ClassDialogsContext';
import { StatusBarSlotProvider } from '@/contexts/StatusBarSlotContext';
import { ToolRailProvider } from '@/contexts/ToolRailContext';
import { SHELL_STATUS_BAR_HEIGHT } from '@/components/shell/shellTokens';

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
 * Below `lg` it stays an ordinary document: the page scrolls between the
 * sticky header and status bar, a tablet keeps the toolbar beside the stage
 * (`workspaceLayerClass`), and the adaptive-height machinery in the student
 * list and the sidebar goes on working untouched. The page footer follows the
 * shell there; on the workspace its entries hang in the header's settings menu
 * instead (`AppSettingsMenu`).
 *
 * The export page wears the same frame with its own header variant and status
 * bar (`header`, `statusBar`), so leaving the plan for the printout does not
 * leave the workspace's shape.
 */
export default function AppShell({
  header = <SeatingPlanHeader />,
  statusBar = <AppStatusBar />,
  children,
}: {
  header?: React.ReactNode;
  statusBar?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <InspectorProvider>
      {/* Creating, renaming and deleting a class is reachable from the header
          on every layer, so the dialogs live above the layer, not inside it. */}
      <ClassDialogsProvider>
        <StatusBarSlotProvider>
          {/* One answer for the whole workspace on whether the toolbar shows
              its labels: the status bar carries the switch, the layer's
              toolbar reads it. */}
          <ToolRailProvider>
            {/* The status bar's height, for what stands above it — the
                drawers, the focus mode's thumb bar, the floating controls
                (`useFloatingActionOffset`). The bar reaches into the bottom
                safe area, so that is part of its height. */}
            <div
              className="flex min-h-screen flex-col lg:h-dvh lg:min-h-0 lg:overflow-hidden"
              style={
                {
                  '--shell-bottom-inset': `calc(${SHELL_STATUS_BAR_HEIGHT}px + env(safe-area-inset-bottom))`,
                } as React.CSSProperties
              }
            >
              {header}
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
              {statusBar}
            </div>
          </ToolRailProvider>
        </StatusBarSlotProvider>
      </ClassDialogsProvider>
    </InspectorProvider>
  );
}
