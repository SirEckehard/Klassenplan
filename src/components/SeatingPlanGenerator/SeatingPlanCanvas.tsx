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
import type { SeatHighlightLookup } from '@/utils';
import { GRID_SIZE, FEATURE_CORNER_RADIUS } from '@/utils';
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
import { useStudentPhotoUrls } from '@/hooks/student/useStudentPhoto';

interface SeatingPlanCanvasProps {
  canvasWidth: number;
  classroomHeight: number;
  sceneTables: ClassroomTable[];
  currentSeating: SeatingArrangement;
  allStudents?: Student[];
  selectedTableIds: number[];
  showGrid: boolean;
  showBoard: boolean;
  showWindows: boolean;
  showDoor: boolean;
  showPodium: boolean;
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
    showBoard,
    showWindows,
    showDoor,
    showPodium,
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
  }: SeatingPlanCanvasProps) => {
    const { t } = useTranslation('generator');
    const canvasRef = React.useRef<SVGSVGElement | null>(null);
    const photoUrls = useStudentPhotoUrls(allStudents ?? []);

    // Helper to get translated feature label based on type
    const getFeatureLabel = (feature: {
      type: string;
      label?: string;
    }): string | undefined => {
      if (!feature.label) return undefined;
      const typeToKey: Record<string, string> = {
        window: 'layout.window',
        door: 'layout.door',
        board: 'layout.board',
        podium: 'layout.podium',
      };
      const key = typeToKey[feature.type];
      return key ? t(key, feature.label) : feature.label;
    };

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

    const featureVisibility = React.useMemo<FeatureVisibilityFlags>(
      () => ({
        board: showBoard,
        window: showWindows,
        door: showDoor,
        podium: showPodium,
      }),
      [showBoard, showDoor, showPodium, showWindows],
    );
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

    return (
      <svg
        ref={canvasRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${canvasWidth} ${classroomHeight}`}
        className="touch-none select-none"
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

        <g>
        {featureViewModels.map(({ feature, styles }) => {
          const isFree = feature.anchor === 'free';
          const rotation = isFree ? (feature.rotation ?? 0) : 0;
          const normalizedRotation = ((rotation % 360) + 360) % 360;
          const isPodium = feature.type === 'podium';
          const labelRotation = isPodium
            ? -normalizedRotation
            : feature.width >= feature.height
              ? 0
              : -90;

          if (isFree) {
            const transform = `translate(${feature.x + feature.width / 2} ${
              feature.y + feature.height / 2
            }) rotate(${rotation}) translate(${-feature.width / 2} ${
              -feature.height / 2
            })`;
            return (
              <g
                key={feature.id}
                style={{ pointerEvents: 'none' }}
                transform={transform}
              >
                <rect
                  x={0}
                  y={0}
                  width={feature.width}
                  height={feature.height}
                  rx={FEATURE_CORNER_RADIUS}
                  fill={styles.fill}
                  stroke="none"
                />
                {feature.label && (
                  <text
                    x={feature.width / 2}
                    y={feature.height / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={styles.text}
                    fontSize={12}
                    transform={
                      labelRotation !== 0
                        ? `rotate(${labelRotation}, ${feature.width / 2}, ${
                            feature.height / 2
                          })`
                        : undefined
                    }
                  >
                    {getFeatureLabel(feature)}
                  </text>
                )}
              </g>
            );
          }

          const centerX = feature.x + feature.width / 2;
          const centerY = feature.y + feature.height / 2;
          const textTransform =
            labelRotation !== 0
              ? `rotate(${labelRotation}, ${centerX}, ${centerY})`
              : undefined;

          return (
            <g key={feature.id} style={{ pointerEvents: 'none' }}>
              <rect
                x={feature.x}
                y={feature.y}
                width={feature.width}
                height={feature.height}
                rx={FEATURE_CORNER_RADIUS}
                fill={styles.fill}
                stroke="none"
              />
              {feature.label && (
                <text
                  x={centerX}
                  y={centerY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={styles.text}
                  fontSize={12}
                  transform={textTransform}
                >
                  {getFeatureLabel(feature)}
                </text>
              )}
            </g>
          );
        })}

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
            dragOrigin={dragOrigin}
            dragHover={dragHover}
            lockedDropTarget={lockedDropTarget}
            onSeatHoverChange={onSeatHoverChange}
            onSeatDropRejected={onLockedSeatDrop}
            moveStudent={moveStudent}
            isSeatLocked={isSeatLocked}
            toggleLock={toggleLock}
            editable={false}
            draggable={true}
            isDark={isDark}
            seatHighlights={seatHighlights}
            photoDisplayMode={photoDisplayMode}
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
    );
  },
);

SeatingPlanCanvas.displayName = 'SeatingPlanCanvas';

export default SeatingPlanCanvas;
