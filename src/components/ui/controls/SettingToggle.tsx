// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { getSidebarSurfaceClasses, getSidebarIconClasses } from '@/utils';

interface SettingToggleProps {
  icon?: React.ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  hideCheckboxIndicator?: boolean;
}

/**
 * Reusable setting toggle component with icon and label
 * Provides consistent styling for checkbox settings in sidebar panels
 */
export default function SettingToggle({
  icon,
  label,
  description,
  checked,
  onChange,
  disabled = false,
  className = '',
  hideCheckboxIndicator = false,
}: SettingToggleProps) {
  const [isFocusVisible, setIsFocusVisible] = React.useState(false);
  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocusVisible(event.target.matches(':focus-visible'));
  };
  const handleBlur = () => {
    setIsFocusVisible(false);
  };
  const focusRingClass = isFocusVisible
    ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-transparent dark:ring-blue-600/80'
    : 'ring-0 ring-transparent';
  const surfaceClass = [
    'group relative flex items-center gap-3 rounded-2xl px-4 py-3 transition-all outline-none',
    getSidebarSurfaceClasses({
      variant: 'expanded',
      isActive: checked,
      disabled,
      interactive: !disabled,
    }),
    focusRingClass,
  ].join(' ');
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !disabled) {
      event.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <label
      className={`${surfaceClass} ${disabled ? 'cursor-not-allowed opacity-50' : ''} ${className}`}
    >
      {/* Icon */}
      {icon && (
        <span
          className={getSidebarIconClasses({
            isActive: checked,
            disabled,
          })}
        >
          {icon}
        </span>
      )}

      {/* Label and Description */}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {label}
        </div>
        {description && (
          <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {description}
          </div>
        )}
      </div>

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        className={`${
          hideCheckboxIndicator
            ? 'sr-only focus:outline-none focus-visible:outline-none'
            : 'h-4 w-4 accent-blue-600 dark:accent-blue-500 cursor-pointer disabled:cursor-not-allowed focus:outline-none focus-visible:outline-none'
        }`}
        aria-label={label}
      />
    </label>
  );
}
