// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { TableTemplateType } from '@/types';
import type { TemplateDragPreview } from '@/types/templateDrag';
import { useCanvasBoundingRect } from '@/hooks/canvas/useCanvasBoundingRect';

interface UseTemplateDragParams {
  canvasRef: React.RefObject<SVGSVGElement | null>;
  dropTemplateAt: (
    templateType: TableTemplateType,
    clientX: number,
    clientY: number,
    svg: SVGSVGElement,
  ) => boolean;
  /** Resolves the scene placement for the live drag ghost (null off-canvas). */
  getTemplateDropPlacement: (
    templateType: TableTemplateType,
    clientX: number,
    clientY: number,
  ) => TemplateDragPreview['placement'];
}

export function useTemplateDrag({
  canvasRef,
  dropTemplateAt,
  getTemplateDropPlacement,
}: UseTemplateDragParams) {
  const [preview, setPreview] = React.useState<TemplateDragPreview | null>(
    null,
  );

  const { canvasRectRef } = useCanvasBoundingRect(canvasRef);
  const pointerRectCacheRef = React.useRef<Map<number, DOMRectReadOnly>>(
    new Map(),
  );
  const dragStateRef = React.useRef<{
    pointerId: number;
    templateType: TableTemplateType;
  } | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const resolvePointerMetrics = React.useCallback(
    (pointerId: number, clientX: number, clientY: number) => {
      const rect =
        pointerRectCacheRef.current.get(pointerId) ?? canvasRectRef.current;
      if (!rect) {
        return {
          overCanvas: false,
          canvasX: null,
          canvasY: null,
        };
      }
      const canvasX = clientX - rect.left;
      const canvasY = clientY - rect.top;
      const overCanvas =
        canvasX >= 0 &&
        canvasX <= rect.width &&
        canvasY >= 0 &&
        canvasY <= rect.height;
      return { overCanvas, canvasX, canvasY };
    },
    [canvasRectRef],
  );

  const cachePointerRect = React.useCallback(
    (pointerId: number) => {
      const rect = canvasRectRef.current;
      if (!rect) {
        pointerRectCacheRef.current.delete(pointerId);
        return null;
      }
      pointerRectCacheRef.current.set(pointerId, rect);
      return rect;
    },
    [canvasRectRef],
  );

  const releasePointerRect = React.useCallback((pointerId: number) => {
    pointerRectCacheRef.current.delete(pointerId);
  }, []);

  const cleanupDrag = React.useCallback(() => {
    dragStateRef.current = null;
    setIsDragging(false);
  }, []);

  const handlePointerMove = React.useCallback(
    (event: PointerEvent) => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }
      const metrics = resolvePointerMetrics(
        event.pointerId,
        event.clientX,
        event.clientY,
      );
      setPreview({
        type: dragState.templateType,
        clientX: event.clientX,
        clientY: event.clientY,
        overCanvas: metrics.overCanvas,
        canvasX: metrics.canvasX,
        canvasY: metrics.canvasY,
        placement: metrics.overCanvas
          ? getTemplateDropPlacement(
              dragState.templateType,
              event.clientX,
              event.clientY,
            )
          : null,
      });
    },
    [getTemplateDropPlacement, resolvePointerMetrics],
  );

  const handlePointerUp = React.useCallback(
    function handlePointerUp(event: PointerEvent) {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      const metrics = resolvePointerMetrics(
        event.pointerId,
        event.clientX,
        event.clientY,
      );

      if (metrics.overCanvas) {
        const svg = canvasRef.current;
        if (svg) {
          dropTemplateAt(
            dragState.templateType,
            event.clientX,
            event.clientY,
            svg,
          );
        }
      }

      setPreview(null);
      releasePointerRect(event.pointerId);
      cleanupDrag();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    },
    [
      canvasRef,
      cleanupDrag,
      dropTemplateAt,
      handlePointerMove,
      releasePointerRect,
      resolvePointerMetrics,
    ],
  );

  const startTemplateDrag = React.useCallback(
    (type: TableTemplateType, event: React.PointerEvent<Element>) => {
      event.preventDefault();
      dragStateRef.current = {
        pointerId: event.pointerId,
        templateType: type,
      };
      setIsDragging(true);
      cachePointerRect(event.pointerId);
      const metrics = resolvePointerMetrics(
        event.pointerId,
        event.clientX,
        event.clientY,
      );
      setPreview({
        type,
        clientX: event.clientX,
        clientY: event.clientY,
        overCanvas: metrics.overCanvas,
        canvasX: metrics.canvasX,
        canvasY: metrics.canvasY,
        placement: metrics.overCanvas
          ? getTemplateDropPlacement(type, event.clientX, event.clientY)
          : null,
      });
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [
      cachePointerRect,
      getTemplateDropPlacement,
      handlePointerMove,
      handlePointerUp,
      resolvePointerMetrics,
    ],
  );

  const cancelTemplateDrag = React.useCallback(() => {
    const dragState = dragStateRef.current;
    if (!dragState) {
      return;
    }
    releasePointerRect(dragState.pointerId);
    dragStateRef.current = null;
    setPreview(null);
    setIsDragging(false);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
    window.removeEventListener('pointercancel', handlePointerUp);
  }, [handlePointerMove, handlePointerUp, releasePointerRect]);

  React.useEffect(() => cancelTemplateDrag, [cancelTemplateDrag]);

  return {
    templateDragPreview: preview,
    startTemplateDrag,
    cancelTemplateDrag,
    isTemplateDragging: isDragging,
  };
}
