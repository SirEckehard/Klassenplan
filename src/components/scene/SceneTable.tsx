// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useMemo, useReducer, useRef } from 'react';
import type {
  Student,
  ClassroomTable,
  PhotoDisplayMode,
} from '@/types';
import {
  TABLE_CORNER_RADIUS,
  getSeatHighlight,
  type SeatHighlightLookup,
} from '@/utils';
import { getStudentAppearance } from '@/utils/ui/studentAppearance';
import {
  calculateSeatLayout,
  determineSeatEdge,
} from '@/utils/math/positionCalculations';
import type {
  DragHover,
  DragOrigin,
  LockedDropTarget,
  DragSeatConfig,
} from '@/hooks/ui/useDragDropState';
import SeatGrid, { type SeatConfig } from '@/components/scene/SeatGrid';
import RotationHandle from '@/components/scene/RotationHandle';
import { useSeatDrag } from '@/hooks/scene/useSeatDrag';
import { useTableRotation } from '@/hooks/scene/useTableRotation';

type TableProps = {
  table: ClassroomTable;
  index: number;
  students: (Student | null)[];
  allStudents?: Student[];
  /** Optional studentId -> photo URL map (Object URL live / Data URL export). */
  photoUrls?: ReadonlyMap<string, string>;
  selected: boolean;
  onPointerDown?: (e: React.PointerEvent<SVGGElement>) => void;
  moveStudent?: (
    fromTable: number,
    fromSeat: number,
    toTable: number,
    toSeat: number,
  ) => boolean;
  draggable?: boolean;
  isSeatLocked?: (table: number, seat: number) => boolean;
  toggleLock?: (studentId: string, table: number, seat: number) => void;
  onUpdate: () => void;
  onTransformStart?: () => void;
  editable: boolean;
  sceneTables?: ClassroomTable[];
  selectedTableIds?: number[];
  onSeatDragStart?: (student: Student, config: DragSeatConfig) => void;
  onSeatDrag?: (x: number, y: number) => void;
  onSeatDragEnd?: () => void;
  dragOrigin?: DragOrigin | null;
  dragHover?: DragHover | null;
  lockedDropTarget?: LockedDropTarget | null;
  onSeatHoverChange?: (hover: DragHover | null) => void;
  onSeatDropRejected?: (target: DragHover) => void;
  showSpecialNeeds?: boolean;
  isDark?: boolean;
  lockSeatLabelOrientation?: boolean;
  seatLabelRotation?: number;
  showFullNames?: boolean;
  seatHighlights?: SeatHighlightLookup | null;
  /**
   * Controls the seat *content*: 'full' renders the seat rectangles, names and
   * badges (step 3 / export); 'dots' hides them (layout editor). Chair dots at
   * the table edge are drawn in both modes.
   */
  seatMarkerMode?: 'full' | 'dots';
  /**
   * How student photos are shown on the seat dots at the table edges:
   * 'all' grows every dot with a photo, 'hover' only the hovered seat's dot,
   * 'off' keeps the plain small dots. Hover is interactive (editor) only.
   */
  photoDisplayMode?: PhotoDisplayMode;
  /** Mirror counter-flip for the student-perspective view (keeps glyphs legible). */
  mirrored?: boolean;
};

