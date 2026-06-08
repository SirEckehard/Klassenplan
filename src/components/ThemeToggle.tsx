import React, { useEffect, useMemo, useState } from 'react';
import { MoonIcon, SunIcon } from '@phosphor-icons/react';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';
import { logDebug } from '@/utils';

// Detect user's system theme preference
const detectSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return 'light';
};

// Toggle between light and dark theme
const ThemeToggle: React.FC = () => {
  const storedTheme = useMemo(() => {
    try {
      return localStorage.getItem(LOCAL_STORAGE_KEYS.theme) as
        | 'light'
        | 'dark'
        | null;
    } catch (error) {
      logDebug('Failed to read theme from localStorage', { error });
      return null;
    }
  }, []);
  const [isDark, setIsDark] = useState(() => {
    const initialTheme = storedTheme || detectSystemTheme();
    return initialTheme === 'dark';
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    // Listen for system theme changes if no explicit preference is set
    if (storedTheme || typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () =>
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [storedTheme]);

  function toggleTheme() {
    // Add transition suppression class to prevent layout thrashing
    document.documentElement.classList.add('theme-switching');

    // Delay the actual theme change to the next frame so CSS applies first
    requestAnimationFrame(() => {
      if (isDark) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem(LOCAL_STORAGE_KEYS.theme, 'light');
        setIsDark(false);
      } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem(LOCAL_STORAGE_KEYS.theme, 'dark');
        setIsDark(true);
      }

      // Remove transition suppression after the theme switch is complete
      requestAnimationFrame(() => {
        document.documentElement.classList.remove('theme-switching');
      });
    });
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="group p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
      aria-label="Toggle dark mode"
    >
      {isDark ? (
        <SunIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors" />
      ) : (
        <MoonIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors" />
      )}
    </button>
  );
};

export default ThemeToggle;
