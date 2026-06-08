// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
const HANDLE_MARGIN = 5;

export type FeatureHandleAnchor = {
  x: number;
  y: number;
};

export const calculateFeatureHandleAnchor = (
  width: number,
  height: number,
  rotation: number,
  margin = HANDLE_MARGIN,
): FeatureHandleAnchor => {
  const centerX = width / 2;
  const centerY = height / 2;
  const theta = (rotation * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const corners: FeatureHandleAnchor[] = [
    { x: width - margin, y: height - margin },
    { x: width - margin, y: margin },
    { x: margin, y: height - margin },
    { x: margin, y: margin },
  ];

  let bestCorner = corners[0];
  let bestScore = -Infinity;

  corners.forEach((corner) => {
    const dx = corner.x - centerX;
    const dy = corner.y - centerY;
    const worldX = centerX + dx * cos - dy * sin;
    const worldY = centerY + dx * sin + dy * cos;
    const score = worldX + worldY;
    if (score > bestScore) {
      bestScore = score;
      bestCorner = corner;
    }
  });

  return bestCorner;
};

export const DEFAULT_HANDLE_MARGIN = HANDLE_MARGIN;
