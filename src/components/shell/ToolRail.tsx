// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArchiveIcon,
  ClockCounterClockwiseIcon,
  DownloadIcon,
  GameControllerIcon,
  HandHeartIcon,
  HandPointingIcon,
  MagnifyingGlassIcon,
  ToolboxIcon,
  UploadIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react';
import FloatingDropdown from '@/components/students/FloatingDropdown';
import { LocalizedLink } from '@/components/LocalizedLink';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';
import { useStorageHistoryModal } from '@/components/ui/navigation/useStorageHistoryModal';
import { useSeatingPlanActions } from '@/contexts/SeatingPlanContext';
import { APP_RETURN_STATE } from '@/hooks/useReturnToApp';
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { useDialogLayer } from '@/hooks/ui/useDialogLayer';
import { logError, menuItemClass, menuSurfaceClass } from '@/utils';

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
 * The toolbar of a layer, in two parts.
 *
 * On top, what this layer can do, in an order no layer changes: the view on
 * the stage, what can be added to it, what it shows, and managing. A layer
 * leaves out a group it has nothing for, but never moves one — the switch
 * between list and relations sits where the switch between table plan and
 * circle does, and the view settings of the room where the plan keeps its own.
 *
 * At the foot, what every layer shares: the class tools, the plans and their
 * history, the backup and the way to support the project. The rail draws that
 * part itself (`ToolRailFoot`), so no layer can leave it out or reorder it.
 *
 * The two densities are the expanded sidebar and its rail; both show the same
 * entries in the same order, so collapsing it costs reach, never function.
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
      <div className="flex min-h-0 flex-1 flex-col">
        {/* The layer's own tools. On a window too short for all of them they
            scroll here, under a foot that stays in view: the room's tables
            and elements alone fill a laptop's height, and what every layer
            shares has to be in reach there too. The negative margins reach
            into the sidebar's padding, so the scroll edge clips no focus
            ring. */}
        <div
          className={`-mx-2 -mt-3 min-h-0 flex-1 overflow-y-auto px-2 pt-3 pb-1 ${
            isCompact
              ? 'flex flex-col items-center gap-1'
              : 'flex flex-col gap-2'
          }`}
        >
          {children}
        </div>
        <ToolRailFoot />
      </div>
    </DensityContext.Provider>
  );
}

/** A menu the foot opens: rows of icon and word on the menu surface. */
const footMenuClass = `${menuSurfaceClass} p-1`;
const footMenuIconClass = 'h-4 w-4 shrink-0 text-(--text-muted)';

/**
 * The foot every rail ends with, on every layer and on the export page.
 *
 * None of it belongs to a layer: a teacher calls on somebody, looks up an
 * earlier plan or saves a backup from wherever they are, so these entries sit
 * in the same place on every layer rather than on the one they were first
 * built for. The class tools stay routes of their own (decision 0019) — what
 * they share is the way in, one menu instead of an entry per tool.
 */
