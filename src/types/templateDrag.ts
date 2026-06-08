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
};
