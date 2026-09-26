// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { LockIcon, LockOpenIcon } from '@phosphor-icons/react';
import type { StatisticHighlightMode, StatisticStatus, Student } from '@/types';
import {
  describeBadge,
  getStudentAppearance,
  SEAT_UI_COLORS,
  type StudentBadge,
} from '@/utils/ui/studentAppearance';
import {
  fitSeatBadges,
  getSeatBadgePillParams,
  getSeatBadges,
  type SeatBadgeView,
} from '@/utils/ui/seatBadges';
import SeatBadgePill from '@/components/scene/SeatBadgePill';
import type { SeatHighlightTone } from '@/utils/ui/statisticsHighlight';
import {
  getDisplayNameForMode,
  getTooltipName,
  calculateSeatLabelFontSize,
  getWishPartnerIds,
  getAvoidPartnerIds,
} from '@/utils';
import type { NameDisplayMode, NameLabels } from '@/utils';
import type { SeatKeyboardEventInfo } from '@/hooks/scene/useSeatKeyboardMove';

interface TableSeatProps {
  student: Student | null;
  seatIndex: number;
  tableIndex: number;
  col: number;
  row: number;
  seatWidth: number;
  seatHeight: number;
  tableRotation?: number;
  allStudents?: Student[];
  isDark: boolean;
  /** Beamer contrast mode: black on white, thicker contours, bolder names. */
  contrast?: boolean;
  locked: boolean;
  isOriginSeat: boolean;
  isHoverSeat: boolean;
  isHoverLockedSeat: boolean;
  isLockedFeedbackSeat: boolean;
  showSpecialNeeds: boolean;
  /** Which badges the seat carries and how they are drawn (see `SeatBadgeView`). */
  badgeView?: SeatBadgeView;
  /**
   * Uniform name rule for the seat label; undefined shortens only names that do
   * not fit (the editor default). See {@link NameDisplayMode}.
   */
  nameDisplay?: NameDisplayMode;
  /** Disambiguated labels of the class (see `buildNameLabels`). */
  nameLabels?: NameLabels;
  /** When false, the gender tint is dropped for a paper seat (the beamer's colour switch). */
  showGenderColors?: boolean;
  /** When false, the seat name label and lock toggle are hidden (layout editor). */
  showSeatLabels?: boolean;
  lockSeatLabelOrientation: boolean;
  seatTextRotation: number;
  toggleLock?: (studentId: string, table: number, seat: number) => void;
  /**
   * When true, the open-lock toggle is revealed only while the seat is
   * hovered or the toggle has keyboard focus (hover-capable pointers only).
   * The closed lock stays always visible — locked is important state info.
   */
  lockRevealOnHover?: boolean;
  /** Whether this seat is currently hovered (tracked at grid level). */
  isSeatHovered?: boolean;
  highlightStatus?: StatisticStatus;
  highlightMode?: StatisticHighlightMode;
  highlightPercentage?: number;
  /** No verdict: a badge points here (`focus`), a student just landed (`confirm`). */
  highlightTone?: SeatHighlightTone;
  /**
   * On the seat a drag started from: the student who would take the dragged
   * student's place, shown faintly while the drag points at them.
   */
  swapPreviewStudent?: Student | null;
  onSeatPointerDown?: (
    e: React.PointerEvent<SVGRectElement>,
    seatIndex: number,
    locked: boolean,
    hasStudent: boolean,
    seatWidth: number,
    seatHeight: number,
    appearance: ReturnType<typeof getStudentAppearance>,
    flags: StudentBadge[],
  ) => void;
  onSeatPointerUp?: (
    e: React.PointerEvent<SVGRectElement>,
    seatIndex: number,
    locked: boolean,
  ) => void;
  /** Pointer enter/leave on the seat, used to grow this seat's photo dot. */
  onSeatPointerEnter?: (seatIndex: number) => void;
  onSeatPointerLeave?: (seatIndex: number) => void;
  /** Keyboard alternative to seat drag-and-drop; makes the seat focusable. */
  onSeatKeyDown?: (
    e: React.KeyboardEvent<SVGRectElement>,
    info: SeatKeyboardEventInfo,
  ) => void;
  onSeatFocus?: (info: SeatKeyboardEventInfo) => void;
  onSeatBlur?: () => void;
}

