// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, MinusIcon, type Icon } from '@phosphor-icons/react';
import { dataFamilyClass, dataHeadingClass } from '@/utils';

/**
 * The three parts every inspector is built from, so a student, a table and a
 * window are read the same way.
 *
 * The panel is a wall, not a stack of cards: one strip at the top saying what
 * is selected, sections below it divided by hairlines rather than by gaps, and
 * — where there is one — the destructive action pinned to the bottom. A layer
 * fills them; none of them invents a frame of its own.
 */

/** What is selected: a face or a glyph, its name, and where it sits. */
export function InspectorHeader({
  media,
  title,
  subtitle,
  actions,
}: {
  /** Avatar, swatch or icon — whatever stands for the thing. */
  media?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Stepping through the selection, at the far end of the strip. */
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-(--border-card) px-4 py-3">
      {media}
      {/* Takes the width between the media and the actions: a title that is
          a field — the student's name — has to fit whole, not be cut off by
          the heading's truncation. */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* A heading, so the panel has a place in the document outline and a
            test can ask for what is selected by name. It wraps rather than
            truncates: a student's name cut to "Lina Schneid…" names nobody. */}
        <h2 className="min-w-0 wrap-break-word text-[17px] font-semibold text-(--text-page)">
          {title}
        </h2>
        {subtitle && (
          <span className="text-xs tabular-nums text-(--text-muted)">
            {subtitle}
          </span>
        )}
      </div>
      {actions && (
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {actions}
        </div>
      )}
    </div>
  );
}

/** Everything between the header and the footer, scrolling on its own. */
export function InspectorBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3">
      {children}
    </div>
  );
}

/**
 * One group of controls under the family it belongs to. `first:` keeps the
 * dividing line off the top of the panel, the same way the toolbar does it.
 */
