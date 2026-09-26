// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { CircleLayout } from '@/types/Circle';
import type { PhotoDisplayMode, Student } from '@/types';
import { angleToPosition } from '@/utils/math/circleGeometry';
import { summarizeCircle } from '@/utils/algorithm/circleSummary';
import {
  GRID_SIZE,
  getDisplayNameForMode,
  getTooltipName,
  calculateSeatLabelFontSize,
  logDebug,
  type NameDisplayMode,
} from '@/utils';
import { LockIcon, LockOpenIcon } from '@phosphor-icons/react';
import {
  describeBadge,
  getStudentAppearance,
  SEAT_UI_COLORS,
} from '@/utils/ui/studentAppearance';
import {
  fitSeatBadges,
  getBadgeHighlightStudentIds,
  getSeatBadges,
  LEGIBLE_BADGE_ICON_SIZE,
  BADGE_MORE_KEY,
  type BadgeFocus,
  type SeatBadgeView,
} from '@/utils/ui/seatBadges';
import SeatBadgePill from '@/components/scene/SeatBadgePill';
import BadgeTooltipLayer from '@/components/scene/BadgeTooltip';
import { computeTokenPhotoLayout } from '@/utils/ui/studentTokenLayout';
import { useCircleDragDrop } from '@/hooks/circle/useCircleDragDrop';
import { useCircleKeyboardMove } from '@/hooks/circle/useCircleKeyboardMove';
import { useHasHoverPointer } from '@/hooks/ui/useHasHoverPointer';
import DragGhost from '@/components/scene/DragGhost';
import { useLayoutMode } from '@/hooks/ui/useLayoutMode';
import { useIsCoarsePointer } from '@/hooks/ui/useCoarsePointer';
import { useStudentPhotoUrls } from '@/hooks/student/useStudentPhoto';
import { useNameLabels } from '@/hooks/student/useNameLabels';

// Connection display modes
export type ConnectionDisplayMode = 'off' | 'subtle';

type SimpleCircleViewProps = {
  layout: CircleLayout;
  isDark?: boolean;
  showSpecialNeeds?: boolean;
  /** When false, the gender tint is dropped for a paper seat (the beamer's colour switch). */
  showGenderColors?: boolean;
  showGrid?: boolean;
  /** Drop the canvas background so the circle blends into the page (present mode). */
  transparentBackground?: boolean;
  editable?: boolean;
  onStudentMove?: (studentId: string, targetPosition: number) => void;
  onSyncCircle?: () => void;
  connectionMode?: ConnectionDisplayMode;
  onConnectionModeChange?: (mode: ConnectionDisplayMode) => void;
  /** How student photos show on the circle tokens: all / hover / off. */
  photoMode?: PhotoDisplayMode;
  /** Uniform name rule for the tokens (see {@link NameDisplayMode}). */
  nameDisplay?: NameDisplayMode;
  onPhotoModeChange?: (mode: PhotoDisplayMode) => void;
  /** Which badges the tokens show and how (see `SeatBadgeView`). */
  badgeView?: SeatBadgeView;
  /** The badge being pointed at — here or in the legend — whose seats light up. */
  badgeFocus?: BadgeFocus | null;
  /** Reports the badge under the pointer, so the host can keep one focus. */
  onBadgeFocusChange?: (focus: BadgeFocus | null) => void;
  /** Whether pointing at a badge explains it in a tooltip. */
  showBadgeTooltip?: boolean;
  /** Locks a student to their place, or lets them go (editable circle only). */
  onToggleLock?: (studentId: string) => void;
};

/**
 * Simplified circle view with real drag-and-drop like table seating
 */