/**
 * Calculate lock button position with a stable anchor inside the seat.
 *
 * Strategy: Anchor the toggle near the visual top-left corner of the unrotated
 * seat and keep it inside the bounds, even for compact seats. This ensures the
 * control does not jump between corners when the table rotates.
 *
 * @param seatWidth - Width of seat in pixels
 * @param seatHeight - Height of seat in pixels
 * @returns LockIcon button offset in local seat coordinates
 */
const calculateLockIconPosition = (
  seatWidth: number,
  seatHeight: number,
): { x: number; y: number } => {
  const touchTargetSize = 24;
  const padding = 1;

  const resolveCoordinate = (dimension: number): number => {
    if (dimension <= touchTargetSize + padding * 2) {
      // Keep the button inside very small seats by centering the touch target.
      return Math.max(padding, (dimension - touchTargetSize) / 2);
    }
    return padding;
  };

  return {
    x: resolveCoordinate(seatWidth),
    y: resolveCoordinate(seatHeight),
  };
};

/**
 * Show the manual focus ring only for keyboard focus (like :focus-visible).
 * Falls back to true where the pseudo-class is unsupported (e.g. jsdom).
 */
const matchesFocusVisible = (element: Element): boolean => {
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
};

/**
 * A highlighted seat's ring and tint. A criterion's verdict speaks in the
 * status colours the fulfilment in the inspector uses; a badge pointing at a
 * seat is no verdict and takes the selection colour. Tokens, so both themes
 * come from `index.css` — highlights are drawn on screen only, never exported.
 */
const HIGHLIGHT_COLORS: Record<
  StatisticStatus | SeatHighlightTone,
  SeatRingColors
> = {
  ok: { ring: 'var(--status-ok)', tint: 'var(--status-ok-surface)' },
  warn: { ring: 'var(--status-warn)', tint: 'var(--status-warn-surface)' },
  alert: { ring: 'var(--status-alert)', tint: 'var(--status-alert-surface)' },
  focus: {
    ring: 'var(--border-option-selected)',
    tint: 'var(--surface-option-selected)',
  },
  // A student has just landed here: a completed action.
  confirm: { ring: 'var(--status-ok)', tint: 'var(--status-ok-surface)' },
};

/**
 * A seat a dragged student hovers: blue where it can land — the colour of
 * "you can act here" — and rose where the seat is held. The seat it came
 * from is not a target and gets neither.
 */
const DROP_COLORS: Record<'target' | 'blocked', SeatRingColors> = {
  target: {
    ring: 'var(--border-option-selected)',
    tint: 'var(--surface-option-selected)',
  },
  blocked: { ring: 'var(--status-alert)', tint: 'var(--status-alert-surface)' },
};

type SeatRingColors = { ring: string; tint: string };

/** Ring widths and their inset, so the whole ring lies inside the seat. */
const HIGHLIGHT_RING_WIDTH = 2.5;
const DROP_RING_WIDTH = 3;
const SEAT_RING_INSET = 2;

/**
 * A tint under the name and a ring inset into the seat: how a seat is marked,
 * for a highlight and as a drop target alike. Inset, because the seat's own
 * edge is the table's edge on the outside — a contour there is clipped by the
 * table and covered by its outline, and only the line between two seats would
 * be left.
 */
