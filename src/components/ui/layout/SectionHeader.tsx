// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';

interface SectionHeaderProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}

/**
 * Reusable section header component for sidebar panels
 * Provides consistent styling across SmartEditPanel, MixCriteria, and CircleViewControls
 */
export default function SectionHeader({
  icon,
  title,
  description,
  className = '',
}: SectionHeaderProps) {
  return (
    <div className={`px-3 py-2 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon && (
          <span className="text-gray-600 dark:text-gray-400">{icon}</span>
        )}
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {title}
        </h3>
      </div>
      {description && (
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {description}
        </p>
      )}
    </div>
  );
}
