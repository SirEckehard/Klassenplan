import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { LinkProps } from 'react-router-dom';

/**
 * Helper to detect if the current path is English.
 */
function useIsEnglishPath(): boolean {
  const location = useLocation();
  return location.pathname === '/en' || location.pathname.startsWith('/en/');
}

/**
 * A localized link component that automatically adds the language prefix
 * to internal links based on the current URL.
 *
 * - German (de): No prefix (e.g., /generator)
 * - English (en): /en prefix (e.g., /en/generator)
 */
export const LocalizedLink: React.FC<LinkProps> = ({
  to,
  children,
  ...props
}) => {
  const isEnglish = useIsEnglishPath();

  // Build the localized path
  const localizedTo = React.useMemo(() => {
    if (typeof to !== 'string') {
      // For object paths, we don't transform
      return to;
    }

    // Only prefix internal paths starting with /
    if (!to.startsWith('/')) {
      return to;
    }

    // Remove any existing language prefix first
    const pathWithoutLang = to.replace(/^\/(en|de)/, '') || '/';

    // Add /en prefix only for English
    if (isEnglish) {
      return pathWithoutLang === '/' ? '/en' : `/en${pathWithoutLang}`;
    }

    // German (default) - no prefix
    return pathWithoutLang;
  }, [to, isEnglish]);

  return (
    <Link to={localizedTo} {...props}>
      {children}
    </Link>
  );
};

/**
 * Helper hook to detect if on English path.
 */
export { useIsEnglishPath };

/**
 * Utility function to create a localized path for use with navigate() or href.
 * Use this when you need the path string rather than a LinkSimpleIcon component.
 */
export function createLocalizedPath(path: string, isEnglish: boolean): string {
  if (!path.startsWith('/')) {
    return path;
  }

  // Remove any existing language prefix
  const pathWithoutLang = path.replace(/^\/(en|de)/, '') || '/';

  // Add /en prefix only for English
  if (isEnglish) {
    return pathWithoutLang === '/' ? '/en' : `/en${pathWithoutLang}`;
  }

  return pathWithoutLang;
}

export default LocalizedLink;
