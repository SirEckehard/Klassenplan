// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { CaretRightIcon } from '@phosphor-icons/react';

/** One entry of a column: a folder, which opens the next column, or a leaf. */
export interface BrowserItem {
  /** Unique across all columns. */
  key: string;
  label: string;
  /** A quiet second line: a date, a count. */
  meta?: string;
  /** A picture before the name: an icon, a room's thumbnail. */
  leading?: React.ReactNode;
  /** Chips after the name: "geöffnet", "automatisch gesichert". */
  badges?: React.ReactNode;
  isFolder?: boolean;
}

/** Entries that belong together, under a heading where they need one. */
export interface BrowserGroup {
  key: string;
  label?: string;
  items: BrowserItem[];
}

export interface BrowserColumn {
  key: string;
  /** What the column lists, for screen readers: "Klassen", "7b", a room. */
  label: string;
  groups: BrowserGroup[];
  selectedKey: string | null;
  /** Said in the column while it lists nothing. */
  emptyText?: string;
}

interface ColumnBrowserProps {
  columns: BrowserColumn[];
  onSelect: (columnIndex: number, key: string) => void;
  /**
   * A click or a tap, after the selection: where a pointer chose rather than
   * the arrow keys — a tablet then shows the entry's inspector.
   */
  onItemClick?: (columnIndex: number, key: string) => void;
  /** Enter or a double click. */
  onOpen?: (columnIndex: number, key: string) => void;
  /** F2. */
  onRename?: (columnIndex: number, key: string) => void;
  /** Delete or Backspace. */
  onDelete?: (columnIndex: number, key: string) => void;
  /** Only the last column, the full width (a phone). */
  single?: boolean;
  className?: string;
}

const itemsOf = (column: BrowserColumn) =>
  column.groups.flatMap((group) => group.items);

/**
 * Folders in columns, as a file manager shows them (decision 0024): each
 * column lists what is selected in the one before, so the path from a class
 * to a plan stands on screen at once. Every column is a listbox whose
 * selection follows the focus — ↑/↓ choose, Home/End jump, → goes into a
 * folder, ← back out of it, Enter opens, F2 renames, Delete removes — and Tab
 * goes from column to column. There is no type-to-find: a single key is a
 * shortcut elsewhere, and class names start with digits ("7b").
 *
 * The row of the item the inspector shows — the deepest one selected — sits
 * on paper with a blue bar at its edge, as an opened student does; the rows
 * on the path to it are sunken.
 */
