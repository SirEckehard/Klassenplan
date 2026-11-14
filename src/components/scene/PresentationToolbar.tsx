// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowsInIcon,
  ArrowsOutIcon,
  BroomIcon,
  ChalkboardTeacherIcon,
  CircleDashedIcon,
  CornersInIcon,
  DoorOpenIcon,
  GridNineIcon,
  HandPointingIcon,
  ImageIcon,
  PaletteIcon,
  StudentIcon,
  SunIcon,
  UserCheckIcon,
  UserMinusIcon,
  UserSquareIcon,
  UsersThreeIcon,
  XIcon,
  type Icon,
} from '@phosphor-icons/react';
import {
  formatPercent,
  menuItemClass,
  menuSurfaceClass,
  type NameDisplayMode,
} from '@/utils';
import { MOTION_DURATION, MOTION_EASE, motionEnabled } from '@/utils/ui/motion';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { usePopoverFocus } from '@/hooks/ui/usePopoverFocus';
import type { PresentationPerspective } from '@/utils/ui/boardOrientation';
import type { SeatingMode } from '@/types/Circle';
import {
  NAME_DISPLAY_ICONS,
  nameDisplayLabelKey,
} from '@/components/SeatingPlanGenerator/canvas/nameDisplayGroup';

/**
 * The one bar of the projection: what is shown, what to do with it, how large.
 *
 * It floats over the plan and follows the theme — paper with a hairline in the
 * light one, ink in the dark one (`--present-bar-*`) — while the projection
 * belongs to the room. Everything on it is one press away; the plan itself
 * carries no controls at all.
 */

const barBaseClass =
  'inline-flex h-11 cursor-pointer items-center justify-center rounded-card border-0 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:ring-offset-2 focus-visible:ring-offset-(--present-bar-bg)';

/**
 * Every button carries its word under the icon. At the board no tooltip
 * explains an icon to a finger, and words beside the icons made the bar too
 * wide for one line even on a wide screen; under it, a button grows from 44
 * to about 60px.
 */
const barIconButtonClass = `${barBaseClass} min-w-14 shrink-0 flex-col gap-1 px-2 text-xs font-medium leading-none`;

const quietClass =
  'bg-(--present-bar-surface) text-(--present-bar-text) hover:bg-(--present-bar-surface-hover)';

/**
 * A view setting that is on reads as a selection, not as the solid blue —
 * that marks whose view is on the wall, the one choice the whole bar hangs on.
 */
const pressedClass =
  'bg-(--surface-option-selected) text-(--text-badge) ring-1 ring-inset ring-(--border-option-selected)';

const primaryClass = 'bg-(--button-primary-bg) text-(--button-primary-text)';

function BarSeparator() {
  return (
    <span
      aria-hidden="true"
      className="mx-1.5 h-7 w-px shrink-0 bg-(--present-bar-border)"
    />
  );
}

