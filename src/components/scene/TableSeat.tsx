// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { LockIcon, LockOpenIcon } from '@phosphor-icons/react';
import { useIsCoarsePointer } from '@/hooks/ui/useCoarsePointer';
import { useTapGesture } from '@/hooks/ui/useDragGesture';
import type { StatisticHighlightMode, StatisticStatus, Student } from '@/types';
import {
  describeBadge,
  getStudentAppearance,
  type StudentBadge,
} from '@/utils/ui/studentAppearance';
import {
  getSeatBadges,
  layoutSeatBadgePill,
  type SeatBadgeView,
} from '@/utils/ui/seatBadges';
import {
  fitNameOnSeat,
  SEAT_LOCK_ICON_SIZE,
  seatLockReservesRoom,
  seatLockOffset,
  seatNameMaxFontSize,
} from '@/utils/ui/seatLabelLayout';
import SeatBadgePill from '@/components/scene/SeatBadgePill';
import SeatNameText from '@/components/scene/SeatNameText';
import type { SeatHighlightTone } from '@/utils/ui/statisticsHighlight';
import {
  insetSeatPath,
  SEAT_MARK_COLORS,
  SEAT_MARK_WIDTH,
  seatEdgeLineInset,
  seatFocusInset,
  seatMarkInset,
  seatTableEdgePath,
  type SeatCorners,
  type SeatEdges,
  type SeatMarkKind,
} from '@/utils/ui/seatMark';
import {
  getDisplayNameForMode,
  getTooltipName,
  getWishPartnerIds,
  getAvoidPartnerIds,
  formatPercent,
} from '@/utils';
import type { NameDisplayMode, NameLabels } from '@/utils';
import type { SeatKeyboardEventInfo } from '@/hooks/scene/useSeatKeyboardMove';
import {
  SEAT_CENTRE_ATTR,
  SEAT_FLIGHT_ATTR,
  SEAT_FLIGHT_PART_ATTR,
  SEAT_FLIGHT_EDGE_ATTR,
  SEAT_STUDENT_ATTR,
  seatFlightKey,
} from '@/hooks/scene/useSeatFlight';

