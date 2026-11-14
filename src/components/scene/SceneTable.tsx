// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useMemo, useRef } from 'react';
import type { Student, ClassroomTable, PhotoDisplayMode } from '@/types';
import {
  TABLE_CORNER_RADIUS,
  getSeatHighlight,
  type NameDisplayMode,
  type NameLabels,
  type SeatHighlightLookup,
} from '@/utils';
import { getStudentAppearance } from '@/utils/ui/studentAppearance';
import type { SeatBadgeView } from '@/utils/ui/seatBadges';
import {
  calculateSeatLayout,
  determineSeatEdge,
} from '@/utils/math/positionCalculations';
import { getPhotoRadius } from '@/utils/math/photoOverlap';
import {
  previewStudentAt,
  type DragHover,
  type DragOrigin,
  type LockedDropTarget,
  type DragSeatConfig,
  type SwapPreview,
} from '@/hooks/ui/useDragDropState';
import SeatGrid, { type SeatConfig } from '@/components/scene/SeatGrid';
import {
  seatDividerPath,
  seatTableCorners,
  seatTableEdges,
} from '@/utils/ui/seatMark';
import { getTableColors } from '@/utils/ui/tableAppearance';
import RotationHandle from '@/components/scene/RotationHandle';
import { useSeatDrag } from '@/hooks/scene/useSeatDrag';
import {
  SEAT_FLIGHT_PART_ATTR,
  seatFlightKey,
} from '@/hooks/scene/useSeatFlight';
import {
  useTableRotation,
  type TableRotationHandler,
} from '@/hooks/scene/useTableRotation';
import { useHasHoverPointer } from '@/hooks/ui/useHasHoverPointer';

/** The dashed outline of a table taken out of the mix. */
const TABLE_OUT_OF_MIX_DASH = '5 4';

