// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSelector from '@/components/LanguageSelector';

interface AppearanceControlsProps {
  /** Additional layout classes for the wrapper. */
  className?: string;
}

/**
 * Theme toggle and language switch as a single unit.
 *
 * Rendered in the footer and in the fullscreen surfaces (presentation mode,
 * name game), which hide the footer and would otherwise offer no way to change
 * theme or language.
 */
const AppearanceControls: React.FC<AppearanceControlsProps> = ({
  className = '',
}) => (
  <div className={`flex items-center gap-2 ${className}`.trimEnd()}>
    <ThemeToggle />
    <span className="text-gray-300 dark:text-gray-600" aria-hidden="true">
      |
    </span>
    <LanguageSelector />
  </div>
);

export default AppearanceControls;
