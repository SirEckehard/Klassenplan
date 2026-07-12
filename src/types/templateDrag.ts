// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { TableTemplateType } from '@/types';

export type TemplateDragPreview = {
  type: TableTemplateType;
  clientX: number;
  clientY: number;
  overCanvas: boolean;
  canvasX: number | null;
  canvasY: number | null;
  /**
   * Scene frame where the table would land right now (drop placement math),
   * or null while the pointer is outside the canvas.
   */
  placement: {
    x: number;
    y: number;
    width: number;
    height: number;
    seatCount: number;
  } | null;
};
