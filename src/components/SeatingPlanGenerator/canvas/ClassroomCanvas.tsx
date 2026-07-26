// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import TableIcon from '@/components/scene/SceneTable';
import FeatureShape from '@/components/scene/FeatureShape';
import RotationHandle from '@/components/scene/RotationHandle';
import ResizeHandle from '@/components/scene/ResizeHandle';
import {
  GRID_SIZE,
  getFeatureResizeHandles,
  type AlignmentGuide,
  type FeatureResizeHandle,
} from '@/utils';
import { getFeatureStyles } from '@/utils/ui';
import type { FeatureVisibilityFlags } from '@/utils/ui';
import type {
  SeatingArrangement,
  ClassroomTable,
  TableTemplateType,
  Student,
  ClassroomFeature,
} from '@/types';
import type { TemplateDragPreview } from '@/types/templateDrag';
import type { FeatureDragPreview } from '@/hooks/canvas/useFeaturePaletteDrag';
import { useIsDarkMode } from '@/hooks/useIsDarkMode';
import type { SelectionBox } from '@/types/canvas';

// Template labels will be translated in component using useTranslation

const noop = () => {};

interface ClassroomCanvasProps {
  canvasRef: React.RefObject<SVGSVGElement | null>;
  canvasWidth: number;
  classroomHeight: number;
  showGrid: boolean;
  featureVisibility?: FeatureVisibilityFlags;
  selectedFeatureIds?: string[];
  onFeatureRotateStart?: (
    feature: ClassroomFeature,
    event: React.PointerEvent<SVGElement>,
  ) => void;
  onFeatureResizeStart?: (
    feature: ClassroomFeature,
    handle: FeatureResizeHandle,
    event: React.PointerEvent<SVGGElement>,
  ) => void;
  features?: ClassroomFeature[];
  sceneTables: ClassroomTable[];
  selectedTableIds: number[];
  placeholderSeating: SeatingArrangement;
  allStudents?: Student[];
  selectionBox: SelectionBox | null;
  templateDragPreview: TemplateDragPreview | null;
  featureDragPreview?: FeatureDragPreview | null;
  /** Keynote-style alignment guides of the drag in progress. */
  alignmentGuides?: AlignmentGuide[] | null;
  onPointerMove: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerUp: (e: React.PointerEvent<SVGSVGElement>) => void;
  onPointerDown: (e: React.PointerEvent<SVGSVGElement>) => void;
  onContextMenu: (e: React.MouseEvent<SVGSVGElement>) => void;
  onTablePointerDown: (
    e: React.PointerEvent<SVGGElement>,
    index: number,
  ) => void;
  onTableUpdate: () => void;
  onTransformStart: () => void;
  onFeaturePointerDown?: (
    feature: ClassroomFeature,
    event: React.PointerEvent<SVGRectElement>,
  ) => void;
}

/**
 * ClassroomCanvas - SVG Canvas for classroom layout editing
 *
 * Renders the classroom scene with:
 * - Optional grid background
 * - Optional board element
 * - Draggable/editable tables
 * - Selection box for multi-select
 * - Template drag preview indicator
 */
