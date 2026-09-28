// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLineLeftIcon,
  ArrowLineRightIcon,
  SlidersHorizontalIcon,
  WrenchIcon,
} from '@phosphor-icons/react';
import {
  TOOL_RAIL_DRAWER_ID,
  useShellToolRail,
} from '@/contexts/ToolRailContext';
import { INSPECTOR_DRAWER_ID, useInspector } from '@/contexts/InspectorContext';
import { useLayoutMode } from '@/hooks/ui/useLayoutMode';
import { quietIconButtonClass, secondaryButtonClass } from '@/utils';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';

/** The toolbar's switch: quiet, and small enough for a 44px line. */
const statusBarIconButtonClass = `${quietIconButtonClass} h-9 w-9`;

/**
 * Undo/redo as one bordered control in the middle of the bar. Two quiet icons
 * beside the toolbar's switch were easy to miss and far from the stage; drawn
 * like the secondary buttons at the right end, the pair reads as a control of
 * its own, right under the thing it takes back.
 */
export const statusBarHistoryGroupClass =
  'flex items-center divide-x divide-(--button-secondary-border) overflow-hidden rounded-full border border-(--button-secondary-border) bg-(--button-secondary-bg) shadow-(--button-secondary-shadow)';
export const statusBarHistoryButtonClass =
  'inline-flex h-9 w-11 cursor-pointer items-center justify-center text-(--button-secondary-text) transition hover:not-disabled:bg-(--button-secondary-bg-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--focus-ring-primary) disabled:cursor-not-allowed disabled:text-(--text-muted) disabled:opacity-50';

/** The way back to the previous layer, beside the way on. */
export const statusBarBackButtonClass = `${secondaryButtonClass} h-9 shrink-0 gap-2 px-3 whitespace-nowrap`;

/**
 * The bar at the bottom of the shell, without what a surface says in it.
 *
 * Every surface in the shell — the three layers and the export — leads the bar
 * with the toolbar's switch, a control of the workspace rather than of the
 * surface, and then fills three parts: where it stands (`start`), what acts on
 * the stage — its history, and where there is one the action it takes back
 * (`middle`) — and the way back beside the way on (`end`). The outer two share
 * the width equally, so the middle sits under the stage whatever the line on
 * the left says.
 *
 * Below `lg` the inspector has no column, so its switch closes the bar on the
 * right, mirroring the toolbar's switch on the left: each sits under the panel
 * it opens. It appears only while a layer has something to show there — the
 * room's properties, the plan's criteria, the circle's summary. A phone has no
 * toolbar column either; there the left switch opens the toolbar as a drawer
 * from the left. The two drawers take turns: opening one closes the other.
 */
export default function StatusBarFrame({
  start,
  middle,
  end,
}: {
  start: React.ReactNode;
  middle?: React.ReactNode;
  end?: React.ReactNode;
}) {
  const { t } = useTranslation('generator');
  // The toolbar's width belongs to the workspace, not to a layer, so its
  // switch sits here rather than in a header above the tools. A phone has no
  // toolbar column at all — there the same place opens it as a drawer.
  const toolRail = useShellToolRail();
  const layoutMode = useLayoutMode();
  const isPhone = layoutMode === 'phone';
  const { portalMounted, portalLabel, drawerOpen, setDrawerOpen } =
    useInspector();
  const showInspectorSwitch =
    layoutMode !== 'desktop' && portalMounted && portalLabel !== null;

  return (
    // A landmark region rather than a live region on purpose: the line changes
    // with every keystroke in the class list, and announcing each one would
    // bury anything that actually matters.
    <div
      role="region"
      aria-label={t('shell.statusBarLabel')}
      className="sticky bottom-0 z-30 shrink-0 border-t border-(--border-card) bg-(--surface-card)"
    >
      <div className="flex min-h-11 items-center gap-2 px-4 py-2 sm:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* The toolbar's switch belongs to the workspace, not to a surface,
              so it leads the bar — right under the toolbar it concerns. */}
          {toolRail && isPhone && (
            <>
              <button
                type="button"
                onClick={() => {
                  if (!toolRail.sheetOpen) setDrawerOpen(false);
                  toolRail.setSheetOpen(!toolRail.sheetOpen);
                }}
                aria-expanded={toolRail.sheetOpen}
                aria-controls={TOOL_RAIL_DRAWER_ID}
                aria-label={t('sidebar.ariaLabel')}
                title={t('sidebar.ariaLabel')}
                className={`${secondaryButtonClass} h-9 w-9 shrink-0 px-0 ${
                  toolRail.sheetOpen
                    ? 'border-(--border-option-selected) bg-(--surface-option-selected) text-(--text-badge)'
                    : ''
                }`}
              >
                <WrenchIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              <span
                aria-hidden="true"
                className="h-4 w-px bg-(--border-card)"
              />
            </>
          )}
          {toolRail && !isPhone && (
            <>
              <button
                type="button"
                onClick={toolRail.toggle}
                data-tour={TOUR_ANCHORS.sidebarToggle}
                onMouseUp={(event) => event.currentTarget.blur()}
                className={statusBarIconButtonClass}
                title={
                  toolRail.isExpanded
                    ? t('sidebar.collapseShortcut')
                    : t('sidebar.expandShortcut')
                }
                aria-label={
                  toolRail.isExpanded
                    ? t('sidebar.collapseLabel')
                    : t('sidebar.expandLabel')
                }
                aria-expanded={toolRail.isExpanded}
              >
                {toolRail.isExpanded ? (
                  <ArrowLineLeftIcon size={16} aria-hidden="true" />
                ) : (
                  <ArrowLineRightIcon size={16} aria-hidden="true" />
                )}
              </button>
              <span
                aria-hidden="true"
                className="h-4 w-px bg-(--border-card)"
              />
            </>
          )}
          {start}
        </div>

        {middle}

        <div className="flex flex-1 items-center justify-end gap-2">
          {end}
          {showInspectorSwitch && (
            <>
              <span
                aria-hidden="true"
                className="h-4 w-px bg-(--border-card)"
              />
              <button
                type="button"
                onClick={() => {
                  if (!drawerOpen) toolRail?.setSheetOpen(false);
                  setDrawerOpen(!drawerOpen);
                }}
                aria-expanded={drawerOpen}
                aria-controls={INSPECTOR_DRAWER_ID}
                title={portalLabel}
                className={`${secondaryButtonClass} h-9 shrink-0 gap-2 px-2.5 text-sm whitespace-nowrap ${
                  drawerOpen
                    ? 'border-(--border-option-selected) bg-(--surface-option-selected) text-(--text-badge)'
                    : ''
                }`}
              >
                <SlidersHorizontalIcon className="h-4 w-4" aria-hidden="true" />
                {/* The name stays for a screen reader where only the icon
                    fits. */}
                <span className="sr-only sm:not-sr-only">{portalLabel}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
