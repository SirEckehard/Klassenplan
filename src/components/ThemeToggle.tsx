// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { MoonIcon, SunIcon } from '@phosphor-icons/react';
import {
  setThemePreference,
  subscribeThemePreference,
} from '@/utils/ui/themePreference';

const isPageDark = () => document.documentElement.classList.contains('dark');

/** Whether the page wears the dark theme, kept current by every change. */
function usePageDark(): boolean {
  return useSyncExternalStore(
    subscribeThemePreference,
    isPageDark,
    () => false,
  );
}

// Toggle between light and dark theme; a press is a choice, which stops the
// page following the system ("Wie das System" in the settings menu resumes it)
const ThemeToggle: React.FC = () => {
  const { t } = useTranslation('common');
  const isDark = usePageDark();

  return (
    <button
      type="button"
      onClick={() => setThemePreference(isDark ? 'light' : 'dark')}
      className="group p-1.5 rounded hover:bg-(--surface-option-selected) transition-colors cursor-pointer"
      aria-label={t('theme.toggle')}
      title={t('theme.toggle')}
    >
      {isDark ? (
        <SunIcon className="h-4 w-4 text-(--text-badge) group-hover:text-(--text-page) transition-colors" />
      ) : (
        <MoonIcon className="h-4 w-4 text-(--text-badge) group-hover:text-(--text-badge) transition-colors" />
      )}
    </button>
  );
};

export default ThemeToggle;
