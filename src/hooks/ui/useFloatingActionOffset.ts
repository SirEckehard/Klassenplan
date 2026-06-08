import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useCookieBannerOffset } from '@/hooks/ui/useCookieBannerOffset';

type FloatingActionOffsetOptions = {
  bottomSpacing?: string;
  rightSpacing?: string;
};

// Provides consistent offsets for floating UI controls while respecting safe areas and the cookie banner
export function useFloatingActionOffset(
  options?: FloatingActionOffsetOptions,
): CSSProperties {
  const cookieBannerOffset = useCookieBannerOffset();
  const { bottomSpacing = '1rem', rightSpacing = '1rem' } = options || {};

  return useMemo(() => {
    const offsetValue =
      cookieBannerOffset > 0 ? `${cookieBannerOffset}px` : '0px';

    return {
      bottom: `calc(${bottomSpacing} + env(safe-area-inset-bottom) + ${offsetValue})`,
      right: `calc(${rightSpacing} + env(safe-area-inset-right))`,
    };
  }, [bottomSpacing, cookieBannerOffset, rightSpacing]);
}
