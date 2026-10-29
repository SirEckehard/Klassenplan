// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '@/hooks/ui/usePrefersReducedMotion';
import { getViewportMetrics, onVisualViewport } from '@/utils';
import { SHELL_STATUS_BAR_HEIGHT } from '@/components/shell/shellTokens';

type UseStudentListLayoutOptions = {
  isMobile: boolean;
  studentCount: number;
};

/**
 * Which way the floating scroll button points, or `null` while both ends of the
 * list are within reach.
 */
export type ListScrollHint = 'down' | 'up' | null;

// How far the top of the step has to be scrolled past before offering the way
// back. Roughly one student row, so the button does not flicker in at the very
// first flick of a short list.
const TOP_SCROLLED_PAST_PX = 120;

export const useStudentListLayout = ({
  isMobile,
  studentCount,
}: UseStudentListLayoutOptions) => {
  // Marks the end of the list for the phone's scroll affordance: an empty
  // sentinel element.
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const listTopRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [scrollHint, setScrollHint] = useState<ListScrollHint>(null);

  // Off a phone, or with nobody on the list, there is nothing to point to.
  // Reset while rendering rather than from the effect, which only listens.
  const tracking = isMobile && studentCount > 0;
  if (!tracking && scrollHint !== null) {
    setScrollHint(null);
  }

  useEffect(() => {
    if (!tracking) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    // The direction follows from the scroll position, so one button can serve
    // both ways: down while the action row is still out of reach, up once it
    // has been reached and the toolbar at the top is what is far away.
    const checkScrollPosition = () => {
      const listEnd = listEndRef.current;
      if (!listEnd) {
        setScrollHint(null);
        return;
      }

      const { height } = getViewportMetrics();
      const viewportHeight = height || window.innerHeight || 0;
      const listEndRect = listEnd.getBoundingClientRect();

      // The status bar stands over the window's bottom edge, so the end is in
      // reach once it shows above the bar. A margin of 100px from the window's
      // edge, from before the bar, was more than the page could ever scroll:
      // at its foot the end stands only the bar and the page's padding up,
      // and the button kept pointing down there.
      if (listEndRect.top > viewportHeight - SHELL_STATUS_BAR_HEIGHT) {
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
    // A student added or removed moves the list's end: checked anew.
  }, [tracking, studentCount]);

  const handleScrollHint = useCallback(() => {
    const behavior = prefersReducedMotion ? 'auto' : 'smooth';

    if (scrollHint === 'up') {
      listTopRef.current?.scrollIntoView({ behavior, block: 'start' });
      return;
    }

    listEndRef.current?.scrollIntoView({ behavior, block: 'center' });
  }, [prefersReducedMotion, scrollHint]);

  return {
    listTopRef,
    listEndRef,
    scrollHint,
    handleScrollHint,
  };
};