/** Two words, one of them true — the shape both of the bar's switches take. */
function BarSegment<T extends string>({
  label,
  value,
  options,
  onChange,
  primary = false,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{
    value: T;
    label: string;
    /** The word under the icon, where `label` is too long for it. */
    short?: string;
    title: string;
    icon: Icon;
  }>;
  onChange: (value: T) => void;
  /** The chosen option in solid blue rather than ink. */
  primary?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex shrink-0 items-center gap-0.5 rounded-card bg-(--present-bar-bg) p-0.5"
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            aria-label={option.label}
            title={option.title}
            className={`${barIconButtonClass} h-10 ${
              isActive
                ? primary
                  ? primaryClass
                  : 'bg-(--present-bar-text) text-(--present-bar-bg)'
                : 'bg-transparent text-(--present-bar-muted) hover:bg-(--present-bar-surface)'
            }`}
          >
            <option.icon size={18} aria-hidden />
            <span>{option.short ?? option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Something the plan shows or does not show: an icon and its word, pressed or not. */
function BarToggle({
  icon: ToggleIcon,
  label,
  title,
  pressed,
  onClick,
}: {
  icon: Icon;
  label: string;
  title: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={label}
      title={title}
      className={`${barIconButtonClass} ${pressed ? pressedClass : quietClass}`}
    >
      <ToggleIcon size={18} aria-hidden />
      <span>{label}</span>
    </button>
  );
}

/** A student missing today, as the bar's list names them. */
export type AbsentStudent = { id: string; name: string };

const NOBODY_ABSENT: readonly AbsentStudent[] = [];

type BarControlsProps = {
  perspective: PresentationPerspective;
  onPerspectiveChange: (perspective: PresentationPerspective) => void;
  mode: SeatingMode;
  onModeChange: (mode: SeatingMode) => void;
  /** Teacher view only, like the two toggles they switch. */
  isTeacher: boolean;
  showBadges: boolean;
  onToggleBadges: () => void;
  showPhotos: boolean;
  onTogglePhotos: () => void;
  showColors: boolean;
  onToggleColors: () => void;
  /** Room elements have nothing to hide in the seating circle. */
  showFeatures: boolean;
  onToggleFeatures: () => void;
  contrast: boolean;
  onToggleContrast: () => void;
  nameDisplay: NameDisplayMode;
  onCycleNameDisplay: () => void;
  /** Absent while there is nobody to draw (an empty circle, no seats). */
  onPick?: () => void;
  /** Absent until the groups view exists for this class. */
  onOpenGroups?: () => void;
  /** Absent until the duties view exists for this class. */
  onOpenDuties?: () => void;
};

type BarViewProps = {
  onResetView: () => void;
  fullscreenSupported: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
};

type PresentationToolbarProps = BarControlsProps &
  BarViewProps & {
    /** Who is marked as missing today (decision 0045), in the class's order. */
    absent?: readonly AbsentStudent[];
    /** One of them is there again. */
    onMarkBack?: (studentId: string) => void;
    /** "Alle da": everybody is back. */
    onClearAbsent?: () => void;
    zoom: number;
    minZoom: number;
    maxZoom: number;
    onZoomChange: (zoom: number) => void;
    onExit: () => void;
  };

/**
 * What the bar shows and does, up to the size: whose view, which shape, the
 * draw and the class's tools, what the plan carries. Kept apart from the
 * size, which changes with every step of a pinch — nothing here does.
 */
const BarControls = React.memo(function BarControls({
  perspective,
  onPerspectiveChange,
  mode,
  onModeChange,
  isTeacher,
  showBadges,
  onToggleBadges,
  showPhotos,
  onTogglePhotos,
  showColors,
  onToggleColors,
  showFeatures,
  onToggleFeatures,
  contrast,
  onToggleContrast,
  nameDisplay,
  onCycleNameDisplay,
  onPick,
  onOpenGroups,
  onOpenDuties,
  absentCount,
  absentOpen,
  absentButtonRef,
  onToggleAbsent,
}: BarControlsProps & {
  absentCount: number;
  absentOpen: boolean;
  absentButtonRef: React.RefObject<HTMLButtonElement | null>;
  onToggleAbsent: () => void;
}) {
  const { t } = useTranslation('generator');
  const NameIcon = NAME_DISPLAY_ICONS[nameDisplay];
  const isCircle = mode === 'circle';

  return (
    <>
      <BarSegment
        label={t('present.perspective')}
        value={perspective}
        onChange={onPerspectiveChange}
        primary
        options={[
          {
            value: 'teacher',
            label: t('present.teacherView'),
            title: t('present.teacherViewTitle'),
            icon: ChalkboardTeacherIcon,
          },
          {
            value: 'student',
            label: t('present.studentView'),
            title: t('present.studentViewTitle'),
            icon: StudentIcon,
          },
        ]}
      />

      <BarSegment
        label={t('mode.label')}
        value={mode}
        onChange={onModeChange}
        options={[
          {
            value: 'table',
            label: t('mode.table'),
            short: t('present.planShort'),
            title: t('mode.tableView'),
            icon: GridNineIcon,
          },
          {
            value: 'circle',
            label: t('mode.circle'),
            short: t('present.circleShort'),
            title: t('mode.circleView'),
            icon: CircleDashedIcon,
          },
        ]}
      />

      <BarSeparator />

      {onPick && (
        <button
          type="button"
          onClick={onPick}
          title={t('present.pickTitle')}
          className={`${barIconButtonClass} ${quietClass} px-3`}
        >
          <HandPointingIcon size={18} aria-hidden />
          <span>{t('present.pick')}</span>
        </button>
      )}
      {/* Who is missing today: the count, and behind it their names. */}
      {absentCount > 0 && (
        <button
          ref={absentButtonRef}
          type="button"
          onClick={onToggleAbsent}
          aria-haspopup="dialog"
          aria-expanded={absentOpen}
          title={t('present.absent.listTitle')}
          className={`${barIconButtonClass} ${absentOpen ? pressedClass : quietClass} px-3`}
        >
          <UserMinusIcon size={18} aria-hidden />
          <span>{t('present.absent.count', { count: absentCount })}</span>
        </button>
      )}
      {onOpenGroups && (
        <button
          type="button"
          onClick={onOpenGroups}
          title={t('present.groupsTitle')}
          className={`${barIconButtonClass} ${quietClass} px-3`}
        >
          <UsersThreeIcon size={18} aria-hidden />
          <span>{t('present.groups')}</span>
        </button>
      )}
      {onOpenDuties && (
        <button
          type="button"
          onClick={onOpenDuties}
          title={t('present.dutiesTitle')}
          className={`${barIconButtonClass} ${quietClass} px-3`}
        >
          <BroomIcon size={18} aria-hidden />
          <span>{t('present.duties')}</span>
        </button>
      )}

      <BarSeparator />

      {isTeacher && (
        <BarToggle
          icon={UserSquareIcon}
          label={t('present.badges')}
          title={t('present.badgesTitle')}
          pressed={showBadges}
          onClick={onToggleBadges}
        />
      )}
      {isTeacher && (
        <BarToggle
          icon={ImageIcon}
          label={t('present.photos')}
          title={t('present.photosTitle')}
          pressed={showPhotos}
          onClick={onTogglePhotos}
        />
      )}
      <button
        type="button"
        onClick={onCycleNameDisplay}
        aria-label={`${t('present.names')}: ${t(nameDisplayLabelKey(nameDisplay))}`}
        title={`${t('present.names')}: ${t(nameDisplayLabelKey(nameDisplay))}`}
        className={`${barIconButtonClass} ${quietClass}`}
      >
        <NameIcon size={18} aria-hidden />
        <span>{t('present.names')}</span>
      </button>
      {!isCircle && (
        <BarToggle
          icon={DoorOpenIcon}
          label={t('present.features')}
          title={t('present.featuresTitle')}
          pressed={showFeatures}
          onClick={onToggleFeatures}
        />
      )}
      <BarToggle
        icon={PaletteIcon}
        label={t('present.colors')}
        title={t('present.colorsTitle')}
        pressed={showColors}
        onClick={onToggleColors}
      />
      <BarToggle
        icon={SunIcon}
        label={t('present.contrast')}
        title={t('present.contrastTitle')}
        pressed={contrast}
        onClick={onToggleContrast}
      />

      <BarSeparator />
    </>
  );
});

/** Back to the whole plan, and the wall to itself. */
const BarView = React.memo(function BarView({
  onResetView,
  fullscreenSupported,
  isFullscreen,
  onToggleFullscreen,
}: BarViewProps) {
  const { t } = useTranslation('generator');
  return (
    <>
      <button
        type="button"
        onClick={onResetView}
        aria-label={t('present.resetView')}
        title={t('present.resetView')}
        className={`${barIconButtonClass} ${quietClass}`}
      >
        <ArrowsInIcon size={18} aria-hidden />
        <span>{t('present.resetViewShort')}</span>
      </button>
      {fullscreenSupported && (
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-pressed={isFullscreen}
          aria-label={
            isFullscreen
              ? t('present.fullscreenExitTitle')
              : t('present.fullscreenTitle')
          }
          title={
            isFullscreen
              ? t('present.fullscreenExitTitle')
              : t('present.fullscreenTitle')
          }
          className={`${barIconButtonClass} ${quietClass}`}
        >
          {isFullscreen ? (
            <CornersInIcon size={18} aria-hidden />
          ) : (
            <ArrowsOutIcon size={18} aria-hidden />
          )}
          <span>{t('present.fullscreen')}</span>
        </button>
      )}
    </>
  );
});

/** The way out, in sight beside the row that scrolls. */
const BarExit = React.memo(function BarExit({
  onExit,
}: {
  onExit: () => void;
}) {
  const { t } = useTranslation('generator');
  return (
    <button
      type="button"
      onClick={onExit}
      aria-label={t('present.exit')}
      title={t('present.backTitle')}
      className={`${barIconButtonClass} ${quietClass}`}
    >
      <XIcon size={18} aria-hidden />
      <span>{t('present.end')}</span>
    </button>
  );
});

/** Half the list's width and its distance from the bar's ends, for `clamp`. */
const ABSENT_MENU_REACH = '8rem';

/**
 * The students missing today, above the count that opens it: a press on a
 * name brings that student back, "Alle da" everybody.
 *
 * It hangs on the bar itself rather than on `<body>`: in fullscreen only the
 * projection is on screen, and the bar's row scrolls on a phone and would
 * clip a list inside it.
 */
function AbsentMenu({
  menuRef,
  centre,
  label,
  absent,
  onMarkBack,
  onClear,
}: {
  menuRef: React.RefObject<HTMLDivElement | null>;
  /** The count's middle, from the bar's left edge. */
  centre: number;
  label: string;
  absent: readonly AbsentStudent[];
  onMarkBack: (studentId: string) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation('generator');

  // It fades in from the bar's side, as every dropdown does.
  React.useLayoutEffect(() => {
    const node = menuRef.current;
    if (!node || !motionEnabled(node)) return;
    node.animate(
      [
        { opacity: 0, transform: 'translateY(4px)' },
        { opacity: 1, transform: 'none' },
      ],
      { duration: MOTION_DURATION.menuIn, easing: MOTION_EASE.arrive },
    );
  }, [menuRef]);

  return (
    <div
      ref={menuRef}
      role="dialog"
      aria-label={label}
      // Focusable from script: the row a press takes away leaves the focus
      // here, not on the page.
      tabIndex={-1}
      className={`${menuSurfaceClass} absolute bottom-full z-30 mb-2 max-h-[60dvh] w-60 -translate-x-1/2 overflow-y-auto focus:outline-none`}
      style={{
        left: `clamp(${ABSENT_MENU_REACH}, ${centre}px, calc(100% - ${ABSENT_MENU_REACH}))`,
      }}
    >
      {absent.map((student) => {
        // Named for what a press does; what it did is announced after.
        const bringBack = t('present.absent.bringBack', { name: student.name });
        return (
          <button
            key={student.id}
            type="button"
            onClick={() => {
              menuRef.current?.focus();
              onMarkBack(student.id);
            }}
            aria-label={bringBack}
            title={bringBack}
            className={`${menuItemClass} pointer-coarse:min-h-11`}
          >
            <span className="min-w-0 flex-1 truncate">{student.name}</span>
            <UserCheckIcon
              size={16}
              aria-hidden
              className="shrink-0 text-(--text-muted)"
            />
          </button>
        );
      })}
      <div className="my-1 h-px bg-(--border-card)" role="separator" />
      {/* Nothing is deleted, the marks of the day are set back: no rose. */}
      <button
        type="button"
        onClick={onClear}
        title={t('present.absent.clearTitle')}
        className={`${menuItemClass} pointer-coarse:min-h-11`}
      >
        <UserCheckIcon size={16} aria-hidden className="shrink-0" />
        {t('present.absent.clear')}
      </button>
    </div>
  );
}

function PresentationToolbar({
  absent = NOBODY_ABSENT,
  onMarkBack,
  onClearAbsent,
  zoom,
  minZoom,
  maxZoom,
  onZoomChange,
  onResetView,
  fullscreenSupported,
  isFullscreen,
  onToggleFullscreen,
  onExit,
  ...controls
}: PresentationToolbarProps) {
  const { t } = useTranslation('generator');

  const rootRef = React.useRef<HTMLDivElement | null>(null);
  const absentButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  // Open with where the count stands, so the list hangs over it.
  const [menuCentre, setMenuCentre] = React.useState<number | null>(null);
  const canList = absent.length > 0 && !!onMarkBack && !!onClearAbsent;
  // Nobody left to list: the list goes with its count, and must not come
  // back by itself with the next mark.
  if (menuCentre !== null && !canList) setMenuCentre(null);
  const menuOpen = menuCentre !== null && canList;

  const closeMenu = React.useCallback(() => setMenuCentre(null), []);
  /** The count's middle, from the bar's left edge. */
  const measureCentre = React.useCallback((): number | null => {
    const root = rootRef.current?.getBoundingClientRect();
    const button = absentButtonRef.current?.getBoundingClientRect();
    return root && button ? button.left + button.width / 2 - root.left : null;
  }, []);
  const toggleMenu = React.useCallback(() => {
    const centre = measureCentre();
    setMenuCentre((current) => (current !== null ? null : centre));
  }, [measureCentre]);
  // The count moves — the row scrolls on a phone, the window changes —, and
  // the list follows it. It does not close: a row still gliding from a swipe
  // would take the list away the moment it opened.
  const followCount = React.useCallback(() => {
    const centre = measureCentre();
    setMenuCentre((current) => (current === null ? null : centre));
  }, [measureCentre]);

  const outsideRefs = React.useMemo(() => [absentButtonRef, menuRef], []);
  useClickOutside(outsideRefs, closeMenu, menuOpen);
  usePopoverFocus({
    open: menuOpen,
    contentRef: menuRef,
    anchorRef: absentButtonRef,
    onClose: closeMenu,
  });
  React.useEffect(() => {
    if (!menuOpen) return undefined;
    window.addEventListener('resize', followCount);
    return () => window.removeEventListener('resize', followCount);
  }, [menuOpen, followCount]);

  return (
    <div
      ref={rootRef}
      className="relative flex justify-center px-3 pb-[max(1rem,env(safe-area-inset-bottom))] bar-compact:px-2 bar-compact:pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-panel border border-(--present-bar-border) bg-(--present-bar-bg) p-2 shadow-[0_8px_28px_-12px_rgba(0,0,0,0.3)] bar-compact:w-full bar-compact:flex-nowrap bar-compact:p-1.5">
        {/* Everything but the way out. On a phone five rows of it took a third
            of the screen, so there it is one row that scrolls sideways, and
            "Beenden" stays in sight beside it. */}
        <div
          className="contents bar-compact:flex bar-compact:min-w-0 bar-compact:flex-1 bar-compact:items-center bar-compact:gap-1.5 bar-compact:overflow-x-auto bar-compact:scrollbar-none"
          onScroll={menuOpen ? followCount : undefined}
        >
          <BarControls
            {...controls}
            absentCount={canList ? absent.length : 0}
            absentOpen={menuOpen}
            absentButtonRef={absentButtonRef}
            onToggleAbsent={toggleMenu}
          />

          {/* The slider on top and its name with the value under it, the way
            the buttons beside it carry their word. A row that scrolls has no
            place for a slider, which a swipe would drag; there two fingers
            and the wheel set the size. */}
          <div className="flex h-11 shrink-0 flex-col items-center justify-center gap-1 rounded-card bg-(--present-bar-surface) px-3 bar-compact:hidden">
            <input
              id="present-zoom"
              type="range"
              min={minZoom}
              max={maxZoom}
              step={0.05}
              value={zoom}
              onChange={(event) => onZoomChange(Number(event.target.value))}
              title={t('present.zoomTitle')}
              // Taller on a touch screen, so a finger finds the track and not
              // only its 16px thumb.
              className="h-4 w-28 cursor-pointer accent-(--button-primary-bg) pointer-coarse:h-6 pointer-coarse:w-32"
            />
            <span className="flex items-center gap-1.5 text-xs leading-none">
              <label
                htmlFor="present-zoom"
                className="font-medium text-(--present-bar-muted)"
              >
                {t('present.size')}
              </label>
              <span className="font-semibold tabular-nums text-(--present-bar-text)">
                {formatPercent(zoom * 100)}
              </span>
            </span>
          </div>
          <BarView
            onResetView={onResetView}
            fullscreenSupported={fullscreenSupported}
            isFullscreen={isFullscreen}
            onToggleFullscreen={onToggleFullscreen}
          />
        </div>

        <BarSeparator />

        <BarExit onExit={onExit} />
      </div>

      {menuCentre !== null && canList && onMarkBack && onClearAbsent && (
        <AbsentMenu
          menuRef={menuRef}
          centre={menuCentre}
          label={t('present.absent.count', { count: absent.length })}
          absent={absent}
          onMarkBack={onMarkBack}
          onClear={() => {
            closeMenu();
            onClearAbsent();
          }}
        />
      )}
    </div>
  );
}

/**
 * Memoised: moving the plan with a finger renders the page with every step,
 * and the bar has nothing to do with where the plan lies.
 */
export default React.memo(PresentationToolbar);
