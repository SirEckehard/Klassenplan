// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import type {
  ClassroomTable,
  SeatingArrangement,
  Student,
  ClassroomFeature,
  PhotoDisplayMode,
} from '@/types';
import type { NameDisplayMode, SeatHighlightLookup } from '@/utils';
import { GRID_SIZE } from '@/utils';
import { getFeatureStyles } from '@/utils/ui';
import type { FeatureVisibilityFlags } from '@/utils/ui';
import type { TemplateDragPreview } from '@/types/templateDrag';
import type {
  DragOrigin,
  DragHover,
  LockedDropTarget,
  DragSeatConfig,
} from '@/hooks/ui/useDragDropState';
import TableIcon from '@/components/scene/SceneTable';
import FeatureShape from '@/components/scene/FeatureShape';
import { useStudentPhotoUrls } from '@/hooks/student/useStudentPhoto';
import { useSeatKeyboardMove } from '@/hooks/scene/useSeatKeyboardMove';

interface SeatingPlanCanvasProps {
  canvasWidth: number;
  classroomHeight: number;
  sceneTables: ClassroomTable[];
  currentSeating: SeatingArrangement;
  allStudents?: Student[];
  selectedTableIds: number[];
  showGrid: boolean;
  featureVisibility?: FeatureVisibilityFlags;
  features?: ClassroomFeature[];
  selectionBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  handlePointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  handlePointerUp: (e: React.PointerEvent<SVGSVGElement>) => void;
  beginSelection: (e: React.PointerEvent<SVGSVGElement>) => void;
  startTablePointerDrag: (e: React.PointerEvent<SVGGElement>) => void;
  templateDragPreview: TemplateDragPreview | null;
  onTableUpdate: () => void;
  toggleSelect: (tableIndex: number, multi: boolean) => number[];
  handleSeatDragStart?: (student: Student, config: DragSeatConfig) => void;
  handleSeatDrag?: (x: number, y: number) => void;
  handleSeatDragEnd?: () => void;
  dragOrigin?: DragOrigin | null;
  dragHover?: DragHover | null;
  lockedDropTarget?: LockedDropTarget | null;
  onSeatHoverChange?: (hover: DragHover | null) => void;
  onLockedSeatDrop?: (target: DragHover) => void;
  moveStudent?: (
    fromTable: number,
    fromSeat: number,
    toTable: number,
    toSeat: number,
  ) => boolean;
  isSeatLocked?: (table: number, seat: number) => boolean;
  toggleLock?: (studentId: string, table: number, seat: number) => void;
  onTransformStart?: () => void;
  isDark?: boolean;
  seatHighlights?: SeatHighlightLookup | null;
  /** How student photos grow on the seat dots (all / hover / off). */
  photoDisplayMode?: PhotoDisplayMode;
  /** Uniform name rule for the seat labels (see {@link NameDisplayMode}). */
  nameDisplay?: NameDisplayMode;
}

