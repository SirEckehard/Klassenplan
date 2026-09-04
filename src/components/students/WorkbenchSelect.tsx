// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';
import { menuSurfaceClass } from '@/utils';
import {
  workbenchCaretClass,
  workbenchPillClass,
} from './classWorkbenchTokens';
import FloatingDropdown from './FloatingDropdown';
import { useClickOutside } from '@/hooks/ui/useClickOutside';

export type WorkbenchSelectOption = {
  value: string;
  label: string;
};

type Props = {
  /** Accessible name of the control, e.g. "Nach Merkmal filtern". */
  label: string;
  value: string;
  options: WorkbenchSelectOption[];
  onChange: (value: string) => void;
  /** Width utility for the trigger, e.g. `w-36`. */
  widthClass: string;
};

/**
 * A one-of-many choice in the class workbench row.
 *
 * A native `<select>` matches the row once it is closed, but the list it opens
 * is drawn by the operating system: a different surface, a different radius, a
 * different type scale and a check mark that belongs to nobody. Next to the
 * class switcher's own dropdown that reads as a foreign control, so the list is
 * ours too — same `menu-surface`, same rows, same active state.
 *
 * Only the workbench row uses this. Inside the selection mode's popover the
 * plain `<select>` stays: a second floating layer over the first would close it
 * (the popover treats a click outside its own DOM as "dismiss"), and a form
 * column reads as a form anyway.
 */
export default function WorkbenchSelect({
  label,
  value,
  options,
  onChange,
  widthClass,
}: Props) {
  const anchorRef = React.useRef<HTMLButtonElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = React.useState(false);
  // Set when the list was opened from the keyboard: the portal only mounts a
  // frame later, so the option to focus has to be remembered until it exists.
  const [pendingFocus, setPendingFocus] = React.useState<
    'selected' | 'first' | 'last' | null
  >(null);

  useClickOutside([containerRef, contentRef], () => setOpen(false), open);

  const optionNodes = React.useCallback(
    () =>
      Array.from(
        contentRef.current?.querySelectorAll<HTMLButtonElement>(
          '[role="option"]',
        ) ?? [],
      ),
    [],
  );

  const close = React.useCallback((restoreFocus = true) => {
    setOpen(false);
    setPendingFocus(null);
    if (restoreFocus) {
      anchorRef.current?.focus();
    }
  }, []);

  // One frame is enough: `FloatingDropdown` renders nothing until it has
  // measured the anchor, and that re-render lands before the next paint.
  React.useEffect(() => {
    if (!open || pendingFocus === null) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      const nodes = optionNodes();
      if (nodes.length === 0) {
        return;
      }
      const selectedIndex = options.findIndex((entry) => entry.value === value);
      const target =
        pendingFocus === 'last'
          ? nodes[nodes.length - 1]
          : pendingFocus === 'first'
            ? nodes[0]
            : (nodes[selectedIndex] ?? nodes[0]);
      target.focus();
      setPendingFocus(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [open, pendingFocus, optionNodes, options, value]);

  // Escape closes from anywhere in the list — including the trigger, which
  // keeps focus when the list was opened by mouse.
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

  const handleTriggerKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    event.preventDefault();
    if (!open) {
      setOpen(true);
    }
    setPendingFocus(event.key === 'ArrowUp' ? 'last' : 'selected');
  };

  const handleListKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Tab') {
      close(false);
      return;
    }

    const nodes = optionNodes();
    if (nodes.length === 0) {
      return;
    }
    const current = nodes.indexOf(document.activeElement as HTMLButtonElement);

    const next = (() => {
      switch (event.key) {
        case 'ArrowDown':
          return nodes[(current + 1) % nodes.length];
        case 'ArrowUp':
          return nodes[(current - 1 + nodes.length) % nodes.length];
        case 'Home':
          return nodes[0];
        case 'End':
          return nodes[nodes.length - 1];
        default:
          return null;
      }
    })();

    if (next) {
      event.preventDefault();
      next.focus();
    }
  };

  const activeLabel =
    options.find((entry) => entry.value === value)?.label ?? label;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        ref={anchorRef}
        onClick={() => setOpen((previous) => !previous)}
        onKeyDown={handleTriggerKeyDown}
        className={`${workbenchPillClass} ${widthClass} inline-flex cursor-pointer items-center pr-9`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${activeLabel}`}
        title={label}
      >
        <span className="min-w-0 flex-1 truncate text-left">{activeLabel}</span>
        <CaretDownIcon size={14} aria-hidden className={workbenchCaretClass} />
      </button>

      {open && (
        <FloatingDropdown
          anchorRef={anchorRef}
          align="left"
          portalRef={contentRef}
        >
          <div
            role="listbox"
            aria-label={label}
            onKeyDown={handleListKeyDown}
            className={`${menuSurfaceClass} flex max-h-72 flex-col overflow-y-auto p-1`}
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={isSelected ? activeOptionClass : optionClass}
                  onClick={() => {
                    onChange(option.value);
                    close();
                  }}
                >
                  {/* The check keeps its space when absent, so the labels line
                      up whatever is selected. */}
                  <CheckIcon
                    size={14}
                    aria-hidden
                    className={`shrink-0 ${isSelected ? '' : 'invisible'}`}
                  />
                  {option.label}
                </button>
              );
            })}
          </div>
        </FloatingDropdown>
      )}
    </div>
  );
}

const optionClass =
  'flex w-full cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:text-gray-100 dark:hover:bg-gray-800';
const activeOptionClass =
  'flex w-full cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg bg-blue-50 px-3 py-2 text-left text-sm font-semibold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:bg-blue-950/40 dark:text-blue-200';
