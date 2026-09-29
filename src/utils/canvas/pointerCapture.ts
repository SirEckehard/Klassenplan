// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer

/**
 * Lets go of a pointer the element holds, and of nothing else.
 *
 * `releasePointerCapture` throws a `NotFoundError` for a pointer that is no
 * longer active. The mouse always is, so on a desktop the call never fails; a
 * finger or a pen stops being active the moment it lifts. A release that came
 * later than that — the room clearing its selection when a long press opened
 * the paste menu, with the id of a table tapped before — threw inside the
 * room's pointer machine and took the whole layout editor down on every touch
 * screen. `hasPointerCapture` answers `false` for a pointer that is gone, so
 * asking first costs nothing.
 */
export function releasePointerCaptureIfHeld(
  element: Element | null | undefined,
  pointerId: number,
): void {
  if (
    element &&
    typeof element.hasPointerCapture === 'function' &&
    element.hasPointerCapture(pointerId)
  ) {
    element.releasePointerCapture(pointerId);
  }
}
