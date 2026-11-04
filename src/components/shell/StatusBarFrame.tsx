// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowClockwiseIcon,
  ArrowLineLeftIcon,
  ArrowLineRightIcon,
  CheckIcon,
  CloudSlashIcon,
  SlidersHorizontalIcon,
  WarningCircleIcon,
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
import {
  retryPersistNow,
  usePersistStatus,
} from '@/hooks/persistence/persistStatus';
import { quietIconButtonClass, secondaryButtonClass } from '@/utils';
import {
  applyPendingUpdate,
  useUpdateReady,
} from '@/hooks/pwa/swUpdateController';
import { useStatusNotice } from '@/hooks/ui/useStatusNotice';
import type { StatusNoticeKind } from '@/utils/ui/statusNotice';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';
import {
  touchHitAreaBorderlessClass,
  touchHitAreaClass,
} from '@/components/shell/shellTokens';

/** What the line says for each confirmation (`noteInStatusBar`). */
const NOTICE_TEXT: Record<StatusNoticeKind, string> = {
  saved: 'shell.notice.saved',
  planSaved: 'shell.notice.planSaved',
  backupSaved: 'shell.notice.backupSaved',
};

/** The toolbar's switch: quiet, and as high as the bar's other controls. */
const statusBarIconButtonClass = `${quietIconButtonClass} ${touchHitAreaBorderlessClass} h-9 w-9 shrink-0`;

/** A phone's drawer switch while its drawer is open. */
const statusBarPressedClass =
  'border-(--border-option-selected) bg-(--surface-option-selected) text-(--text-badge)';

/**
 * Undo/redo as one bordered control in the middle of the bar. Two quiet icons
 * beside the toolbar's switch were easy to miss and far from the stage; drawn
 * like the secondary buttons at the right end, the pair reads as a control of
 * its own, right under the thing it takes back.
 *
 * Below `sm` its buttons, the way back and the exits are squares of 36px and
 * the bar drops its hairlines: a 402px iPhone otherwise had to fit ~460px,
 * and the middle covered the plan's fulfilment at the left end. "Mischen"
 * leaves the bar below `md` altogether (`AppStatusBar`).
 *
 * The group is 36px with its border, as high as the buttons beside it; the
 * border on top of 36px buttons made the bar 2px taller wherever undo/redo stood.
 *
 * On a touch screen each button is 44px to hit, as the bar's other buttons are
 * (`touchHitAreaClass`), but only towards the outside: the two share an edge.
 * So the buttons round their own outer corners, since the group's
 * `overflow-hidden` would cut the hit area off.
 */
export const statusBarHistoryGroupClass =
  'flex h-9 items-center divide-x divide-(--button-secondary-border) rounded-full border border-(--button-secondary-border) bg-(--button-secondary-bg) shadow-(--button-secondary-shadow)';
export const statusBarHistoryButtonClass =
  'relative inline-flex h-full w-9 cursor-pointer items-center justify-center first:rounded-l-full last:rounded-r-full sm:w-11 pointer-coarse:after:absolute pointer-coarse:after:inset-x-0 pointer-coarse:after:-inset-y-1.25 pointer-coarse:first:after:-left-1.25 pointer-coarse:last:after:-right-1.25 text-(--button-secondary-text) transition hover:not-disabled:bg-(--button-secondary-bg-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--focus-ring) disabled:cursor-not-allowed disabled:text-(--text-muted) disabled:opacity-50';

/** The way back to the previous layer, beside the way on. */
export const statusBarBackButtonClass = `${secondaryButtonClass} ${touchHitAreaClass} h-9 shrink-0 gap-2 px-3 whitespace-nowrap max-sm:w-9 max-sm:px-0`;

/**
 * The word beside a button's icon at the right end of a status bar. A desktop
 * and a whiteboard show it — a mouse from `lg` up, any pointer from `xl` —
 * while a phone and a tablet, an iPad in landscape included, show the icon
 * alone: the bar is narrow there, and the word sits in the button's
 * accessible name either way.
 */
export const statusBarWordClass = 'hidden lg:pointer-fine:inline xl:inline';

/**
 * A status line's text with its figures set as the plan's fulfilment sets
 * its percentage: in the page's ink and semibold, the words around them
 * muted. Every figure in the line is a count, so the digits are found in the
 * translated text itself and the sentence stays one string for both
 * languages and the tooltip.
 */
