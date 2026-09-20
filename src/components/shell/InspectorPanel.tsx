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
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </section>
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
