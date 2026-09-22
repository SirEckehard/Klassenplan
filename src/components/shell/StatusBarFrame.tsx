// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLineLeftIcon, ArrowLineRightIcon } from '@phosphor-icons/react';
import { useShellToolRail } from '@/contexts/ToolRailContext';
import { useLayoutMode } from '@/hooks/ui/useLayoutMode';
import AppSettingsMenu from '@/components/shell/AppSettingsMenu';
import { quietIconButtonClass } from '@/utils';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';

/** Undo/redo and the like in the status bar: quiet, and small enough for a 44px line. */
export const statusBarIconButtonClass = `${quietIconButtonClass} h-9 w-9`;

/**
 * The bar at the bottom of the shell, without what a surface says in it.
 *
 * Every surface in the shell — the three layers and the export — leads the bar
 * with the same two workspace controls, the settings and the toolbar's switch,
 * and then fills three parts: where it stands (`start`), the ways out
 * (`middle`) and its one primary action (`end`). The outer two share the width
 * equally, so the middle sits in the middle whatever the line on the left says.
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
  // toolbar column at all — there it is a sheet with its own trigger.
  const toolRail = useShellToolRail();
  const isPhone = useLayoutMode() === 'phone';
  const showToolRailSwitch = toolRail !== null && !isPhone;

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
          {/* The settings and the toolbar's switch belong to the workspace,
              not to a surface, so they lead the bar together — right under
              the toolbar they concern. */}
          <span className="flex items-center gap-1">
            <AppSettingsMenu />
            {showToolRailSwitch && toolRail && (
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
            )}
          </span>
          <span aria-hidden="true" className="h-4 w-px bg-(--border-card)" />
          {start}
        </div>

        {middle}

        <div className="flex flex-1 items-center justify-end">{end}</div>
      </div>
    </div>
  );
}
