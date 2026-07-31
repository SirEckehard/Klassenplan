// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useBreakpointUp } from '@/hooks/ui/useBreakpoint';

/**
 * Returns whether the viewport is at least Tailwind's `lg` breakpoint (≥1024px).
 *
 * Used to switch the Step 1 student list between the wide columnar layout
 * (`compact` selectors + sticky header + inner scroll) at `lg+` and the
 * narrow stacked layout (`hybrid` labelled chips + page scroll) below `lg`.
 */
export function useIsLgUp(): boolean {
  return useBreakpointUp('lg');
}