function SimpleCircleView({
  layout,
  isDark = false,
  showSpecialNeeds = true,
  showGenderColors = true,
  showGrid = false,
  transparentBackground = false,
  editable = false,
  onStudentMove,
  connectionMode: externalConnectionMode,
  onConnectionModeChange,
  photoMode: externalPhotoMode,
  nameDisplay,
  badgeView,
  badgeFocus = null,
  onBadgeFocusChange,
  showBadgeTooltip = true,
  onToggleLock,
}: SimpleCircleViewProps) {
  const { t } = useTranslation('generator');
  const layoutMode = useLayoutMode();
  const isCoarsePointer = useIsCoarsePointer();
  // Connection display mode - with localStorage persistence
  const [localConnectionMode, setLocalConnectionMode] =
    useState<ConnectionDisplayMode>(() => {
      if (externalConnectionMode) return externalConnectionMode;
      try {
        const stored = localStorage.getItem('circle-connection-mode');
        return (stored as ConnectionDisplayMode) || 'subtle';
      } catch (error) {
        logDebug('Failed to read circle connection mode from localStorage', {
          error,
        });
        return 'subtle';
      }
    });

  // Use external mode if provided, otherwise local
  const connectionMode = externalConnectionMode || localConnectionMode;

  const handleConnectionModeToggle = useCallback(() => {
    const nextMode: ConnectionDisplayMode =
      connectionMode === 'off' ? 'subtle' : 'off';

    if (onConnectionModeChange) {
      onConnectionModeChange(nextMode);
    } else {
      setLocalConnectionMode(nextMode);
      try {
        localStorage.setItem('circle-connection-mode', nextMode);
      } catch (error) {
        logDebug('Failed to persist circle connection mode to localStorage', {
          error,
        });
      }
    }
  }, [connectionMode, onConnectionModeChange]);

  // Photo display mode: the host passes the setting the table plan shares
  // (`CanvasPreferencesContext`); on its own the circle shows every photo.
  const photoMode: PhotoDisplayMode = externalPhotoMode ?? 'all';
  // Hover mode tracks the pointer-hovered token so only its photo is revealed.
  const [hoveredPhotoPosition, setHoveredPhotoPosition] = useState<
    number | null
  >(null);

  const seatRadius = 30;
  const seatDiameter = seatRadius * 2;
  // A fit constant, not a touch target: the badge rows have to stay inside the
  // seat wherever the whole circle is scaled down. Keyed on the layout tier the
  // width used to decide, so nothing about the drawing changes here.
  const badgeBaseIconSize = layoutMode === 'desktop' ? 10 : 9;
  const badgeMinNameSpacing = 4;
  const badgeMinBottomSpacing = 4;
  // Allow 4px more vertical space for the badge so 3 rows fit in the circle.
  const badgeMaxHeightValue = seatRadius - 4;
  const badgeMaxHeight =
    badgeMaxHeightValue > 0 ? badgeMaxHeightValue : undefined;
  const computeBadgeOffset = (radius: number, height: number) => {
    const rawOffset = radius - height - 6;
    const maxAllowedOffset = Math.max(
      badgeMinNameSpacing,
      radius - height - badgeMinBottomSpacing,
    );
    const desiredOffset = Math.max(rawOffset, badgeMinNameSpacing);
    return Math.min(desiredOffset, maxAllowedOffset);
  };

  // Memoize allStudents to avoid N map+filter operations per render
  const allStudents = React.useMemo(
    () =>
      layout.students
        .map((sp) => sp.student)
        .filter((s): s is Student => s !== null),
    [layout.students],
  );

  const photoUrls = useStudentPhotoUrls(allStudents);
  const nameLabels = useNameLabels(allStudents, nameDisplay);

  // The arcs join table neighbours who are still side by side. Read off the
  // current order: the neighbour lists stored on each position describe the
  // order the circle was built in, and a drag leaves them behind.
  const keptTablePairs = React.useMemo(
    () => summarizeCircle(layout).tableNeighbors.kept,
    [layout],
  );
  const slotIndexById = React.useMemo(() => {
    const byId = new Map<string, number>();
    layout.students.forEach((position, index) => {
      if (position?.student) byId.set(position.student.id, index);
    });
    return byId;
  }, [layout.students]);

  // When any student has a photo, shrink the ring so the avatars docked just
  // outside each token still fit inside the 900×600 viewBox (otherwise the
  // top/bottom photos get clipped by the canvas edge). The clearance equals the
  // photo's outer reach from the token centre (seatRadius + 2×photoRadius) plus
  // a small padding. With no photos the layout is left untouched.
  const renderRadius = React.useMemo(() => {
    const anyPhoto = allStudents.some((s) => s.hasPhoto);
    if (!anyPhoto) return layout.radius;
    const VIEWBOX_WIDTH = 900;
    const VIEWBOX_HEIGHT = 600;
    const photoReach = seatRadius + 2 * 18 + 6; // max circle avatar r = 18
    const maxH =
      Math.min(layout.center.x, VIEWBOX_WIDTH - layout.center.x) - photoReach;
    const maxV =
      Math.min(layout.center.y, VIEWBOX_HEIGHT - layout.center.y) - photoReach;
    const scale = Math.min(
      layout.radius.horizontal > 0
        ? Math.min(1, maxH / layout.radius.horizontal)
        : 1,
      layout.radius.vertical > 0
        ? Math.min(1, maxV / layout.radius.vertical)
        : 1,
    );
    return {
      horizontal: layout.radius.horizontal * scale,
      vertical: layout.radius.vertical * scale,
    };
  }, [allStudents, layout.radius, layout.center]);

  // Where every place is drawn. The drag finds its target among these, so it
  // agrees with the drawing — also when photos make the circle smaller.
  const studentSlots = React.useMemo(
    () =>
      Array.from({ length: layout.students.length }, (_, index) => {
        const angle = (360 / layout.students.length) * index;
        const position = angleToPosition(angle, layout.center, renderRadius);
        return { position: index, angle, x: position.x, y: position.y };
      }),
    [layout.students.length, layout.center, renderRadius],
  );

  // Held places: they neither give their student away nor take another. Only
  // the editable circle knows about them — the projection shows a circle.
  const lockedIds = React.useMemo(
    () => new Set(editable ? (layout.lockedStudentIds ?? []) : []),
    [editable, layout.lockedStudentIds],
  );
  const isPositionLocked = useCallback(
    (position: number) => {
      const id = layout.students[position]?.student?.id;
      return id !== undefined && lockedIds.has(id);
    },
    [layout.students, lockedIds],
  );

  // The places a student just moved between ring green for a moment.
  const [dropConfirm, setDropConfirm] = useState<{
    id: number;
    positions: number[];
  } | null>(null);
  React.useEffect(() => {
    if (!dropConfirm) return undefined;
    const timeout = window.setTimeout(() => setDropConfirm(null), 900);
    return () => window.clearTimeout(timeout);
  }, [dropConfirm]);
  const handleMoved = useCallback(
    (from: number, to: number) =>
      setDropConfirm({ id: Date.now(), positions: [from, to] }),
    [],
  );

  const keyboard = useCircleKeyboardMove({
    layout,
    editable,
    isPositionLocked,
    onStudentMove,
    onMoved: handleMoved,
  });
  const { announce } = keyboard;

  // A pointer drop is said in the keyboard's live region too.
  const handlePointerMoved = useCallback(
    (from: number, to: number) => {
      handleMoved(from, to);
      announce(
        t('drag.announce.swapped', {
          name: getTooltipName(layout.students[from]?.student?.name ?? ''),
          other: getTooltipName(layout.students[to]?.student?.name ?? ''),
        }),
      );
    },
    [announce, handleMoved, layout.students, t],
  );

  // Drag and drop functionality
  const { dragState, handlePointerDown, svgRef } = useCircleDragDrop({
    layout,
    editable,
    onStudentMove,
    slotPositions: studentSlots,
    isPositionLocked,
    onMoved: handlePointerMoved,
  });

  // One origin and one target, whichever of pointer and keyboard moves.
  const originPosition = dragState.draggedPosition ?? keyboard.keyboardOrigin;
  const targetPosition = dragState.isDragging
    ? dragState.hoverPosition
    : keyboard.keyboardTarget;
  const targetBlocked =
    targetPosition !== null && isPositionLocked(targetPosition);

  const hasHoverPointer = useHasHoverPointer();
  const lockMode = isDark ? 'dark' : 'light';
  const [hoveredToken, setHoveredToken] = useState<number | null>(null);
  const [focusedToken, setFocusedToken] = useState<number | null>(null);
  const [focusedLock, setFocusedLock] = useState<number | null>(null);

  const getCircleAppearance = (student: Student | null) => {
    const locked = student ? lockedIds.has(student.id) : false;
    return {
      ...getStudentAppearance(student, isDark, locked, false, showGenderColors),
      flags: getSeatBadges(
        student,
        allStudents,
        showSpecialNeeds,
        badgeView?.filter,
      ),
    };
  };
  const collapseBadges = Boolean(badgeView?.collapse);

  // The seats a hovered badge points at, ringed like a drop target.
  const highlightedIds = React.useMemo(
    () =>
      badgeFocus && badgeFocus.badgeKey !== BADGE_MORE_KEY
        ? getBadgeHighlightStudentIds(
            badgeFocus.badgeKey,
            badgeFocus.studentId,
            allStudents,
          )
        : null,
    [allStudents, badgeFocus],
  );

  // Function to create arc path for connections
  const createArcPath = useCallback(
    (
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      centerX: number,
      centerY: number,
    ) => {
      // Calculate the midpoint
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;

      // Calculate direction from center to midpoint (for outward arc)
      const directionX = midX - centerX;
      const directionY = midY - centerY;
      const directionLength = Math.sqrt(
        directionX * directionX + directionY * directionY,
      );

      // Guard against division by zero (when midpoint equals center)
      if (directionLength === 0) {
        // Fallback to straight line if we can't determine arc direction
        return `M ${x1} ${y1} L ${x2} ${y2}`;
      }

      // Normalize and extend outward
      const normalizedX = directionX / directionLength;
      const normalizedY = directionY / directionLength;

      // Arc control point (extend outward by 40 pixels)
      const arcDistance = 40;
      const controlX = midX + normalizedX * arcDistance;
      const controlY = midY + normalizedY * arcDistance;

      return `M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`;
    },
    [],
  );

  // Handle drag start
  // Keyboard navigation for connection toggle
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if no input field is focused
      const activeElement = document.activeElement;
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement instanceof HTMLSelectElement
      ) {
        return;
      }

      // 'C' key toggles connections
      if (event.key.toLowerCase() === 'c' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        handleConnectionModeToggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleConnectionModeToggle]);

  // Map students to their current positions
  const studentPositionMap = new Map<number, (typeof layout.students)[0]>();
  layout.students.forEach((studentPos, index) => {
    studentPositionMap.set(index, studentPos);
  });

  // The dragged student, for the preview above the pointer.
  const draggedStudent =
    dragState.draggedPosition !== null
      ? (layout.students[dragState.draggedPosition]?.student ?? null)
      : null;
  const previewAppearance = draggedStudent
    ? getCircleAppearance(draggedStudent)
    : null;
  // Over another place the drag is a swap: who would come here instead.
  const swapStudent =
    originPosition !== null && targetPosition !== null && !targetBlocked
      ? (layout.students[targetPosition]?.student ?? null)
      : null;
  const circleName = (student: Student) =>
    getDisplayNameForMode(student.name, 'circle', nameDisplay, nameLabels);

  return (
    <div className="relative w-full">
      {/* CSS Animations */}
      <style>{`
        @keyframes drag-feedback {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* Text equivalent of the circle, in order. The editable circle's
          tokens are focusable as well; the projection's are not. */}
      <ol
        className="sr-only"
        aria-label={t('circleView.orderLabel', 'Sitzreihenfolge im Sitzkreis')}
      >
        {layout.students.map((studentPosition) => (
          <li key={studentPosition.student.id}>
            {studentPosition.student.name}
          </li>
        ))}
      </ol>

      <svg
        ref={svgRef}
        width="100%"
        viewBox="0 0 900 600"
        className="block h-auto w-full"
        // Focusable tokens need a group: an image hides its children.
        role={editable ? 'group' : 'img'}
        aria-label={t('circleView.canvasLabel', {
          count: layout.students.length,
        })}
        style={{
          aspectRatio: '3 / 2',
          backgroundColor: transparentBackground
            ? 'transparent'
            : 'var(--canvas-bg)',
          backgroundImage: showGrid
            ? 'linear-gradient(to right, var(--border-card) 1px, transparent 1px), linear-gradient(to bottom, var(--border-card) 1px, transparent 1px)'
            : undefined,
          backgroundSize: showGrid
            ? `${GRID_SIZE}px ${GRID_SIZE}px`
            : undefined,
          touchAction: editable ? 'none' : 'auto',
        }}
      >
        {/* Table neighbours still side by side, drawn before the slots so
            they sit behind them */}
        {connectionMode === 'subtle' &&
          keptTablePairs.map(([firstId, secondId]) => {
            const firstSlot = studentSlots[slotIndexById.get(firstId) ?? -1];
            const secondSlot = studentSlots[slotIndexById.get(secondId) ?? -1];
            if (!firstSlot || !secondSlot) return null;

            // Calculate center of the circle
            const centerX = 450; // Half of 900px viewport width
            const centerY = 300; // Half of 600px viewport height

            const pathData = createArcPath(
              firstSlot.x,
              firstSlot.y,
              secondSlot.x,
              secondSlot.y,
              centerX,
              centerY,
            );

            return (
              <path
                key={`${firstId}-${secondId}`}
                d={pathData}
                fill="none"
                stroke={isDark ? '#22c55e' : '#16a34a'}
                strokeWidth="2"
                opacity="0.4"
                strokeLinecap="round"
              />
            );
          })}

        {/* Position slots */}
        {studentSlots.map((slot) => {
          const studentPosition = studentPositionMap.get(slot.position);
          const student = studentPosition?.student ?? null;
          const isOrigin = originPosition === slot.position;
          const isTarget = targetPosition === slot.position;
          // Over a taken place the origin shows who would come here instead.
          const labelStudent = isOrigin && swapStudent ? swapStudent : student;
          const appearance = getCircleAppearance(student);
          const studentDisplayName = labelStudent
            ? circleName(labelStudent)
            : '';
          const studentTooltip = student ? getTooltipName(student.name) : '';
          const seatFontSize = calculateSeatLabelFontSize(
            studentDisplayName,
            seatDiameter,
          );
          const seatOpacity = isOrigin ? (swapStudent ? 0.6 : 0.3) : 1;
          const locked = student ? lockedIds.has(student.id) : false;
          const badgeFit = fitSeatBadges(
            appearance.flags,
            {
              availableWidth: seatDiameter - 14,
              baseIconSize: badgeBaseIconSize,
              minIconSize: collapseBadges ? LEGIBLE_BADGE_ICON_SIZE : 5,
              horizontalPadding: 4,
              verticalPadding: 1,
              rowGap: 2,
              maxRows: 3,
              maxHeight: badgeMaxHeight,
              minIconsForWrap: 5,
            },
            { collapse: collapseBadges, prioritize: badgeView?.prioritize },
          );
          const badgeOffset =
            badgeFit && badgeFit.layout.height > 0
              ? computeBadgeOffset(seatRadius, badgeFit.layout.height)
              : 0;
          const isBadgeHighlighted = Boolean(
            student && highlightedIds?.has(student.id),
          );
          const confirmed =
            dropConfirm?.positions.includes(slot.position) ?? false;
          const canToggleLock = editable && Boolean(onToggleLock) && student;
          // The closed lock always shows; the open one on hover, on focus,
          // and always where nothing can hover.
          const lockVisible =
            locked ||
            !hasHoverPointer ||
            hoveredToken === slot.position ||
            focusedLock === slot.position;
          const tokenLabel = student
            ? [
                t('circleView.keyboard.tokenLabel', {
                  name: getTooltipName(student.name),
                  position: slot.position + 1,
                }),
                locked ? t('seat.ariaLocked') : null,
                appearance.flags.length > 0
                  ? t('seat.ariaBadges', {
                      list: appearance.flags
                        .map((flag) => describeBadge(flag).heading)
                        .join(', '),
                    })
                  : null,
              ]
                .filter(Boolean)
                .join(', ')
            : '';

          return (
            <g key={slot.position}>
              {/* Student or empty slot */}
              {student ? (
                <g
                  onPointerEnter={() => setHoveredToken(slot.position)}
                  onPointerLeave={() =>
                    setHoveredToken((current) =>
                      current === slot.position ? null : current,
                    )
                  }
                  style={{
                    opacity: seatOpacity,
                    transition: 'opacity 160ms ease',
                  }}
                >
                  {/* Drag target: sized for the pointer, not the viewport. A
                      tablet in landscape is 1180px wide and used to get the
                      mouse-sized circle although every drag is a fingertip.
                      In the editable circle it is also the keyboard's
                      handle on the student. */}
                  <circle
                    ref={
                      editable
                        ? keyboard.registerToken(slot.position)
                        : undefined
                    }
                    cx={slot.x}
                    cy={slot.y}
                    r={isCoarsePointer ? '48' : '35'}
                    fill="transparent"
                    tabIndex={editable ? 0 : undefined}
                    role={editable ? 'button' : undefined}
                    aria-label={editable ? tokenLabel : undefined}
                    aria-pressed={editable ? isOrigin : undefined}
                    onKeyDown={
                      editable
                        ? (event) =>
                            keyboard.handleKeyDown(event, slot.position)
                        : undefined
                    }
                    onFocus={
                      editable
                        ? (event) => {
                            setFocusedToken(
                              isFocusVisible(event.currentTarget)
                                ? slot.position
                                : null,
                            );
                            keyboard.handleFocus(slot.position);
                          }
                        : undefined
                    }
                    onBlur={
                      editable
                        ? () =>
                            setFocusedToken((current) =>
                              current === slot.position ? null : current,
                            )
                        : undefined
                    }
                    onPointerDown={(e) =>
                      handlePointerDown(e, slot.position, student.id)
                    }
                    onPointerEnter={
                      photoMode === 'hover'
                        ? () => setHoveredPhotoPosition(slot.position)
                        : undefined
                    }
                    onPointerLeave={
                      photoMode === 'hover'
                        ? () =>
                            setHoveredPhotoPosition((current) =>
                              current === slot.position ? null : current,
                            )
                        : undefined
                    }
                    style={{
                      cursor: editable && !locked ? 'grab' : 'default',
                      touchAction: 'none',
                      outline: 'none',
                    }}
                  />

                  {/* Student circle */}
                  <circle
                    cx={slot.x}
                    cy={slot.y}
                    r="30"
                    fill={appearance.fill}
                    stroke={appearance.stroke}
                    strokeWidth={1}
                    pointerEvents="none"
                    style={{
                      transition: 'fill 0.2s ease, stroke 0.2s ease',
                    }}
                  />

                  {/* Where the dragged student would land, and where one
                      just did: a tint under the name and a ring inside the
                      token, as on a seat of the table plan. */}
                  {isTarget && (
                    <TokenRing
                      cx={slot.x}
                      cy={slot.y}
                      kind={targetBlocked ? 'blocked' : 'target'}
                    />
                  )}
                  {/* A badge being pointed at marks this student: the same
                      steady ring a seat of the table plan wears for it. */}
                  {isBadgeHighlighted && !isTarget && (
                    <TokenRing cx={slot.x} cy={slot.y} kind="focus" />
                  )}
                  {confirmed && !isTarget && (
                    <TokenRing
                      key={dropConfirm?.id}
                      cx={slot.x}
                      cy={slot.y}
                      kind="confirm"
                    />
                  )}

                  {/* Keyboard focus: a white halo and a blue ring round the
                      token, visible on any tint. */}
                  {focusedToken === slot.position && (
                    <g pointerEvents="none">
                      <circle
                        cx={slot.x}
                        cy={slot.y}
                        r={33}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth={4.5}
                      />
                      <circle
                        cx={slot.x}
                        cy={slot.y}
                        r={33}
                        fill="none"
                        strokeWidth={2}
                        style={{ stroke: 'var(--border-option-selected)' }}
                      />
                    </g>
                  )}

                  {/* Optional student photo: small circular avatar docked
                      radially just outside the token, away from the circle
                      centre, so it never overlaps the name. */}
                  {(() => {
                    const photoVisible =
                      photoMode === 'all' ||
                      (photoMode === 'hover' &&
                        hoveredPhotoPosition === slot.position);
                    if (!photoVisible) return null;
                    const photoUrl = student.hasPhoto
                      ? photoUrls.get(student.id)
                      : undefined;
                    if (!photoUrl) return null;
                    const { avatar } = computeTokenPhotoLayout({
                      shape: 'circle',
                      centerX: slot.x,
                      centerY: slot.y,
                      width: seatDiameter,
                      height: seatDiameter,
                      hasPhoto: true,
                      nameFontSize: seatFontSize,
                      outward: {
                        dirX: slot.x - layout.center.x,
                        dirY: slot.y - layout.center.y,
                        tokenRadius: seatRadius,
                      },
                    });
                    if (!avatar) return null;
                    const clipId = `circle-photo-${slot.position}`;
                    return (
                      <g pointerEvents="none">
                        <defs>
                          <clipPath id={clipId}>
                            <circle
                              cx={avatar.cx}
                              cy={avatar.cy}
                              r={avatar.r}
                            />
                          </clipPath>
                        </defs>
                        <image
                          href={photoUrl}
                          x={avatar.cx - avatar.r}
                          y={avatar.cy - avatar.r}
                          width={avatar.r * 2}
                          height={avatar.r * 2}
                          preserveAspectRatio="xMidYMid slice"
                          clipPath={`url(#${clipId})`}
                        />
                        <circle
                          cx={avatar.cx}
                          cy={avatar.cy}
                          r={avatar.r}
                          fill="none"
                          stroke={appearance.stroke}
                          strokeWidth={1}
                        />
                      </g>
                    );
                  })()}

                  {/* Student name with improved readability */}
                  <text
                    x={slot.x}
                    y={slot.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={seatFontSize}
                    fontWeight="400"
                    fill={appearance.text}
                    pointerEvents="none"
                    style={{ userSelect: 'none' }}
                  >
                    <title>{studentTooltip}</title>
                    {studentDisplayName}
                  </text>

                  {/* Special needs and partner indicators */}
                  {badgeFit && (
                    <g style={{ pointerEvents: 'none' }}>
                      <SeatBadgePill
                        fit={badgeFit}
                        studentId={student.id}
                        isDark={isDark}
                        x={slot.x - badgeFit.layout.width / 2}
                        y={slot.y + badgeOffset}
                      />
                    </g>
                  )}

                  {/* The lock: inside the token's upper left, as on a seat
                      of the table plan, clear of the name and the photo. */}
                  {canToggleLock && (
                    <g
                      role="button"
                      tabIndex={0}
                      aria-label={
                        locked ? t('seat.unlockSeat') : t('seat.lockSeat')
                      }
                      aria-pressed={locked}
                      onFocus={() => setFocusedLock(slot.position)}
                      onBlur={() =>
                        setFocusedLock((current) =>
                          current === slot.position ? null : current,
                        )
                      }
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        onToggleLock?.(student.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          event.stopPropagation();
                          onToggleLock?.(student.id);
                        }
                      }}
                      style={{
                        cursor: 'pointer',
                        opacity: lockVisible ? 1 : 0,
                        pointerEvents: lockVisible ? 'auto' : 'none',
                        transition: 'opacity 150ms ease',
                      }}
                    >
                      <title>
                        {locked ? t('seat.unlockSeat') : t('seat.lockSeat')}
                      </title>
                      <circle
                        cx={slot.x - 14}
                        cy={slot.y - 16}
                        r={12}
                        fill="transparent"
                      />
                      <circle
                        cx={slot.x - 14}
                        cy={slot.y - 16}
                        r={8}
                        fill={SEAT_UI_COLORS.lockButtonBackground[lockMode]}
                        stroke={SEAT_UI_COLORS.lockButtonBorder[lockMode]}
                        strokeWidth={1}
                      />
                      <g
                        transform={`translate(${slot.x - 18.5} ${slot.y - 20.5})`}
                      >
                        {locked ? (
                          <LockIcon
                            size={9}
                            color={SEAT_UI_COLORS.lockIcon[lockMode]}
                          />
                        ) : (
                          <LockOpenIcon
                            size={9}
                            color={SEAT_UI_COLORS.unlockIcon[lockMode]}
                          />
                        )}
                      </g>
                    </g>
                  )}
                </g>
              ) : (
                /* Empty slot */
                <g>
                  <circle
                    cx={slot.x}
                    cy={slot.y}
                    r="25"
                    fill="none"
                    stroke={isDark ? '#555' : '#ccc'}
                    strokeWidth="2"
                    strokeDasharray="3,3"
                    opacity="0.5"
                  />
                </g>
              )}
            </g>
          );
        })}
      </svg>
      <BadgeTooltipLayer
        svgRef={svgRef}
        allStudents={allStudents}
        enabled={!dragState.isDragging}
        showTooltip={showBadgeTooltip}
        onFocusChange={onBadgeFocusChange}
      />
      {dragState.isDragging &&
        dragState.pointer &&
        draggedStudent &&
        previewAppearance && (
          <DragGhost
            x={dragState.pointer.x}
            y={dragState.pointer.y}
            shape="token"
            width={seatDiameter}
            height={seatDiameter}
            viewportScale={dragState.viewportScale}
            name={circleName(draggedStudent)}
            appearance={previewAppearance}
            badges={previewAppearance.flags}
            swapWith={swapStudent ? circleName(swapStudent) : null}
            isDark={isDark}
          />
        )}
      {editable && (
        <span role="status" aria-live="polite" className="sr-only">
          {keyboard.announcement}
        </span>
      )}
    </div>
  );
}