const SeatingPlanCanvas = React.memo(
  ({
    canvasWidth,
    classroomHeight,
    sceneTables,
    currentSeating,
    allStudents,
    selectedTableIds,
    showGrid,
    featureVisibility,
    features = [],
    selectionBox,
    handlePointerMove,
    handlePointerUp,
    beginSelection,
    startTablePointerDrag,
    templateDragPreview,
    onTableUpdate,
    toggleSelect,
    handleSeatDragStart,
    handleSeatDrag,
    handleSeatDragEnd,
    dragOrigin = null,
    dragHover = null,
    lockedDropTarget = null,
    onSeatHoverChange,
    onLockedSeatDrop,
    moveStudent,
    isSeatLocked,
    toggleLock,
    onTransformStart,
    isDark = false,
    seatHighlights = null,
    photoDisplayMode = 'off',
    nameDisplay,
  }: SeatingPlanCanvasProps) => {
    const { t } = useTranslation('generator');
    const canvasRef = React.useRef<SVGSVGElement | null>(null);
    const photoUrls = useStudentPhotoUrls(allStudents ?? []);

    // Keyboard alternative to the pointer seat drag (P2.10): Enter/Space picks
    // a student up, Tab moves to the target seat, Enter/Space drops, Escape
    // cancels. Reuses the existing dragOrigin/dragHover visuals.
    const {
      keyboardMoveOrigin,
      keyboardAnnouncement,
      handleSeatKeyDown,
      handleSeatFocus,
      handleSeatBlur,
      cancelKeyboardMove,
    } = useSeatKeyboardMove({
      moveStudent,
      onHoverChange: onSeatHoverChange,
      onDropRejected: onLockedSeatDrop,
    });

    // A pointer drag takes precedence: release any pending keyboard grab.
    React.useEffect(() => {
      if (dragOrigin) {
        cancelKeyboardMove();
      }
    }, [dragOrigin, cancelKeyboardMove]);

    const effectiveDragOrigin = dragOrigin ?? keyboardMoveOrigin;

    const applySelectionForTable = React.useCallback(
      (tableIndex: number, multi: boolean) => {
        if (multi) {
          toggleSelect(tableIndex, true);
        } else if (!selectedTableIds.includes(tableIndex)) {
          toggleSelect(tableIndex, false);
        }
      },
      [selectedTableIds, toggleSelect],
    );

    const handleTablePointerDown = React.useCallback(
      (tableIndex: number, e: React.PointerEvent<SVGGElement>) => {
        const multi = e.ctrlKey || e.metaKey || e.shiftKey;
        applySelectionForTable(tableIndex, multi);
        startTablePointerDrag(e);
      },
      [applySelectionForTable, startTablePointerDrag],
    );

    // Render grid lines
    const renderGrid = () => {
      if (!showGrid) return null;
      const lines = [];
      for (let x = 0; x <= canvasWidth; x += GRID_SIZE) {
        lines.push(
          <line
            key={`v${x}`}
            x1={x}
            y1={0}
            x2={x}
            y2={classroomHeight}
            stroke="#e5e7eb"
            strokeWidth="0.5"
          />,
        );
      }
      for (let y = 0; y <= classroomHeight; y += GRID_SIZE) {
        lines.push(
          <line
            key={`h${y}`}
            x1={0}
            y1={y}
            x2={canvasWidth}
            y2={y}
            stroke="#e5e7eb"
            strokeWidth="0.5"
          />,
        );
      }
      return <g className="grid">{lines}</g>;
    };

    const featureViewModels = React.useMemo(
      () =>
        features
          .map((feature) => ({
            feature,
            styles: getFeatureStyles(feature, isDark, featureVisibility),
          }))
          .filter(({ styles }) => styles.shouldRender),
      [features, featureVisibility, isDark],
    );

    // The seats inside carry their own labels and focus; the SVG only needs a
    // group name so screen readers announce what the seat list belongs to.
    const { occupiedSeats, totalSeats } = React.useMemo(() => {
      let occupied = 0;
      let total = 0;
      for (const table of currentSeating) {
        total += table.length;
        for (const seat of table) {
          if (seat) occupied += 1;
        }
      }
      return { occupiedSeats: occupied, totalSeats: total };
    }, [currentSeating]);

    return (
      <>
        {/* Screen-reader feedback for keyboard seat moves (grab/drop/cancel). */}
        <span role="status" aria-live="polite" className="sr-only">
          {keyboardAnnouncement}
        </span>
        <svg
          ref={canvasRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${canvasWidth} ${classroomHeight}`}
          className="touch-none select-none"
          role="group"
          aria-label={t('editor.canvasLabel', {
            occupied: occupiedSeats,
            total: totalSeats,
            defaultValue: 'Sitzplan: {{occupied}} von {{total}} Plätzen belegt',
          })}
          onPointerDown={beginSelection}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <style>{`
          @keyframes seat-photo-pop {
            from { opacity: 0; transform: scale(0.85); }
            to   { opacity: 1; transform: scale(1); }
          }
        `}</style>
          {renderGrid()}

          <g style={{ pointerEvents: 'none' }}>
            {featureViewModels.map(({ feature, styles }) => (
              <FeatureShape
                key={feature.id}
                feature={feature}
                styles={styles}
              />
            ))}
          </g>

          <g>
            {sceneTables.map((table, index) => (
              <TableIcon
                key={index}
                table={table}
                index={index}
                students={currentSeating[index] || []}
                allStudents={allStudents}
                photoUrls={photoUrls}
                selected={selectedTableIds.includes(index)}
                onPointerDown={(e) => handleTablePointerDown(index, e)}
                onUpdate={onTableUpdate}
                onTransformStart={onTransformStart}
                onSeatDragStart={handleSeatDragStart}
                onSeatDrag={handleSeatDrag}
                onSeatDragEnd={handleSeatDragEnd}
                dragOrigin={effectiveDragOrigin}
                dragHover={dragHover}
                lockedDropTarget={lockedDropTarget}
                onSeatHoverChange={onSeatHoverChange}
                onSeatDropRejected={onLockedSeatDrop}
                onSeatKeyDown={handleSeatKeyDown}
                onSeatFocus={handleSeatFocus}
                onSeatBlur={handleSeatBlur}
                moveStudent={moveStudent}
                isSeatLocked={isSeatLocked}
                toggleLock={toggleLock}
                editable={false}
                draggable={true}
                isDark={isDark}
                seatHighlights={seatHighlights}
                photoDisplayMode={photoDisplayMode}
                nameDisplay={nameDisplay}
              />
            ))}
          </g>

          {selectionBox && (
            <rect
              x={selectionBox.x}
              y={selectionBox.y}
              width={selectionBox.width}
              height={selectionBox.height}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="rgba(59, 130, 246, 0.5)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          )}

          {templateDragPreview && (
            <g
              transform={`translate(${
                templateDragPreview.canvasX ?? templateDragPreview.clientX
              }, ${templateDragPreview.canvasY ?? templateDragPreview.clientY})`}
              opacity="0.7"
            >
              <rect
                width={50}
                height={50}
                fill="#3b82f6"
                stroke="#1d4ed8"
                strokeWidth="2"
                rx="4"
              />
            </g>
          )}
        </svg>
      </>
    );
  },
);

SeatingPlanCanvas.displayName = 'SeatingPlanCanvas';

export default SeatingPlanCanvas;
