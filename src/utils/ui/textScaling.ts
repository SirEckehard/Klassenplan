// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Calculate a readable font size for seat labels inside circular or rectangular
 * containers. Keeps the base size responsive while shrinking long names so the
 * text stays within the seat boundary.
 */
export const calculateSeatLabelFontSize = (
  label: string,
  containerWidth: number,
): number => {
  const baseSize = Math.max(13, Math.min(16, containerWidth * 0.2));
  if (!label.length) {
    return baseSize;
  }

  const maxTextWidth = containerWidth * 0.85;
  const approximateCharWidthFactor = 0.58;
  const estimatedSize =
    maxTextWidth / (approximateCharWidthFactor * label.length);
  const clampedSize = Math.min(baseSize, estimatedSize);
  return Math.max(6, clampedSize);
};
