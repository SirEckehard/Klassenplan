// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CaretDownIcon,
  CheckIcon,
  GraduationCapIcon,
  PencilLineIcon,
  PlusIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import FloatingDropdown from '@/components/students/FloatingDropdown';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { usePopoverFocus } from '@/hooks/ui/usePopoverFocus';
import { useClassDialogs } from '@/contexts/ClassDialogsContext';
import { useClassManagementContext } from '@/contexts/seatingPlan/ClassManagementContext';
import { useSeatingPlanState } from '@/contexts/SeatingPlanContext';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';
import {
  checkName,
  inputFieldClass,
  MAX_NAME_LENGTH,
  menuItemClass,
  menuSurfaceClass,
  quietDangerIconButtonClass,
  quietIconButtonClass,
  secondaryButtonClass,
} from '@/utils';

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
  const { classSummaries, activeClass, selectClass, updateClassMetadata } =
    useClassManagementContext();
  const { openCreate, requestDelete, isBusy } = useClassDialogs();
  const { students } = useSeatingPlanState();

  const anchorRef = React.useRef<HTMLButtonElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = React.useState(false);
  // The class renamed in place, in its own row of the menu.
  const [renamingId, setRenamingId] = React.useState<string | null>(null);

  const hasActiveClass = Boolean(activeClass.id);

  const close = React.useCallback(() => {
    setOpen(false);
    setRenamingId(null);
  }, []);
  useClickOutside([containerRef, contentRef], close, open);
  // Focus lands on the open class, Tab and the arrow keys stay in the list,
  // Escape closes it with the focus back on this button.
  usePopoverFocus({
    open,
    contentRef,
    anchorRef,
    onClose: close,
    initialFocusSelector: '[aria-current="true"]',
  });

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
    // `min-w-0`: where the header runs short, the name gives way rather than
    // the button sliding under the layer switch.
    <div className="relative min-w-0" ref={containerRef}>
      <button
        type="button"
        ref={anchorRef}
        onClick={() => setOpen((previous) => !previous)}
        disabled={isBusy}
        data-tour={TOUR_ANCHORS.classSwitcher}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={buttonLabel}
        aria-label={buttonLabel}
        className={`${secondaryButtonClass} h-9 max-w-full gap-1.5 px-2.5 text-sm md:gap-2 md:px-3`}
      >
        {/* A phone and a small tablet in portrait — an iPad mini at 744px —
            have no room for the name beside the layers, which carry their
            words from `sm` up: it slid under "Klasse". There the button is a
            mark, and the name stays in its label and tooltip. */}
        <GraduationCapIcon
          className="h-4 w-4 shrink-0 md:hidden"
          aria-hidden="true"
        />
        <span
          className={`hidden max-w-44 truncate md:inline ${
            hasActiveClass ? 'font-semibold' : 'text-(--text-muted)'
          }`}
        >
          {hasActiveClass
            ? activeName
            : t('students:classManagement.noClassSelected')}
        </span>
        {hasActiveClass && students.length > 0 && (
          <span className="hidden whitespace-nowrap text-xs font-normal tabular-nums text-(--text-muted) md:inline">
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
          {/* A dialog of buttons, not a listbox: each class carries its own
              rename and delete beside it, which an option may not contain. */}
          <div
            role="dialog"
            aria-label={t('students:classManagement.switchClass')}
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
              className={menuItemClass}
            >
              <PlusIcon
                className="h-4 w-4 shrink-0 text-(--text-muted)"
                aria-hidden="true"
              />
              {t('students:classManagement.newClass')}
            </button>
            <div className="my-1 h-px bg-(--border-card)" role="separator" />

            <div
              role="group"
              aria-label={t('students:classManagement.selectClass')}
            >
              {summaries.map((entry) => {
                const isSelected = entry.id === activeClass.id;
                if (entry.id === renamingId) {
                  return (
                    <ClassNameRow
                      key={entry.id}
                      initialName={entry.name}
                      otherNames={summaries
                        .filter((other) => other.id !== entry.id)
                        .map((other) => other.name)}
                      onCommit={(name) =>
                        updateClassMetadata(entry.id, { name })
                      }
                      onDone={() => {
                        setRenamingId(null);
                        // Back on the class just renamed, so the keyboard
                        // stays in the menu.
                        requestAnimationFrame(() => {
                          contentRef.current
                            ?.querySelector<HTMLElement>(
                              `[data-class-id="${CSS.escape(entry.id)}"]`,
                            )
                            ?.focus();
                        });
                      }}
                    />
                  );
                }
                return (
                  <div key={entry.id} className="flex items-center gap-1">
                    <button
                      type="button"
                      data-class-id={entry.id}
                      onClick={() => handleSelect(entry.id)}
                      disabled={isBusy}
                      aria-current={isSelected ? 'true' : undefined}
                      title={entry.name}
                      className={`${menuItemClass} min-w-0 flex-1`}
                    >
                      <span className="block min-w-0 flex-1 truncate">
                        {entry.name}
                      </span>
                      <CheckIcon
                        size={16}
                        aria-hidden="true"
                        className={`shrink-0 text-(--text-badge) ${isSelected ? '' : 'invisible'}`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRenamingId(entry.id)}
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

// The rows are the menu rows every dropdown uses (`menu-item`), the open class
// with a check at its end; beside each the two things a class can undergo, as
// quiet icons. Deleting turns rose only under the pointer, as a menu's
// destructive row does (`menu-item-danger`).
const optionActionClass = `${quietIconButtonClass} h-9 w-9 shrink-0`;
const optionDeleteClass = `${quietDangerIconButtonClass} h-9 w-9 shrink-0`;

/**
 * A class's name in its own row of the menu: Enter, or moving on within the
 * menu, keeps it; Escape or a click beside the menu closes the menu without
 * it, as it closes any menu without a choice. A name another class carries is
 * refused under the field as it is typed — the repository would refuse it
 * too, but only after the fact.
 */
function ClassNameRow({
  initialName,
  otherNames,
  onCommit,
  onDone,
}: {
  initialName: string;
  otherNames: string[];
  /** Gives the name; resolves with whether it was kept. */
  onCommit: (name: string) => Promise<boolean>;
  onDone: () => void;
}) {
  const { t } = useTranslation('generator');
  const [draft, setDraft] = React.useState(initialName);
  // Enter and leaving the field can both ask while the rename is on its way.
  const committingRef = React.useRef(false);
  const errorId = React.useId();
  const problem = checkName(draft, otherNames, MAX_NAME_LENGTH);
  const taken = problem === 'taken';

  const commit = async () => {
    if (committingRef.current) return;
    const trimmed = draft.trim();
    if (trimmed === '' || trimmed === initialName) {
      onDone();
      return;
    }
    if (problem) return;
    committingRef.current = true;
    try {
      if (await onCommit(trimmed)) onDone();
    } finally {
      committingRef.current = false;
    }
  };

  return (
    <div className="flex flex-col gap-1 px-2 py-1">
      <input
        type="text"
        value={draft}
        maxLength={MAX_NAME_LENGTH}
        autoFocus
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          void commit();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            void commit();
          }
        }}
        aria-label={t('classPanel.name')}
        aria-invalid={taken || undefined}
        aria-describedby={taken ? errorId : undefined}
        className={`${inputFieldClass} h-9 w-full py-0 text-sm`}
      />
      {taken && (
        <p id={errorId} className="text-xs text-(--status-alert-text)">
          {t('classPanel.nameTaken')}
        </p>
      )}
    </div>
  );
}
