// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { mutedIconButtonClass } from '@/utils';

type IconWithLabelProps = {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  tooltip?: string;
  variant?: 'default' | 'danger';
  ariaLabel?: string;
  ariaPressed?: boolean;
  colorClasses?: string; // For custom colors from compact view
};

/**
 * IconWithLabel Component (Redesigned for Hybrid View)
 *
 * A button component with a round icon button and label below it.
 * Designed to match the visual style of the compact view.
 *
 * Features:
 * - Round button (rounded-full) with icon inside
 * - Label displayed below button (outside)
 * - Fixed width: 8 characters for consistent alignment
 * - Colors match compact view styling
 * - 44px minimum touch target size
 * - Active/inactive states
 * - Default and danger variants
 * - Full dark mode support
 *
 * @param icon - The icon element to display inside the button
 * @param label - Text label to show below the button (max 8 chars)
 * @param onClick - Optional click handler
 * @param active - Whether the button is in active state (default: false)
 * @param tooltip - Tooltip text for hover (default: label)
 * @param variant - Visual variant: 'default' or 'danger' (default: 'default')
 * @param ariaLabel - Accessibility label (default: label)
 * @param ariaPressed - ARIA pressed state for toggle buttons
 * @param colorClasses - Custom color classes from compact view tokens
 */
export default function IconWithLabel({
  icon,
  label,
  onClick,
  active = false,
  tooltip,
  variant = 'default',
  ariaLabel,
  ariaPressed,
  colorClasses,
}: IconWithLabelProps) {
  // Truncate label to 8 characters max
  const truncatedLabel = label.length > 8 ? `${label.slice(0, 7)}…` : label;

  // Base button class with round shape (44px min touch target)
  const baseButtonClass = `${mutedIconButtonClass} h-11 w-11 rounded-full flex items-center justify-center p-0`;

  // Color classes based on variant and active state
  const buttonColorClass = colorClasses
    ? colorClasses
    : variant === 'danger'
      ? active
        ? 'border-rose-400! bg-rose-200! text-rose-700! dark:border-rose-500! dark:bg-rose-500/20! dark:text-rose-200!'
        : 'border-gray-200! bg-white! text-gray-500! hover:border-rose-300! hover:bg-rose-50! dark:border-gray-700! dark:bg-gray-800! dark:text-gray-400! dark:hover:border-rose-600! dark:hover:bg-rose-900/20!'
      : active
        ? 'border-blue-400! bg-blue-200! text-blue-700! dark:border-blue-500! dark:bg-blue-500/20! dark:text-blue-200!'
        : 'border-gray-200! bg-white! text-gray-600! hover:border-gray-300! hover:bg-gray-50! dark:border-gray-700! dark:bg-gray-800! dark:text-gray-300! dark:hover:border-gray-600! dark:hover:bg-gray-700!';

  const buttonClass = `${baseButtonClass} ${buttonColorClass}`;

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onClick?.();
  };

  return (
    <div
      className={`flex flex-col items-center gap-1 min-w-11 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick ? handleClick : undefined}
    >
      {/* Round Icon Button */}
      <button
        type="button"
        className={buttonClass}
        // onClick is now handled by wrapper for consistent behavior, but keep here for tab focus
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        title={tooltip ?? label}
        aria-label={ariaLabel ?? label}
        aria-pressed={ariaPressed}
        disabled={!onClick}
      >
        {icon}
      </button>

      {/* Label Below Button (Fixed Width: 8 chars) */}
      <span
        className="text-[10px] font-medium leading-tight text-center text-gray-700 dark:text-gray-300 w-16 truncate"
        // Match the button tooltip so compact (icon-only) and detail views show
        // the same hover text; falls back to the (possibly truncated) label.
        title={tooltip ?? label}
      >
        {truncatedLabel}
      </span>
    </div>
  );
}
