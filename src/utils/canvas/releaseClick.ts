// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer

/**
 * How long after the finger lifts its click may still arrive. Browsers send
 * it straight after the lift; a tap this soon after is no decision anyone
 * took, a later one is the teacher's own.
 */
const RELEASE_CLICK_WINDOW_MS = 350;

/**
 * How far from the lift the browser's click may land: it comes at the spot
 * the finger left, give or take the fingertip. A tap on the menu, which never
 * lies under the finger (`placeTouchMenu`), is farther and goes through.
 */
const RELEASE_CLICK_SLOP_PX = 24;

/**
 * Swallows the click a browser may send when the finger that held a long
 * press lifts.
 *
 * A long press opens its menu while the finger still rests on the screen.
 * Some browsers follow the lift with a click on the spot (Safari and the
 * Chromium touch emulation do, Chrome on Android mostly does not). It landed
 * on the table under the finger, and the document took it for a click beside
 * the menu and closed it at once — or, where the menu had been pushed under
 * the finger, on the entry lying there, removing a table nobody chose. So the
 * first click right after the next lift, at the spot it lifted, is taken out
 * before anything sees it. Returns a function that stands the guard down
 * early.
 */
export function swallowReleaseClick(target: Window = window): () => void {
  let liftedAt: { x: number; y: number } | null = null;
  let releaseTimer: number | undefined;

  const stop = () => {
    target.removeEventListener('pointerup', handleRelease, true);
    target.removeEventListener('pointercancel', stop, true);
    target.removeEventListener('click', handleClick, true);
    if (releaseTimer !== undefined) {
      target.clearTimeout(releaseTimer);
      releaseTimer = undefined;
    }
  };

  function handleRelease(event: PointerEvent) {
    liftedAt = { x: event.clientX, y: event.clientY };
    target.removeEventListener('pointerup', handleRelease, true);
    releaseTimer = target.setTimeout(stop, RELEASE_CLICK_WINDOW_MS);
  }

  function handleClick(event: MouseEvent) {
    // A click while the finger still holds, or one elsewhere, is not the
    // lift's.
    if (
      !liftedAt ||
      Math.hypot(event.clientX - liftedAt.x, event.clientY - liftedAt.y) >
        RELEASE_CLICK_SLOP_PX
    ) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    stop();
  }

  target.addEventListener('pointerup', handleRelease, true);
  // A pointer the browser takes back sends no click.
  target.addEventListener('pointercancel', stop, true);
  target.addEventListener('click', handleClick, true);
  return stop;
}
