import React from 'react';

const getIsDarkMode = () => {
  if (typeof document === 'undefined') {
    return false;
  }
  return document.documentElement.classList.contains('dark');
};

export function useIsDarkMode() {
  const [isDark, setIsDark] = React.useState(() => getIsDarkMode());

  React.useEffect(() => {
    // Re-sync on mount in case the `dark` class changed between the lazy
    // useState initializer and this effect (e.g. a pre-hydration theme script).
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional one-time sync with the DOM on mount
    setIsDark(getIsDarkMode());
    if (
      typeof MutationObserver === 'undefined' ||
      typeof document === 'undefined'
    ) {
      return;
    }

    const observer = new MutationObserver(() => {
      setIsDark(getIsDarkMode());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}
