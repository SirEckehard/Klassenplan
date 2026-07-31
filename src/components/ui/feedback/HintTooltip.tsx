// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';

interface HintTooltipProps {
  /** The explanation shown on hover/focus. */
  hint: string;
  /** Referenced by the control's aria-describedby. */
  id: string;
  /** Extra positioning classes; defaults to "above, right-aligned". */
  className?: string;
}

/**
 * Small tooltip explaining why a control is blocked.
 *
 * Place inside a `group relative` wrapper around the control. Kept in the
 * accessibility tree (opacity, not `hidden`) so `aria-describedby` still
 * announces it, and out of the layout flow so nothing shifts when it appears.
 */
const HintTooltip: React.FC<HintTooltipProps> = ({
  hint,
  id,
  className = 'bottom-full right-0 mb-2',
}) => (
  <span
    id={id}
    role="tooltip"
    className={`pointer-events-none absolute z-20 max-w-64 rounded-xl bg-gray-900/95 px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-gray-100 dark:text-gray-900 ${className}`}
  >
    {hint}
  </span>
);

export default HintTooltip;