export default function ColumnBrowser({
  columns,
  onSelect,
  onItemClick,
  onOpen,
  onRename,
  onDelete,
  single = false,
  className = '',
}: ColumnBrowserProps) {
  const optionRefs = React.useRef(new Map<string, HTMLDivElement>());
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const idPrefix = React.useId();

  const currentColumnIndex = columns.reduce(
    (deepest, column, index) => (column.selectedKey ? index : deepest),
    -1,
  );
  const shownColumns = single
    ? columns.slice(-1).map((column) => ({
        column,
        index: columns.length - 1,
      }))
    : columns.map((column, index) => ({ column, index }));

  // A column that appears is brought into view, as the next step of the path.
  const columnCount = columns.length;
  React.useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || single) return;
    scroller.scrollTo?.({ left: scroller.scrollWidth, behavior: 'smooth' });
  }, [columnCount, single]);

  const focusItem = (key: string) => {
    const element = optionRefs.current.get(key);
    element?.focus();
    element?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    columnIndex: number,
    key: string,
  ) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const column = columns[columnIndex];
    const items = itemsOf(column);
    const position = items.findIndex((item) => item.key === key);
    const choose = (index: number) => {
      const target = items[index];
      if (!target) return;
      onSelect(columnIndex, target.key);
      focusItem(target.key);
    };

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        choose(Math.min(position + 1, items.length - 1));
        return;
      case 'ArrowUp':
        event.preventDefault();
        choose(Math.max(position - 1, 0));
        return;
      case 'Home':
        event.preventDefault();
        choose(0);
        return;
      case 'End':
        event.preventDefault();
        choose(items.length - 1);
        return;
      case 'ArrowRight': {
        const next = columns[columnIndex + 1];
        if (!items[position]?.isFolder || !next) return;
        event.preventDefault();
        const nextItems = itemsOf(next);
        const target =
          nextItems.find((item) => item.key === next.selectedKey) ??
          nextItems[0];
        if (!target) return;
        if (next.selectedKey !== target.key) {
          onSelect(columnIndex + 1, target.key);
        }
        focusItem(target.key);
        return;
      }
      case 'ArrowLeft': {
        const previous = columns[columnIndex - 1];
        if (!previous?.selectedKey) return;
        event.preventDefault();
        // The column left keeps its place in the path: choosing its folder
        // again keeps this column on screen.
        onSelect(columnIndex - 1, previous.selectedKey);
        focusItem(previous.selectedKey);
        return;
      }
      case 'Enter':
        if (!onOpen) return;
        event.preventDefault();
        onOpen(columnIndex, key);
        return;
      case 'F2':
        if (!onRename) return;
        event.preventDefault();
        onRename(columnIndex, key);
        return;
      case 'Delete':
      case 'Backspace':
        if (!onDelete) return;
        event.preventDefault();
        onDelete(columnIndex, key);
        return;
      default:
    }
  };

  return (
    <div
      ref={scrollerRef}
      className={`flex min-h-0 overflow-x-auto ${className}`}
    >
      {shownColumns.map(({ column, index: columnIndex }) => {
        const items = itemsOf(column);
        // One option per column takes the Tab key: the chosen one, or the
        // first while none is.
        const tabbableKey =
          items.find((item) => item.key === column.selectedKey)?.key ??
          items[0]?.key;
        return (
          <div
            key={column.key}
            className={`flex min-h-0 flex-col border-r border-(--border-card) last:border-r-0 ${
              single ? 'w-full' : 'w-64 shrink-0'
            }`}
          >
            {items.length === 0 && column.emptyText && (
              <p className="px-4 py-6 text-center text-sm text-(--text-muted)">
                {column.emptyText}
              </p>
            )}
            <div
              role="listbox"
              aria-label={column.label}
              aria-orientation="vertical"
              className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto py-1"
            >
              {column.groups.map((group, groupIndex) =>
                group.items.length === 0 ? null : (
                  <div
                    key={group.key}
                    role="group"
                    aria-label={group.label}
                    className={
                      groupIndex > 0
                        ? 'mt-1 border-t border-(--border-card) pt-1'
                        : undefined
                    }
                  >
                    {group.label && (
                      <div
                        aria-hidden="true"
                        className="px-4 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-(--text-muted) uppercase"
                      >
                        {group.label}
                      </div>
                    )}
                    {group.items.map((item) => {
                      const selected = item.key === column.selectedKey;
                      const current =
                        selected && columnIndex === currentColumnIndex;
                      return (
                        <div
                          key={item.key}
                          id={`${idPrefix}-${item.key}`}
                          ref={(node) => {
                            if (node) optionRefs.current.set(item.key, node);
                            else optionRefs.current.delete(item.key);
                          }}
                          role="option"
                          aria-selected={selected}
                          tabIndex={item.key === tabbableKey ? 0 : -1}
                          onClick={() => {
                            onSelect(columnIndex, item.key);
                            focusItem(item.key);
                            onItemClick?.(columnIndex, item.key);
                          }}
                          onDoubleClick={() => onOpen?.(columnIndex, item.key)}
                          onKeyDown={(event) =>
                            handleKeyDown(event, columnIndex, item.key)
                          }
                          className={`relative mx-1 flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-3 py-1.5 text-sm outline-none select-none hover:bg-(--surface-sunken) focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) pointer-coarse:min-h-11 ${
                            selected ? 'bg-(--surface-sunken)' : ''
                          }`}
                        >
                          {current && (
                            <span
                              aria-hidden="true"
                              className="absolute inset-y-1 left-0 w-1 rounded-full bg-(--border-option-selected)"
                            />
                          )}
                          {item.leading && (
                            <span
                              aria-hidden="true"
                              className="flex shrink-0 items-center text-(--text-muted)"
                            >
                              {item.leading}
                            </span>
                          )}
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-(--text-page)">
                              {item.label}
                            </span>
                            {item.meta && (
                              <span className="truncate text-xs text-(--text-muted) tabular-nums">
                                {item.meta}
                              </span>
                            )}
                          </span>
                          {item.badges}
                          {item.isFolder && (
                            <CaretRightIcon
                              size={14}
                              aria-hidden="true"
                              className="shrink-0 text-(--text-muted)"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ),
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
