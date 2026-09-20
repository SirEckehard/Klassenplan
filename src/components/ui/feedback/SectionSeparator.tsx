// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';

interface SectionSeparatorProps {
  label?: string;
  className?: string;
}

/**
 * Visual separator between sections in sidebar panels
 * Optionally displays a centered label
 */
export default function SectionSeparator({
  label,
  className = '',
}: SectionSeparatorProps) {
  if (label) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 ${className}`}
        role="separator"
        aria-label={label}
      >
        <div className="flex-1 h-px bg-(--border-card)" />
        <span className="text-xs font-medium text-(--text-muted) uppercase tracking-wide">
          {label}
        </span>
        <div className="flex-1 h-px bg-(--border-card)" />
      </div>
    );
  }

  return (
    <div
      className={`border-t border-(--border-card) ${className}`}
      role="separator"
    />
  );
}
