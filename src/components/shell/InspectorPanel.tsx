// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
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
      <div className="flex min-w-0 flex-col gap-0.5">
        {/* A heading, so the panel has a place in the document outline and a
            test can ask for what is selected by name. */}
        <h2 className="truncate text-[17px] font-semibold text-(--text-page)">
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
  children,
}: {
  /** Pedagogical family the group speaks for; neutral where it has none. */
  family?: keyof typeof dataFamilyClass;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2 border-t border-(--border-card) pt-3 pb-3 first:border-t-0 first:pt-0 last:pb-0">
      <h3
        className={`${dataHeadingClass} ${family ? dataFamilyClass[family] : 'text-(--text-muted)'}`}
      >
        {title}
      </h3>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
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
  children,
}: {
  label: string;
  /** A word on what the setting does, where the label cannot carry it. */
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
      <span className="text-[13px] text-(--text-page)" title={hint}>
        {label}
      </span>
      <span className="flex flex-wrap items-center gap-1">{children}</span>
    </div>
  );
}

/** The value of a setting with a handful of options, as chips. */
export function InspectorChoice<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T | undefined;
  options: ReadonlyArray<{
    value: T;
    label: string;
    title?: string;
    icon?: React.ReactNode;
  }>;
  onChange: (value: T | undefined) => void;
  /** Names the group for a screen reader; the row's label repeats it on screen. */
  label: string;
}) {
  return (
    <span role="group" aria-label={label} className="flex flex-wrap gap-1">
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            // Pressing the value it already has clears it: "not decided" has
            // to stay reachable, or every student ends up with an opinion.
            onClick={() => onChange(isActive ? undefined : option.value)}
            aria-pressed={isActive}
            title={option.title ?? option.label}
            className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) ${
              isActive
                ? 'border-(--border-option-selected) bg-(--surface-option-selected) text-(--text-badge)'
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
