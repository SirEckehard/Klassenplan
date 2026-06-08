import type { TableTemplateType } from '@/types';

export type TemplateDragPreview = {
  type: TableTemplateType;
  clientX: number;
  clientY: number;
  overCanvas: boolean;
  canvasX: number | null;
  canvasY: number | null;
};
