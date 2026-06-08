import { useEffect, useState } from 'react';

export const COOKIE_BANNER_OFFSET_EVENT = 'cookie-banner-offset-change';

// Track the current cookie banner offset in pixels
export function useCookieBannerOffset(): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const readOffset = () => {
      const computedStyle = window.getComputedStyle(document.body);
      const rawValue = computedStyle
        .getPropertyValue('--cookie-banner-offset')
        .trim();
      const parsedValue = Number.parseFloat(rawValue);
      setOffset(Number.isFinite(parsedValue) ? parsedValue : 0);
    };

    readOffset();

    const handleOffsetChange = () => {
      readOffset();
    };

    window.addEventListener(COOKIE_BANNER_OFFSET_EVENT, handleOffsetChange);
    window.addEventListener('resize', handleOffsetChange);
    window.addEventListener('orientationchange', handleOffsetChange);

    return () => {
      window.removeEventListener(
        COOKIE_BANNER_OFFSET_EVENT,
        handleOffsetChange,
      );
      window.removeEventListener('resize', handleOffsetChange);
      window.removeEventListener('orientationchange', handleOffsetChange);
    };
  }, []);

  return offset;
}
