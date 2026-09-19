// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useCookieBannerOffset } from '@/hooks/ui/useCookieBannerOffset';

type FloatingActionOffsetOptions = {
  bottomSpacing?: string;
  /** Horizontal spacing from the anchored edge. */
  inlineSpacing?: string;
  /** Which edge to anchor to. Defaults to the right. */
  side?: 'left' | 'right';
};

// Provides consistent offsets for floating UI controls while respecting safe areas and the cookie banner
export function useFloatingActionOffset(
  options?: FloatingActionOffsetOptions,
): CSSProperties {
  const cookieBannerOffset = useCookieBannerOffset();
  const {
    bottomSpacing = '1rem',
    inlineSpacing = '1rem',
    side = 'right',
  } = options || {};

  return useMemo(() => {
    const offsetValue =
      cookieBannerOffset > 0 ? `${cookieBannerOffset}px` : '0px';

    return {
      // `--shell-bottom-inset` is the height of the shell's status bar, which
      // is sticky at the bottom of the workspace; a floating control that
      // ignored it would cover the layer's primary action.
      bottom: `calc(${bottomSpacing} + env(safe-area-inset-bottom) + ${offsetValue} + var(--shell-bottom-inset, 0px))`,
      [side]: `calc(${inlineSpacing} + env(safe-area-inset-${side}))`,
    };
  }, [bottomSpacing, cookieBannerOffset, inlineSpacing, side]);
}
