// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { Icon } from '@phosphor-icons/react';
import {
  pillTabActiveClass,
  pillTabBaseClass,
  pillTabInactiveClass,
  segmentedTrackClass,
} from '@/utils';

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: Icon;
};

type Props<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Names the group for screen readers; the options name themselves. */
  ariaLabel: string;
  /** Fired on hover and focus — the layer switcher warms a route with it. */
  onOptionPointed?: (value: T) => void;
  /** Hide the labels below `sm` and keep only the icons. */
  compactLabels?: boolean;
  className?: string;
};

/**
 * One choice out of two or three, in a recessed track.
 *
 * The active option is a raised paper pill, never a blue one: blue means "you
 * can act here", and picking which of several views you are looking at is not
 * an action. Three places grew their own version of this before the token
 * existed — the layer switcher, the seating mode toggle and the dialog tabs.
 */
export default function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  onOptionPointed,
  compactLabels = false,
  className = '',
}: Props<T>) {
  return (
    <div
      className={`${segmentedTrackClass} ${className}`}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        const OptionIcon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => {
              if (!isActive) onChange(option.value);
            }}
            onMouseEnter={() => onOptionPointed?.(option.value)}
            onFocus={() => onOptionPointed?.(option.value)}
            className={`${pillTabBaseClass} ${
              isActive ? pillTabActiveClass : pillTabInactiveClass
            } gap-2 px-3 py-1.5 sm:px-4`}
          >
            {OptionIcon && <OptionIcon size={17} aria-hidden="true" />}
            {compactLabels ? (
              <>
                <span className="hidden sm:inline">{option.label}</span>
                <span className="sr-only sm:hidden">{option.label}</span>
              </>
            ) : (
              option.label
            )}
          </button>
        );
      })}
    </div>
  );
}
