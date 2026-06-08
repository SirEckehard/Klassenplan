// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DependencyList,
  type MutableRefObject,
} from 'react';
import { getViewportMetrics, onVisualViewport } from '@/utils';
import type { ViewportMetrics } from '@/utils';

type VisualViewportEvent = 'resize' | 'scroll';

export interface AdaptiveViewportMeasureContext<T extends HTMLElement> {
  container: T;
  rect: DOMRect;
  metrics: ViewportMetrics;
  viewportHeight: number;
  viewportWidth: number;
}

export interface AdaptiveViewportHeightOptions<T extends HTMLElement> {
  containerRef?: MutableRefObject<T | null>;
  disabled?: boolean;
  dependencies?: DependencyList;
  reservedTop?: number;
  reservedBottom?: number;
  minHeight?: number;
  maxHeight?: number;
  maxViewportRatio?: number;
  fallbackHeight?: number;
  includeViewportOffset?: boolean;
  changeThreshold?: number;
  detectOverflow?: boolean;
  overflowThreshold?: number;
  debounceMs?: number;
  useAnimationFrame?: boolean;
  useResizeObserver?: boolean;
  visualViewportEvents?: ReadonlyArray<VisualViewportEvent>;
  orientationChange?: boolean;
  customMeasure?: (context: AdaptiveViewportMeasureContext<T>) => number | null;
}

export interface AdaptiveViewportHeightResult<T extends HTMLElement> {
  containerRef: MutableRefObject<T | null>;
  maxHeight: number | null;
  hasOverflow: boolean;
  recalculate: () => void;
}

const DEFAULT_VISUAL_EVENTS: ReadonlyArray<VisualViewportEvent> = ['resize'];

const EMPTY_DEPENDENCIES: DependencyList = [];

