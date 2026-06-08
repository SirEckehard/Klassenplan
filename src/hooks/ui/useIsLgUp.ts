import { useEffect, useState } from 'react';

// Mirrors Tailwind's canonical `lg` breakpoint (min-width: 1024px).
const LG_QUERY = '(min-width: 1024px)';

const getInitialMatch = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    // Desktop-first default matches the dominant case and avoids a layout
    // flash for desktop users; touch/phone clients correct on mount.
    return true;
  }
  return window.matchMedia(LG_QUERY).matches;
};

/**
 * Returns whether the viewport is at least Tailwind's `lg` breakpoint (≥1024px).
 *
 * Used to switch the Step 1 student list between the wide columnar layout
 * (`compact` selectors + sticky header + inner scroll) at `lg+` and the
 * narrow stacked layout (`hybrid` labelled chips + page scroll) below `lg`.
 * Reads `matchMedia` synchronously for the initial value to avoid a flash.
 */
export function useIsLgUp(): boolean {
  const [isLgUp, setIsLgUp] = useState<boolean>(getInitialMatch);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(LG_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsLgUp(event.matches);
    };

    // Initial value is read synchronously in useState; only subscribe here.
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isLgUp;
}
