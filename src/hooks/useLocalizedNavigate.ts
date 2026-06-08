// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { NavigateOptions, To } from 'react-router-dom';
import {
  createLocalizedPath,
  useIsEnglishPath,
} from '@/components/LocalizedLink';

/**
 * A localized version of useNavigate that automatically adds language prefixes.
 *
 * - German (de): No prefix (e.g., /generator)
 * - English (en): /en prefix (e.g., /en/generator)
 */
export function useLocalizedNavigate() {
  const navigate = useNavigate();
  const isEnglish = useIsEnglishPath();

  return useCallback(
    (to: To | number, options?: NavigateOptions) => {
      // Handle numeric navigation (back/forward)
      if (typeof to === 'number') {
        navigate(to);
        return;
      }

      // Handle string paths
      if (typeof to === 'string') {
        const localizedPath = createLocalizedPath(to, isEnglish);
        navigate(localizedPath, options);
        return;
      }

      // Handle object paths
      if (typeof to === 'object' && 'pathname' in to && to.pathname) {
        const localizedPath = createLocalizedPath(to.pathname, isEnglish);
        navigate({ ...to, pathname: localizedPath }, options);
        return;
      }

      // Fallback for other cases
      navigate(to, options);
    },
    [navigate, isEnglish],
  );
}

/**
 * Hook to get current path without language prefix.
 * Useful for language switching.
 */
export const usePathWithoutLang = (): string => {
  const location = useLocation();
  return location.pathname.replace(/^\/(en|de)/, '') || '/';
};

export default useLocalizedNavigate;
