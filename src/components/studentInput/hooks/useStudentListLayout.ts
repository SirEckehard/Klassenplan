// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdaptiveViewportHeight } from '@/hooks/ui/useAdaptiveViewportHeight';
import { useFloatingActionOffset } from '@/hooks/ui/useFloatingActionOffset';
import { useCookieBannerOffset } from '@/hooks/ui/useCookieBannerOffset';
import { usePrefersReducedMotion } from '@/hooks/ui/usePrefersReducedMotion';
import { getViewportMetrics, onVisualViewport } from '@/utils';

type UseStudentListLayoutOptions = {
  isMobile: boolean;
  studentCount: number;
  recalcKey?: number;
};

// Space kept free below the list so the action row (name game / proceed
// buttons) stays visible: collapsed list/action-row margin (24px), the button
// row itself (~36px) and a small bottom margin matching the step-2 footer
// buttons, so the action row shares their baseline on desktop viewports.
const ACTION_ROW_RESERVED_PX = 76;

/**
 * Which way the floating scroll button points, or `null` while both ends of the
 * list are within reach.
 */
export type ListScrollHint = 'down' | 'up' | null;

// The proceed button counts as reached once it clears the bottom edge by this
// much — the same margin the earlier scroll affordance used.
const PROCEED_REACHED_MARGIN_PX = 100;

// How far the top of the step has to be scrolled past before offering the way
// back. Roughly one student row, so the button does not flicker in at the very
// first flick of a short list.
const TOP_SCROLLED_PAST_PX = 120;

export const useStudentListLayout = ({
  isMobile,
  studentCount,
  recalcKey,
}: UseStudentListLayoutOptions) => {
  const cookieBannerOffset = useCookieBannerOffset();
  const proceedButtonRef = useRef<HTMLButtonElement | null>(null);
  const floatingActionOffsets = useFloatingActionOffset();
  const { containerRef: listContainerRef, maxHeight: listMaxHeight } =
    useAdaptiveViewportHeight<HTMLDivElement>({
      disabled: isMobile,
      reservedBottom: ACTION_ROW_RESERVED_PX + cookieBannerOffset,
      minHeight: 280,
      fallbackHeight: 448,
      includeViewportOffset: true,
      changeThreshold: 50,
      debounceMs: 300,
      dependencies: [studentCount, cookieBannerOffset, recalcKey],
    });
  const listTopRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [scrollHint, setScrollHint] = useState<ListScrollHint>(null);

  useEffect(() => {
    if (!isMobile || studentCount === 0) {
      queueMicrotask(() => {
        setScrollHint(null);
      });
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    // The direction follows from the scroll position, so one button can serve
    // both ways: down while the action row is still out of reach, up once it
    // has been reached and the toolbar at the top is what is far away.
    const checkScrollPosition = () => {
      const proceedButton = proceedButtonRef.current;
      if (!proceedButton) {
        setScrollHint(null);
        return;
      }

      const { height } = getViewportMetrics();
      const viewportHeight = height || window.innerHeight || 0;
      const proceedRect = proceedButton.getBoundingClientRect();

      if (proceedRect.top > viewportHeight - PROCEED_REACHED_MARGIN_PX) {
        setScrollHint('down');
        return;
      }

      const topRect = listTopRef.current?.getBoundingClientRect();
      setScrollHint(
        topRect && topRect.top < -TOP_SCROLLED_PAST_PX ? 'up' : null,
      );
    };

    checkScrollPosition();

    let scrollTimeout: number | null = null;
    const debouncedScroll = () => {
      if (scrollTimeout) {
        window.clearTimeout(scrollTimeout);
      }
      scrollTimeout = window.setTimeout(checkScrollPosition, 100);
    };

    window.addEventListener('scroll', debouncedScroll, { passive: true });
    window.addEventListener('resize', debouncedScroll);

    const removeViewportResize = onVisualViewport('resize', debouncedScroll);
    const removeViewportScroll = onVisualViewport('scroll', debouncedScroll);

    return () => {
      if (scrollTimeout) {
        window.clearTimeout(scrollTimeout);
      }
      window.removeEventListener('scroll', debouncedScroll);
      window.removeEventListener('resize', debouncedScroll);
      removeViewportResize();
      removeViewportScroll();
    };
  }, [isMobile, studentCount]);

  const handleScrollHint = useCallback(() => {
    const behavior = prefersReducedMotion ? 'auto' : 'smooth';

    if (scrollHint === 'up') {
      listTopRef.current?.scrollIntoView({ behavior, block: 'start' });
      return;
    }

    proceedButtonRef.current?.scrollIntoView({ behavior, block: 'center' });
  }, [prefersReducedMotion, scrollHint]);

  return {
    listContainerRef,
    listMaxHeight,
    listTopRef,
    proceedButtonRef,
    scrollHint,
    handleScrollHint,
    floatingActionOffsets,
  };
};
