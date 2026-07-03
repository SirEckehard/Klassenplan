// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { LockIcon, LockOpenIcon } from '@phosphor-icons/react';
import type {
  StatisticHighlightMode,
  StatisticStatus,
  Student,
} from '@/types';
import {
  getStudentAppearance,
  getAllStudentBadges,
  SEAT_UI_COLORS,
  STUDENT_COLORS,
  calculateBadgePillLayout,
} from '@/utils/ui/studentAppearance';
import {
  getDisplayName,
  getTooltipName,
  calculateSeatLabelFontSize,
} from '@/utils';

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
  locked: boolean;
  isOriginSeat: boolean;
  isHoverSeat: boolean;
  isHoverLockedSeat: boolean;
  isLockedFeedbackSeat: boolean;
  showSpecialNeeds: boolean;
  showFullNames: boolean;
  /** When false, the seat name label and lock toggle are hidden (layout editor). */
  showSeatLabels?: boolean;
  lockSeatLabelOrientation: boolean;
  seatTextRotation: number;
  toggleLock?: (studentId: string, table: number, seat: number) => void;
  highlightStatus?: StatisticStatus;
  highlightMode?: StatisticHighlightMode;
  highlightPercentage?: number;
  onSeatPointerDown?: (
    e: React.PointerEvent<SVGRectElement>,
    seatIndex: number,
    locked: boolean,
    hasStudent: boolean,
    seatWidth: number,
    seatHeight: number,
    appearance: ReturnType<typeof getStudentAppearance>,
    flags: ReturnType<typeof getAllStudentBadges>,
  ) => void;
  onSeatPointerUp?: (
    e: React.PointerEvent<SVGRectElement>,
    seatIndex: number,
    locked: boolean,
  ) => void;
  /** Pointer enter/leave on the seat, used to grow this seat's photo dot. */
  onSeatPointerEnter?: (seatIndex: number) => void;
  onSeatPointerLeave?: (seatIndex: number) => void;
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

const HIGHLIGHT_STROKES: Record<StatisticStatus, string> = {
  ok: '#2563eb',
  warn: '#f97316',
  alert: '#dc2626',
};

const HIGHLIGHT_FILLS_LIGHT: Record<StatisticStatus, string> = {
  ok: '#dbeafe',
  warn: '#fff7ed',
  alert: '#fef2f2',
};