export function useAdaptiveViewportHeight<T extends HTMLElement = HTMLElement>(
  options: AdaptiveViewportHeightOptions<T> = {},
): AdaptiveViewportHeightResult<T> {
  const {
    containerRef,
    disabled = false,
    dependencies,
    reservedTop = 0,
    reservedBottom = 0,
    minHeight,
    maxHeight,
    maxViewportRatio,
    fallbackHeight,
    includeViewportOffset = false,
    changeThreshold = 1,
    detectOverflow = false,
    overflowThreshold = 1,
    debounceMs = 150,
    useAnimationFrame = true,
    useResizeObserver,
    visualViewportEvents,
    orientationChange = true,
    customMeasure,
  } = options;

  const internalRef = useRef<T | null>(null);
  const resolvedRef = containerRef ?? internalRef;

  const [measuredHeight, setMeasuredHeight] = useState<number | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);

  const viewportEvents = useMemo(
    () =>
      visualViewportEvents && visualViewportEvents.length > 0
        ? visualViewportEvents
        : DEFAULT_VISUAL_EVENTS,
    [visualViewportEvents],
  );

  const shouldObserveResize =
    useResizeObserver !== undefined ? useResizeObserver : detectOverflow;

  const manualDependencies = dependencies ?? EMPTY_DEPENDENCIES;

  const commitHeight = useCallback(
    (next: number | null) => {
      const applyUpdate = () => {
        setMeasuredHeight((previous) => {
          if (next === null) {
            return null;
          }

          if (previous === null) {
            return next;
          }

          return Math.abs(previous - next) > changeThreshold ? next : previous;
        });
      };

      if (useAnimationFrame && typeof window !== 'undefined') {
        window.requestAnimationFrame(applyUpdate);
        return;
      }

      applyUpdate();
    },
    [changeThreshold, useAnimationFrame],
  );

  const defaultMeasure = useCallback(
    (context: AdaptiveViewportMeasureContext<T>) => {
      const { rect, metrics, viewportHeight } = context;
      const effectiveViewportHeight =
        viewportHeight ||
        (typeof window !== 'undefined' ? window.innerHeight || 0 : 0);

      if (effectiveViewportHeight === 0) {
        return fallbackHeight ?? null;
      }

      const offset = includeViewportOffset ? (metrics.offsetTop ?? 0) : 0;
      const reservedSpace = reservedTop + reservedBottom + offset;
      const availableHeight =
        effectiveViewportHeight - rect.top - reservedSpace;

      if (!Number.isFinite(availableHeight)) {
        return fallbackHeight ?? null;
      }

      const ratioSource =
        effectiveViewportHeight > 0
          ? effectiveViewportHeight
          : (fallbackHeight ?? effectiveViewportHeight);

      const ratioCap =
        maxViewportRatio && maxViewportRatio > 0 && ratioSource > 0
          ? ratioSource * maxViewportRatio
          : undefined;

      let nextHeight = availableHeight;
      if (typeof ratioCap === 'number') {
        nextHeight = Math.min(nextHeight, ratioCap);
      }

      if (typeof maxHeight === 'number') {
        nextHeight = Math.min(nextHeight, maxHeight);
      }

      if (typeof minHeight === 'number') {
        nextHeight = Math.max(nextHeight, minHeight);
      }

      if (!Number.isFinite(nextHeight)) {
        return fallbackHeight ?? null;
      }

      if (nextHeight <= 0) {
        if (typeof fallbackHeight === 'number') {
          return fallbackHeight;
        }
        return 0;
      }

      return nextHeight;
    },
    [
      fallbackHeight,
      includeViewportOffset,
      maxHeight,
      maxViewportRatio,
      minHeight,
      reservedBottom,
      reservedTop,
    ],
  );

  const measure = customMeasure ?? defaultMeasure;

  const performMeasurement = useCallback(() => {
    if (disabled || typeof window === 'undefined') {
      return;
    }

    const container = resolvedRef.current;
    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const metrics = getViewportMetrics();
    const viewportHeight = metrics.height || window.innerHeight || 0;
    const viewportWidth = metrics.width || window.innerWidth || 0;

    const height = measure({
      container,
      rect,
      metrics,
      viewportHeight,
      viewportWidth,
    });

    if (!Number.isFinite(height) || height === null) {
      commitHeight(null);
      setHasOverflow(false);
      return;
    }

    const normalizedHeight = Math.max(0, height);
    commitHeight(normalizedHeight);

    if (detectOverflow) {
      const overflow =
        container.scrollHeight - normalizedHeight > overflowThreshold;
      setHasOverflow((previous) =>
        previous === overflow ? previous : overflow,
      );
    } else {
      setHasOverflow(false);
    }
  }, [
    commitHeight,
    detectOverflow,
    disabled,
    measure,
    overflowThreshold,
    resolvedRef,
  ]);

  useEffect(() => {
    if (disabled || typeof window === 'undefined') {
      return;
    }

    queueMicrotask(performMeasurement);

    let timeoutId: number | undefined;
    const scheduleMeasurement = () => {
      if (!debounceMs || debounceMs <= 0) {
        performMeasurement();
        return;
      }

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        performMeasurement();
      }, debounceMs);
    };

    const resizeHandler = () => scheduleMeasurement();

    window.addEventListener('resize', resizeHandler);
    if (orientationChange) {
      window.addEventListener('orientationchange', resizeHandler);
    }
    const viewportCleanups = viewportEvents.map((event) =>
      onVisualViewport(event, resizeHandler),
    );

    let resizeObserver: ResizeObserver | undefined;
    if (
      shouldObserveResize &&
      typeof ResizeObserver !== 'undefined' &&
      resolvedRef.current
    ) {
      resizeObserver = new ResizeObserver(resizeHandler);
      resizeObserver.observe(resolvedRef.current);
    }

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      window.removeEventListener('resize', resizeHandler);
      if (orientationChange) {
        window.removeEventListener('orientationchange', resizeHandler);
      }
      viewportCleanups.forEach((cleanup) => cleanup());
      resizeObserver?.disconnect();
    };
  }, [
    debounceMs,
    disabled,
    orientationChange,
    performMeasurement,
    resolvedRef,
    shouldObserveResize,
    viewportEvents,
  ]);

  useEffect(() => {
    if (disabled) {
      return;
    }

    queueMicrotask(performMeasurement);
  }, [disabled, manualDependencies, performMeasurement]);

  const recalculate = useCallback(() => {
    performMeasurement();
  }, [performMeasurement]);

  return {
    containerRef: resolvedRef,
    maxHeight: disabled ? null : measuredHeight,
    hasOverflow: disabled ? false : hasOverflow,
    recalculate,
  };
}
