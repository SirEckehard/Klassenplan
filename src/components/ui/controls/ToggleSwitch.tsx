// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  title?: string;
  className?: string;
  /** Visual size of the switch; `sm` fits compact popover headings. */
  size?: 'md' | 'sm';
}

/**
 * Reusable sliding toggle switch primitive.
 * Renders a track with a sliding knob and exposes proper switch semantics
 * (role="switch", aria-checked, keyboard activation via Space/Enter).
 */
export default function ToggleSwitch({
  checked,
  onChange,
  label,
  disabled = false,
  title,
  className = '',
  size = 'md',
}: ToggleSwitchProps) {
  const trackSizeClass = size === 'sm' ? 'h-4 w-7' : 'h-6 w-11';
  const knobSizeClass = size === 'sm' ? 'h-3 w-3' : 'h-5 w-5';
  const knobPositionClass = checked
    ? size === 'sm'
      ? 'translate-x-3.5'
      : 'translate-x-5.5'
    : 'translate-x-0.5';
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex ${trackSizeClass} shrink-0 cursor-pointer items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-blue-600/80 ${
        checked
          ? 'bg-blue-600 dark:bg-blue-500'
          : 'bg-gray-300 dark:bg-gray-600'
      } ${className}`}
    >
      <span
        className={`inline-block ${knobSizeClass} transform rounded-full bg-white shadow transition-transform ${knobPositionClass}`}
      />
    </button>
  );
}