function SeatRing({
  seatWidth,
  seatHeight,
  colors,
  ringWidth,
  motion,
  title,
  ...dataAttributes
}: {
  seatWidth: number;
  seatHeight: number;
  colors: SeatRingColors;
  ringWidth: number;
  /** `pulse`: the tint breathes. `confirm`: the whole ring fades once. */
  motion?: 'pulse' | 'confirm';
  title?: string;
  [dataAttribute: `data-${string}`]: string;
}) {
  return (
    <g
      {...dataAttributes}
      className={motion === 'confirm' ? 'seat-drop-confirm' : undefined}
      style={{ pointerEvents: 'none' }}
    >
      <rect
        width={seatWidth}
        height={seatHeight}
        rx={4}
        className={motion === 'pulse' ? 'animate-pulse' : undefined}
        style={{ fill: colors.tint, transition: 'fill 160ms ease' }}
      />
      <rect
        x={SEAT_RING_INSET}
        y={SEAT_RING_INSET}
        width={Math.max(seatWidth - SEAT_RING_INSET * 2, 0)}
        height={Math.max(seatHeight - SEAT_RING_INSET * 2, 0)}
        rx={3}
        fill="none"
        strokeWidth={ringWidth}
        style={{ stroke: colors.ring, transition: 'stroke 160ms ease' }}
      >
        {title ? <title>{title}</title> : null}
      </rect>
    </g>
  );
}

/**
 * TableSeat - Individual seat rendering component for SceneTable
 *
 * Optimized with React.memo to prevent unnecessary re-renders when:
 * - Seat position hasn't changed
 * - Student data hasn't changed
 * - Visual state (hover, drag, lock) hasn't changed
 *
 * Performance considerations:
 * - Appearance and flags are computed only when relevant props change
 * - Uses useMemo internally for expensive calculations
 * - Memoized with shallow prop comparison
 */
