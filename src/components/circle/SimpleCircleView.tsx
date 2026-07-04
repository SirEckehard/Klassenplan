// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useState, useCallback } from 'react';
import type { CircleLayout } from '@/types/Circle';
import type { PhotoDisplayMode, Student } from '@/types';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';
import { angleToPosition } from '@/utils/math/circleGeometry';
import {
  GRID_SIZE,
  getDisplayName,
  getTooltipName,
  calculateSeatLabelFontSize,
  logDebug,
} from '@/utils';
import {
  getStudentAppearance,
  getAllStudentBadges,
  calculateBadgePillLayout,
} from '@/utils/ui/studentAppearance';
import { computeTokenPhotoLayout } from '@/utils/ui/studentTokenLayout';
import { useCircleDragDrop } from '@/hooks/circle/useCircleDragDrop';
import { useIsMobile } from '@/hooks/ui/useIsMobile';
import { useStudentPhotoUrls } from '@/hooks/student/useStudentPhoto';

// Connection display modes
export type ConnectionDisplayMode = 'off' | 'subtle';

type SimpleCircleViewProps = {
  layout: CircleLayout;
  isDark?: boolean;
  showSpecialNeeds?: boolean;
  /** When false, gender colors are dropped for a neutral (colorless) render. */
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
  onPhotoModeChange?: (mode: PhotoDisplayMode) => void;
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
}: SimpleCircleViewProps) {
  const isMobile = useIsMobile();
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

  // Photo display mode — falls back to a persisted local value (parity with the
  // seating plan's all/hover/off control). Default 'all' preserves prior behaviour.
  const photoMode: PhotoDisplayMode = (() => {
    if (externalPhotoMode) return externalPhotoMode;
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.circlePhotoMode);
      if (stored === 'all' || stored === 'hover' || stored === 'off') {
        return stored;
      }
    } catch (error) {
      logDebug('Failed to read circle photo mode from localStorage', { error });
    }
    return 'all';
  })();
  // Hover mode tracks the pointer-hovered token so only its photo is revealed.
  const [hoveredPhotoPosition, setHoveredPhotoPosition] = useState<
    number | null
  >(null);

  // Drag and drop functionality
  const { dragState, handlePointerDown, svgRef } = useCircleDragDrop({
    layout,
    editable,
    onStudentMove,
  });

  const seatRadius = 30;
  const seatDiameter = seatRadius * 2;
  const badgeBaseIconSize = isMobile ? 9 : 10;
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

  const getCircleAppearance = (student: Student | null) => {
    return {
      ...getStudentAppearance(student, isDark, !showGenderColors),
      flags: getAllStudentBadges(student, allStudents, {
        showSpecialNeeds,
        showPartners: showSpecialNeeds,
        showHeight: showSpecialNeeds,
        showEnvironment: showSpecialNeeds,
      }),
    };
  };

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

  // Calculate positions for each student slot
  const studentSlots = Array.from(
    { length: layout.students.length },
    (_, index) => {
      const angle = (360 / layout.students.length) * index;
      const position = angleToPosition(angle, layout.center, renderRadius);
      return {
        position: index,
        angle,
        x: position.x,
        y: position.y,
      };
    },
  );

  // Map students to their current positions
  const studentPositionMap = new Map<number, (typeof layout.students)[0]>();
  layout.students.forEach((studentPos, index) => {
    studentPositionMap.set(index, studentPos);
  });

  const previewAppearance = dragState.dragPreview
    ? getCircleAppearance(dragState.dragPreview.student ?? null)
    : null;
  const previewRadius = 25;
  const previewBadgeMaxHeightValue =
    previewRadius - (badgeMinNameSpacing + badgeMinBottomSpacing);
  const previewBadgeMaxHeight =
    previewBadgeMaxHeightValue > 0 ? previewBadgeMaxHeightValue : undefined;
  const previewBadgeLayout =
    previewAppearance && previewAppearance.flags.length > 0
      ? calculateBadgePillLayout({
          availableWidth: 50 - 8,
          iconCount: previewAppearance.flags.length,
          baseIconSize: 9,
          minIconSize: 6,
          horizontalPadding: 5,
          verticalPadding: 2,
          maxHeight: previewBadgeMaxHeight,
        })
      : null;
  const previewBadgeOffset =
    previewBadgeLayout && previewBadgeLayout.height > 0
      ? computeBadgeOffset(previewRadius, previewBadgeLayout.height)
      : 0;
  const previewDisplayName = dragState.dragPreview?.student
    ? getDisplayName(dragState.dragPreview.student.name, 'circle')
    : '';
  const previewFontSize = calculateSeatLabelFontSize(
    previewDisplayName,
    previewRadius * 2,
  );

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

      <svg
        ref={svgRef}
        width="100%"
        viewBox="0 0 900 600"
        className="block w-full h-auto rounded-lg"
        style={{
          aspectRatio: '3 / 2',
          backgroundColor: transparentBackground
            ? 'transparent'
            : isDark
              ? '#1f2937'
              : '#f9fafb',
          backgroundImage: showGrid
            ? `linear-gradient(to right, ${isDark ? '#374151' : '#e5e7eb'} 1px, transparent 1px), linear-gradient(to bottom, ${isDark ? '#374151' : '#e5e7eb'} 1px, transparent 1px)`
            : undefined,
          backgroundSize: showGrid
            ? `${GRID_SIZE}px ${GRID_SIZE}px`
            : undefined,
          touchAction: editable ? 'none' : 'auto',
        }}
      >
        {/* Preserved neighborhood connections - MOVED BEFORE position slots to render behind */}
        {connectionMode === 'subtle' &&
          layout.students.map((studentPosition, currentIndex) =>
            studentPosition.preservedNeighbors.map((neighborId) => {
              const neighborIndex = layout.students.findIndex(
                (pos) => pos.student.id === neighborId,
              );

              if (neighborIndex === -1 || currentIndex > neighborIndex)
                return null;

              const currentSlot = studentSlots[currentIndex];
              const neighborSlot = studentSlots[neighborIndex];

              // Calculate center of the circle
              const centerX = 450; // Half of 900px viewport width
              const centerY = 300; // Half of 600px viewport height

              const pathData = createArcPath(
                currentSlot.x,
                currentSlot.y,
                neighborSlot.x,
                neighborSlot.y,
                centerX,
                centerY,
              );

              return (
                <path
                  key={`${studentPosition.student.id}-${neighborId}`}
                  d={pathData}
                  fill="none"
                  stroke={isDark ? '#22c55e' : '#16a34a'}
                  strokeWidth="2"
                  opacity="0.4"
                  strokeLinecap="round"
                />
              );
            }),
          )}

        {/* Position slots */}
        {studentSlots.map((slot) => {
          const studentPosition = studentPositionMap.get(slot.position);
          const appearance = getCircleAppearance(
            studentPosition?.student ?? null,
          );
          const studentDisplayName = studentPosition?.student
            ? getDisplayName(studentPosition.student.name, 'circle')
            : '';
          const studentTooltip = studentPosition?.student
            ? getTooltipName(studentPosition.student.name)
            : '';
          const seatFontSize = calculateSeatLabelFontSize(
            studentDisplayName,
            seatDiameter,
          );
          const isDragged = dragState.draggedPosition === slot.position;
          const isHovered = dragState.hoverPosition === slot.position;
          const seatScale = isHovered ? 1.06 : 1;
          const seatOpacity = isDragged ? 0.3 : 1;
          const seatStrokeColor = isHovered ? '#16a34a' : appearance.stroke;
          const seatStrokeWidth = isHovered ? 2 : 1;
          const badgeLayout =
            appearance.flags.length > 0
              ? calculateBadgePillLayout({
                  availableWidth: seatDiameter - 14,
                  iconCount: appearance.flags.length,
                  baseIconSize: badgeBaseIconSize,
                  minIconSize: 5,
                  horizontalPadding: 4,
                  verticalPadding: 1,
                  rowGap: 2,
                  maxRows: 3,
                  maxHeight: badgeMaxHeight,
                  minIconsForWrap: 5,
                })
              : null;
          const badgeFill = isDark
            ? 'rgba(15, 23, 42, 0.7)'
            : 'rgba(255, 255, 255, 0.92)';
          const badgeStroke = isDark
            ? 'rgba(148, 163, 184, 0.45)'
            : 'rgba(148, 163, 184, 0.65)';
          const badgeOffset =
            badgeLayout && badgeLayout.height > 0
              ? computeBadgeOffset(seatRadius, badgeLayout.height)
              : 0;

          return (
            <g key={slot.position}>
              {/* Drop zone indicator */}
              {isHovered && (
                <circle
                  cx={slot.x}
                  cy={slot.y}
                  r="32"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="3"
                  opacity="0.8"
                />
              )}

              {/* Student or empty slot */}
              {studentPosition ? (
                <g
                  style={{
                    cursor: editable
                      ? isDragged
                        ? 'grabbing'
                        : 'grab'
                      : 'default',
                  }}
                >
                  <g
                    style={{
                      transform: `scale(${seatScale})`,
                      transformOrigin: 'center',
                      transformBox: 'fill-box',
                      opacity: seatOpacity,
                      transition: isDragged
                        ? 'opacity 0.1s ease'
                        : 'transform 140ms ease, opacity 160ms ease',
                    }}
                  >
                    {/* Draggable area - larger on mobile for better touch interaction */}
                    <circle
                      cx={slot.x}
                      cy={slot.y}
                      r={isMobile ? '48' : '35'}
                      fill="transparent"
                      onPointerDown={(e) =>
                        handlePointerDown(
                          e,
                          slot.position,
                          studentPosition.student.id,
                        )
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
                        cursor: editable ? 'grab' : 'default',
                        touchAction: 'none',
                      }}
                    />

                    {/* Student circle */}
                    <circle
                      cx={slot.x}
                      cy={slot.y}
                      r="30"
                      fill={appearance.fill}
                      stroke={seatStrokeColor}
                      strokeWidth={seatStrokeWidth}
                      pointerEvents="none"
                      style={{
                        filter: isDragged
                          ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
                          : 'none',
                        transition: isDragged
                          ? 'none'
                          : 'fill 0.2s ease, stroke 0.2s ease, stroke-width 0.2s ease',
                      }}
                    />

                    {/* Optional student photo: small circular avatar docked
                        radially just outside the token, away from the circle
                        centre, so it never overlaps the name. */}
                    {(() => {
                      const photoVisible =
                        photoMode === 'all' ||
                        (photoMode === 'hover' &&
                          hoveredPhotoPosition === slot.position);
                      if (!photoVisible) return null;
                      const photoUrl = studentPosition.student.hasPhoto
                        ? photoUrls.get(studentPosition.student.id)
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
                    {appearance.flags.length > 0 && badgeLayout && (
                      <g style={{ pointerEvents: 'none' }}>
                        <g
                          transform={`translate(${slot.x - badgeLayout.width / 2} ${slot.y + badgeOffset})`}
                        >
                          <rect
                            width={badgeLayout.width}
                            height={badgeLayout.height}
                            rx={badgeLayout.height / 2}
                            fill={badgeFill}
                            stroke={badgeStroke}
                            strokeWidth={0.8}
                          />
                          {appearance.flags.map((flag, index) => {
                            const Icon = flag.icon;
                            const color =
                              'color' in flag ? flag.color : '#d97706';
                            const position = badgeLayout.iconPositions[index];
                            if (!position) {
                              return null;
                            }
                            return (
                              <g
                                key={flag.key}
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
                    )}
                  </g>
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

        {/* Drag Preview */}
        {dragState.dragPreview && previewAppearance && (
          <g style={{ pointerEvents: 'none' }}>
            {/* Preview student circle */}
            <circle
              cx={dragState.dragPreview.x}
              cy={dragState.dragPreview.y}
              r="25"
              fill={previewAppearance.fill}
              stroke={previewAppearance.stroke}
              strokeWidth={2.5}
              opacity="0.8"
              style={{
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
              }}
            />
            {/* Preview student name */}
            <text
              x={dragState.dragPreview.x}
              y={dragState.dragPreview.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={previewFontSize}
              fontWeight="500"
              fill={previewAppearance.text}
              opacity="0.8"
              style={{ userSelect: 'none' }}
            >
              {previewDisplayName}
            </text>
            {/* Preview special needs indicators */}
            {previewAppearance.flags.length > 0 && previewBadgeLayout && (
              <g opacity="0.8">
                <g
                  transform={`translate(${dragState.dragPreview.x - previewBadgeLayout.width / 2} ${dragState.dragPreview.y + previewBadgeOffset})`}
                >
                  <rect
                    width={previewBadgeLayout.width}
                    height={previewBadgeLayout.height}
                    rx={previewBadgeLayout.height / 2}
                    fill="rgba(255, 255, 255, 0.95)"
                    stroke="rgba(148, 163, 184, 0.6)"
                    strokeWidth={0.8}
                  />
                  {previewAppearance.flags.map(
                    ({ key, icon: Icon, tooltip }, index) => {
                      const position = previewBadgeLayout.iconPositions[index];
                      if (!position) {
                        return null;
                      }
                      return (
                        <g
                          key={key}
                          transform={`translate(${position.x} ${position.y})`}
                        >
                          <Icon
                            size={previewBadgeLayout.iconSize}
                            color="#d97706"
                          >
                            <title>{tooltip}</title>
                          </Icon>
                        </g>
                      );
                    },
                  )}
                </g>
              </g>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}

// Memoize for better performance with complex SVG rendering
export default React.memo(SimpleCircleView);