/** How much of a photo stays of a student missing today. */
const ABSENT_PHOTO_OPACITY = 0.45;

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
  /** Turns the table by its handle; only an editable table has one. */
  onRotate?: TableRotationHandler;
  editable: boolean;
  onSeatDragStart?: (student: Student, config: DragSeatConfig) => void;
  onSeatDrag?: (x: number, y: number) => void;
  onSeatDragEnd?: () => void;
  dragOrigin?: DragOrigin | null;
  dragHover?: DragHover | null;
  lockedDropTarget?: LockedDropTarget | null;
  onSeatHoverChange?: (hover: DragHover | null) => void;
  onSeatDropRejected?: (target: DragHover) => void;
  /** A student landed: where from, where to. */
  onSeatDropped?: (from: DragOrigin, to: DragOrigin) => void;
  /** The swap a resting drag would make, drawn on its two seats. */
  swapPreview?: SwapPreview | null;
  /** Keyboard alternative to the pointer seat drag (grab/drop via Enter). */
  onSeatKeyDown?: React.ComponentProps<typeof SeatGrid>['onSeatKeyDown'];
  onSeatFocus?: React.ComponentProps<typeof SeatGrid>['onSeatFocus'];
  onSeatBlur?: React.ComponentProps<typeof SeatGrid>['onSeatBlur'];
  showSpecialNeeds?: boolean;
  /** Which badges the seats carry and how they are drawn (see `SeatBadgeView`). */
  badgeView?: SeatBadgeView;
  /** When false, the gender tint is dropped for a paper seat (the beamer's colour switch). */
  showGenderColors?: boolean;
  isDark?: boolean;
  /** Beamer contrast mode: black on white, thicker contours (see `TableSeat`). */
  contrast?: boolean;
  lockSeatLabelOrientation?: boolean;
  seatLabelRotation?: number;
  /** Uniform name rule for the seat labels (see {@link NameDisplayMode}). */
  nameDisplay?: NameDisplayMode;
  /** Disambiguated labels of the class (see `buildNameLabels`). */
  nameLabels?: NameLabels;
  /** The size the plan's names share (`computePlanNameFontSize`). */
  nameFontSize?: number;
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
  /**
   * The students missing today (decision 0045): their photo turns grey and
   * pale, as the projection veils their seat.
   */
  absentIds?: ReadonlySet<string>;
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
  onRotate,
  editable,
  onSeatDragStart,
  onSeatDrag,
  onSeatDragEnd,
  dragOrigin = null,
  dragHover = null,
  lockedDropTarget = null,
  onSeatHoverChange,
  onSeatDropRejected,
  onSeatDropped,
  swapPreview = null,
  onSeatKeyDown,
  onSeatFocus,
  onSeatBlur,
  showSpecialNeeds = true,
  badgeView,
  showGenderColors = true,
  isDark = false,
  contrast = false,
  lockSeatLabelOrientation = true,
  seatLabelRotation = 0,
  nameDisplay,
  nameLabels,
  nameFontSize,
  seatHighlights = null,
  seatMarkerMode = 'full',
  photoDisplayMode = 'off',
  absentIds,
}: TableProps) {
  const tableRef = useRef<SVGGElement>(null);
  // The rotate handle only appears while the table is selected or hovered.
  const [isHovered, setIsHovered] = React.useState(false);
  const hoverPhotosEnabled = photoDisplayMode === 'hover';
  // Hover tracking feeds the photo hover mode and the lock hover-reveal;
  // on touch devices (no hover) the lock stays always visible.
  const hasHoverPointer = useHasHoverPointer();
  const [hoveredSeatIndex, setHoveredSeatIndex] = React.useState<number | null>(
    null,
  );
  const seatHoverTrackingEnabled =
    hoverPhotosEnabled || (Boolean(toggleLock) && hasHoverPointer);
  const inverseRotation = -table.rotation;
  const seatTextRotation = inverseRotation + seatLabelRotation;
  const clipPathId = useMemo(
    () =>
      `table-seat-clip-${index}-${Math.round(table.x)}-${Math.round(table.y)}`,
    [index, table.x, table.y],
  );
  const { handleRotate } = useTableRotation({
    tableRef,
    width: table.width,
    height: table.height,
    onRotate,
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
    onSeatDropped,
    nameDisplay,
    nameLabels,
  });

  const { templateType, seatCount, width, height } = table;
  const seatLayout = useMemo(
    () => calculateSeatLayout({ templateType, seatCount, width, height }),
    [templateType, seatCount, width, height],
  );
  const { cols, rows, seatWidth, seatHeight, positions } = seatLayout;
  // Each seat's cell in the table's grid; a seat the layout has no place for
  // takes the next cell in reading order.
  const seatsShown = students.length;
  const seatCells = useMemo(() => {
    const fallbackCols = Math.max(cols, 1);
    return Array.from(
      { length: seatsShown },
      (_, seatIndex) =>
        positions[seatIndex] ?? {
          col: seatIndex % fallbackCols,
          row: Math.floor(seatIndex / fallbackCols),
        },
    );
  }, [positions, cols, seatsShown]);
  const dividerPath = useMemo(
    () => seatDividerPath(seatCells, cols, rows, seatWidth, seatHeight),
    [seatCells, cols, rows, seatWidth, seatHeight],
  );

  const tableColors = getTableColors(isDark, contrast);
  // The selection's blue is on screen only; an export never selects a table.
  const tableStroke =
    selected && !contrast ? 'var(--canvas-selection)' : tableColors.stroke;

  // Chair dots: one small filled dot per seat, docked just outside the table
  // edge the seat faces. The facing edge is derived per template via
  // determineSeatEdge (the same logic the table-template previews use) so it is
  // correct for every table type, not only the 4-seat group. Drawn outside the
  // seat clip group so they sit against the table border instead of inside it.
  const chairRadius = Math.max(
    2.5,
    Math.min(5, Math.min(seatWidth, seatHeight) * 0.12),
  );
  // Dock tangentially: the dot/photo sits fully outside the table and its inner
  // edge just kisses the outer edge of the table border stroke (half of the 1px
  // base border), so it touches the border without overlapping into the table.
  const TABLE_BORDER_HALF = 0.5;
  // Shared with the layout editor's photo-collision prediction so both always
  // agree on the rendered avatar size.
  const photoRadius = getPhotoRadius(seatWidth, seatHeight);
  const chairDots = useMemo(() => {
    return seatCells.map((position, seatIndex) => {
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
    seatCells,
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

  const seatConfigs: SeatConfig[] = students.map((seatStudent, seatIndex) => {
    const { col, row } = seatCells[seatIndex];

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
      tableCorners: seatTableCorners(col, row, cols, rows),
      tableEdges: seatTableEdges(col, row, cols, rows),
      locked,
      isOriginSeat,
      isHoverSeat,
      isHoverLockedSeat,
      isLockedFeedbackSeat,
      highlightStatus: highlight?.status,
      highlightMode: highlight?.mode,
      highlightPercentage: highlight?.percentage,
      highlightTone: highlight?.tone,
      previewStudent: previewStudentAt(swapPreview, index, seatIndex),
    };
  });

  const baseTableStrokeOpacity = 1;
  const baseTableStrokeWidth = contrast ? 2.5 : selected ? 2.4 : 1;
  // A table taken out of the mix keeps its place in the room, drawn with a
  // dashed edge — and faint while nobody sits there, so a student put there
  // by hand stays as legible as anywhere else.
  const outOfMix = table.inactive === true;
  const outOfMixOpacity =
    outOfMix && !students.some(Boolean) ? 0.45 : undefined;

  return (
    <g
      ref={tableRef}
      data-table-index={index}
      transform={`translate(${table.x + table.width / 2} ${
        table.y + table.height / 2
      }) rotate(${table.rotation}) translate(${-table.width / 2} ${
        -table.height / 2
      })`}
      onPointerDown={
        table.locked || !onPointerDown ? undefined : handleTablePointerDown
      }
      onPointerEnter={editable ? () => setIsHovered(true) : undefined}
      onPointerLeave={editable ? () => setIsHovered(false) : undefined}
      onContextMenu={(e) => {
        if (table.locked) return;
        e.preventDefault();
      }}
      // Grab hand only where the table is actually interactive; static renders
      // (presentation view, PDF preview/export) keep the default cursor. Matches
      // the room-element cursor behaviour.
      className={
        !table.locked && onPointerDown
          ? 'cursor-grab active:cursor-grabbing'
          : undefined
      }
      style={{
        touchAction: 'none',
      }}
      opacity={outOfMixOpacity}
      data-out-of-mix={outOfMix || undefined}
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
        fill={tableColors.fill}
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
        tableEdgeWidth={baseTableStrokeWidth}
        // Only a plan a student can be dragged in sees students fly, so only
        // its seats carry the outline a flight shows (`useSeatFlight`).
        tableEdgeStroke={draggable ? tableStroke : undefined}
        tableEdgeDash={outOfMix ? TABLE_OUT_OF_MIX_DASH : undefined}
        dividerPath={dividerPath}
        dividerStroke={tableColors.divider}
        allStudents={allStudents}
        showSpecialNeeds={showSpecialNeeds}
        badgeView={badgeView}
        contrast={contrast}
        showGenderColors={showGenderColors}
        nameDisplay={nameDisplay}
        nameLabels={nameLabels}
        nameFontSize={nameFontSize}
        showSeatLabels={seatMarkerMode === 'full'}
        lockSeatLabelOrientation={lockSeatLabelOrientation}
        seatTextRotation={seatTextRotation}
        isDark={isDark}
        toggleLock={toggleLock}
        lockRevealOnHover={hasHoverPointer}
        hoveredSeatIndex={hoveredSeatIndex}
        onSeatPointerDown={draggable ? handleSeatPointerDown : undefined}
        onSeatPointerUp={draggable ? handleSeatPointerUp : undefined}
        onSeatKeyDown={draggable ? onSeatKeyDown : undefined}
        onSeatFocus={draggable ? onSeatFocus : undefined}
        onSeatBlur={draggable ? onSeatBlur : undefined}
        onSeatPointerEnter={
          seatHoverTrackingEnabled
            ? (seatIndex) => setHoveredSeatIndex(seatIndex)
            : undefined
        }
        onSeatPointerLeave={
          seatHoverTrackingEnabled
            ? (seatIndex) =>
                setHoveredSeatIndex((current) =>
                  current === seatIndex ? null : current,
                )
            : undefined
        }
      />
      {chairDots.map((dot) => {
        // The photo belongs to the student the seat shows: the one a resting
        // drag would bring here, and none where it would leave the seat empty.
        const previewStudent = previewStudentAt(swapPreview, index, dot.key);
        const seatStudent =
          previewStudent !== undefined
            ? previewStudent
            : (students[dot.key] ?? null);
        // The student in hand leaves a faded photo behind, as the seat fades.
        const lifted =
          previewStudent === undefined &&
          dragOrigin?.tableIndex === index &&
          dragOrigin.seatIndex === dot.key;
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
              fill={tableColors.chair}
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
        const ringStroke = getStudentAppearance(
          seatStudent,
          isDark,
          false,
          false,
          showGenderColors,
        ).stroke;
        const clipId = `chair-photo-${index}-${dot.key}`;
        const absent = !!seatStudent && !!absentIds?.has(seatStudent.id);
        const greyId = `chair-photo-grey-${index}-${dot.key}`;
        return (
          <g
            key={`chair-${dot.key}`}
            transform={uprightTransform}
            pointerEvents="none"
            opacity={lifted ? 0.35 : absent ? ABSENT_PHOTO_OPACITY : undefined}
            filter={absent ? `url(#${greyId})` : undefined}
            {...{ [SEAT_FLIGHT_PART_ATTR]: seatFlightKey(index, dot.key) }}
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
                {absent && (
                  <filter id={greyId}>
                    <feColorMatrix type="saturate" values="0" />
                  </filter>
                )}
                <clipPath id={clipId}>
                  <circle cx={photoCx} cy={photoCy} r={photoRadius} />
                </clipPath>
              </defs>
              <circle
                cx={photoCx}
                cy={photoCy}
                r={photoRadius}
                fill={tableColors.photoBackdrop}
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
                stroke={tableColors.photoHalo}
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
        strokeDasharray={outOfMix ? TABLE_OUT_OF_MIX_DASH : undefined}
        opacity={baseTableStrokeOpacity}
      />
      {!table.locked && editable && (selected || isHovered) && (
        <RotationHandle
          width={table.width}
          height={table.height}
          // Upright on screen, as the names are, also in a drawing turned
          // for a screen held upright.
          inverseRotation={seatTextRotation}
          onRotateStart={handleRotate}
        />
      )}
    </g>
  );
}

const MemoizedSceneTable = React.memo(SceneTable);
export default MemoizedSceneTable;