function TableSeat({
  student,
  seatIndex,
  tableIndex,
  col,
  row,
  seatWidth,
  seatHeight,
  tableRotation = 0,
  allStudents = [],
  isDark,
  contrast = false,
  locked,
  isOriginSeat,
  isHoverSeat,
  isHoverLockedSeat,
  isLockedFeedbackSeat,
  showSpecialNeeds,
  badgeView,
  nameDisplay,
  nameLabels,
  showGenderColors = true,
  showSeatLabels = true,
  lockSeatLabelOrientation,
  seatTextRotation,
  highlightStatus,
  highlightMode,
  highlightPercentage,
  highlightTone,
  swapPreviewStudent = null,
  toggleLock,
  lockRevealOnHover = false,
  isSeatHovered = false,
  onSeatPointerDown,
  onSeatPointerUp,
  onSeatPointerEnter,
  onSeatPointerLeave,
  onSeatKeyDown,
  onSeatFocus,
  onSeatBlur,
}: TableSeatProps) {
  // Memoize appearance calculation - only recompute when dependencies change
  const appearance = React.useMemo(
    () =>
      getStudentAppearance(student, isDark, locked, contrast, showGenderColors),
    [student, isDark, locked, contrast, showGenderColors],
  );

  // The badges the seat shows: they ride along with a drag and are read out
  // with the seat's name.
  const badgeFilter = badgeView?.filter;
  const flags = React.useMemo(
    () => getSeatBadges(student, allStudents, showSpecialNeeds, badgeFilter),
    [student, allStudents, showSpecialNeeds, badgeFilter],
  );

  const seatFill = appearance.fill;
  const seatStroke = appearance.stroke;
  const textColor = appearance.text;
  const mode = isDark ? 'dark' : 'light';
  const lockIconColor = SEAT_UI_COLORS.lockIcon[mode];
  const unlockIconColor = SEAT_UI_COLORS.unlockIcon[mode];
  const lockButtonBackground = SEAT_UI_COLORS.lockButtonBackground[mode];
  const lockButtonBorder = SEAT_UI_COLORS.lockButtonBorder[mode];

  const seatLabelTransform = lockSeatLabelOrientation
    ? `rotate(${seatTextRotation} ${seatWidth / 2} ${seatHeight / 2})`
    : undefined;
  const lockButtonOffset = calculateLockIconPosition(seatWidth, seatHeight);
  const lockButtonTransform = `translate(${lockButtonOffset.x} ${lockButtonOffset.y})`;
  const normalizedTableRotation = ((tableRotation % 360) + 360) % 360;
  const lockButtonRotationCompensation = lockSeatLabelOrientation
    ? -normalizedTableRotation
    : 0;
  const lockButtonCircleTransform =
    lockButtonRotationCompensation !== 0
      ? `rotate(${lockButtonRotationCompensation} 10 10)`
      : undefined;
  const lockButtonIconTransform =
    lockButtonRotationCompensation !== 0
      ? `rotate(${lockButtonRotationCompensation} 5 5)`
      : undefined;
  // The seat itself carries the highlight — never its table, which would
  // mark the neighbours at a double or group table as well.
  const highlightKind = highlightStatus
    ? (highlightTone ?? highlightStatus)
    : null;
  const highlightColors = highlightKind
    ? HIGHLIGHT_COLORS[highlightKind]
    : null;
  const { t } = useTranslation('generator');

  const highlightTitle =
    highlightKind && !highlightTone && typeof highlightPercentage === 'number'
      ? t('seat.fulfillmentTitle', {
          percentage: Math.round(highlightPercentage),
          defaultValue: `Erfüllung ${Math.round(highlightPercentage)}%`,
        })
      : undefined;
  // Where a dragged student would land. The seat it was picked up from is
  // under the pointer at the start of every drag, and is no target.
  const dropState =
    isLockedFeedbackSeat || isHoverLockedSeat
      ? 'blocked'
      : isHoverSeat && !locked && !isOriginSeat
        ? 'target'
        : null;

  // The seat a drag started from fades; while the drag points at a taken
  // seat, it shows who would come here instead.
  const showsSwapPreview = isOriginSeat && swapPreviewStudent !== null;
  const seatGroupOpacity = isOriginSeat ? (showsSwapPreview ? 0.6 : 0.35) : 1;
  const focusInset = dropState ? SEAT_RING_INSET + DROP_RING_WIDTH + 1 : 2.5;
  const dividerStroke = isDark
    ? 'rgba(226, 232, 240, 0.18)'
    : 'rgba(30, 41, 59, 0.12)';
  // Empty (unoccupied, unlocked) seats read as "empty" purely via their subtle
  // neutral fill — no dashed outline or texture, so they stay visually calm and
  // don't clash with the table frame in step 3, the PDF export and presentation.
  // On a wall a 0.75px hairline is not a line; the contrast mode draws the
  // seat's own contour instead of the table's faint divider.
  const seatStrokeWidth = contrast ? 1.5 : locked ? 1 : 0.75;
  const seatStrokeValue = contrast || locked ? seatStroke : dividerStroke;
  const seatTextOpacity = isOriginSeat ? 0.35 : 1;
  const labelStudent = showsSwapPreview ? swapPreviewStudent : student;
  const displayName = labelStudent
    ? getDisplayNameForMode(labelStudent.name, 'table', nameDisplay, nameLabels)
    : '';
  const seatFontSize = calculateSeatLabelFontSize(displayName, seatWidth);

  // The open lock is hover-revealed on hover-capable pointers; the closed
  // lock always stays visible. Keyboard focus reveals it too, so the toggle
  // remains reachable via Tab. The element stays in the DOM (a11y tree).
  const [lockHasFocus, setLockHasFocus] = React.useState(false);
  const lockVisible =
    !lockRevealOnHover || locked || isSeatHovered || lockHasFocus;

  // Keyboard move support: the touch target becomes a focusable button so the
  // seat drag has a keyboard alternative (Enter/Space grab & drop, Escape).
  const keyboardEnabled = Boolean(onSeatKeyDown);
  const [hasVisibleFocus, setHasVisibleFocus] = React.useState(false);
  const keyboardInfo = React.useMemo<SeatKeyboardEventInfo>(
    () => ({
      tableIndex,
      seatIndex,
      locked,
      hasStudent: !!student,
      studentName: student ? getTooltipName(student.name) : null,
    }),
    [tableIndex, seatIndex, locked, student],
  );
  const seatPosition = {
    table: tableIndex + 1,
    seat: seatIndex + 1,
  };
  let seatAriaLabel = student
    ? t('seat.ariaOccupied', {
        name: getTooltipName(student.name),
        ...seatPosition,
        defaultValue: `${getTooltipName(student.name)} – Tisch ${seatPosition.table}, Platz ${seatPosition.seat}`,
      })
    : t('seat.ariaEmpty', {
        ...seatPosition,
        defaultValue: `Freier Platz – Tisch ${seatPosition.table}, Platz ${seatPosition.seat}`,
      });
  if (locked) {
    seatAriaLabel += `, ${t('seat.ariaLocked', 'gesperrt')}`;
  }
  // What the icons on the seat say, for everyone who cannot see them.
  if (student && flags.length > 0) {
    seatAriaLabel += `, ${t('seat.ariaBadges', {
      // The tooltip's heading: "Körpergröße: Klein" rather than a bare
      // "Klein", which means nothing without the icon.
      list: flags.map((flag) => describeBadge(flag).heading).join(', '),
    })}`;
  }

  return (
    <g transform={`translate(${col * seatWidth} ${row * seatHeight})`}>
      {/* Hover is tracked on the group (not the touch-target rect): the group
          boundary covers the rect AND the lock toggle, so moving the pointer
          onto the hover-revealed lock doesn't fire a leave that would hide it
          again — which caused an enter/leave flicker loop on unlocked seats. */}
      <g
        onPointerEnter={
          onSeatPointerEnter ? () => onSeatPointerEnter(seatIndex) : undefined
        }
        onPointerLeave={
          onSeatPointerLeave ? () => onSeatPointerLeave(seatIndex) : undefined
        }
        style={{
          opacity: seatGroupOpacity,
          transition: 'opacity 160ms ease',
        }}
      >
        {/* Touch target area - minimum 44x44px for better touch accessibility.
            Only rendered when seats are interactive (step 3 editor); in static
            contexts (layout editor, export) it would otherwise swallow table
            drag events from neighbouring tables. */}
        {(onSeatPointerDown || onSeatPointerUp || keyboardEnabled) && (
          <rect
            width={Math.max(seatWidth, 44)}
            height={Math.max(seatHeight, 44)}
            x={seatWidth < 44 ? -(44 - seatWidth) / 2 : 0}
            y={seatHeight < 44 ? -(44 - seatHeight) / 2 : 0}
            fill="transparent"
            data-seat-index={seatIndex}
            data-table-index={tableIndex}
            tabIndex={keyboardEnabled ? 0 : undefined}
            role={keyboardEnabled ? 'button' : undefined}
            aria-label={keyboardEnabled ? seatAriaLabel : undefined}
            aria-pressed={keyboardEnabled ? isOriginSeat : undefined}
            onPointerDown={(e) =>
              onSeatPointerDown?.(
                e,
                seatIndex,
                locked,
                !!student,
                seatWidth,
                seatHeight,
                appearance,
                flags,
              )
            }
            onPointerUp={(e) => onSeatPointerUp?.(e, seatIndex, locked)}
            onKeyDown={
              onSeatKeyDown ? (e) => onSeatKeyDown(e, keyboardInfo) : undefined
            }
            onFocus={
              keyboardEnabled
                ? (e) => {
                    setHasVisibleFocus(matchesFocusVisible(e.currentTarget));
                    onSeatFocus?.(keyboardInfo);
                  }
                : undefined
            }
            onBlur={
              keyboardEnabled
                ? () => {
                    setHasVisibleFocus(false);
                    onSeatBlur?.();
                  }
                : undefined
            }
            style={{
              cursor: !locked && student ? 'grab' : 'default',
              touchAction: 'none',
              outline: 'none',
            }}
          />
        )}
        {/* Visual seat rectangle */}
        <rect
          width={seatWidth}
          height={seatHeight}
          fill={seatFill}
          stroke={seatStrokeValue}
          strokeWidth={seatStrokeWidth}
          rx={4}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{
            pointerEvents: 'none', // Touch events handled by larger target above
            transition:
              'fill 150ms ease, stroke 150ms ease, stroke-width 150ms ease',
          }}
        />
        {/* The highlight, then the drop target on top of it: both on the
            seat itself, never on its table. */}
        {highlightColors && highlightKind && (
          <SeatRing
            data-seat-highlight={highlightKind}
            seatWidth={seatWidth}
            seatHeight={seatHeight}
            colors={highlightColors}
            ringWidth={HIGHLIGHT_RING_WIDTH}
            // A passing hover breathes, a pinned highlight stands still, a
            // landing fades out once.
            motion={
              highlightKind === 'confirm'
                ? 'confirm'
                : // A pointed-at badge stands still in the plan and in
                  // the circle alike; only a passing criterion breathes.
                  highlightMode === 'hover' && highlightKind !== 'focus'
                  ? 'pulse'
                  : undefined
            }
            title={highlightTitle}
          />
        )}
        {dropState && (
          <SeatRing
            data-seat-drop={dropState}
            seatWidth={seatWidth}
            seatHeight={seatHeight}
            colors={DROP_COLORS[dropState]}
            ringWidth={DROP_RING_WIDTH}
          />
        )}
        {/* Keyboard focus ring - drawn manually because SVG outline rendering
            is inconsistent across browsers. Inset so it stays visible inside
            the table clip path and is not covered by the table border. Uses a
            two-tone ring (white halo + blue ring, like ring + ring-offset) so
            it stays visible on any seat color in light and dark mode. */}
        {hasVisibleFocus && (
          // While a keyboard move points here, the drop ring takes the
          // seat's edge and the focus ring steps inside it.
          <>
            <rect
              x={focusInset}
              y={focusInset}
              width={Math.max(seatWidth - focusInset * 2, 0)}
              height={Math.max(seatHeight - focusInset * 2, 0)}
              rx={3}
              fill="none"
              stroke="#ffffff"
              strokeWidth={4.5}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
            <rect
              x={focusInset}
              y={focusInset}
              width={Math.max(seatWidth - focusInset * 2, 0)}
              height={Math.max(seatHeight - focusInset * 2, 0)}
              rx={3}
              fill="none"
              stroke={isDark ? '#60a5fa' : '#2563eb'}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          </>
        )}
        {student && showSeatLabels && (
          <>
            <text
              x={seatWidth / 2}
              y={seatHeight / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={seatFontSize}
              fontWeight={contrast ? 700 : 400}
              transform={seatLabelTransform}
              fill={textColor}
              style={{
                pointerEvents: 'none',
                opacity: seatTextOpacity,
                transition: 'opacity 150ms ease',
              }}
            >
              <title>{getTooltipName(student.name)}</title>
              {displayName}
            </text>
          </>
        )}
        {student && showSeatLabels && (
          <>
            {toggleLock && (
              <g
                transform={lockButtonTransform}
                style={{
                  cursor: 'pointer',
                  opacity: lockVisible ? seatTextOpacity : 0,
                  transition: 'opacity 150ms ease',
                  // No invisible click target while hidden (focus still works)
                  pointerEvents: lockVisible ? 'auto' : 'none',
                }}
                role="button"
                tabIndex={0}
                onFocus={() => setLockHasFocus(true)}
                onBlur={() => setLockHasFocus(false)}
                aria-label={
                  locked
                    ? t('seat.unlockSeat', 'Sitzplatz entsperren')
                    : t('seat.lockSeat', 'Sitzplatz sperren')
                }
                aria-pressed={locked}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  event.preventDefault();
                  toggleLock(student.id, tableIndex, seatIndex);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleLock(student.id, tableIndex, seatIndex);
                  }
                }}
              >
                <title>
                  {locked
                    ? t('seat.unlockSeat', 'Sitzplatz entsperren')
                    : t('seat.lockSeat', 'Sitzplatz sperren')}
                </title>
                {/* Invisible 24px hit area (touchTargetSize) around the 20px
                    circle so the pointer cursor and click target cover the
                    whole button, not just the painted circle — otherwise the
                    seat's grab-cursor touch target wins right at the edge. */}
                <rect x={-2} y={-2} width={24} height={24} fill="transparent" />
                {/* Circular lock toggle surface using muted icon button design token colors */}
                <circle
                  cx={10}
                  cy={10}
                  r={10}
                  fill={lockButtonBackground}
                  stroke={lockButtonBorder}
                  strokeWidth={1}
                  transform={lockButtonCircleTransform}
                  style={{
                    transition:
                      'fill 150ms ease, stroke 150ms ease, opacity 150ms ease',
                    opacity: locked ? 1 : 0.92,
                  }}
                />
                <g transform="translate(5 5)">
                  <g transform={lockButtonIconTransform}>
                    {locked ? (
                      <LockIcon size={10} color={lockIconColor} />
                    ) : (
                      <LockOpenIcon size={10} color={unlockIconColor} />
                    )}
                  </g>
                </g>
              </g>
            )}
          </>
        )}
      </g>
    </g>
  );
}

