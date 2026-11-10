// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer

/**
 * Marks what lies over the room's canvas and takes the pointer there — the
 * tray of tables and room elements at the status bar (`RoomAddTray`). A table
 * or a room element let go over it lands nowhere: the canvas's box alone said
 * the pointer was over the room, and a tap on the tray put one table under the
 * finger and, with the tap's click, a second one on a free spot.
 */
export const CANVAS_COVER_ATTRIBUTE = 'data-covers-canvas';

/**
 * Whether what the pointer is over at this point is something lying over the
 * canvas rather than the canvas. A hidden cover — sunk away during a drag, or
 * an inert copy on its way out — is not hit and covers nothing.
 */
export function isCanvasCovered(clientX: number, clientY: number): boolean {
  if (
    typeof document === 'undefined' ||
    typeof document.elementFromPoint !== 'function'
  ) {
    return false;
  }
  return (
    document
      .elementFromPoint(clientX, clientY)
      ?.closest(`[${CANVAS_COVER_ATTRIBUTE}]`) != null
  );
}
