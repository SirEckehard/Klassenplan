// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  BooksIcon,
  CaretDownIcon,
  CaretLeftIcon,
  CheckIcon,
} from '@phosphor-icons/react';
import { menuItemClass, menuSurfaceClass } from '@/utils';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { usePopoverFocus } from '@/hooks/ui/usePopoverFocus';
import FloatingDropdown from '@/components/students/FloatingDropdown';
import type { BrowserColumn } from '@/components/library/ColumnBrowser';

const headButtonClass =
  'flex h-9 min-w-0 cursor-pointer items-center gap-1 rounded-md px-2 text-sm hover:bg-(--surface-sunken) hover:text-(--text-page) focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:outline-none pointer-coarse:h-11';

/**
 * The way up in "Bibliothek" where its columns do not all fit — a phone, an
 * iPad in portrait —, as a phone's file manager has it above its list: on the
 * left the folder one step up, named, on the right where the last column
 * stands, which opens the whole path as a menu. It takes the place the status
 * bar's path has from `lg` up, where the bar has the room for it.
 *
 * Each step is a column: choosing one cuts the path back so that column is
 * the last, as a step of the bar's path does.
 */
export default function LibraryPathHead({
  columns,
  firstShown,
  rootLabel,
  onReveal,
}: {
  columns: BrowserColumn[];
  /** The first column on screen; the ones before it are left out. */
  firstShown: number;
  /** What the first column is called here: "Bibliothek". */
  rootLabel: string;
  onReveal: (columnIndex: number) => void;
}) {
  const { t } = useTranslation('generator');
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const outsideRefs = React.useMemo(() => [anchorRef, contentRef], []);
  const close = React.useCallback(() => setOpen(false), []);
  useClickOutside(outsideRefs, close, open);
  usePopoverFocus({
    open,
    contentRef,
    anchorRef: triggerRef,
    onClose: close,
    initialFocusSelector: '[aria-current="location"]',
  });

  // A column is named by the folder it lists, and wears that folder's icon.
  const steps = columns.map((column, index) => {
    const folder =
      index > 0
        ? columns[index - 1].groups
            .flatMap((group) => group.items)
            .find((item) => item.key === columns[index - 1].selectedKey)
        : undefined;
    return {
      index,
      label: index === 0 ? rootLabel : column.label,
      leading: index === 0 ? <BooksIcon size={16} /> : folder?.leading,
    };
  });
  const up = steps[firstShown - 1];
  const here = steps[steps.length - 1];
  if (!up || !here) return null;

  const choose = (index: number) => {
    setOpen(false);
    if (index !== here.index) onReveal(index);
    else triggerRef.current?.focus();
  };
  const upName = t('library.up', { name: up.label });
  const menuName = t('library.pathMenu', { name: here.label });

  return (
    <nav
      aria-label={t('library.path')}
      className="flex shrink-0 items-center gap-1 border-b border-(--border-card) p-1"
    >
      <button
        type="button"
        // One step up: the column before the first on screen comes in, and
        // the last one goes — on a tablet the pair moves by one.
        onClick={() => onReveal(here.index - 1)}
        aria-label={upName}
        title={upName}
        className={`${headButtonClass} max-w-1/2 text-(--text-muted)`}
      >
        <CaretLeftIcon size={16} aria-hidden="true" className="shrink-0" />
        <span className="truncate">{up.label}</span>
      </button>
      <div ref={anchorRef} className="ml-auto flex min-w-0">
        <button
          type="button"
          ref={triggerRef}
          onClick={() => setOpen((previous) => !previous)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={menuName}
          title={menuName}
          className={`${headButtonClass} font-medium text-(--text-page)`}
        >
          <span className="truncate">{here.label}</span>
          <CaretDownIcon
            size={12}
            aria-hidden="true"
            className="shrink-0 text-(--text-muted)"
          />
        </button>
      </div>
      {open && (
        <FloatingDropdown
          anchorRef={anchorRef}
          align="right"
          portalRef={contentRef}
          className="z-50"
        >
          <div
            role="dialog"
            aria-label={t('library.path')}
            className={`${menuSurfaceClass} max-h-[70dvh] min-w-56 overflow-y-auto`}
          >
            {steps.map((step) => {
              const current = step.index === here.index;
              return (
                <button
                  key={columns[step.index].key}
                  type="button"
                  onClick={() => choose(step.index)}
                  aria-current={current ? 'location' : undefined}
                  className={menuItemClass}
                >
                  {step.leading && (
                    <span
                      aria-hidden="true"
                      className="flex shrink-0 items-center text-(--text-muted)"
                    >
                      {step.leading}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate">{step.label}</span>
                  {current && (
                    <CheckIcon
                      size={14}
                      weight="bold"
                      aria-hidden="true"
                      className="shrink-0 text-(--button-primary-bg)"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </FloatingDropdown>
      )}
    </nav>
  );
}