interface TableSeatBadgeOverlayProps {
  student: Student | null;
  col: number;
  row: number;
  seatWidth: number;
  seatHeight: number;
  allStudents?: Student[];
  showSpecialNeeds: boolean;
  badgeView?: SeatBadgeView;
  isDark: boolean;
  isOriginSeat: boolean;
  lockSeatLabelOrientation: boolean;
  seatTextRotation: number;
}

export const TableSeatBadgeOverlay = React.memo(function TableSeatBadgeOverlay({
  student,
  col,
  row,
  seatWidth,
  seatHeight,
  allStudents = [],
  showSpecialNeeds,
  badgeView,
  isDark,
  isOriginSeat,
  lockSeatLabelOrientation,
  seatTextRotation,
}: TableSeatBadgeOverlayProps) {
  const fit = React.useMemo(() => {
    const collapse = Boolean(badgeView?.collapse);
    return fitSeatBadges(
      getSeatBadges(student, allStudents, showSpecialNeeds, badgeView?.filter),
      getSeatBadgePillParams(seatWidth, seatHeight, collapse),
      { collapse, prioritize: badgeView?.prioritize },
    );
  }, [
    student,
    allStudents,
    showSpecialNeeds,
    badgeView,
    seatWidth,
    seatHeight,
  ]);

  if (!student || !fit) {
    return null;
  }

  const seatLabelTransform = lockSeatLabelOrientation
    ? `rotate(${seatTextRotation} ${seatWidth / 2} ${seatHeight / 2})`
    : undefined;
  const seatTextOpacity = isOriginSeat ? 0.35 : 1;

  return (
    <g transform={`translate(${col * seatWidth} ${row * seatHeight})`}>
      <g
        transform={seatLabelTransform}
        style={{
          pointerEvents: 'none',
          opacity: seatTextOpacity,
          transition: 'opacity 150ms ease',
        }}
      >
        <SeatBadgePill
          fit={fit}
          studentId={student.id}
          isDark={isDark}
          x={(seatWidth - fit.layout.width) / 2}
          y={seatHeight - fit.layout.height - 6}
        />
      </g>
    </g>
  );
});
TableSeatBadgeOverlay.displayName = 'TableSeatBadgeOverlay';

