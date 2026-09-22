// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { HandHeartIcon } from '@phosphor-icons/react';
import FloatingDropdown from '@/components/students/FloatingDropdown';
import { LocalizedLink } from '@/components/LocalizedLink';
import { APP_RETURN_STATE } from '@/hooks/useReturnToApp';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { useDialogLayer } from '@/hooks/ui/useDialogLayer';

/**
 * One entry, in the two densities the rail has. Paper and one accent: an entry
 * is a row of the toolbar, not a card of its own — the round, bordered,
 * shadowed buttons it replaces made a toolbar of eight tools look like eight
 * separate panels.
 */
const entryStateClass = (active: boolean, disabled: boolean) =>
  [
    active
      ? 'bg-(--surface-option-selected) text-(--text-badge)'
      : 'text-(--text-page) hover:bg-(--surface-sunken)',
    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
    'transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)',
  ].join(' ');

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
  const isCompact = density === 'compact';

  return (
    <DensityContext.Provider value={density}>
      <div
        className={`flex min-h-0 flex-1 flex-col ${isCompact ? 'items-center' : ''}`}
      >
        {/* The layer's own tools. The column grows with them rather than
            shrinking below them, so on a short window the rail scrolls
            instead of drawing the last entry over the support link. */}
        <div
          className={
            isCompact
              ? 'flex flex-1 flex-col items-center gap-1'
              : 'flex flex-1 flex-col gap-2'
          }
        >
          {children}
        </div>
        <ToolRailSupport />
      </div>
    </DensityContext.Provider>
  );
}

/**
 * The last entry of every rail, on every layer and on the export page: the
 * way to support the project. It belongs to no layer, so no layer's panel
 * lists it — the rail itself closes with it, under the tools, where it never
 * takes the place of one.
 */
function ToolRailSupport() {
  const { t } = useTranslation('common');
  const isCompact = React.useContext(DensityContext) === 'compact';
  const label = t('nav.support');

  return (
    <div
      className={
        isCompact
          ? 'mt-1 flex flex-col items-center'
          : 'mt-2 border-t border-(--border-card) pt-2'
      }
    >
      {isCompact && (
        <div aria-hidden="true" className="mb-1 h-px w-7 bg-(--border-card)" />
      )}
      <LocalizedLink
        to="/support"
        state={APP_RETURN_STATE}
        title={t('nav.titles.support')}
        aria-label={isCompact ? label : undefined}
        className={
          isCompact
            ? `inline-flex size-11 shrink-0 items-center justify-center rounded-lg ${entryStateClass(false, false)}`
            : `flex h-9 w-full items-center gap-2.5 rounded-lg px-2 text-left text-[13px] ${entryStateClass(false, false)}`
        }
      >
        <span className="shrink-0 text-(--text-muted)" aria-hidden="true">
          <HandHeartIcon size={18} />
        </span>
        {!isCompact && <span className="min-w-0 flex-1 truncate">{label}</span>}
      </LocalizedLink>
    </div>
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

  // The groups are told apart by a hairline, not by a gap — the rail is one
  // column of tools, and `first:` keeps the line off the top of it.
  if (density === 'compact') {
    return (
      <>
        <div
          aria-hidden="true"
          className={`h-px w-7 bg-(--border-card) first:hidden ${
            atEnd ? 'mt-auto mb-1' : 'my-1'
          }`}
        />
        {children}
      </>
    );
  }

  return (
    <section
      className={`border-t border-(--border-card) pt-2 first:border-t-0 first:pt-0 ${
        atEnd ? 'mt-auto' : ''
      }`}
    >
      <h3 className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-(--text-muted) uppercase">
        {title}
      </h3>
      <div className="flex flex-col gap-0.5">{children}</div>
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
   * For an entry that is dragged onto the stage rather than pressed — the
   * table templates and the room elements. Turns the entry into a drag source.
   */
  onPointerDown?: (event: React.PointerEvent<HTMLButtonElement>) => void;
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
  onPointerDown,
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
      onPointerDown={onPointerDown}
      // A drag must not scroll the rail under the finger.
      style={onPointerDown ? { touchAction: 'none' } : undefined}
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
          ? `relative inline-flex size-11 shrink-0 select-none items-center justify-center rounded-lg [-webkit-touch-callout:none] ${entryStateClass(
              active,
              disabled,
            )} ${onPointerDown && !disabled ? 'cursor-grab active:cursor-grabbing' : ''}`
          : `flex h-9 w-full items-center gap-2.5 rounded-lg px-2 text-left text-[13px] ${entryStateClass(
              active,
              disabled,
            )} ${onPointerDown && !disabled ? 'cursor-grab active:cursor-grabbing' : ''}`
      }
    >
      {/* The icon carries the active state a second time, so the row is not
          told apart by its background alone. */}
      <span
        className={`shrink-0 ${active ? 'text-(--text-badge)' : 'text-(--text-muted)'}`}
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
