// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLineLeftIcon,
  ArrowLineRightIcon,
  CloudSlashIcon,
  SlidersHorizontalIcon,
  WrenchIcon,
} from '@phosphor-icons/react';
import {
  TOOL_RAIL_DRAWER_ID,
  useShellToolRail,
} from '@/contexts/ToolRailContext';
import { INSPECTOR_DRAWER_ID, useInspector } from '@/contexts/InspectorContext';
import { useStatusBarSlot } from '@/contexts/StatusBarSlotContext';
import { useLayoutMode } from '@/hooks/ui/useLayoutMode';
import { useOnlineStatus } from '@/hooks/ui/useOnlineStatus';
import { useRegisterStatusBar } from '@/hooks/ui/statusBarPresence';
import { quietIconButtonClass, secondaryButtonClass } from '@/utils';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';

/** The toolbar's switch: quiet, and small enough for a 44px line. */
const statusBarIconButtonClass = `${quietIconButtonClass} h-9 w-9`;

/** A phone's drawer switch while its drawer is open. */
const statusBarPressedClass =
  'border-(--border-option-selected) bg-(--surface-option-selected) text-(--text-badge)';

/**
 * Undo/redo as one bordered control in the middle of the bar. Two quiet icons
 * beside the toolbar's switch were easy to miss and far from the stage; drawn
 * like the secondary buttons at the right end, the pair reads as a control of
 * its own, right under the thing it takes back.
 *
 * Below `sm` its buttons, the way back, the exits and "Mischen" are squares
 * of 36px and the bar drops its hairlines: a 402px iPhone otherwise had to
 * fit ~460px, and the middle covered the plan's fulfilment at the left end.
 */
export const statusBarHistoryGroupClass =
  'flex items-center divide-x divide-(--button-secondary-border) overflow-hidden rounded-full border border-(--button-secondary-border) bg-(--button-secondary-bg) shadow-(--button-secondary-shadow)';
export const statusBarHistoryButtonClass =
  'inline-flex h-9 w-9 cursor-pointer items-center justify-center sm:w-11 text-(--button-secondary-text) transition hover:not-disabled:bg-(--button-secondary-bg-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--focus-ring-primary) disabled:cursor-not-allowed disabled:text-(--text-muted) disabled:opacity-50';

/** The way back to the previous layer, beside the way on. */
export const statusBarBackButtonClass = `${secondaryButtonClass} h-9 shrink-0 gap-2 px-3 whitespace-nowrap max-sm:w-9 max-sm:px-0`;

/**
 * The word beside a button's icon at the right end of a status bar. A desktop
 * and a whiteboard show it — a mouse from `lg` up, any pointer from `xl` —
 * while a phone and a tablet, an iPad in landscape included, show the icon
 * alone: the bar is narrow there, and the word sits in the button's
 * accessible name either way.
 */
export const statusBarWordClass = 'hidden lg:pointer-fine:inline xl:inline';

