// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { LOCAL_STORAGE_KEYS, withBrowserLocalStorage } from '@/utils';
import { usePrefersReducedMotion } from '@/hooks/ui/usePrefersReducedMotion';

/** How long the greeting stands unless the teacher gets going first. */
const TEACHERS_DAY_GREETING_MS = 10_000;
const FADE_MS = 300;

/** World Teachers' Day (UNESCO): 5 October, by the local calendar. */
function isTeachersDay(date: Date): boolean {
  return date.getMonth() === 9 && date.getDate() === 5;
}

function shouldGreet(date: Date): boolean {
  if (!isTeachersDay(date)) return false;
  // An automated browser reads the status line; a greeting would replace it.
  if (typeof navigator !== 'undefined' && navigator.webdriver) return false;
  const greeted = withBrowserLocalStorage((storage) =>
    storage.getItem(LOCAL_STORAGE_KEYS.teachersDayGreeted),
  );
  return greeted !== String(date.getFullYear());
}

/**
 * The status bar thanks the teacher on World Teachers' Day — once a year, the
 * first time the workspace opens that day (an easter egg, AGENTS.md § Easter
 * eggs). It stands for ten seconds or until the first press of a key or a
 * pointer, then fades and gives the line back.
 */
export function useTeachersDayGreeting(now: () => Date = () => new Date()): {
  visible: boolean;
  fading: boolean;
} {
  const reducedMotion = usePrefersReducedMotion();
  const [year] = React.useState(() => now().getFullYear());
  const [visible, setVisible] = React.useState(() => shouldGreet(now()));
  const [fading, setFading] = React.useState(false);

  React.useEffect(() => {
    if (!visible) return undefined;
    withBrowserLocalStorage((storage) =>
      storage.setItem(LOCAL_STORAGE_KEYS.teachersDayGreeted, String(year)),
    );

    let fadeTimer: number | undefined;
    const dismiss = () => {
      window.removeEventListener('pointerdown', dismiss, true);
      window.removeEventListener('keydown', dismiss, true);
      window.clearTimeout(standTimer);
      if (reducedMotion) {
        setVisible(false);
        return;
      }
      setFading(true);
      fadeTimer = window.setTimeout(() => setVisible(false), FADE_MS);
    };
    const standTimer = window.setTimeout(dismiss, TEACHERS_DAY_GREETING_MS);
    window.addEventListener('pointerdown', dismiss, true);
    window.addEventListener('keydown', dismiss, true);
    return () => {
      window.removeEventListener('pointerdown', dismiss, true);
      window.removeEventListener('keydown', dismiss, true);
      window.clearTimeout(standTimer);
      window.clearTimeout(fadeTimer);
    };
  }, [reducedMotion, visible, year]);

  return { visible, fading };
}