function SceneTable({
  table,
  index,
  students,
  allStudents = [],
  photoUrls,
  selected,
  onPointerDown,
  moveStudent,
  draggable,
  isSeatLocked,
  toggleLock,
  onUpdate,
  onTransformStart,
  editable,
  sceneTables,
  selectedTableIds,
  onSeatDragStart,
  onSeatDrag,
  onSeatDragEnd,
  dragOrigin = null,
  dragHover = null,
  lockedDropTarget = null,
  onSeatHoverChange,
  onSeatDropRejected,
  showSpecialNeeds = true,
  isDark = false,
  lockSeatLabelOrientation = true,
  seatLabelRotation = 0,
  showFullNames = false,
  seatHighlights = null,
  seatMarkerMode = 'full',
  photoDisplayMode = 'off',
  mirrored = false,
}: TableProps) {
  const tableRef = useRef<SVGGElement>(null);
  const hoverPhotosEnabled = photoDisplayMode === 'hover';
  const [hoveredSeatIndex, setHoveredSeatIndex] = React.useState<number | null>(
    null,
  );
  const inverseRotation = -table.rotation;
  const seatTextRotation = inverseRotation + seatLabelRotation;
  const clipPathId = useMemo(
    () =>
      `table-seat-clip-${index}-${Math.round(table.x)}-${Math.round(table.y)}`,
    [index, table.x, table.y],
  );
  const [, forceLocalRender] = useReducer((value: number) => value + 1, 0);

  const { handleRotate } = useTableRotation({
    table,
    index,
    tableRef,
    onUpdate,
    onTransformStart,
    selectedTableIds,
    sceneTables,
    forceLocalRender,
  });

  const { handleSeatPointerDown, handleSeatPointerUp } = useSeatDrag({
    draggable,
    moveStudent,
    index,
    students,
    isSeatLocked,
    onSeatDragStart,
    onSeatDrag,
    onSeatDragEnd,
    onSeatHoverChange,
    onSeatDropRejected,
    showFullNames,
  });

  const { templateType, seatCount, width, height } = table;
  const seatLayout = useMemo(
    () => calculateSeatLayout({ templateType, seatCount, width, height }),
    [templateType, seatCount, width, height],
  );
  const { cols, rows, seatWidth, seatHeight, positions } = seatLayout;

  const tableFill = isDark ? '#374151' : '#fff';
  const tableStroke = selected ? '#3b82f6' : isDark ? '#d1d5db' : '#000';

  // Chair dots: one small filled dot per seat, docked just outside the table
  // edge the seat faces. The facing edge is derived per template via
  // determineSeatEdge (the same logic the table-template previews use) so it is
  // correct for every table type, not only the 4-seat group. Drawn outside the
  // seat clip group so they sit against the table border instead of inside it.
  const chairFill = isDark ? '#9ca3af' : '#94a3b8';
  const chairRadius = Math.max(2.5, Math.min(5, Math.min(seatWidth, seatHeight) * 0.12));
  // Dock tangentially: the dot/photo sits fully outside the table and its inner
  // edge just kisses the outer edge of the table border stroke (half of the 1px
  // base border), so it touches the border without overlapping into the table.
  const TABLE_BORDER_HALF = 0.5;
  // When a dot "grows" into a photo avatar it scales with the seat but stays
  // small enough that neighbouring dots (≈ one seat width/height apart) don't
  // overlap (diameter ≈ 0.7 × the smaller seat dimension).
  const photoRadius = Math.max(
    9,
    Math.min(18, Math.min(seatWidth, seatHeight) * 0.35),
  );
  const chairDots = useMemo(() => {
    const fallback = Math.max(cols, 1);
    return students.map((_, seatIndex) => {
      const position = positions[seatIndex] ?? {
        col: seatIndex % fallback,
        row: Math.floor(seatIndex / fallback),
      };
      const edge = determineSeatEdge(
        templateType,
        position,
        { cols, rows },
        seatCount,
      );
      const colCenter = position.col * seatWidth + seatWidth / 2;
      const rowCenter = position.row * seatHeight + seatHeight / 2;
      let cx = colCenter;
      let cy = rowCenter;
      // Outward normal of the facing edge — dots and photos are offset along it
      // so they dock just *outside* the table border instead of straddling it.
      let nx = 0;
      let ny = 0;
      if (edge === 'left') {
        cx = 0;
        nx = -1;
      } else if (edge === 'right') {
        cx = table.width;
        nx = 1;
      } else if (edge === 'top') {
        cy = 0;
        ny = -1;
      } else {
        cy = table.height;
        ny = 1;
      }
      return { key: seatIndex, cx, cy, nx, ny };
    });
  }, [
    students,
    positions,
    cols,
    rows,
    seatWidth,
    seatHeight,
    table.width,
    table.height,
    templateType,
    seatCount,
  ]);

  const handleTablePointerDown = (e: React.PointerEvent<SVGGElement>) => {
    if (typeof e.currentTarget.setPointerCapture === 'function') {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    onPointerDown?.(e);
  };

  const fallbackCols = Math.max(cols, 1);
  const seatConfigs: SeatConfig[] = students.map((seatStudent, seatIndex) => {
    const { col, row } = positions[seatIndex] ?? {
      col: seatIndex % fallbackCols,
      row: Math.floor(seatIndex / fallbackCols),
    };

    const locked = isSeatLocked ? isSeatLocked(index, seatIndex) : false;
    const isOriginSeat =
      dragOrigin?.tableIndex === index && dragOrigin.seatIndex === seatIndex;
    const isHoverSeat =
      dragHover?.tableIndex === index && dragHover.seatIndex === seatIndex;
    const isHoverLockedSeat = isHoverSeat && !!dragHover?.locked;
    const isLockedFeedbackSeat =
      lockedDropTarget?.tableIndex === index &&
      lockedDropTarget.seatIndex === seatIndex;
    const highlight = seatHighlights
      ? getSeatHighlight(seatHighlights, index, seatIndex)
      : undefined;

    return {
      student: seatStudent,
      seatIndex,
      col,
      row,
      locked,
      isOriginSeat,
      isHoverSeat,
      isHoverLockedSeat,
      isLockedFeedbackSeat,
      highlightStatus: highlight?.status,
      highlightMode: highlight?.mode,
      highlightPercentage: highlight?.percentage,
    };
  });

  const tableHighlightPriority = React.useMemo(() => {
    let status: 'ok' | 'warn' | 'alert' | null = null;
    for (const config of seatConfigs) {
      if (!config.highlightStatus) continue;
      if (config.highlightStatus === 'alert') {
        status = 'alert';
        break;
      }
      if (config.highlightStatus === 'warn') {
        status = 'warn';
      }
      if (config.highlightStatus === 'ok') {
        status = status ?? 'ok';
      }
    }
    return status;
  }, [seatConfigs]);

  const tableHighlightStroke =
    tableHighlightPriority === 'alert'
      ? '#ef4444'
      : tableHighlightPriority === 'warn'
        ? '#f59e0b'
        : tableHighlightPriority === 'ok'
          ? '#22c55e'
          : null;
  const tableHighlightOpacity = tableHighlightPriority ? 1 : 0;
  const baseTableStrokeOpacity = 1;
  const baseTableStrokeWidth = selected ? 2.4 : 1;

  return (
    <g
      ref={tableRef}
      data-table-index={index}
      transform={`translate(${table.x + table.width / 2} ${
        table.y + table.height / 2
      }) rotate(${table.rotation}) translate(${-table.width / 2} ${
        -table.height / 2
      })`}
      onPointerDown={table.locked ? undefined : handleTablePointerDown}
      onContextMenu={(e) => {
        if (table.locked) return;
        e.preventDefault();
      }}
      style={{
        cursor: table.locked ? 'default' : 'move',
        touchAction: 'none',
      }}
    >
      <defs>
        <clipPath id={clipPathId}>
          <rect
            width={table.width}
            height={table.height}
            rx={TABLE_CORNER_RADIUS}
          />
        </clipPath>
      </defs>
      <rect
        width={table.width}
        height={table.height}
        fill={tableFill}
        rx={TABLE_CORNER_RADIUS}
      />
      {/* Seat rectangles always render so seat colours and the table's seat
          dividers stay visible (incl. the layout editor in step 2). In 'dots'
          mode the seat labels/badges are hidden, leaving only colours + dividers. */}
      <SeatGrid
        clipPathId={clipPathId}
        seatConfigs={seatConfigs}
        tableIndex={index}
        seatWidth={seatWidth}
        seatHeight={seatHeight}
        tableRotation={table.rotation}
        allStudents={allStudents}
        showSpecialNeeds={showSpecialNeeds}
        showFullNames={showFullNames}
        showSeatLabels={seatMarkerMode === 'full'}
        mirrored={mirrored}
        lockSeatLabelOrientation={lockSeatLabelOrientation}
        seatTextRotation={seatTextRotation}
        isDark={isDark}
        toggleLock={toggleLock}
        onSeatPointerDown={draggable ? handleSeatPointerDown : undefined}
        onSeatPointerUp={draggable ? handleSeatPointerUp : undefined}
        onSeatPointerEnter={
          hoverPhotosEnabled
            ? (seatIndex) => setHoveredSeatIndex(seatIndex)
            : undefined
        }
        onSeatPointerLeave={
          hoverPhotosEnabled
            ? (seatIndex) =>
                setHoveredSeatIndex((current) =>
                  current === seatIndex ? null : current,
                )
            : undefined
        }
      />
      {chairDots.map((dot) => {
        const seatStudent = students[dot.key] ?? null;
        const photoUrl =
          seatMarkerMode === 'full' && seatStudent?.hasPhoto
            ? photoUrls?.get(seatStudent.id)
            : undefined;
        const showPhoto =
          !!photoUrl &&
          (photoDisplayMode === 'all' ||
            (photoDisplayMode === 'hover' && hoveredSeatIndex === dot.key));

        if (!showPhoto || !photoUrl) {
          // Dock the dot tangentially against the table border: fully outside,
          // inner edge kissing the border's outer edge.
          return (
            <circle
              key={`chair-${dot.key}`}
              cx={dot.cx + dot.nx * (chairRadius + TABLE_BORDER_HALF)}
              cy={dot.cy + dot.ny * (chairRadius + TABLE_BORDER_HALF)}
              r={chairRadius}
              fill={chairFill}
              pointerEvents="none"
            />
          );
        }

        // Dock the photo tangentially against the table border: fully outside,
        // inner edge kissing the border's outer edge (no protrusion into the
        // seat/name tag).
        const photoCx = dot.cx + dot.nx * (photoRadius + TABLE_BORDER_HALF);
        const photoCy = dot.cy + dot.ny * (photoRadius + TABLE_BORDER_HALF);
        // Counter-rotate the avatar about its own centre so the photo stays
        // upright when the table is rotated — same rule the seat labels use.
        const uprightTransform = lockSeatLabelOrientation
          ? `rotate(${seatTextRotation} ${photoCx} ${photoCy})`
          : undefined;
        const ringStroke = getStudentAppearance(seatStudent, isDark).stroke;
        const clipId = `chair-photo-${index}-${dot.key}`;
        return (
          <g
            key={`chair-${dot.key}`}
            transform={uprightTransform}
            pointerEvents="none"
          >
            {/* Inner group carries the entrance animation (hover mode only) so
                the rotate attribute above and the CSS transform don't collide. */}
            <g
              style={
                photoDisplayMode === 'hover'
                  ? {
                      animation: 'seat-photo-pop 130ms ease-out',
                      transformBox: 'fill-box',
                      transformOrigin: 'center',
                    }
                  : undefined
              }
            >
              <defs>
                <clipPath id={clipId}>
                  <circle cx={photoCx} cy={photoCy} r={photoRadius} />
                </clipPath>
              </defs>
              <circle
                cx={photoCx}
                cy={photoCy}
                r={photoRadius}
                fill={isDark ? '#374151' : '#fff'}
              />
              <image
                href={photoUrl}
                x={photoCx - photoRadius}
                y={photoCy - photoRadius}
                width={photoRadius * 2}
                height={photoRadius * 2}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#${clipId})`}
              />
              <circle
                cx={photoCx}
                cy={photoCy}
                r={photoRadius}
                fill="none"
                stroke={isDark ? '#1f2937' : '#fff'}
                strokeWidth={2.5}
              />
              <circle
                cx={photoCx}
                cy={photoCy}
                r={photoRadius}
                fill="none"
                stroke={ringStroke}
                strokeWidth={1.25}
              />
            </g>
          </g>
        );
      })}
      <rect
        width={table.width}
        height={table.height}
        fill="none"
        stroke={tableStroke}
        strokeWidth={baseTableStrokeWidth}
        rx={TABLE_CORNER_RADIUS}
        pointerEvents="none"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={baseTableStrokeOpacity}
      />
      {tableHighlightStroke && (
        <rect
          width={table.width}
          height={table.height}
          fill="none"
          stroke={tableHighlightStroke}
          strokeWidth={4.8}
          rx={TABLE_CORNER_RADIUS}
          pointerEvents="none"
          opacity={tableHighlightOpacity}
          vectorEffect="non-scaling-stroke"
          style={{
            transition:
              'stroke 160ms ease, stroke-width 160ms ease, opacity 160ms ease',
          }}
        />
      )}
      {!table.locked && editable && (
        <RotationHandle
          width={table.width}
          height={table.height}
          inverseRotation={inverseRotation}
          onRotateStart={handleRotate}
        />
      )}
    </g>
  );
}

const MemoizedSceneTable = React.memo(SceneTable);
export default MemoizedSceneTable;
