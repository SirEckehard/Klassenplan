// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdaptiveViewportHeight } from '@/hooks/ui/useAdaptiveViewportHeight';
import { useFloatingActionOffset } from '@/hooks/ui/useFloatingActionOffset';
import { useCookieBannerOffset } from '@/hooks/ui/useCookieBannerOffset';
import { getViewportMetrics, onVisualViewport } from '@/utils';

type UseStudentListLayoutOptions = {
  isMobile: boolean;
  studentCount: number;
  recalcKey?: number;
};

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
      reservedTop: 280,
      reservedBottom: cookieBannerOffset,
      minHeight: 280,
      maxHeight: 640,
      maxViewportRatio: 0.6,
      fallbackHeight: 384,
      includeViewportOffset: true,
      changeThreshold: 50,
      debounceMs: 300,
      dependencies: [studentCount, cookieBannerOffset, recalcKey],
    });
  const [showScrollButton, setShowScrollButton] = useState(false);

  useEffect(() => {
    if (!isMobile || studentCount === 0) {
      queueMicrotask(() => {
        setShowScrollButton(false);
      });
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const checkScrollPosition = () => {
      if (!proceedButtonRef.current) {
        return;
      }

      const rect = proceedButtonRef.current.getBoundingClientRect();
      const { height } = getViewportMetrics();
      const viewportHeight = height || window.innerHeight || 0;

      setShowScrollButton(rect.top > viewportHeight - 100);
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

  const handleScrollToBottom = useCallback(() => {
    proceedButtonRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, []);

  return {
    listContainerRef,
    listMaxHeight,
    proceedButtonRef,
    showScrollButton,
    handleScrollToBottom,
    floatingActionOffsets,
  };
};
