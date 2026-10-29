// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useBreakpointUp } from '@/hooks/ui/useBreakpoint';

/**
 * Returns whether the viewport is at least Tailwind's `lg` breakpoint (≥1024px).
 *
 * From `lg` up the workspace is the window and its columns scroll on their
 * own; below it a layer is a scrolling page and an upright window turns the
 * plan (`usePortraitTurn`).
 */
export function useIsLgUp(): boolean {
  return useBreakpointUp('lg');
}
