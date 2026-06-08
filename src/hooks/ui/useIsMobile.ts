import { useState, useEffect } from 'react';

/**
 * Hook to detect mobile devices based on screen width
 * Uses 995px breakpoint for mobile-responsive UI layouts
 * @returns boolean indicating if the current viewport is mobile size
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 996); // Mobile breakpoint
    };

    // Initial check
    checkIsMobile();

    // Listen for window resize
    window.addEventListener('resize', checkIsMobile);

    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  return isMobile;
}
