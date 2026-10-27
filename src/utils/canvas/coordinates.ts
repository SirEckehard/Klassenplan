// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { readSvgTurn, turnPoint, unturnPoint } from './turn';

export interface ClientPointToSceneParams {
  svg: SVGSVGElement;
  clientX: number;
  clientY: number;
  sceneWidth: number;
  sceneHeight: number;
}

/**
 * The point of the stored room under a pointer. A drawing turned for a screen
 * held upright says so on its `<svg>` (`data-turn`); the point is then read in
 * the turned drawing and turned back, so every caller works in the room as it
 * is stored whatever the screen shows.
 */
export function convertClientPointToScene({
  svg,
  clientX,
  clientY,
  sceneWidth,
  sceneHeight,
}: ClientPointToSceneParams) {
  const rect = svg.getBoundingClientRect();
  const turn = readSvgTurn(svg);
  const shownWidth = turn === null ? sceneWidth : sceneHeight;
  const shownHeight = turn === null ? sceneHeight : sceneWidth;
  const shown = {
    x: (clientX - rect.left) * (shownWidth / rect.width),
    y: (clientY - rect.top) * (shownHeight / rect.height),
  };

  return turn === null
    ? shown
    : unturnPoint(turn, shown, sceneWidth, sceneHeight);
}

/** Where on screen a point of the stored room is drawn; see above. */
export function convertScenePointToClient({
  svg,
  point,
  sceneWidth,
  sceneHeight,
}: {
  svg: SVGSVGElement;
  point: { x: number; y: number };
  sceneWidth: number;
  sceneHeight: number;
}) {
  const rect = svg.getBoundingClientRect();
  const turn = readSvgTurn(svg);
  const shownWidth = turn === null ? sceneWidth : sceneHeight;
  const shownHeight = turn === null ? sceneHeight : sceneWidth;
  const shown =
    turn === null ? point : turnPoint(turn, point, sceneWidth, sceneHeight);

  return {
    x: rect.left + shown.x * (rect.width / shownWidth),
    y: rect.top + shown.y * (rect.height / shownHeight),
  };
}

export function createClientToSceneConverter({
  sceneWidth,
  sceneHeight,
}: {
  sceneWidth: number;
  sceneHeight: number;
}) {
  return (svg: SVGSVGElement, clientX: number, clientY: number) =>
    convertClientPointToScene({
      svg,
      clientX,
      clientY,
      sceneWidth,
      sceneHeight,
    });
}

export function convertClientPointToSvgCoordinates({
  svg,
  clientX,
  clientY,
}: {
  svg: SVGSVGElement;
  clientX: number;
  clientY: number;
}): { x: number; y: number } {
  // The drawing's own units, turned or not.
  const viewBox = svg.viewBox.baseVal;
  const rect = svg.getBoundingClientRect();

  return {
    x: (clientX - rect.left) * (viewBox.width / rect.width) + viewBox.x,
    y: (clientY - rect.top) * (viewBox.height / rect.height) + viewBox.y,
  };
}
