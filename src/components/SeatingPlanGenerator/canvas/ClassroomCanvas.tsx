// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowClockwiseIcon } from '@phosphor-icons/react';
import TableIcon from '@/components/scene/SceneTable';
import FeatureShape from '@/components/scene/FeatureShape';
import {
  GRID_SIZE,
  calculateFeatureHandleAnchor,
  type FeatureHandleAnchor,
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
import { useIsDarkMode } from '@/hooks/useIsDarkMode';
import type { SelectionBox } from '@/types/canvas';

// Template labels will be translated in component using useTranslation

interface ClassroomCanvasProps {
  canvasRef: React.RefObject<SVGSVGElement | null>;
  canvasWidth: number;
  classroomHeight: number;
  showGrid: boolean;
  featureVisibility?: FeatureVisibilityFlags;
  activeFeatureId?: string | null;
  onFeatureRotateStart?: (
    feature: ClassroomFeature,
    event: React.PointerEvent<SVGElement>,
  ) => void;
  features?: ClassroomFeature[];
  sceneTables: ClassroomTable[];
  selectedTableIds: number[];
  placeholderSeating: SeatingArrangement;
  allStudents?: Student[];
  selectionBox: SelectionBox | null;
  templateDragPreview: TemplateDragPreview | null;
  featureDragPreview?: {
    label: string;
    width: number;
    height: number;
    clientX: number;
    clientY: number;
    overCanvas: boolean;
    canvasX: number | null;
    canvasY: number | null;
  } | null;
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
  featureHandleAnchors?: Map<string, FeatureHandleAnchor> | null;
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
    activeFeatureId = null,
    features = [],
    sceneTables,
    selectedTableIds,
    placeholderSeating,
    allStudents,
    selectionBox,
    templateDragPreview,
    featureDragPreview,
    onPointerMove,
    onPointerUp,
    onPointerDown,
    onContextMenu,
    onTablePointerDown,
    onTableUpdate,
    onTransformStart,
    onFeaturePointerDown,
    onFeatureRotateStart,
    featureHandleAnchors = null,
  }) => {
    const { t } = useTranslation('generator');
    const isDark = useIsDarkMode();

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

    // Template drag preview indicator
    let templateIndicator: React.ReactNode = null;
    if (
      templateDragPreview &&
      templateDragPreview.canvasX !== null &&
      templateDragPreview.canvasY !== null
    ) {
      const indicatorClass = templateDragPreview.overCanvas
        ? 'bg-blue-600 text-white dark:bg-blue-500'
        : 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-100';
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
      featureDragPreview.canvasX !== null &&
      featureDragPreview.canvasY !== null
    ) {
      const indicatorClass = featureDragPreview.overCanvas
        ? 'bg-amber-500 text-white dark:bg-amber-400'
        : 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-100';
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
            const isActive = feature.id === activeFeatureId;
            const isRotatable = feature.anchor === 'free' && feature.movable;
            const rotation =
              feature.anchor === 'free' ? (feature.rotation ?? 0) : 0;
            const handleAnchor = featureHandleAnchors?.get(feature.id);
            const resolvedAnchor = handleAnchor
              ? handleAnchor
              : calculateFeatureHandleAnchor(
                  feature.width,
                  feature.height,
                  rotation,
                );

            return (
              <FeatureShape
                key={feature.id}
                feature={feature}
                styles={styles}
                strokeMode="active"
                isActive={isActive}
                rectProps={{
                  className: 'cursor-grab active:cursor-grabbing',
                  style: { touchAction: 'none' },
                  onPointerDown: (event) =>
                    onFeaturePointerDown?.(feature, event),
                }}
              >
                {isRotatable && onFeatureRotateStart && (
                  <g
                    transform={`translate(${resolvedAnchor.x} ${resolvedAnchor.y})`}
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      event.preventDefault();
                      onFeatureRotateStart(feature, event);
                    }}
                    style={{ cursor: 'grab' }}
                  >
                    <g transform={`rotate(${-rotation})`}>
                      <circle r={10} fill="#3b82f6" />
                      <g transform="translate(-6 -6)">
                        <ArrowClockwiseIcon size={12} color="#fff" />
                      </g>
                    </g>
                  </g>
                )}
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
