// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, type RefObject } from 'react';

/**
 * Hook to detect clicks outside of specified element(s)
 * @param refs - Single ref or array of refs to monitor
 * @param callback - Function to call when click outside is detected
 * @param isActive - Whether the hook should be active (default: true)
 *
 * @example
 * ```tsx
 * const dropdownRef = useRef<HTMLDivElement>(null);
 * const buttonRef = useRef<HTMLButtonElement>(null);
 *
 * useClickOutside([dropdownRef, buttonRef], () => setOpen(false), isOpen);
 * ```
 */
export function useClickOutside(
  refs: RefObject<HTMLElement | null> | Array<RefObject<HTMLElement | null>>,
  callback: () => void,
  isActive = true,
): void {
  useEffect(() => {
    if (!isActive) return;

    const handleClickOutside = (event: MouseEvent | PointerEvent) => {
      const target = event.target as Node;
      const refArray = Array.isArray(refs) ? refs : [refs];

      // Check if click is outside all refs
      const isOutside = refArray.every(
        (ref) => !ref.current || !ref.current.contains(target),
      );

      if (isOutside) {
        callback();
      }
    };

    const supportsPointerEvent =
      typeof window !== 'undefined' && 'PointerEvent' in window;
    const eventName = supportsPointerEvent ? 'pointerdown' : 'mousedown';

    document.addEventListener(eventName, handleClickOutside);
    return () => document.removeEventListener(eventName, handleClickOutside);
  }, [refs, callback, isActive]);
}
