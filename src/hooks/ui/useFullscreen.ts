// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { logWarn } from '@/utils';

export interface FullscreenControls {
  /** Whether the document is currently in fullscreen. */
  isFullscreen: boolean;
  /** Whether the browser offers the Fullscreen API at all (iOS Safari does not). */
  isSupported: boolean;
  toggle: () => void;
}

/**
 * Fullscreen for the projection surfaces.
 *
 * The browser can leave fullscreen without asking us (Esc, window switch), so
 * the flag is derived from the `fullscreenchange` event rather than from our
 * own calls — otherwise the button would claim a state the screen contradicts.
 */
export function useFullscreen(
  target: React.RefObject<HTMLElement | null>,
): FullscreenControls {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  // Static browser capability — read once instead of via an effect.
  const isSupported = React.useMemo(
    () =>
      typeof document !== 'undefined' && Boolean(document.fullscreenEnabled),
    [],
  );

  React.useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const toggle = React.useCallback(() => {
    const element = target.current;
    if (!element) {
      return;
    }

    const request = document.fullscreenElement
      ? document.exitFullscreen()
      : element.requestFullscreen();

    request?.catch((error: unknown) => {
      // Denied permission or an unsupported element — the view stays usable
      // windowed, so this is a note, not an error the user must act on.
      logWarn('Fullscreen request rejected', { error }, 'useFullscreen');
    });
  }, [target]);

  return { isFullscreen, isSupported, toggle };
}