/** Where a student would land, where one cannot, and where one just did. */
const TOKEN_RING_COLORS = {
  target: {
    ring: 'var(--border-option-selected)',
    tint: 'var(--surface-option-selected)',
  },
  focus: {
    ring: 'var(--border-option-selected)',
    tint: 'var(--surface-option-selected)',
  },
  blocked: { ring: 'var(--status-alert)', tint: 'var(--status-alert-surface)' },
  confirm: { ring: 'var(--status-ok)', tint: 'var(--status-ok-surface)' },
} as const;

function TokenRing({
  cx,
  cy,
  kind,
}: {
  cx: number;
  cy: number;
  kind: keyof typeof TOKEN_RING_COLORS;
}) {
  const colors = TOKEN_RING_COLORS[kind];
  return (
    <g
      data-token-ring={kind}
      className={kind === 'confirm' ? 'seat-drop-confirm' : undefined}
      pointerEvents="none"
    >
      <circle cx={cx} cy={cy} r={30} style={{ fill: colors.tint }} />
      <circle
        cx={cx}
        cy={cy}
        r={27.5}
        fill="none"
        strokeWidth={3}
        style={{ stroke: colors.ring }}
      />
    </g>
  );
}

/** Keyboard focus only, like `:focus-visible`; true where that is unknown. */
const isFocusVisible = (element: Element) => {
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
};

// Memoize for better performance with complex SVG rendering
export default React.memo(SimpleCircleView);