interface TableSeatProps {
  student: Student | null;
  seatIndex: number;
  tableIndex: number;
  col: number;
  row: number;
  seatWidth: number;
  seatHeight: number;
  /** Which of the seat's corners are its table's, so a mark follows them. */
  tableCorners?: SeatCorners;
  /** The width of the table's outline, which a mark keeps clear of. */
  tableEdgeWidth?: number;
  /** Which of the seat's sides are its table's, outlined while it flies. */
  tableEdges?: SeatEdges;
  /** The table's outline, as the seat wears it on its way to another seat. */
  tableEdgeStroke?: string;
  tableEdgeDash?: string;
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
  /**
   * The size the plan's names share (`computePlanNameFontSize`); a name that
   * cannot reach it on this seat stays smaller. Undefined: the seat's own cap.
   */
  nameFontSize?: number;
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
    e: React.PointerEvent<SVGElement>,
    seatIndex: number,
    locked: boolean,
    hasStudent: boolean,
    seatWidth: number,
    seatHeight: number,
    appearance: ReturnType<typeof getStudentAppearance>,
    flags: StudentBadge[],
  ) => void;
  onSeatPointerUp?: (
    e: React.PointerEvent<SVGElement>,
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

/** The lock toggle's box on a seat (`seatLockOffset` places it). */
const SEAT_LOCK_BOX = 20;
/** The lock's keyboard focus ring, round its icon. */
const LOCK_FOCUS_RADIUS = 7.5;

/** A seat that is not drawn inside a table's grid keeps its own corners. */
const OWN_CORNERS: SeatCorners = [false, false, false, false];
/** … and has no side of a table to outline. */
const NO_EDGES: SeatEdges = [false, false, false, false];

/**
 * A seat's mark (see `utils/ui/seatMark`): a tint over the seat and a ring
 * inside it, clear of the table's outline and concentric with its corners —
 * the seat's own edge is the table's edge on the outside, where a ring on
 * the edge is clipped by the table and covered by its outline.
 */
function SeatMark({
  seatWidth,
  seatHeight,
  kind,
  corners,
  edgeWidth,
  motion,
  title,
  ...dataAttributes
}: {
  seatWidth: number;
  seatHeight: number;
  kind: SeatMarkKind;
  corners: SeatCorners;
  edgeWidth: number;
  /** `pulse`: the tint breathes. `confirm`: the whole mark fades once. */
  motion?: 'pulse' | 'confirm';
  title?: string;
  [dataAttribute: `data-${string}`]: string;
}) {
  const colors = SEAT_MARK_COLORS[kind];
  return (
    <g
      {...dataAttributes}
      className={motion === 'confirm' ? 'seat-drop-confirm' : undefined}
      style={{ pointerEvents: 'none' }}
    >
      <path
        d={insetSeatPath(seatWidth, seatHeight, 0, corners)}
        className={motion === 'pulse' ? 'animate-pulse' : undefined}
        style={{ fill: colors.tint, transition: 'fill 160ms ease' }}
      />
      <path
        d={insetSeatPath(
          seatWidth,
          seatHeight,
          seatMarkInset(edgeWidth),
          corners,
        )}
        fill="none"
        strokeWidth={SEAT_MARK_WIDTH}
        style={{ stroke: colors.ring, transition: 'stroke 160ms ease' }}
      >
        {title ? <title>{title}</title> : null}
      </path>
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
  tableCorners = OWN_CORNERS,
  tableEdgeWidth = 1,
  tableEdges = NO_EDGES,
  tableEdgeStroke,
  tableEdgeDash,
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
  nameFontSize,
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

  const seatLabelTransform = lockSeatLabelOrientation
    ? `rotate(${seatTextRotation} ${seatWidth / 2} ${seatHeight / 2})`
    : undefined;
  const lockButtonOffset = seatLockOffset(seatWidth, seatHeight);
  const lockButtonTransform = `translate(${lockButtonOffset.x} ${lockButtonOffset.y})`;
  const normalizedTableRotation = ((tableRotation % 360) + 360) % 360;
  const lockButtonRotationCompensation = lockSeatLabelOrientation
    ? -normalizedTableRotation
    : 0;
  const lockIconOffset = (SEAT_LOCK_BOX - SEAT_LOCK_ICON_SIZE) / 2;
  const lockButtonIconTransform =
    lockButtonRotationCompensation !== 0
      ? `rotate(${lockButtonRotationCompensation} ${SEAT_LOCK_ICON_SIZE / 2} ${SEAT_LOCK_ICON_SIZE / 2})`
      : undefined;
  // The seat itself carries the highlight — never its table, which would
  // mark the neighbours at a double or group table as well.
  const highlightKind = highlightStatus
    ? (highlightTone ?? highlightStatus)
    : null;
  const { t } = useTranslation('generator');

  const highlightTitle =
    highlightKind && !highlightTone && typeof highlightPercentage === 'number'
      ? t('seat.fulfillmentTitle', {
          percentage: formatPercent(highlightPercentage),
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
  const dividerStroke = isDark
    ? 'rgba(226, 232, 240, 0.18)'
    : 'rgba(30, 41, 59, 0.12)';
  // Empty (unoccupied, unlocked) seats read as "empty" purely via their subtle
  // neutral fill — no dashed outline or texture, so they stay visually calm and
  // don't clash with the table frame in step 3, the PDF export and presentation.
  // On a wall a 0.75px hairline is not a line; the contrast mode draws the
  // seat's own contour instead of the table's faint divider. A held seat
  // keeps the divider and draws its contour inside the table's outline
  // (below), where the outline cannot cover it.
  const seatPath = React.useMemo(
    () => insetSeatPath(seatWidth, seatHeight, 0, tableCorners),
    [seatWidth, seatHeight, tableCorners],
  );
  const edgePath = React.useMemo(
    () => seatTableEdgePath(seatWidth, seatHeight, tableEdges),
    [seatWidth, seatHeight, tableEdges],
  );
  const seatStrokeWidth = contrast ? 1.5 : 0.75;
  const seatStrokeValue = contrast ? seatStroke : dividerStroke;
  const showsEdgeLine = locked && !contrast;
  const seatTextOpacity = isOriginSeat ? 0.35 : 1;
  const labelStudent = showsSwapPreview ? swapPreviewStudent : student;
  const displayName = labelStudent
    ? getDisplayNameForMode(labelStudent.name, 'table', nameDisplay, nameLabels)
    : '';
  // The name stands upright in the seat, between its lock and its badges, on
  // one line or two, at the plan's shared size where it fits.
  const labelRotation = lockSeatLabelOrientation ? seatTextRotation : 0;
  const nameFit = React.useMemo(() => {
    const shape = {
      seatWidth,
      seatHeight,
      rotation: labelRotation,
      lock: seatLockReservesRoom(
        Boolean(toggleLock),
        lockRevealOnHover,
        locked,
      ),
    };
    const pill = layoutSeatBadgePill(flags, shape, badgeView);
    return fitNameOnSeat(displayName, shape, pill?.rect ?? null, {
      weight: contrast ? 700 : 400,
      maxFont: Math.min(
        seatNameMaxFontSize(seatWidth, seatHeight),
        nameFontSize ?? Infinity,
      ),
      // Full names all break into first and last name, so a plan reads alike.
      split: nameDisplay === 'full',
    });
  }, [
    seatWidth,
    seatHeight,
    labelRotation,
    flags,
    badgeView,
    toggleLock,
    lockRevealOnHover,
    locked,
    displayName,
    contrast,
    nameFontSize,
    nameDisplay,
  ]);

  // The open lock is hover-revealed on hover-capable pointers; the closed
  // lock always stays visible. Keyboard focus reveals it too, so the toggle
  // remains reachable via Tab. The element stays in the DOM (a11y tree).
  const [lockHasFocus, setLockHasFocus] = React.useState(false);
  const [lockHasVisibleFocus, setLockHasVisibleFocus] = React.useState(false);
  const lockVisible =
    !lockRevealOnHover || locked || isSeatHovered || lockHasFocus;
  // A fingertip gets a wider margin around the lock than the mouse's 24
  // units; more would eat into the seat a finger grabs to drag.
  const lockHitInset = useIsCoarsePointer() ? 7 : 2;
  const beginLockTap = useTapGesture();

  // Keyboard move support: the touch target becomes a focusable button so the
  // seat drag has a keyboard alternative (Enter/Space grab & drop, Escape).
  const keyboardEnabled = Boolean(onSeatKeyDown);
  const [hasVisibleFocus, setHasVisibleFocus] = React.useState(false);
  // The focus ring lies on the mark's line, and inside a mark where there is
  // one, so the two never cross.
  const focusPath = hasVisibleFocus
    ? insetSeatPath(
        seatWidth,
        seatHeight,
        seatFocusInset(tableEdgeWidth, Boolean(dropState || highlightKind)),
        tableCorners,
      )
    : '';
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
      })
    : t('seat.ariaEmpty', {
        ...seatPosition,
      });
  if (locked) {
    seatAriaLabel += `, ${t('seat.ariaLocked')}`;
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
    <g
      transform={`translate(${col * seatWidth} ${row * seatHeight})`}
      {...{
        [SEAT_FLIGHT_ATTR]: seatFlightKey(tableIndex, seatIndex),
        [SEAT_STUDENT_ATTR]: student?.id,
        [SEAT_CENTRE_ATTR]: `${seatWidth / 2} ${seatHeight / 2}`,
      }}
    >
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
        {/* The seat as its table cuts it: the table's radius in the table's
            corners, its own elsewhere — so a copy flying to another seat
            already has the shape it lands in. */}
        <path
          data-seat-shape=""
          d={seatPath}
          fill={seatFill}
          stroke={seatStrokeValue}
          strokeWidth={seatStrokeWidth}
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
        {highlightKind && (
          <SeatMark
            data-seat-highlight={highlightKind}
            seatWidth={seatWidth}
            seatHeight={seatHeight}
            kind={highlightKind}
            corners={tableCorners}
            edgeWidth={tableEdgeWidth}
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
          <SeatMark
            data-seat-drop={dropState}
            seatWidth={seatWidth}
            seatHeight={seatHeight}
            kind={dropState}
            corners={tableCorners}
            edgeWidth={tableEdgeWidth}
          />
        )}
        {/* A held seat's contour: a hairline all round, just inside the
            table's outline, above a mark's tint. */}
        {showsEdgeLine && (
          <path
            data-seat-edge="locked"
            d={insetSeatPath(
              seatWidth,
              seatHeight,
              seatEdgeLineInset(tableEdgeWidth),
              tableCorners,
            )}
            fill="none"
            stroke={seatStroke}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        )}
        {/* Keyboard focus ring - drawn manually because SVG outline rendering
            is inconsistent across browsers. Inset on the mark's line, or
            inside a mark, so the table neither clips nor covers it. Uses a
            two-tone ring (white halo + blue ring, like ring + ring-offset) so
            it stays visible on any seat color in light and dark mode. */}
        {hasVisibleFocus && (
          <>
            <path
              d={focusPath}
              fill="none"
              stroke="#ffffff"
              strokeWidth={4.5}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
            <path
              d={focusPath}
              fill="none"
              stroke="var(--canvas-selection)"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          </>
        )}
        {student && showSeatLabels && (
          <>
            <SeatNameText
              x={seatWidth / 2}
              y={seatHeight / 2}
              fit={nameFit}
              title={getTooltipName(student.name)}
              fontWeight={contrast ? 700 : 400}
              transform={seatLabelTransform}
              fill={textColor}
              style={{
                pointerEvents: 'none',
                opacity: seatTextOpacity,
                transition: 'opacity 150ms ease',
              }}
            />
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
                  // A finger's tap must not turn into a scroll that cancels it
                  touchAction: 'none',
                }}
                className="seat-lock"
                role="button"
                tabIndex={0}
                onFocus={(event) => {
                  setLockHasFocus(true);
                  setLockHasVisibleFocus(
                    matchesFocusVisible(event.currentTarget),
                  );
                }}
                onBlur={() => {
                  setLockHasFocus(false);
                  setLockHasVisibleFocus(false);
                }}
                aria-label={locked ? t('seat.unlockSeat') : t('seat.lockSeat')}
                aria-pressed={locked}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  event.preventDefault();
                  // The lock switches on a tap alone; a press that travels
                  // picks the student up, as one beside the lock does.
                  beginLockTap(event, () =>
                    toggleLock(student.id, tableIndex, seatIndex),
                  );
                  onSeatPointerDown?.(
                    event,
                    seatIndex,
                    locked,
                    true,
                    seatWidth,
                    seatHeight,
                    appearance,
                    flags,
                  );
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
                  {locked ? t('seat.unlockSeat') : t('seat.lockSeat')}
                </title>
                {/* Invisible hit area over the toggle's 20-unit box (24
                    units, 34 for a finger): the icon is drawn without a
                    plate, so the pointer cursor and the click target cover
                    the whole box, not just the painted glyph — otherwise
                    the seat's grab-cursor touch target wins right beside it. */}
                <rect
                  x={-lockHitInset}
                  y={-lockHitInset}
                  width={SEAT_LOCK_BOX + lockHitInset * 2}
                  height={SEAT_LOCK_BOX + lockHitInset * 2}
                  fill="transparent"
                />
                {/* Keyboard focus: the two-tone ring a focused seat wears,
                    round the icon. */}
                {lockHasVisibleFocus && (
                  <g pointerEvents="none">
                    <circle
                      cx={SEAT_LOCK_BOX / 2}
                      cy={SEAT_LOCK_BOX / 2}
                      r={LOCK_FOCUS_RADIUS}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth={4.5}
                      vectorEffect="non-scaling-stroke"
                    />
                    <circle
                      cx={SEAT_LOCK_BOX / 2}
                      cy={SEAT_LOCK_BOX / 2}
                      r={LOCK_FOCUS_RADIUS}
                      fill="none"
                      stroke="var(--canvas-selection)"
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                    />
                  </g>
                )}
                {/* The icon alone, in the colour of a held seat's contour
                    when closed (`.seat-lock` in index.css). */}
                <g transform={`translate(${lockIconOffset} ${lockIconOffset})`}>
                  <g transform={lockButtonIconTransform}>
                    {locked ? (
                      <LockIcon
                        size={SEAT_LOCK_ICON_SIZE}
                        color="currentColor"
                      />
                    ) : (
                      <LockOpenIcon
                        size={SEAT_LOCK_ICON_SIZE}
                        color="currentColor"
                      />
                    )}
                  </g>
                </g>
              </g>
            )}
          </>
        )}
      </g>
      {/* The table's outline along the seat's outer sides. Hidden here, where
          the table draws it; a copy flying to this seat shows it, so nothing
          is added when it lands (`useSeatFlight`). */}
      {tableEdgeStroke && edgePath && (
        <path
          d={edgePath}
          fill="none"
          stroke={tableEdgeStroke}
          strokeWidth={tableEdgeWidth}
          strokeDasharray={tableEdgeDash}
          strokeLinejoin="round"
          strokeLinecap="round"
          visibility="hidden"
          pointerEvents="none"
          {...{ [SEAT_FLIGHT_EDGE_ATTR]: '' }}
        />
      )}
    </g>
  );
}

