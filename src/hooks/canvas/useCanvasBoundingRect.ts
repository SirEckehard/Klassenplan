// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';

export function useCanvasBoundingRect<T extends Element>(
  targetRef: React.RefObject<T | null>,
) {
  const rectRef = React.useRef<DOMRectReadOnly | null>(null);

  const measureCanvasRect = React.useCallback(() => {
    const element = targetRef.current;
    if (!element) {
      rectRef.current = null;
      return null;
    }
    const rect = element.getBoundingClientRect();
    rectRef.current = rect;
    return rect;
  }, [targetRef]);

  React.useLayoutEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let resizeObserver: ResizeObserver | null = null;
    let rafId: number | null = null;
    let isCancelled = false;

    const scheduleMeasure = () => {
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        measureCanvasRect();
      });
    };

    const attachObservers = () => {
      if (isCancelled) {
        return;
      }
      const element = targetRef.current;
      if (!element) {
        rafId = window.requestAnimationFrame(attachObservers);
        return;
      }

      measureCanvasRect();

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(scheduleMeasure);
        resizeObserver.observe(element);
      }
      window.addEventListener('resize', scheduleMeasure);
      window.addEventListener('scroll', scheduleMeasure, true);
    };

    attachObservers();

    return () => {
      isCancelled = true;
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('scroll', scheduleMeasure, true);
    };
  }, [measureCanvasRect, targetRef]);

  return {
    canvasRectRef: rectRef,
  };
}