export function StatusFigures({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\d+)/).map((part, index) =>
        // The split puts the figures at the odd places.
        index % 2 === 1 ? (
          <span key={index} className="font-semibold text-(--text-page)">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

/**
 * The check a status line ends with when what it states is in order — the
 * one the plan's inspector puts before "Heute gespeichert": a bare tick in
 * the confirmation's green, no filled disc, so it reads as quietly as the
 * words beside it.
 */
export function StatusCheckIcon() {
  return (
    <CheckIcon
      size={14}
      weight="bold"
      aria-hidden="true"
      className="shrink-0 text-(--status-ok)"
    />
  );
}

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
 *
 * When writes to storage fail, "Nicht gespeichert" stands in the same place
 * until one succeeds (`persistStatus`): that is a warning, so it is a button
 * in the alert's ink that tries again at once.
 *
 * A new version waiting is a state too: "Neue Version", a quiet button that
 * takes it on (`useUpdateReady`). And what was kept without the screen
 * showing it — a plan saved while its inspector is out of sight, a backup,
 * writes that work again — the line says for a few seconds in place of the
 * surface's status (`noteInStatusBar`). Both were toasts, which lay over the
 * inspector's head (decision 0037).
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
    portalPresentation,
    drawerOpen,
    setDrawerOpen,
    folded,
    setFolded,
    helpOpen,
    setHelpOpen,
  } = useInspector();
  const { setFloatNode } = useStatusBarSlot();
  const isOnline = useOnlineStatus();
  const unsaved = usePersistStatus() === 'failed';
  const updateReady = useUpdateReady();
  const notice = useStatusNotice();
  useRegisterStatusBar();
  const isDesktop = layoutMode === 'desktop';
  // From `lg` up every layer's column folds; below it there is a drawer only
  // where a layer portals a panel in.
  const showsInspectorSwitch =
    inShell &&
    !suspended &&
    (isDesktop || (portalMounted && portalLabel !== null));
  // The help stands in the inspector's place, so the switch puts it away.
  const inspectorShown = helpOpen || (isDesktop ? !folded : drawerOpen);
  // A plan saved while its inspector shows says so there ("Heute
  // gespeichert"); the line keeps quiet then.
  const shownNotice =
    notice && !(notice.kind === 'planSaved' && inspectorShown && !helpOpen)
      ? notice
      : null;
  const inspectorName = inspectorShown
    ? t('shell.inspectorHide')
    : portalLabel
      ? t('shell.inspectorShowNamed', { name: portalLabel })
      : t('shell.inspectorShow');
  const toggleInspector = () => {
    if (isDesktop) {
      // Folding closes the help as well.
      setFolded(helpOpen || !folded);
      return;
    }
    if (helpOpen) {
      setHelpOpen(false);
      setDrawerOpen(false);
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
      data-shell-status-bar=""
      className="sticky bottom-0 z-30 shrink-0 border-t border-(--border-card) bg-(--surface-card) pb-[env(safe-area-inset-bottom)]"
    >
      {/* What stands over the stage but belongs to the bar — the class list's
          jump to its ends — hangs above its right end and moves with it. */}
      <div
        ref={setFloatNode}
        data-status-bar-hang=""
        className="pointer-events-none absolute right-4 bottom-full mb-3 flex flex-col items-end gap-2 empty:hidden *:pointer-events-auto"
      />
      <div className="flex min-h-13 items-center gap-2 px-3 py-2 sm:gap-4 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {/* The toolbar's switch belongs to the workspace, not to a surface,
              so it leads the bar — right under the toolbar it concerns. */}
          {toolRail && !toolRail.suspended && isPhone && (
            <>
              <button
                type="button"
                onClick={() => {
                  if (!toolRail.sheetOpen) {
                    setDrawerOpen(false);
                    setHelpOpen(false);
                  }
                  toolRail.setSheetOpen(!toolRail.sheetOpen);
                }}
                aria-expanded={toolRail.sheetOpen}
                aria-controls={TOOL_RAIL_DRAWER_ID}
                aria-label={t('sidebar.ariaLabel')}
                title={t('sidebar.ariaLabel')}
                className={`${secondaryButtonClass} ${touchHitAreaClass} h-9 w-9 shrink-0 px-0 ${
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
          {toolRail && !toolRail.suspended && !isPhone && (
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
          {unsaved && (
            <button
              type="button"
              onClick={retryPersistNow}
              aria-label={t('shell.unsavedRetry')}
              title={t('shell.unsavedRetry')}
              className={`${secondaryButtonClass} ${touchHitAreaClass} h-9 shrink-0 gap-2 px-3 text-(--status-alert-text) max-sm:w-9 max-sm:px-0`}
            >
              <WarningCircleIcon size={16} aria-hidden="true" />
              <span className={statusBarWordClass}>{t('shell.unsaved')}</span>
            </button>
          )}
          {updateReady && (
            <button
              type="button"
              onClick={applyPendingUpdate}
              aria-label={t('common:pwa.updateReadyTitle')}
              title={t('common:pwa.updateReadyTitle')}
              className={`${secondaryButtonClass} ${touchHitAreaClass} h-9 shrink-0 gap-2 px-3 max-sm:w-9 max-sm:px-0`}
            >
              <ArrowClockwiseIcon size={16} aria-hidden="true" />
              <span className={statusBarWordClass}>
                {t('common:pwa.updateReadyShort')}
              </span>
            </button>
          )}
          {/* A polite status of its own, out of the flow, so going offline or
              a new version is said once while the bar as a whole stays
              quiet. The failed write announces itself through its toast. */}
          <span role="status" className="sr-only">
            {[
              isOnline ? '' : t('common:offline.badge'),
              updateReady ? t('common:pwa.updateAvailable') : '',
            ]
              .filter(Boolean)
              .join('. ')}
          </span>
          {shownNotice && (
            <p className="flex min-w-0 items-center gap-1.5 text-xs text-(--text-page) sm:text-sm">
              <StatusCheckIcon />
              <span className="min-w-0 truncate">
                {t(NOTICE_TEXT[shownNotice.kind])}
              </span>
            </p>
          )}
          {/* Kept mounted under a notice: a view portals into it. */}
          <div className="contents" hidden={shownNotice !== null}>
            {start}
          </div>
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
                  className={`${secondaryButtonClass} ${touchHitAreaClass} h-9 w-9 shrink-0 px-0 ${
                    inspectorShown ? statusBarPressedClass : ''
                  }`}
                >
                  <SlidersHorizontalIcon
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                  {/* How many students are ticked: the one place a phone
                      says it, since the sheet opens only from here. */}
                  {portalPresentation.badge !== undefined && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-(--button-primary-bg) px-1 text-micro leading-none font-semibold text-white tabular-nums"
                    >
                      {portalPresentation.badge}
                    </span>
                  )}
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
