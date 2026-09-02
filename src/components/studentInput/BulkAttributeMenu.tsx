// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CaretDownIcon } from '@phosphor-icons/react';
import { menuSurfaceClass, secondaryButtonClass } from '@/utils';
import FloatingDropdown from '@/components/students/FloatingDropdown';
import { useClickOutside } from '@/hooks/ui/useClickOutside';

export interface BulkAttributeOption<TValue extends string> {
  value: TValue;
  label: string;
}

interface BulkAttributeMenuProps<TValue extends string> {
  /** Visible on the closed trigger, e.g. "Geschlecht". */
  label: string;
  /** Accessible name of the trigger, e.g. "Geschlecht setzen". */
  actionLabel: string;
  options: BulkAttributeOption<TValue>[];
  /** `null` clears the attribute for the whole selection. */
  onSelect: (value: TValue | null) => void;
}

/**
 * One attribute of the bulk bar as a menu button.
 *
 * A native `<select>` is as wide as its longest *option*, not its label — with
 * four of them the bar could not fit on a 1280px layout and the flag chips
 * wrapped. A trigger button is as wide as its label, which buys back ~85px, and
 * it keeps its 14px type on touch devices where `index.css` bumps form controls
 * to 16px.
 *
 * The menu carries `role="menu"`, which parks the global Escape shortcut in
 * `StudentInput` (it would otherwise drop the whole selection); closing on
 * Escape is therefore this component's job.
 */
export default function BulkAttributeMenu<TValue extends string>({
  label,
  actionLabel,
  options,
  onSelect,
}: BulkAttributeMenuProps<TValue>) {
  const { t } = useTranslation('students');
  const anchorRef = React.useRef<HTMLButtonElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = React.useState(false);
  // Set when the menu was opened from the keyboard: the portal only mounts a
  // frame later, so the item to focus has to be remembered until it exists.
  const [pendingFocus, setPendingFocus] = React.useState<
    'first' | 'last' | null
  >(null);

  useClickOutside([containerRef, contentRef], () => setOpen(false), open);

  const menuItems = React.useCallback(
    () =>
      Array.from(
        contentRef.current?.querySelectorAll<HTMLButtonElement>(
          '[role="menuitem"]',
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
      const items = menuItems();
      if (items.length === 0) {
        return;
      }
      (pendingFocus === 'last' ? items[items.length - 1] : items[0]).focus();
      setPendingFocus(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [open, pendingFocus, menuItems]);

  const handleTriggerKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    event.preventDefault();
    const target = event.key === 'ArrowUp' ? 'last' : 'first';
    if (!open) {
      setOpen(true);
    }
    setPendingFocus(target);
  };

  // Escape closes from anywhere in the menu — including the trigger, which
  // keeps focus when the menu was opened by mouse.
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

  const handleMenuKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Tab') {
      close(false);
      return;
    }

    const items = menuItems();
    if (items.length === 0) {
      return;
    }
    const current = items.indexOf(document.activeElement as HTMLButtonElement);

    const next = (() => {
      switch (event.key) {
        case 'ArrowDown':
          return items[(current + 1) % items.length];
        case 'ArrowUp':
          return items[(current - 1 + items.length) % items.length];
        case 'Home':
          return items[0];
        case 'End':
          return items[items.length - 1];
        default:
          return null;
      }
    })();

    if (next) {
      event.preventDefault();
      next.focus();
    }
  };

  const choose = (value: TValue | null) => {
    onSelect(value);
    close();
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        ref={anchorRef}
        onClick={() => setOpen((previous) => !previous)}
        onKeyDown={handleTriggerKeyDown}
        className={`${secondaryButtonClass} h-9 gap-1.5 px-3! font-normal`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={actionLabel}
      >
        {label}
        <CaretDownIcon size={14} aria-hidden className="shrink-0" />
      </button>

      {open && (
        <FloatingDropdown
          anchorRef={anchorRef}
          align="left"
          portalRef={contentRef}
        >
          <div
            role="menu"
            aria-label={actionLabel}
            onKeyDown={handleMenuKeyDown}
            className={`${menuSurfaceClass} flex flex-col p-1`}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="menuitem"
                className={menuItemClass}
                onClick={() => choose(option.value)}
              >
                {option.label}
              </button>
            ))}
            <div
              className="my-1 h-px bg-gray-200 dark:bg-gray-700"
              role="separator"
            />
            {/* Same escape hatch the select's clear option was: an attribute
                set by mistake comes off the way it went on. */}
            <button
              type="button"
              role="menuitem"
              className={`${menuItemClass} text-gray-500 dark:text-gray-400`}
              onClick={() => choose(null)}
            >
              {t('bulkEdit.clearValue', '— entfernen —')}
            </button>
          </div>
        </FloatingDropdown>
      )}
    </div>
  );
}

const menuItemClass =
  'w-full cursor-pointer whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:text-gray-100 dark:hover:bg-gray-800';
