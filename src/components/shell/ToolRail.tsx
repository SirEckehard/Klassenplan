// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import FloatingDropdown from '@/components/students/FloatingDropdown';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { useDialogLayer } from '@/hooks/ui/useDialogLayer';
import {
  getSidebarIconClasses,
  getSidebarSurfaceClasses,
  sidebarRailButtonClass,
} from '@/utils';

/**
 * The toolbar of a layer: what this layer lets you insert, look at and manage.
 *
 * Every layer fills it differently, but never in a different order — insert on
 * top, look at in the middle, manage at the bottom. A teacher who has learnt
 * where "add" sits on the class layer finds "add a table" in the same place in
 * the room. The two densities are the expanded sidebar and its rail; both show
 * the same entries in the same order, so collapsing it costs reach, never
 * function.
 */
export type ToolRailDensity = 'comfortable' | 'compact';

const DensityContext = React.createContext<ToolRailDensity>('comfortable');

/**
 * The open panel of an entry. Its own component so the `close` it hands down
 * is an ordinary prop here rather than a ref read while the rail renders.
 */
function ToolRailPanel({
  label,
  close,
  render,
}: {
  label: string;
  close: () => void;
  render: (close: () => void) => React.ReactNode;
}) {
  return (
    <div role="dialog" aria-label={label} className="w-72">
      {render(close)}
    </div>
  );
}

export function ToolRail({
  density,
  children,
}: {
  density: ToolRailDensity;
  children: React.ReactNode;
}) {
  return (
    <DensityContext.Provider value={density}>
      <div
        className={
          density === 'compact'
            ? 'flex flex-col items-center gap-1 px-1'
            : 'flex flex-col gap-5 pb-2'
        }
      >
        {children}
      </div>
    </DensityContext.Provider>
  );
}

/**
 * One section. `atEnd` pushes it to the bottom of the rail — that is where
 * managing lives: saving, exporting, the side trips.
 */
export function ToolRailGroup({
  title,
  atEnd = false,
  children,
}: {
  title: string;
  atEnd?: boolean;
  children: React.ReactNode;
}) {
  const density = React.useContext(DensityContext);

  if (density === 'compact') {
    return (
      <>
        <div
          aria-hidden="true"
          className={`h-px w-8 bg-(--border-card) ${atEnd ? 'mt-auto mb-1' : 'my-1'}`}
        />
        {children}
      </>
    );
  }

  return (
    <section className={atEnd ? 'mt-auto' : undefined}>
      <h3 className="px-1 text-[11px] font-semibold tracking-wider text-(--text-muted) uppercase">
        {title}
      </h3>
      <div className="mt-2 flex flex-col gap-1">{children}</div>
    </section>
  );
}

type ToolRailButtonProps = {
  icon: React.ReactNode;
  label: string;
  /** Tooltip; defaults to the label, which is all the rail can show. */
  title?: string;
  /** Marks the entry as the view currently on screen. */
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  /**
   * A panel the entry opens instead of acting straight away — a name to type,
   * a number of placeholders, a set of switches. Receives a `close` it can
   * call once its job is done.
   */
  panel?: (close: () => void) => React.ReactNode;
  'data-tour'?: string;
};

/**
 * One entry: an icon plus a word, or on the rail the icon alone with the word
 * as its tooltip and accessible name.
 */
export function ToolRailButton({
  icon,
  label,
  title,
  active = false,
  disabled = false,
  onClick,
  panel,
  'data-tour': dataTour,
}: ToolRailButtonProps) {
  const density = React.useContext(DensityContext);
  const isCompact = density === 'compact';
  const anchorRef = React.useRef<HTMLButtonElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = React.useState(false);

  useDialogLayer(open);
  useClickOutside([containerRef, contentRef], () => setOpen(false), open);

  const close = React.useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) anchorRef.current?.focus();
  }, []);
  // The panel closes itself once its job is done; focus stays where the
  // pointer left it rather than jumping back to the rail.
  const closeFromPanel = React.useCallback(() => close(false), [close]);

  // The panel owns Escape while it is up, so the view underneath does not also
  // act on it (the class list would drop its selection).
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      close();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [close, open]);

  const button = (
    <button
      type="button"
      ref={anchorRef}
      data-tour={dataTour}
      disabled={disabled}
      onClick={() => {
        if (panel) {
          setOpen((previous) => !previous);
          return;
        }
        onClick?.();
      }}
      title={title ?? label}
      aria-label={isCompact ? label : undefined}
      aria-pressed={onClick && !panel ? active : undefined}
      aria-haspopup={panel ? 'dialog' : undefined}
      aria-expanded={panel ? open : undefined}
      className={
        isCompact
          ? `${sidebarRailButtonClass} ${getSidebarSurfaceClasses({
              variant: 'collapsed',
              isActive: active,
              disabled,
            })}`
          : `flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition ${
              active
                ? 'bg-(--surface-option-selected) font-semibold text-(--text-badge)'
                : 'text-(--text-page) hover:bg-(--surface-sunken)'
            } ${
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)`
      }
    >
      <span
        className={
          isCompact
            ? getSidebarIconClasses({ isActive: active, disabled })
            : 'shrink-0 text-(--text-muted)'
        }
        aria-hidden="true"
      >
        {icon}
      </span>
      {!isCompact && <span className="min-w-0 flex-1 truncate">{label}</span>}
    </button>
  );

  if (!panel) return button;

  return (
    <div className="relative" ref={containerRef}>
      {button}
      {open && (
        <FloatingDropdown
          anchorRef={anchorRef}
          align="left"
          portalRef={contentRef}
        >
          <ToolRailPanel label={label} close={closeFromPanel} render={panel} />
        </FloatingDropdown>
      )}
    </div>
  );
}
