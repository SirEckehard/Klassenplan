// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CaretDownIcon, CheckIcon, MinusIcon } from '@phosphor-icons/react';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { usePopoverFocus } from '@/hooks/ui/usePopoverFocus';
import { menuItemClass, menuSurfaceClass, type DataFamily } from '@/utils';
import { InspectorRow } from '@/components/shell/InspectorPanel';
import { familyValueControl } from './studentStyleTokens';
import FloatingDropdown from './FloatingDropdown';

type InspectorSelectOption<T extends string> = {
  value: T;
  label: string;
  /** What the value means, on the menu row. */
  title?: string;
  /** The value's badge icon (`InspectorIcon`), on the row and on the button. */
  icon?: React.ReactNode;
};

/**
 * A student attribute with more values than fit as chips beside its name —
 * the social role, the language level — as one inspector row: the name on
 * the left, the value on the right as a button that opens the values as a
 * menu. Four or five values stacked as a list took nine rows of a panel for
 * what most students leave unset; the row keeps the value readable while a
 * teacher steps through the class with Alt/⌥+↑/↓.
 *
 * The menu's first row is "not set", so a value can be taken back. Choosing
 * a row sets it and closes the menu. Several students who do not agree
 * (`mixedValues`) read "Gemischt" on the button and a dash beside the values
 * some of them have, as `InspectorChoice` does with its chips.
 */
export default function InspectorSelect<T extends string>({
  label,
  icon,
  family,
  value,
  options,
  onChange,
  notSetLabel,
  mixedValues,
}: {
  label: string;
  /**
   * The attribute's icon before its name (`InspectorIcon`) — the one its
   * criterion wears, since the values each bring an icon of their own.
   */
  icon?: React.ReactNode;
  /** The family the attribute belongs to; the button wears it while set. */
  family: DataFamily;
  value: T | undefined;
  options: ReadonlyArray<InspectorSelectOption<T>>;
  onChange: (value: T | undefined) => void;
  /** The button's word, and the menu's first row, while nothing is set. */
  notSetLabel: string;
  /** Values only some of a multi-selection have; see `InspectorChoice`. */
  mixedValues?: ReadonlySet<string>;
}) {
  const { t } = useTranslation('students');
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const outsideRefs = React.useMemo(() => [anchorRef, contentRef], []);
  const close = React.useCallback(() => setOpen(false), []);
  useClickOutside(outsideRefs, close, open);
  // Portalled to the end of the page: the focus moves in onto the value that
  // is set, the arrow keys step through the rows, Escape closes the menu with
  // the focus back on the button.
  usePopoverFocus({
    open,
    contentRef,
    anchorRef: triggerRef,
    onClose: close,
    initialFocusSelector: '[aria-pressed="true"]',
  });

  const tokens = familyValueControl(family);
  const active = options.find((option) => option.value === value);
  const isMixed = !active && (mixedValues?.size ?? 0) > 0;
  const shownLabel = active
    ? active.label
    : isMixed
      ? t('bulkEdit.valueMixed')
      : notSetLabel;
  const stateClass = active
    ? tokens.activeStateClass
    : isMixed
      ? 'border-dashed border-(--border-option-selected) bg-(--surface-card) text-(--text-page)'
      : tokens.inactiveStateClass;

  const choose = (next: T | undefined) => {
    onChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const rows: ReadonlyArray<{
    value: T | undefined;
    label: string;
    title?: string;
    icon?: React.ReactNode;
  }> = [{ value: undefined, label: notSetLabel }, ...options];

  return (
    <InspectorRow label={label} icon={icon}>
      <div className="relative" ref={anchorRef}>
        <button
          type="button"
          ref={triggerRef}
          className={`${tokens.baseClass} ${stateClass}`}
          title={active?.title ?? label}
          onClick={() => setOpen((previous) => !previous)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`${label}: ${shownLabel}`}
        >
          {active?.icon}
          <span className="truncate">{shownLabel}</span>
          <CaretDownIcon
            size={10}
            className={tokens.caretClass}
            aria-hidden="true"
          />
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
              className={`${menuSurfaceClass} min-w-48`}
            >
              {rows.map((row) => {
                const isActive = row.value === value && !isMixed;
                const isPartly =
                  row.value !== undefined &&
                  !isActive &&
                  (mixedValues?.has(row.value) ?? false);
                const title = row.title ?? row.label;
                return (
                  <button
                    key={row.value ?? ''}
                    type="button"
                    className={menuItemClass}
                    onClick={() => choose(row.value)}
                    aria-pressed={isActive ? true : isPartly ? 'mixed' : false}
                    title={
                      isPartly
                        ? t('bulkEdit.choiceMixed', { label: title })
                        : title
                    }
                  >
                    {/* "Not set" keeps the icon's room, so the words line up. */}
                    {row.icon ?? (
                      <span aria-hidden="true" className="w-3.5 shrink-0" />
                    )}
                    <span
                      className={`min-w-0 flex-1 ${row.value === undefined ? 'text-(--text-muted)' : ''}`}
                    >
                      {row.label}
                    </span>
                    {isActive && (
                      <CheckIcon
                        size={14}
                        weight="bold"
                        aria-hidden="true"
                        className="shrink-0 text-(--button-primary-bg)"
                      />
                    )}
                    {/* Some of the selection have it: a dash where the check
                        of "all of them" would stand. */}
                    {isPartly && (
                      <MinusIcon
                        size={14}
                        weight="bold"
                        aria-hidden="true"
                        className="shrink-0 text-(--text-muted)"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </FloatingDropdown>
        )}
      </div>
    </InspectorRow>
  );
}
