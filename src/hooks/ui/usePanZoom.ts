// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';

export type PanOffset = { x: number; y: number };

type PanGesture = {
  type: 'pan';
  startX: number;
  startY: number;
  basePan: PanOffset;
};

type PinchGesture = {
  type: 'pinch';
  startDist: number;
  startZoom: number;
  startPan: PanOffset;
  startMid: PanOffset;
  /** Container centre in screen coordinates (captured at gesture start). */
  cx: number;
  cy: number;
};

type Gesture = PanGesture | PinchGesture | null;

interface UsePanZoomOptions {
  zoom: number;
  setZoom: (value: number) => void;
  minZoom?: number;
  maxZoom?: number;
}

interface UsePanZoomResult {
  pan: PanOffset;
  /** Ref for the scene container: wheel listener + geometry are read from it. */
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** Pointer handlers to spread onto the scene container. */
  pointerHandlers: {
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
  };
  /** True when zoomed in far enough that panning does something. */
  canPan: boolean;
  /** Set an absolute zoom level (slider); recentres when back to fit. */
  setZoomLevel: (value: number) => void;
  /** Reset to 100 % and recentre. */
  reset: () => void;
}

/**
 * Pan & zoom gestures for the presentation scene: mouse-drag pan, wheel zoom
 * (anchored at the cursor, like a map), and two-finger pinch-zoom. Zoom is owned
 * by the caller (persisted); the pan offset lives here (ephemeral, in screen px).
 */
export function usePanZoom({
  zoom,
  setZoom,
  minZoom = 0.5,
  maxZoom = 3,
}: UsePanZoomOptions): UsePanZoomResult {
  const [pan, setPan] = useState<PanOffset>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Latest values for the native wheel listener and mid-gesture reads.
  const zoomRef = useRef(zoom);
  const panRef = useRef(pan);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  const pointersRef = useRef<Map<number, PanOffset>>(new Map());
  const gestureRef = useRef<Gesture>(null);

  const clampZoom = useCallback(
    (value: number) => Math.min(maxZoom, Math.max(minZoom, value)),
    [minZoom, maxZoom],
  );

  // Zoom toward a screen point so the content under it stays put (map-style).
  const zoomToPoint = useCallback(
    (rawZoom: number, anchorX: number, anchorY: number) => {
      const el = containerRef.current;
      if (!el) return;
      const newZoom = clampZoom(rawZoom);
      const curZoom = zoomRef.current;
      if (newZoom === curZoom) return;

      const rect = el.getBoundingClientRect();
      const k = newZoom / curZoom;
      const dx = anchorX - (rect.left + rect.width / 2);
      const dy = anchorY - (rect.top + rect.height / 2);
      const curPan = panRef.current;

      setZoom(newZoom);
      setPan(
        newZoom <= 1
          ? { x: 0, y: 0 }
          : { x: dx * (1 - k) + k * curPan.x, y: dy * (1 - k) + k * curPan.y },
      );
    },
    [clampZoom, setZoom],
  );

  // Native, non-passive wheel listener so preventDefault actually stops scroll.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.0015);
      zoomToPoint(zoomRef.current * factor, event.clientX, event.clientY);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomToPoint]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      pointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      const pointers = [...pointersRef.current.values()];
      if (pointers.length === 1) {
        gestureRef.current =
          zoomRef.current > 1
            ? {
                type: 'pan',
                startX: event.clientX,
                startY: event.clientY,
                basePan: panRef.current,
              }
            : null;
      } else if (pointers.length === 2) {
        const rect = event.currentTarget.getBoundingClientRect();
        gestureRef.current = {
          type: 'pinch',
          startDist:
            Math.hypot(
              pointers[0].x - pointers[1].x,
              pointers[0].y - pointers[1].y,
            ) || 1,
          startZoom: zoomRef.current,
          startPan: panRef.current,
          startMid: {
            x: (pointers[0].x + pointers[1].x) / 2,
            y: (pointers[0].y + pointers[1].y) / 2,
          },
          cx: rect.left + rect.width / 2,
          cy: rect.top + rect.height / 2,
        };
      }
    },
    [],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!pointersRef.current.has(event.pointerId)) return;
      pointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      const gesture = gestureRef.current;
      if (!gesture) return;

      if (gesture.type === 'pan') {
        setPan({
          x: gesture.basePan.x + (event.clientX - gesture.startX),
          y: gesture.basePan.y + (event.clientY - gesture.startY),
        });
        return;
      }

      const pointers = [...pointersRef.current.values()];
      if (pointers.length < 2) return;
      const dist = Math.hypot(
        pointers[0].x - pointers[1].x,
        pointers[0].y - pointers[1].y,
      );
      const mid = {
        x: (pointers[0].x + pointers[1].x) / 2,
        y: (pointers[0].y + pointers[1].y) / 2,
      };
      const newZoom = clampZoom(gesture.startZoom * (dist / gesture.startDist));
      const k = newZoom / gesture.startZoom;
      const dx = gesture.startMid.x - gesture.cx;
      const dy = gesture.startMid.y - gesture.cy;

      setZoom(newZoom);
      setPan(
        newZoom <= 1
          ? { x: 0, y: 0 }
          : {
              x:
                dx * (1 - k) +
                k * gesture.startPan.x +
                (mid.x - gesture.startMid.x),
              y:
                dy * (1 - k) +
                k * gesture.startPan.y +
                (mid.y - gesture.startMid.y),
            },
      );
    },
    [clampZoom, setZoom],
  );

  const onPointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!pointersRef.current.has(event.pointerId)) return;
      pointersRef.current.delete(event.pointerId);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      const pointers = [...pointersRef.current.values()];
      if (pointers.length === 1) {
        // Lifted one finger of a pinch — continue panning with the other.
        gestureRef.current =
          zoomRef.current > 1
            ? {
                type: 'pan',
                startX: pointers[0].x,
                startY: pointers[0].y,
                basePan: panRef.current,
              }
            : null;
      } else if (pointers.length === 0) {
        gestureRef.current = null;
      }
    },
    [],
  );

  const setZoomLevel = useCallback(
    (value: number) => {
      const next = clampZoom(value);
      setZoom(next);
      if (next <= 1) setPan({ x: 0, y: 0 });
    },
    [clampZoom, setZoom],
  );

  const reset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [setZoom]);

  return {
    pan,
    containerRef,
    pointerHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
    },
    canPan: zoom > 1,
    setZoomLevel,
    reset,
  };
}

export default usePanZoom;
