// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, FunnelSimpleIcon } from '@phosphor-icons/react';
import { menuItemClass, menuSurfaceClass, secondaryButtonClass } from '@/utils';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { usePopoverFocus } from '@/hooks/ui/usePopoverFocus';
import FloatingDropdown from '@/components/students/FloatingDropdown';
import {
  STUDENT_FILTER_MODES,
  STUDENT_SORT_LABEL_KEYS,
  STUDENT_SORT_MODES,
  type StudentFilterMode,
  type StudentSortMode,
} from '@/components/studentInput/hooks/useStudentListView';

type Props = {
  filterMode: StudentFilterMode;
  onFilterModeChange: (mode: StudentFilterMode) => void;
  sortMode: StudentSortMode;
  onSortModeChange: (mode: StudentSortMode) => void;
};

/**
 * The filter and the sort of the class list behind one button, on a phone.
 *
 * Side by side with the search the two choices took a line each there, three
 * lines before the first student. The menu holds both as rows, the chosen one
 * with a check at its end; a dot on the button says a filter hides students,
 * as the list's head says how many it shows (`StudentListHeader`). A tablet
 * keeps them as two fields beside the search, where they fit in one line and
 * say what is chosen without a tap.
 */
export default function StudentListViewMenu({
  filterMode,
  onFilterModeChange,
  sortMode,
  onSortModeChange,
}: Props) {
  const { t } = useTranslation('students');
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const outsideRefs = React.useMemo(() => [anchorRef, contentRef], []);
  const close = React.useCallback(() => setOpen(false), []);
  useClickOutside(outsideRefs, close, open);
  usePopoverFocus({
    open,
    contentRef,
    anchorRef: triggerRef,
    onClose: close,
    initialFocusSelector: '[aria-pressed="true"]',
  });

  const label = t('listToolbar.viewMenu');
  const filterLabel = t(`listToolbar.filters.${filterMode}`);
  const sortLabel = t(STUDENT_SORT_LABEL_KEYS[sortMode]);
  const filtered = filterMode !== 'all';
  const name = `${label}: ${filterLabel}, ${sortLabel}`;

  const choose = (apply: () => void) => {
    apply();
    setOpen(false);
    triggerRef.current?.focus();
  };

  const row = (
    key: string,
    text: string,
    active: boolean,
    onSelect: () => void,
  ) => (
    <button
      key={key}
      type="button"
      className={menuItemClass}
      onClick={() => choose(onSelect)}
      aria-pressed={active}
    >
      <span className="min-w-0 flex-1">{text}</span>
      {active && (
        <CheckIcon
          size={14}
          weight="bold"
          aria-hidden="true"
          className="shrink-0 text-(--button-primary-bg)"
        />
      )}
    </button>
  );

  const headingClass =
    'px-3 pt-2 pb-1 text-caption font-semibold tracking-wider text-(--text-muted) uppercase';

  return (
    <div className="relative shrink-0" ref={anchorRef}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((previous) => !previous)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={name}
        title={name}
        className={`${secondaryButtonClass} relative h-9 w-9 px-0 pointer-coarse:h-11 pointer-coarse:w-11`}
      >
        <FunnelSimpleIcon size={16} aria-hidden="true" />
        {filtered && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-(--button-primary-bg) ring-2 ring-(--surface-card)"
          />
        )}
      </button>

      {open && (
        <FloatingDropdown
          anchorRef={anchorRef}
          align="right"
          portalRef={contentRef}
          className="z-50"
        >
          <div
            role="dialog"
            aria-label={label}
            className={`${menuSurfaceClass} max-h-[70vh] min-w-56 overflow-y-auto`}
          >
            <div role="group" aria-labelledby="student-list-view-filter">
              <h3 id="student-list-view-filter" className={headingClass}>
                {t('listToolbar.viewMenuFilter')}
              </h3>
              {STUDENT_FILTER_MODES.map((mode) =>
                row(
                  mode,
                  t(`listToolbar.filters.${mode}`),
                  mode === filterMode,
                  () => onFilterModeChange(mode),
                ),
              )}
            </div>
            <div
              aria-hidden="true"
              className="mx-3 my-1 h-px bg-(--border-card)"
            />
            <div role="group" aria-labelledby="student-list-view-sort">
              <h3 id="student-list-view-sort" className={headingClass}>
                {t('listToolbar.viewMenuSort')}
              </h3>
              {STUDENT_SORT_MODES.map((mode) =>
                row(
                  mode,
                  t(STUDENT_SORT_LABEL_KEYS[mode]),
                  mode === sortMode,
                  () => onSortModeChange(mode),
                ),
              )}
            </div>
          </div>
        </FloatingDropdown>
      )}
    </div>
  );
}