interface TableSeatBadgeOverlayProps {
  student: Student | null;
  /** The seat's name for a flight (`seatFlightKey`): the badges travel with it. */
  flightKey?: string;
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
  flightKey,
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
  // The pill stands upright with the name, so it is sized and placed in the
  // name's frame: at a quarter turn the seat's width is its height, on a seat
  // turned at a slant it sits as low as the seat's outline allows.
  const labelRotation = lockSeatLabelOrientation ? seatTextRotation : 0;
  const pill = React.useMemo(
    () =>
      layoutSeatBadgePill(
        getSeatBadges(
          student,
          allStudents,
          showSpecialNeeds,
          badgeView?.filter,
        ),
        { seatWidth, seatHeight, rotation: labelRotation },
        badgeView,
      ),
    [
      student,
      allStudents,
      showSpecialNeeds,
      badgeView,
      seatWidth,
      seatHeight,
      labelRotation,
    ],
  );
  const fit = pill?.fit;

  if (!student || !fit || !pill) {
    return null;
  }

  const seatLabelTransform = lockSeatLabelOrientation
    ? `rotate(${seatTextRotation} ${seatWidth / 2} ${seatHeight / 2})`
    : undefined;
  const seatTextOpacity = isOriginSeat ? 0.35 : 1;

  return (
    <g
      transform={`translate(${col * seatWidth} ${row * seatHeight})`}
      {...{ [SEAT_FLIGHT_PART_ATTR]: flightKey }}
    >
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
          x={seatWidth / 2 + pill.rect.x}
          y={seatHeight / 2 + pill.rect.y}
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

  // The table's corners and outline the marks and the seat's shape follow
  if (prevProps.tableEdgeWidth !== nextProps.tableEdgeWidth) return false;
  if (
    prevProps.tableEdgeStroke !== nextProps.tableEdgeStroke ||
    prevProps.tableEdgeDash !== nextProps.tableEdgeDash
  )
    return false;
  if (
    prevProps.tableEdges !== nextProps.tableEdges &&
    (prevProps.tableEdges ?? NO_EDGES).some(
      (edge, i) => edge !== (nextProps.tableEdges ?? NO_EDGES)[i],
    )
  )
    return false;
  if (
    prevProps.tableCorners !== nextProps.tableCorners &&
    (prevProps.tableCorners ?? OWN_CORNERS).some(
      (corner, i) => corner !== (nextProps.tableCorners ?? OWN_CORNERS)[i],
    )
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
    prevProps.nameFontSize !== nextProps.nameFontSize ||
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