// Memoize TableSeat with custom comparison for optimal performance
const MemoizedTableSeat = React.memo(TableSeat, (prevProps, nextProps) => {
  // Quick checks for common changes that should trigger re-render
  if (prevProps.student?.id !== nextProps.student?.id) return false;
  if (prevProps.locked !== nextProps.locked) return false;
  if (prevProps.isHoverSeat !== nextProps.isHoverSeat) return false;
  if (prevProps.isOriginSeat !== nextProps.isOriginSeat) return false;
  if (prevProps.isHoverLockedSeat !== nextProps.isHoverLockedSeat) return false;
  if (prevProps.isLockedFeedbackSeat !== nextProps.isLockedFeedbackSeat)
    return false;
  if (prevProps.highlightStatus !== nextProps.highlightStatus) return false;
  if (prevProps.highlightMode !== nextProps.highlightMode) return false;
  if (prevProps.highlightPercentage !== nextProps.highlightPercentage)
    return false;
  if (prevProps.highlightTone !== nextProps.highlightTone) return false;
  if (prevProps.swapPreviewStudent !== nextProps.swapPreviewStudent)
    return false;

  // Lock hover-reveal state
  if (prevProps.isSeatHovered !== nextProps.isSeatHovered) return false;
  if (prevProps.lockRevealOnHover !== nextProps.lockRevealOnHover) return false;

  // CheckIcon position changes
  if (
    prevProps.col !== nextProps.col ||
    prevProps.row !== nextProps.row ||
    prevProps.seatWidth !== nextProps.seatWidth ||
    prevProps.seatHeight !== nextProps.seatHeight
  )
    return false;

  // Keyboard interactivity toggles focusability and ARIA attributes
  if (Boolean(prevProps.onSeatKeyDown) !== Boolean(nextProps.onSeatKeyDown))
    return false;

  // CheckIcon visual state changes
  if (
    prevProps.isDark !== nextProps.isDark ||
    prevProps.contrast !== nextProps.contrast ||
    prevProps.showGenderColors !== nextProps.showGenderColors ||
    prevProps.nameDisplay !== nextProps.nameDisplay ||
    prevProps.nameLabels !== nextProps.nameLabels ||
    prevProps.showSeatLabels !== nextProps.showSeatLabels ||
    prevProps.seatTextRotation !== nextProps.seatTextRotation ||
    prevProps.tableRotation !== nextProps.tableRotation ||
    prevProps.showSpecialNeeds !== nextProps.showSpecialNeeds ||
    prevProps.badgeView !== nextProps.badgeView
  )
    return false;

  // Student data comparison (only if student exists)
  if (prevProps.student && nextProps.student) {
    const prev = prevProps.student;
    const next = nextProps.student;
    if (
      prev.name !== next.name ||
      prev.gender !== next.gender ||
      prev.height !== next.height ||
      prev.needsFrontSeat !== next.needsFrontSeat ||
      // The rest of what becomes a badge, which the seat reads out.
      prev.restless !== next.restless ||
      prev.shy !== next.shy ||
      prev.concentrationIssues !== next.concentrationIssues ||
      prev.performanceStrong !== next.performanceStrong ||
      prev.performanceWeak !== next.performanceWeak ||
      prev.languageSkill !== next.languageSkill ||
      prev.socialRole !== next.socialRole ||
      prev.prefersWindow !== next.prefersWindow ||
      prev.prefersDoor !== next.prefersDoor ||
      getWishPartnerIds(prev).join(',') !== getWishPartnerIds(next).join(',') ||
      getAvoidPartnerIds(prev).join(',') !== getAvoidPartnerIds(next).join(',')
    ) {
      return false;
    }
  }

  // All checks passed - props are equivalent
  return true;
});

MemoizedTableSeat.displayName = 'TableSeat';

export default MemoizedTableSeat;