export function InspectorSection({
  family,
  title,
  tourAnchor,
  actions,
  children,
}: {
  /** Pedagogical family the group speaks for; neutral where it has none. */
  family?: keyof typeof dataFamilyClass;
  title: string;
  /** The coach mark that points at this group, if one does. */
  tourAnchor?: string;
  /**
   * What acts on every row of the group at once — a switch for all of them —
   * beside the heading, as the criteria's switch sits beside the panel's.
   */
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const heading = (
    <h3
      className={`${dataHeadingClass} ${family ? dataFamilyClass[family] : 'text-(--text-muted)'}`}
    >
      {title}
    </h3>
  );
  return (
    <section
      data-tour={tourAnchor}
      className="flex flex-col gap-2 border-t border-(--border-card) pt-3 pb-3 first:border-t-0 first:pt-0 last:pb-0"
    >
      {actions ? (
        <div className="flex items-center justify-between gap-2">
          {heading}
          {actions}
        </div>
      ) : (
        heading
      )}
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

/**
 * The symbol an attribute wears on a seat, in its family's ink, beside the
 * control that sets it — so the icon on the plan is one the teacher has
 * already seen next to its word.
 */
export function InspectorIcon({
  icon: IconComponent,
  family,
}: {
  icon: Icon;
  family: keyof typeof dataFamilyClass;
}) {
  return (
    <IconComponent
      size={14}
      aria-hidden="true"
      className={`${dataFamilyClass[family]} shrink-0 text-(--data-chip-text)`}
    />
  );
}

/**
 * One setting: what it is on the left, what it is set to on the right.
 *
 * The inspector used to stack 44px icon tiles with a word underneath, which
 * said what an attribute is but never what it is set to without reading the
 * colour. A row states both, and eleven of them read as one list.
 */
export function InspectorRow({
  label,
  hint,
  icon,
  labelsControl = false,
  stacked = false,
  children,
}: {
  label: string;
  /** The attribute's badge icon before its name (`InspectorIcon`). */
  icon?: React.ReactNode;
  /** A word on what the setting does, where the label cannot carry it. */
  hint?: string;
  /**
   * The row holds a single switch, and the whole row is its label: a tap on
   * the name operates it as well. On a touch screen that makes the row the
   * target, 44px tall, where the switch alone is 28×16px — never set it on a
   * row of chips, whose first chip the label would press.
   */
  labelsControl?: boolean;
  /**
   * The name above the value, the value the row's full width: for a choice
   * among more options than fit beside a name (`InspectorChoice` as a list).
   */
  stacked?: boolean;
  children: React.ReactNode;
}) {
  const rowClass = stacked
    ? 'flex w-full flex-col gap-1.5'
    : 'flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1.5';
  const content = (
    <>
      <span
        className="flex min-w-0 items-center gap-2 text-[13px] text-(--text-page)"
        title={hint}
      >
        {icon}
        {label}
      </span>
      <span
        className={
          stacked ? 'flex w-full' : 'flex flex-wrap items-center gap-1'
        }
      >
        {children}
      </span>
    </>
  );
  return labelsControl ? (
    <label className={`${rowClass} cursor-pointer pointer-coarse:min-h-11`}>
      {content}
    </label>
  ) : (
    <div className={rowClass}>{content}</div>
  );
}

/**
 * The value of a setting with a handful of options: as chips beside the name
 * where three short words fit, as a list under it where more do not — a run
 * of chips wrapping onto a second line reads as a scatter, not as a scale.
 */
export function InspectorChoice<T extends string>({
  value,
  options,
  onChange,
  label,
  mixedValues,
  layout = 'chips',
}: {
  value: T | undefined;
  options: ReadonlyArray<{
    value: T;
    label: string;
    title?: string;
    icon?: React.ReactNode;
    /**
     * Colours the chip takes while it is pressed, in place of the selection
     * blue — for a value the plan itself draws in a colour of its own.
     */
    tint?: { fill: string; stroke: string };
  }>;
  onChange: (value: T | undefined) => void;
  /** Names the group for a screen reader; the row's label repeats it on screen. */
  label: string;
  /**
   * Several students who do not agree: the values some of them have. Those
   * chips are outlined in dashes and announced as half pressed — otherwise a
   * mixed selection looks exactly like one where nothing is set. Pressing one
   * sets it for all, as pressing any other chip does.
   */
  mixedValues?: ReadonlySet<string>;
  /** `list` stacks the options as rows, for a row set `stacked`. */
  layout?: 'chips' | 'list';
}) {
  const { t } = useTranslation('students');
  if (layout === 'list') {
    return (
      <span
        role="group"
        aria-label={label}
        className="flex w-full flex-col divide-y divide-(--border-card) overflow-hidden rounded-md border border-(--border-card) bg-(--surface-card)"
      >
        {options.map((option) => {
          const isActive = value === option.value;
          const isMixed =
            !isActive && (mixedValues?.has(option.value) ?? false);
          const title = option.title ?? option.label;
          return (
            <button
              key={option.value}
              type="button"
              // Pressing the value it already has clears it, as with a chip.
              onClick={() => onChange(isActive ? undefined : option.value)}
              aria-pressed={isActive ? true : isMixed ? 'mixed' : false}
              title={
                isMixed ? t('bulkEdit.choiceMixed', { label: title }) : title
              }
              className={`flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left text-[13px] transition pointer-coarse:min-h-11 focus-visible:relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--focus-ring-primary) ${
                isActive
                  ? 'bg-(--surface-option-selected) font-medium text-(--text-page)'
                  : 'text-(--text-page) hover:bg-(--surface-sunken)'
              }`}
            >
              {option.icon}
              <span className="min-w-0 flex-1">{option.label}</span>
              {isActive && (
                <CheckIcon
                  size={14}
                  weight="bold"
                  aria-hidden="true"
                  className="shrink-0 text-(--button-primary-bg)"
                />
              )}
              {/* Some of the selection have it: a dash where the check of
                  "all of them" would stand. */}
              {isMixed && (
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
      </span>
    );
  }
  return (
    <span role="group" aria-label={label} className="flex flex-wrap gap-1">
      {options.map((option) => {
        const isActive = value === option.value;
        const isMixed = !isActive && (mixedValues?.has(option.value) ?? false);
        const title = option.title ?? option.label;
        return (
          <button
            key={option.value}
            type="button"
            // Pressing the value it already has clears it: "not decided" has
            // to stay reachable, or every student ends up with an opinion.
            onClick={() => onChange(isActive ? undefined : option.value)}
            aria-pressed={isActive ? true : isMixed ? 'mixed' : false}
            title={
              isMixed ? t('bulkEdit.choiceMixed', { label: title }) : title
            }
            style={
              isActive && option.tint
                ? {
                    backgroundColor: option.tint.fill,
                    borderColor: option.tint.stroke,
                  }
                : undefined
            }
            // A fingertip needs 44px; with the mouse the chips stay compact.
            className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs transition pointer-coarse:min-h-11 pointer-coarse:px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) ${
              isActive && option.tint
                ? 'font-medium text-(--text-page)'
                : isActive
                  ? 'border-(--border-option-selected) bg-(--surface-option-selected) text-(--text-badge)'
                  : isMixed
                    ? 'border-dashed border-(--border-option-selected) bg-(--surface-card) text-(--text-page) hover:bg-(--surface-option-selected)'
                    : 'border-(--border-card) bg-(--surface-card) text-(--text-muted) hover:border-(--border-option-hover)'
            }`}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </span>
  );
}

/** The bottom strip: what acts on the whole selection, destructive last. */
export function InspectorFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-(--border-card) px-4 py-3">
      {children}
    </div>
  );
}