const HIGHLIGHT_FILLS_DARK: Record<StatisticStatus, string> = {
  ok: 'rgba(147, 197, 253, 0.28)',
  warn: 'rgba(251, 191, 36, 0.22)',
  alert: 'rgba(248, 113, 113, 0.24)',
};

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
  locked,
  isOriginSeat,
  isHoverSeat,
  isHoverLockedSeat,
  isLockedFeedbackSeat,
  showSpecialNeeds,
  showFullNames,
  showSeatLabels = true,
  lockSeatLabelOrientation,
  seatTextRotation,
  highlightStatus,
  highlightMode,
  highlightPercentage,
  toggleLock,
  onSeatPointerDown,
  onSeatPointerUp,
  onSeatPointerEnter,
  onSeatPointerLeave,
}: TableSeatProps) {
  // Memoize appearance calculation - only recompute when dependencies change
  const appearance = React.useMemo(
    () => getStudentAppearance(student, isDark, locked),
    [student, isDark, locked],
  );

  // Memoize badge flags calculation
  const flags = React.useMemo(
    () =>
      getAllStudentBadges(student, allStudents, {
        showSpecialNeeds,
        showPartners: showSpecialNeeds,
        showHeight: showSpecialNeeds,
        showEnvironment: showSpecialNeeds,
      }),
    [student, allStudents, showSpecialNeeds],
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
  const highlightStroke = highlightStatus
    ? HIGHLIGHT_STROKES[highlightStatus]
    : null;
  const highlightFill = highlightStatus
    ? isDark
      ? HIGHLIGHT_FILLS_DARK[highlightStatus]
      : HIGHLIGHT_FILLS_LIGHT[highlightStatus]
    : null;
  const highlightPulseFill = isDark
    ? 'rgba(147, 197, 253, 0.42)'
    : 'rgba(59, 130, 246, 0.3)';
  const effectiveHighlightFill =
    highlightStatus && highlightMode === 'hover'
      ? highlightPulseFill
      : highlightFill;
  const highlightOpacity = highlightStatus
    ? highlightMode === 'persistent'
      ? isDark
        ? 0.9
        : 0.45
      : isDark
        ? 0.75
        : 0.42
    : 0;
  const { t } = useTranslation('generator');

  const highlightTitle =
    highlightStatus && typeof highlightPercentage === 'number'
      ? t('seat.fulfillmentTitle', {
          percentage: Math.round(highlightPercentage),
          defaultValue: `Erfüllung ${Math.round(highlightPercentage)}%`,
        })
      : undefined;
  const highlightAnimationClass =
    highlightStatus && highlightMode === 'hover' ? 'animate-pulse' : '';

  const seatScale = isHoverSeat ? 1.06 : 1;
  const seatGroupOpacity = isOriginSeat ? 0.35 : 1;
  const seatStrokeColor = isLockedFeedbackSeat
    ? '#ef4444'
    : isHoverLockedSeat
      ? '#ef4444'
      : isHoverSeat && !locked
        ? '#16a34a'
        : seatStroke;
  const seatFillColor = isLockedFeedbackSeat
    ? '#fee2e2'
    : isHoverLockedSeat
      ? '#fee2e2'
      : seatFill;
  const showInteractiveSeatStroke =
    isLockedFeedbackSeat || isHoverLockedSeat || (isHoverSeat && !locked);
  const dividerStroke = isDark
    ? 'rgba(226, 232, 240, 0.18)'
    : 'rgba(30, 41, 59, 0.12)';
  // Empty (unoccupied, unlocked) seats get a clearer dashed outline so they
  // stand out from occupied seats in step 3 and the PDF export.
  const isEmptySeat = !student && !locked && !showInteractiveSeatStroke;
  const emptySeatStroke = STUDENT_COLORS.empty.stroke[mode];
  // Fill empty seats with a subtle dotted texture so they read as "empty" even
  // when the dashed outline blends into the table edge (step 3 + PDF export).
  const emptyDotsPatternId = `empty-dots-${tableIndex}-${seatIndex}`;
  const emptyDotsFill = isDark ? '#6b7280' : '#cbd5e1';
  const seatStrokeWidth = showInteractiveSeatStroke
    ? 2
    : locked
      ? 1
      : isEmptySeat
        ? 1
        : 0.75;
  const seatStrokeValue = showInteractiveSeatStroke
    ? seatStrokeColor
    : locked
      ? seatStroke
      : isEmptySeat
        ? emptySeatStroke
        : dividerStroke;
  const effectiveSeatStrokeWidth = seatStrokeWidth;
  const effectiveSeatStrokeValue = seatStrokeValue;
  const seatTextOpacity = isOriginSeat ? 0.35 : 1;
  const displayContext = showFullNames ? 'full' : 'table';
  const displayName = student
    ? getDisplayName(student.name, displayContext)
    : '';
  const seatFontSize = calculateSeatLabelFontSize(displayName, seatWidth);

  return (
    <g transform={`translate(${col * seatWidth} ${row * seatHeight})`}>
      <g
        style={{
          transform: `scale(${seatScale})`,
          transformOrigin: 'center',
          transformBox: 'fill-box',
          opacity: seatGroupOpacity,
          transition: 'transform 140ms ease, opacity 160ms ease',
        }}
      >
        {/* Touch target area - minimum 44x44px for better touch accessibility.
            Only rendered when seats are interactive (step 3 editor); in static
            contexts (layout editor, export) it would otherwise swallow table
            drag events from neighbouring tables. */}
        {(onSeatPointerDown || onSeatPointerUp) && (
          <rect
            width={Math.max(seatWidth, 44)}
            height={Math.max(seatHeight, 44)}
            x={seatWidth < 44 ? -(44 - seatWidth) / 2 : 0}
            y={seatHeight < 44 ? -(44 - seatHeight) / 2 : 0}
            fill="transparent"
            data-seat-index={seatIndex}
            data-table-index={tableIndex}
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
            onPointerEnter={
              onSeatPointerEnter
                ? () => onSeatPointerEnter(seatIndex)
                : undefined
            }
            onPointerLeave={
              onSeatPointerLeave
                ? () => onSeatPointerLeave(seatIndex)
                : undefined
            }
            style={{
              cursor: !locked && student ? 'grab' : 'default',
              touchAction: 'none',
            }}
          />
        )}
        {/* Visual seat rectangle */}
        <rect
          width={seatWidth}
          height={seatHeight}
          fill={seatFillColor}
          stroke={effectiveSeatStrokeValue}
          strokeWidth={effectiveSeatStrokeWidth}
          strokeDasharray={isEmptySeat ? '3 3' : undefined}
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
        {isEmptySeat && (
          <>
            <defs>
              <pattern
                id={emptyDotsPatternId}
                width={5}
                height={5}
                patternUnits="userSpaceOnUse"
              >
                <circle cx={1} cy={1} r={0.85} fill={emptyDotsFill} />
              </pattern>
            </defs>
            <rect
              width={seatWidth}
              height={seatHeight}
              rx={4}
              fill={`url(#${emptyDotsPatternId})`}
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
              fontWeight="semibold"
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
                  opacity: seatTextOpacity,
                  transition: 'opacity 150ms ease',
                  pointerEvents: 'auto',
                }}
                role="button"
                tabIndex={0}
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
        {highlightStroke && (
          <>
            <rect
              width={seatWidth}
              height={seatHeight}
              rx={4}
              fill={effectiveHighlightFill ?? 'none'}
              stroke={highlightStroke}
              strokeWidth={4.6}
              vectorEffect="non-scaling-stroke"
              opacity={highlightOpacity}
              className={highlightAnimationClass}
              style={{
                pointerEvents: 'none',
                transition:
                  'stroke 160ms ease, stroke-width 160ms ease, opacity 140ms ease',
                mixBlendMode: 'normal',
              }}
            >
              {highlightTitle ? <title>{highlightTitle}</title> : null}
            </rect>
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
  isDark,
  isOriginSeat,
  lockSeatLabelOrientation,
  seatTextRotation,
}: TableSeatBadgeOverlayProps) {
  const flags = React.useMemo(
    () =>
      getAllStudentBadges(student, allStudents, {
        showSpecialNeeds,
        showPartners: showSpecialNeeds,
        showHeight: showSpecialNeeds,
        showEnvironment: showSpecialNeeds,
      }),
    [student, allStudents, showSpecialNeeds],
  );

  const badgeLayout = React.useMemo(() => {
    if (flags.length === 0) {
      return null;
    }

    const availableWidth = Math.max(seatWidth - 12, 30);
    const baseIconSize = Math.max(7, Math.min(10, seatWidth * 0.2));
    const horizontalPadding = Math.max(4, Math.round(seatWidth * 0.08));

    return calculateBadgePillLayout({
      availableWidth,
      iconCount: flags.length,
      baseIconSize,
      minIconSize: 5,
      horizontalPadding,
      verticalPadding: 1,
      rowGap: 2,
      maxRows: 3,
      maxHeight: Math.max(14, seatHeight * 0.45),
      minIconsForWrap: 5,
    });
  }, [flags, seatWidth, seatHeight]);

  if (flags.length === 0 || !badgeLayout) {
    return null;
  }

  const badgePillFill = isDark
    ? 'rgba(15, 23, 42, 0.68)'
    : 'rgba(248, 250, 252, 0.92)';
  const badgePillStroke = isDark
    ? 'rgba(148, 163, 184, 0.45)'
    : 'rgba(148, 163, 184, 0.7)';
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
        <g
          transform={`translate(${(seatWidth - badgeLayout.width) / 2} ${seatHeight - badgeLayout.height - 6})`}
        >
          <rect
            width={badgeLayout.width}
            height={badgeLayout.height}
            rx={badgeLayout.height / 2}
            fill={badgePillFill}
            stroke={badgePillStroke}
            strokeWidth={0.8}
            style={{
              transition: 'fill 150ms ease, stroke 150ms ease',
            }}
          />
          {flags.map((flag, index) => {
            const Icon = flag.icon;
            const color = 'color' in flag ? flag.color : '#d97706';
            const position = badgeLayout.iconPositions[index];
            if (!position) {
              return null;
            }
            return (
              <g
                key={`${flag.key}-${index}`}
                transform={`translate(${position.x} ${position.y})`}
              >
                <Icon size={badgeLayout.iconSize} color={color}>
                  <title>{flag.tooltip}</title>
                </Icon>
              </g>
            );
          })}
        </g>
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

  // CheckIcon position changes
  if (
    prevProps.col !== nextProps.col ||
    prevProps.row !== nextProps.row ||
    prevProps.seatWidth !== nextProps.seatWidth ||
    prevProps.seatHeight !== nextProps.seatHeight
  )
    return false;

  // CheckIcon visual state changes
  if (
    prevProps.isDark !== nextProps.isDark ||
    prevProps.showFullNames !== nextProps.showFullNames ||
    prevProps.showSeatLabels !== nextProps.showSeatLabels ||
    prevProps.seatTextRotation !== nextProps.seatTextRotation ||
    prevProps.tableRotation !== nextProps.tableRotation
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
      prev.wishPartnerId !== next.wishPartnerId ||
      prev.avoidPartnerId !== next.avoidPartnerId
    ) {
      return false;
    }
  }

  // All checks passed - props are equivalent
  return true;
});

MemoizedTableSeat.displayName = 'TableSeat';

export default MemoizedTableSeat;
