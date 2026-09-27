// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { CheckIcon } from '@phosphor-icons/react';
import { menuItemClass } from '@/utils';

/**
 * One row of the menu: its icon, its word and — while it is on — a check. The
 * row itself is the switch, pressed or not; the check says the same thing
 * without colour.
 */
export default function MenuCheckRow({
  icon,
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  icon?: React.ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={menuItemClass}
    >
      {icon && (
        <span
          aria-hidden="true"
          className={`inline-flex size-4.5 shrink-0 items-center justify-center ${
            checked ? 'text-(--text-page)' : 'text-(--text-muted)'
          }`}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block">{label}</span>
        {description && (
          <span className="block text-xs text-(--text-muted)">
            {description}
          </span>
        )}
      </span>
      <CheckIcon
        size={16}
        aria-hidden="true"
        className={`shrink-0 text-(--text-badge) ${checked ? '' : 'invisible'}`}
      />
    </button>
  );
}
