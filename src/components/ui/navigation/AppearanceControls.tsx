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
 * Theme toggle and language switch as a single unit, at the top of the
 * settings menu every page's head carries (`AppSettingsMenu`).
 */
const AppearanceControls: React.FC<AppearanceControlsProps> = ({
  className = '',
}) => (
  <div className={`flex items-center gap-2 ${className}`.trimEnd()}>
    <ThemeToggle />
    <span className="text-(--text-muted)" aria-hidden="true">
      |
    </span>
    <LanguageSelector />
  </div>
);

export default AppearanceControls;
