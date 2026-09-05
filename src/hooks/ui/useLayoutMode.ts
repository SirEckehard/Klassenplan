// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useBreakpointUp } from '@/hooks/ui/useBreakpoint';

/**
 * How much room the editor views have for a sidebar column.
 *
 * - `phone` (< `md`, 768px) — no room at all: the sidebar becomes a floating
 *   trigger plus a full-screen sheet, and the palettes move under the canvas.
 * - `tablet` (`md` … `lg`, 768–1023px) — room for the collapsed 88px rail but
 *   not for the expanded 288px panel next to a usable canvas. An iPad in
 *   portrait lands here; before this tier existed it got the phone UI and could
 *   never see options and canvas at the same time.
 * - `desktop` (≥ `lg`, 1024px) — the full sidebar, expansion state remembered.
 *
 * The tiers are the Tailwind `md`/`lg` steps so the JS decisions line up with
 * the `md:`/`lg:` variants in the markup.
 */
export type LayoutMode = 'phone' | 'tablet' | 'desktop';

export function useLayoutMode(): LayoutMode {
  const isMdUp = useBreakpointUp('md');
  const isLgUp = useBreakpointUp('lg');

  if (isLgUp) {
    return 'desktop';
  }
  return isMdUp ? 'tablet' : 'phone';
}

/**
 * Whether the viewport is too narrow for any sidebar column.
 *
 * The one question most call sites actually have — "do the palettes and the
 * options need a full-screen sheet?" — kept separate from the three-way mode so
 * components do not have to spell out `mode === 'phone'` each time.
 */
export function useIsPhone(): boolean {
  return useLayoutMode() === 'phone';
}
