// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useBreakpointDown } from '@/hooks/ui/useBreakpoint';

/**
 * Hook to detect narrow viewports that need the mobile UI (floating triggers
 * and full-screen sheets instead of sidebars).
 *
 * Shares the `lg` breakpoint with `useIsLgUp` so JS and CSS switch layouts at
 * the same width; it used to sit at a bespoke 996px, leaving a 28px band where
 * the two disagreed.
 *
 * @returns boolean indicating if the current viewport is below `lg` (1024px)
 */
export function useIsMobile(): boolean {
  return useBreakpointDown('lg');
}
