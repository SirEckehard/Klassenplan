// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRightIcon,
  CaretDownIcon,
  FileArrowUpIcon,
  PlusIcon,
} from '@phosphor-icons/react';
import {
  inputFieldClass,
  menuSurfaceClass,
  primaryButtonClass,
  successIconButtonClass,
} from '@/utils';
import { workbenchPillClass } from './classWorkbenchTokens';
import FloatingDropdown from './FloatingDropdown';
import { useClickOutside } from '@/hooks/ui/useClickOutside';

type Props = {
  /** Drives the trigger's emphasis: an empty class needs to be filled first. */
  studentCount: number;
  newStudentName: string;
  onNewStudentNameChange: (value: string) => void;
  onAddStudent: () => void;
  isAddStudentDisabled?: boolean;
  /** Placeholder creation is offered only when the host wires all three up. */
  placeholderCount?: string;
  onPlaceholderCountChange?: (value: string) => void;
  onCreatePlaceholders?: () => void;
  onImportCsv?: (file: File) => Promise<unknown>;
};

/**
 * Every way of getting students into a class, behind one trigger.
 *
 * The three paths used to sit in three different places: a name field in the
 * workbench row, a placeholder pill that only existed while the class was
 * empty, and a CSV button parked next to Export. Collecting them here answers
 * "how do I add students?" in one look, gives the placeholder path back to a
 * class that already has students (three newcomers in November are the normal
 * case), and frees the ~240px the inline field cost — the row it sat in now
 * also carries search, filter and sort.
 *
 * The popover stays open after an add so a whole class can be typed in one go;
 * the name field keeps focus for the next name.
 *
 * It carries `role="dialog"`, which parks the global Escape shortcut in
 * `StudentInput` (that one would otherwise drop the list selection), so
 * closing on Escape is this component's job.
 */
export default function AddStudentsMenu({
  studentCount,
  newStudentName,
  onNewStudentNameChange,
  onAddStudent,
  isAddStudentDisabled = false,
  placeholderCount = '10',
  onPlaceholderCountChange,
  onCreatePlaceholders,
  onImportCsv,
}: Props) {
  const { t } = useTranslation('students');
  const anchorRef = React.useRef<HTMLButtonElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const nameInputRef = React.useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = React.useState(false);

  useClickOutside([containerRef, contentRef], () => setOpen(false), open);

  const close = React.useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) {
      anchorRef.current?.focus();
    }
  }, []);

  // One frame is enough: `FloatingDropdown` renders nothing until it has
  // measured the anchor, and that re-render lands before the next paint.
  React.useEffect(() => {
    if (!open) {
      return;
    }
    const frame = requestAnimationFrame(() => nameInputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  React.useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      event.stopPropagation();
      close();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, close]);

  const title = t('studentList.addStudent');
  // An empty class has nothing else to do first, so the trigger carries the
  // filled style there and steps back to a quiet pill once students exist.
  const isEmptyClass = studentCount === 0;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        ref={anchorRef}
        onClick={() => setOpen((previous) => !previous)}
        className={
          isEmptyClass
            ? `${primaryButtonClass} h-11 gap-1.5 px-4!`
            : addTriggerClass
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        title={title}
      >
        <PlusIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t('studentList.addMenu.trigger')}
        <CaretDownIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      </button>

      {open && (
        <FloatingDropdown
          anchorRef={anchorRef}
          align="left"
          portalRef={contentRef}
        >
          <div
            role="dialog"
            aria-label={title}
            className={`${menuSurfaceClass} flex w-72 flex-col gap-3 p-3`}
          >
            <label className="flex flex-col gap-1">
              <span className={sectionLabelClass}>
                {t('studentList.addMenu.singleLabel')}
              </span>
              <span className="flex items-center gap-2">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={newStudentName}
                  onChange={(event) =>
                    onNewStudentNameChange(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      onAddStudent();
                    }
                  }}
                  placeholder={t('studentList.addMenu.namePlaceholder')}
                  className={`${inputFieldClass} flex-1`}
                />
                <button
                  type="button"
                  onClick={onAddStudent}
                  disabled={isAddStudentDisabled}
                  className={`${successIconButtonClass} h-9 w-9 shrink-0 p-0!`}
                  title={title}
                  aria-label={title}
                >
                  <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                </button>
              </span>
            </label>

            {onCreatePlaceholders && onPlaceholderCountChange && (
              <>
                <div
                  className="h-px bg-gray-200 dark:bg-gray-700"
                  role="separator"
                />

                <label className="flex flex-col gap-1">
                  <span className={sectionLabelClass}>
                    {t('studentList.createPlaceholders')}
                  </span>
                  <span className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={40}
                      value={placeholderCount}
                      onChange={(event) =>
                        onPlaceholderCountChange(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          onCreatePlaceholders();
                        }
                      }}
                      placeholder={t('studentList.placeholderCountPlaceholder')}
                      className={`${inputFieldClass} w-20`}
                    />
                    <button
                      type="button"
                      onClick={onCreatePlaceholders}
                      className={`${primaryButtonClass} h-9 w-9 shrink-0 p-0!`}
                      title={t('studentList.createPlaceholders')}
                      aria-label={t('studentList.createPlaceholders')}
                    >
                      <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t('studentList.addMenu.placeholderHint')}
                  </span>
                </label>
              </>
            )}

            {onImportCsv && (
              <>
                <div
                  className="h-px bg-gray-200 dark:bg-gray-700"
                  role="separator"
                />
                <label className={importOptionClass}>
                  <FileArrowUpIcon size={16} aria-hidden="true" />
                  {t('csv.import')}
                  <input
                    type="file"
                    accept=".csv"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (!file) {
                        return;
                      }
                      close(false);
                      await onImportCsv(file);
                    }}
                    className="hidden"
                  />
                </label>
              </>
            )}
          </div>
        </FloatingDropdown>
      )}
    </div>
  );
}

const addTriggerClass = `${workbenchPillClass} inline-flex cursor-pointer items-center gap-1.5 font-medium`;
const sectionLabelClass =
  'text-xs font-medium text-gray-600 dark:text-gray-300';
const importOptionClass =
  'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 transition hover:bg-blue-50 focus-within:ring-2 focus-within:ring-blue-400 dark:text-gray-100 dark:hover:bg-gray-800';