/**
 * The bar at the bottom of the shell, without what a surface says in it.
 *
 * Every surface in the shell — the three layers and the export — leads the bar
 * with the toolbar's switch, a control of the workspace rather than of the
 * surface, and then fills three parts: where it stands (`start`), what acts on
 * the stage — its history, and where there is one the action it takes back
 * (`middle`) — and the way back beside the way on (`end`). The outer two share
 * the width equally, so the middle sits under the stage whatever the line on
 * the left says. The right end belongs to the way on alone, on every layer.
 *
 * The inspector's switch closes the bar on the right, the mirror of the
 * toolbar's on the left: a quiet arrow beside the way on that folds the
 * column away and back from `lg` up — on every layer, the class layer's
 * included — and opens the inspector as a drawer below `lg`, where a layer has
 * something to show in it: the room's properties, the plan's criteria, the
 * circle's summary. A phone has no toolbar column either; there the left
 * switch opens the toolbar as a drawer from the left and the right one the
 * inspector's, each a button of its own. The two drawers take turns: opening
 * one closes the other.
 *
 * Offline, a small cloud beside the switches says so — the app goes on
 * working, so it is a note, not a warning — in place of the floating badge
 * the pages without a bar keep (`OfflineIndicator`).
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
  const { t } = useTranslation(['generator', 'common']);
  // The toolbar's width belongs to the workspace, not to a layer, so its
  // switch sits here rather than in a header above the tools. A phone has no
  // toolbar column at all — there the same place opens it as a drawer.
  const toolRail = useShellToolRail();
  const layoutMode = useLayoutMode();
  const isPhone = layoutMode === 'phone';
  const {
    inShell,
    suspended,
    portalMounted,
    portalLabel,
    drawerOpen,
    setDrawerOpen,
    folded,
    setFolded,
  } = useInspector();
  const { setFloatNode } = useStatusBarSlot();
  const isOnline = useOnlineStatus();
  useRegisterStatusBar();
  const isDesktop = layoutMode === 'desktop';
  // From `lg` up every layer's column folds; below it there is a drawer only
  // where a layer portals a panel in.
  const showsInspectorSwitch =
    inShell &&
    !suspended &&
    (isDesktop || (portalMounted && portalLabel !== null));
  const inspectorShown = isDesktop ? !folded : drawerOpen;
  const inspectorName = inspectorShown
    ? t('shell.inspectorHide')
    : portalLabel
      ? t('shell.inspectorShowNamed', { name: portalLabel })
      : t('shell.inspectorShow');
  const toggleInspector = () => {
    if (isDesktop) {
      setFolded(!folded);
      return;
    }
    if (!drawerOpen) toolRail?.setSheetOpen(false);
    setDrawerOpen(!drawerOpen);
  };

  return (
    // A landmark region rather than a live region on purpose: the line changes
    // with every keystroke in the class list, and announcing each one would
    // bury anything that actually matters. Below the controls the bar reaches
    // into the bottom safe area — Safari's own toolbar and the home bar — so
    // its paper meets the screen's edge instead of a strip of page under it.
    <div
      role="region"
      aria-label={t('shell.statusBarLabel')}
      className="sticky bottom-0 z-30 shrink-0 border-t border-(--border-card) bg-(--surface-card) pb-[env(safe-area-inset-bottom)]"
    >
      {/* What stands over the stage but belongs to the bar — the class list's
          jump to its ends — hangs above its right end and moves with it. */}
      <div
        ref={setFloatNode}
        className="pointer-events-none absolute right-4 bottom-full mb-3 flex flex-col items-end gap-2 empty:hidden *:pointer-events-auto"
      />
      <div className="flex min-h-11 items-center gap-2 px-3 py-2 sm:gap-4 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
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
                  toolRail.sheetOpen ? statusBarPressedClass : ''
                }`}
              >
                <WrenchIcon className="h-4 w-4" aria-hidden="true" />
              </button>
              <span
                aria-hidden="true"
                className="h-4 w-px bg-(--border-card) max-sm:hidden"
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
                className="h-4 w-px bg-(--border-card) max-sm:hidden"
              />
            </>
          )}
          {!isOnline && (
            <span
              aria-hidden="true"
              className="inline-flex shrink-0 text-(--text-muted)"
              title={t('common:offline.badge')}
            >
              <CloudSlashIcon size={16} />
            </span>
          )}
          {/* A polite status of its own, out of the flow, so going offline is
              said once while the bar as a whole stays quiet. */}
          <span role="status" className="sr-only">
            {isOnline ? '' : t('common:offline.badge')}
          </span>
          {start}
        </div>

        {middle}

        <div className="flex flex-1 items-center justify-end gap-2">
          {end}
          {showsInspectorSwitch && (
            <>
              <span
                aria-hidden="true"
                className="h-4 w-px bg-(--border-card) max-sm:hidden"
              />
              {isPhone ? (
                <button
                  type="button"
                  onClick={toggleInspector}
                  aria-expanded={inspectorShown}
                  aria-controls={INSPECTOR_DRAWER_ID}
                  aria-label={inspectorName}
                  title={inspectorName}
                  className={`${secondaryButtonClass} h-9 w-9 shrink-0 px-0 ${
                    inspectorShown ? statusBarPressedClass : ''
                  }`}
                >
                  <SlidersHorizontalIcon
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={toggleInspector}
                  onMouseUp={(event) => event.currentTarget.blur()}
                  aria-expanded={inspectorShown}
                  aria-controls={INSPECTOR_DRAWER_ID}
                  aria-label={inspectorName}
                  title={inspectorName}
                  className={statusBarIconButtonClass}
                >
                  {/* The mirror of the toolbar's arrows: towards the edge
                      folds the column away, away from it brings it back. */}
                  {inspectorShown ? (
                    <ArrowLineRightIcon size={16} aria-hidden="true" />
                  ) : (
                    <ArrowLineLeftIcon size={16} aria-hidden="true" />
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