function ToolRailFoot() {
  const { t } = useTranslation(['generator', 'pages']);
  const isCompact = React.useContext(DensityContext) === 'compact';
  const navigate = useLocalizedNavigate();
  const { handleExportAll, triggerImport } = useSeatingPlanActions();
  const history = useStorageHistoryModal();

  const classTools = [
    {
      route: '/wer-kommt-dran',
      Icon: HandPointingIcon,
      label: t('generator:tools.whoIsNext.title'),
    },
    {
      route: '/wo-sitzt-wer',
      Icon: MagnifyingGlassIcon,
      label: t('generator:tools.seatFinder.title'),
    },
    {
      route: '/gruppen',
      Icon: UsersThreeIcon,
      label: t('generator:tools.groups.title'),
    },
    {
      route: '/namensspiel',
      Icon: GameControllerIcon,
      label: t('pages:nameGame.title'),
    },
  ];

  return (
    <div
      className={
        isCompact
          ? 'flex shrink-0 flex-col items-center gap-1'
          : 'flex shrink-0 flex-col gap-0.5 border-t border-(--border-card) pt-2'
      }
    >
      {isCompact && (
        <div aria-hidden="true" className="mb-1 h-px w-7 bg-(--border-card)" />
      )}
      {/* Each tool opens its own page and explains there what it still
          needs — a plan, names, photos — so none of them is held back here. */}
      <ToolRailButton
        icon={<ToolboxIcon size={18} />}
        label={t('generator:toolRail.classTools')}
        panel={(close) => (
          <div className={footMenuClass}>
            {classTools.map(({ route, Icon, label }) => (
              <button
                key={route}
                type="button"
                onClick={() => {
                  close();
                  navigate(route);
                }}
                className={menuItemClass}
              >
                <Icon className={footMenuIconClass} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        )}
      />
      <ToolRailButton
        icon={<ClockCounterClockwiseIcon size={18} />}
        label={t('generator:storage.historyTitle')}
        opensDialog
        onClick={history.show}
      />
      {/* The data lives in this browser only; both ways a backup travels
          sit behind one entry. */}
      <ToolRailButton
        icon={<ArchiveIcon size={18} />}
        label={t('generator:storage.backup')}
        data-tour={TOUR_ANCHORS.backup}
        panel={(close) => (
          <div className={footMenuClass}>
            <button
              type="button"
              onClick={() => {
                close();
                // The success toast is fired by the export itself, once the
                // password has been confirmed and the file has been written.
                handleExportAll().catch((error: unknown) => {
                  logError('Backup export failed', { error }, 'ToolRail');
                });
              }}
              className={menuItemClass}
            >
              <DownloadIcon className={footMenuIconClass} aria-hidden="true" />
              {t('generator:storage.exportBackup')}
            </button>
            <button
              type="button"
              onClick={() => {
                close();
                triggerImport();
              }}
              className={menuItemClass}
            >
              <UploadIcon className={footMenuIconClass} aria-hidden="true" />
              {t('generator:storage.importBackup')}
            </button>
          </div>
        )}
      />
      <ToolRailSupport />
      {history.modal}
    </div>
  );
}

/**
 * The last entry of the foot: the way to support the project. It belongs to
 * no layer and never takes the place of a tool.
 */
function ToolRailSupport() {
  const { t } = useTranslation('common');
  const isCompact = React.useContext(DensityContext) === 'compact';
  const label = t('nav.support');

  return (
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
  );
}

/** One section of the layer's own part. */
export function ToolRailGroup({
  title,
  children,
  'data-tour': dataTour,
}: {
  title: string;
  children: React.ReactNode;
  /**
   * For a tour mark that explains the group as a whole — the switch between
   * table plan and circle, the view settings — rather than one entry of it.
   */
  'data-tour'?: string;
}) {
  const density = React.useContext(DensityContext);

  // The groups are told apart by a hairline, not by a gap — the rail is one
  // column of tools, and `first:` keeps the line off the top of it. The
  // entries share a box of their own, so a tour mark can frame all of them.
  if (density === 'compact') {
    return (
      <>
        <div
          aria-hidden="true"
          className="my-1 h-px w-7 bg-(--border-card) first:hidden"
        />
        <div data-tour={dataTour} className="flex flex-col items-center gap-1">
          {children}
        </div>
      </>
    );
  }

  return (
    <section
      data-tour={dataTour}
      className="border-t border-(--border-card) pt-2 first:border-t-0 first:pt-0"
    >
      <h3 className="px-2 pb-1 text-[11px] font-semibold tracking-wider text-(--text-muted) uppercase">
        {title}
      </h3>
      <div className="flex flex-col gap-0.5">{children}</div>
    </section>
  );
}

/**
 * A hairline inside a group, between two kinds of one thing — the tables and
 * the room elements under "Hinzufügen". Shorter than the line between groups,
 * so it does not read as a group of its own.
 */
export function ToolRailDivider() {
  const isCompact = React.useContext(DensityContext) === 'compact';

  return (
    <div
      aria-hidden="true"
      className={
        isCompact
          ? 'my-1 h-px w-4 bg-(--border-card)'
          : 'mx-2 my-1 h-px bg-(--border-card)'
      }
    />
  );
}

type ToolRailButtonProps = {
  icon: React.ReactNode;
  label: string;
  /** Tooltip; defaults to the label, which is all the rail can show. */
  title?: string;
  /**
   * Marks the entry as the view currently on screen. Only an entry that
   * switches a view passes it; an action announces no pressed state.
   */
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  /** The entry opens a dialog of its own rather than a panel of the rail. */
  opensDialog?: boolean;
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
  active,
  disabled = false,
  onClick,
  opensDialog = false,
  onPointerDown,
  panel,
  'data-tour': dataTour,
}: ToolRailButtonProps) {
  const density = React.useContext(DensityContext);
  const isCompact = density === 'compact';
  const isActive = active === true;
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
      aria-pressed={
        onClick && !panel && active !== undefined ? active : undefined
      }
      aria-haspopup={panel || opensDialog ? 'dialog' : undefined}
      aria-expanded={panel ? open : undefined}
      className={
        isCompact
          ? `relative inline-flex size-11 shrink-0 select-none items-center justify-center rounded-lg [-webkit-touch-callout:none] ${entryStateClass(
              isActive,
              disabled,
            )} ${onPointerDown && !disabled ? 'cursor-grab active:cursor-grabbing' : ''}`
          : `flex h-9 w-full items-center gap-2.5 rounded-lg px-2 text-left text-[13px] ${entryStateClass(
              isActive,
              disabled,
            )} ${onPointerDown && !disabled ? 'cursor-grab active:cursor-grabbing' : ''}`
      }
    >
      {/* The icon carries the active state a second time, so the row is not
          told apart by its background alone. */}
      <span
        className={`shrink-0 ${isActive ? 'text-(--text-badge)' : 'text-(--text-muted)'}`}
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
