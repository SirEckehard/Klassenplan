// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CaretDownIcon,
  PencilLineIcon,
  PlusIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import FloatingDropdown from '@/components/students/FloatingDropdown';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { useClassDialogs } from '@/contexts/ClassDialogsContext';
import { useClassManagementContext } from '@/contexts/seatingPlan/ClassManagementContext';
import { useSeatingPlanState } from '@/contexts/SeatingPlanContext';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';
import { menuSurfaceClass, secondaryButtonClass } from '@/utils';

/**
 * Which class is open — as the document name of the whole workspace.
 *
 * The switcher used to be the heading of a card on the class layer, which made
 * the open class invisible from the room and the plan although everything
 * there belongs to it. In the header it states the same thing on all three
 * layers, and everything a class itself can undergo — create, rename, delete —
 * stays in its dropdown, next to the class it acts on.
 */
export default function HeaderClassMenu() {
  const { t } = useTranslation(['students', 'generator']);
  const { classSummaries, activeClass, selectClass } =
    useClassManagementContext();
  const { openCreate, openEdit, requestDelete, isBusy } = useClassDialogs();
  const { students } = useSeatingPlanState();

  const anchorRef = React.useRef<HTMLButtonElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = React.useState(false);

  const hasActiveClass = Boolean(activeClass.id);

  useClickOutside([containerRef, contentRef], () => setOpen(false), open);

  // A class that exists but has not reached the summaries yet still belongs in
  // the list — otherwise the open class is missing from its own switcher.
  const summaries = React.useMemo(() => {
    if (!activeClass.id) return classSummaries;
    if (classSummaries.some((entry) => entry.id === activeClass.id)) {
      return classSummaries;
    }
    return [
      {
        id: activeClass.id,
        name: activeClass.name || t('students:classManagement.activeClass'),
        label: activeClass.label,
        notes: activeClass.notes,
        createdAt: '',
        updatedAt: '',
        lastUsedAt: activeClass.lastUsedAt,
        studentCount: 0,
      },
      ...classSummaries,
    ];
  }, [activeClass, classSummaries, t]);

  const activeName =
    summaries.find((entry) => entry.id === activeClass.id)?.name ??
    t('students:classManagement.selectClass');
  const buttonLabel = hasActiveClass
    ? `${t('students:classManagement.switchClass')} — ${t('students:classManagement.activeClass')}: ${activeName}`
    : t('students:classManagement.noClassSelected');

  const handleSelect = (classId: string) => {
    setOpen(false);
    if (!classId || classId === activeClass.id) return;
    void selectClass(classId);
  };

  // Without a class the button keeps its shape and says so: creating the first
  // one is in the dropdown, where creating any other one is too. The empty
  // state of the class layer is where a beginner is meant to start, and two
  // buttons reading "New class" beside each other help nobody.
  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        ref={anchorRef}
        onClick={() => setOpen((previous) => !previous)}
        disabled={isBusy}
        data-tour={TOUR_ANCHORS.classSwitcher}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={buttonLabel}
        aria-label={buttonLabel}
        className={`${secondaryButtonClass} h-9 max-w-full gap-2 px-3 text-sm`}
      >
        <span
          className={`max-w-32 truncate sm:max-w-44 ${
            hasActiveClass ? 'font-semibold' : 'text-(--text-muted)'
          }`}
        >
          {hasActiveClass
            ? activeName
            : t('students:classManagement.noClassSelected')}
        </span>
        {hasActiveClass && students.length > 0 && (
          <span className="hidden whitespace-nowrap text-xs font-normal tabular-nums text-(--text-muted) sm:inline">
            {t('students:classManagement.studentCount', {
              count: students.length,
            })}
          </span>
        )}
        <CaretDownIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      </button>

      {open && (
        <FloatingDropdown
          anchorRef={anchorRef}
          align="left"
          portalRef={contentRef}
        >
          <div
            className={`${menuSurfaceClass} max-h-72 w-64 overflow-y-auto p-1`}
          >
            {/* Creating a class is offered above the existing ones, so the
                switcher answers both "which class?" and "a new one". */}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openCreate();
              }}
              disabled={isBusy}
              className={createOptionClass}
            >
              <PlusIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t('students:classManagement.newClass')}
            </button>
            <div className="my-1 h-px bg-(--border-card)" role="separator" />

            <div role="listbox">
              {summaries.map((entry) => {
                const isSelected = entry.id === activeClass.id;
                return (
                  <div key={entry.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSelect(entry.id)}
                      disabled={isBusy}
                      role="option"
                      aria-selected={isSelected}
                      title={entry.name}
                      className={`${isSelected ? activeOptionClass : optionClass} min-w-0 flex-1`}
                    >
                      <span className="block min-w-0 flex-1 truncate">
                        {entry.name}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        openEdit(entry.id);
                      }}
                      disabled={isBusy}
                      title={t('students:classManagement.editClass')}
                      aria-label={`${t('students:classManagement.editClass')} ${entry.name}`}
                      className={optionActionClass}
                    >
                      <PencilLineIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        requestDelete(entry.id);
                      }}
                      disabled={isBusy}
                      title={t('students:classManagement.deleteClass')}
                      aria-label={`${t('students:classManagement.deleteClass')} ${entry.name}`}
                      className={optionDeleteClass}
                    >
                      <TrashIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </FloatingDropdown>
      )}
    </div>
  );
}

const optionClass =
  'flex w-full cursor-pointer items-center overflow-hidden rounded-lg px-3 py-2 text-left text-sm transition hover:bg-(--surface-sunken) disabled:cursor-not-allowed';
const activeOptionClass =
  'flex w-full cursor-pointer items-center overflow-hidden rounded-lg bg-(--surface-option-selected) px-3 py-2 text-left text-sm font-semibold text-(--text-badge) disabled:cursor-not-allowed';
const createOptionClass =
  'flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-(--text-badge) transition hover:bg-(--surface-sunken) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) disabled:cursor-not-allowed disabled:opacity-40';
const optionActionClass =
  'inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-(--text-muted) transition hover:bg-(--surface-sunken) hover:text-(--text-page) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) disabled:cursor-not-allowed disabled:opacity-40';
const optionDeleteClass =
  'inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-(--button-danger-bg) transition hover:bg-(--surface-sunken) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-danger) disabled:cursor-not-allowed disabled:opacity-40';