const ClassroomCanvas = React.memo<ClassroomCanvasProps>(
  ({
    canvasRef,
    canvasWidth,
    classroomHeight,
    showGrid,
    featureVisibility,
    selectedFeatureIds = [],
    features = [],
    sceneTables,
    selectedTableIds,
    placeholderSeating,
    allStudents,
    selectionBox,
    templateDragPreview,
    featureDragPreview,
    alignmentGuides,
    onPointerMove,
    onPointerUp,
    onPointerDown,
    onContextMenu,
    onTablePointerDown,
    onTableUpdate,
    onTransformStart,
    onFeaturePointerDown,
    onFeatureRotateStart,
    onFeatureResizeStart,
  }) => {
    const { t } = useTranslation('generator');
    const isDark = useIsDarkMode();
    // Rotate handles only appear on the selected or hovered element.
    const [hoveredFeatureId, setHoveredFeatureId] = React.useState<
      string | null
    >(null);

    // Translated template labels
    const TEMPLATE_LABELS: Record<TableTemplateType, string> = React.useMemo(
      () => ({
        single: t('tableType.single', 'Einzelplatz'),
        double: t('tableType.double', 'Doppelplatz'),
        group4: t('tableType.group4', '4er-Gruppe'),
        group6: t('tableType.group6', '6er-Gruppe'),
      }),
      [t],
    );

    const backgroundColor = isDark ? '#1f2937' : '#f9fafb';
    const gridColor = isDark ? '#374151' : '#e5e7eb';
    // Amber keeps the guides distinct from the blue selection overlay.
    const guideColor = isDark ? '#fbbf24' : '#f59e0b';
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

    // Template drag preview indicator — shown only while the pointer is
    // outside the canvas (over the canvas the live ghost takes over).
    let templateIndicator: React.ReactNode = null;
    if (
      templateDragPreview &&
      !templateDragPreview.overCanvas &&
      templateDragPreview.canvasX !== null &&
      templateDragPreview.canvasY !== null
    ) {
      const indicatorClass =
        'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-100';
      templateIndicator = (
        <div
          className={`pointer-events-none absolute z-10 px-2 py-1 rounded-lg text-xs font-semibold shadow whitespace-nowrap ${indicatorClass}`}
          style={{
            left: templateDragPreview.canvasX,
            top: templateDragPreview.canvasY,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {TEMPLATE_LABELS[templateDragPreview.type]}
        </div>
      );
    }

    let featureIndicator: React.ReactNode = null;
    if (
      featureDragPreview &&
      !featureDragPreview.overCanvas &&
      featureDragPreview.canvasX !== null &&
      featureDragPreview.canvasY !== null
    ) {
      const indicatorClass =
        'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-100';
      featureIndicator = (
        <div
          className={`pointer-events-none absolute z-10 px-2 py-1 rounded-lg text-xs font-semibold shadow whitespace-nowrap ${indicatorClass}`}
          style={{
            left: featureDragPreview.canvasX,
            top: featureDragPreview.canvasY,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {`${featureDragPreview.label} (${featureDragPreview.width}×${featureDragPreview.height})`}
        </div>
      );
    }

    return (
      <>
        <svg
          ref={canvasRef}
          viewBox={`0 0 ${canvasWidth} ${classroomHeight}`}
          style={{
            backgroundColor,
            backgroundImage: showGrid
              ? `linear-gradient(to right, ${gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`
              : undefined,
            backgroundSize: showGrid
              ? `${GRID_SIZE}px ${GRID_SIZE}px`
              : undefined,
            touchAction: 'none',
          }}
          className="w-full h-auto touch-none"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerDown={onPointerDown}
          onContextMenu={onContextMenu}
        >
          {/* Structural features */}
          {featureViewModels.map(({ feature, styles }) => {
            const isActive = selectedFeatureIds.includes(feature.id);
            // The rotate handle only makes sense for a single active feature.
            const isSoleSelection = selectedFeatureIds.length === 1 && isActive;
            const isRotatable = feature.anchor === 'free' && feature.movable;
            const rotation =
              feature.anchor === 'free' ? (feature.rotation ?? 0) : 0;
            const showRotationHandle =
              isRotatable &&
              !!onFeatureRotateStart &&
              (isSoleSelection || feature.id === hoveredFeatureId);
            // Unlike rotation, every feature is resizable — including the
            // wall-anchored ones (window, door, board, whiteboard).
            const showResizeHandles =
              !!onFeatureResizeStart &&
              (isSoleSelection || feature.id === hoveredFeatureId);

            return (
              <FeatureShape
                key={feature.id}
                feature={feature}
                styles={styles}
                isActive={isActive}
                rectProps={{
                  className: 'cursor-grab active:cursor-grabbing',
                  style: { touchAction: 'none' },
                  onPointerDown: (event) =>
                    onFeaturePointerDown?.(feature, event),
                }}
                groupProps={{
                  onPointerEnter: () => setHoveredFeatureId(feature.id),
                  onPointerLeave: () =>
                    setHoveredFeatureId((current) =>
                      current === feature.id ? null : current,
                    ),
                }}
              >
                {showRotationHandle && (
                  <RotationHandle
                    width={feature.width}
                    height={feature.height}
                    inverseRotation={-rotation}
                    onRotateStart={(event) =>
                      onFeatureRotateStart(feature, event)
                    }
                  />
                )}
                {showResizeHandles &&
                  getFeatureResizeHandles(feature)
                    // The rotate handle sits at the south-east corner, so
                    // that resize grip is skipped when both are visible.
                    .filter(
                      (handle) => !(showRotationHandle && handle === 'se'),
                    )
                    .map((handle) => (
                      <ResizeHandle
                        key={handle}
                        width={feature.width}
                        height={feature.height}
                        handle={handle}
                        rotation={rotation}
                        ariaLabel={
                          handle === 'e' || handle === 'w'
                            ? t('layout.resizeWidth', 'Breite anpassen')
                            : handle === 'n' || handle === 's'
                              ? t('layout.resizeHeight', 'Höhe anpassen')
                              : t('layout.resize', 'Größe anpassen')
                        }
                        onResizeStart={(resizeHandle, event) =>
                          onFeatureResizeStart(feature, resizeHandle, event)
                        }
                      />
                    ))}
              </FeatureShape>
            );
          })}

          {/* Tables */}
          {sceneTables.map((t, tIndex) => (
            <TableIcon
              key={tIndex}
              table={t}
              index={tIndex}
              students={placeholderSeating[tIndex]}
              allStudents={allStudents}
              selected={selectedTableIds.includes(tIndex)}
              onPointerDown={(e) => onTablePointerDown(e, tIndex)}
              onUpdate={onTableUpdate}
              onTransformStart={onTransformStart}
              editable
              sceneTables={sceneTables}
              selectedTableIds={selectedTableIds}
              isDark={isDark}
              seatMarkerMode="dots"
            />
          ))}

          {/* Selection Box */}
          {selectionBox && (
            <rect
              x={selectionBox.x}
              y={selectionBox.y}
              width={selectionBox.width}
              height={selectionBox.height}
              fill="rgba(147,197,253,0.2)"
              stroke="#60a5fa"
              strokeWidth={2}
              pointerEvents="none"
            />
          )}

          {/* Live drag ghosts: translucent previews at the exact drop position */}
          {templateDragPreview?.placement && (
            <g opacity={0.5} pointerEvents="none" aria-hidden="true">
              <TableIcon
                table={{
                  ...templateDragPreview.placement,
                  rotation: 0,
                  locked: false,
                  zIndex: 0,
                  templateType: templateDragPreview.type,
                }}
                index={-1}
                students={Array.from(
                  { length: templateDragPreview.placement.seatCount },
                  () => null,
                )}
                selected={false}
                editable={false}
                onUpdate={noop}
                isDark={isDark}
                seatMarkerMode="dots"
              />
            </g>
          )}
          {featureDragPreview?.placement && (
            <g opacity={0.5} pointerEvents="none" aria-hidden="true">
              {(() => {
                // Reserved id keeps FeatureShape's clipPath unique against
                // real features.
                const ghost: ClassroomFeature = {
                  id: '__drag-preview__',
                  type: featureDragPreview.type,
                  visible: true,
                  ...featureDragPreview.placement,
                };
                return (
                  <FeatureShape
                    feature={ghost}
                    styles={getFeatureStyles(ghost, isDark)}
                  />
                );
              })()}
            </g>
          )}

          {/* Alignment guides: full-length lines, canvas centers dashed */}
          {alignmentGuides && alignmentGuides.length > 0 && (
            <g
              pointerEvents="none"
              aria-hidden="true"
              data-testid="alignment-guides"
            >
              {alignmentGuides.map((guide) => (
                <line
                  key={`${guide.orientation}-${guide.position}-${guide.kind}`}
                  x1={guide.orientation === 'vertical' ? guide.position : 0}
                  x2={
                    guide.orientation === 'vertical'
                      ? guide.position
                      : canvasWidth
                  }
                  y1={guide.orientation === 'horizontal' ? guide.position : 0}
                  y2={
                    guide.orientation === 'horizontal'
                      ? guide.position
                      : classroomHeight
                  }
                  stroke={guideColor}
                  strokeWidth={1.5}
                  strokeDasharray={
                    guide.kind === 'canvasCenter' ? '6 4' : undefined
                  }
                />
              ))}
            </g>
          )}
        </svg>

        {/* Template Drag Preview Indicator (overlay) */}
        {templateIndicator}
        {featureIndicator}
      </>
    );
  },
);

ClassroomCanvas.displayName = 'ClassroomCanvas';

export default ClassroomCanvas;
