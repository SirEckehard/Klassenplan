// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { setup } from 'xstate';
import type { StateFrom } from 'xstate';
import type { TableTemplateType } from '@/types';

export interface TemplateDragContext {
  pointerId: number | null;
  templateType: TableTemplateType | null;
  clientX: number;
  clientY: number;
  overCanvas: boolean;
  canvasX: number | null;
  canvasY: number | null;
}

export type TemplateDragEvent =
  | {
      type: 'TEMPLATE_DRAG_START';
      pointerId: number;
      templateType: TableTemplateType;
      clientX: number;
      clientY: number;
      overCanvas: boolean;
      canvasX: number | null;
      canvasY: number | null;
    }
  | {
      type: 'TEMPLATE_DRAG_MOVE';
      pointerId: number;
      clientX: number;
      clientY: number;
      overCanvas: boolean;
      canvasX: number | null;
      canvasY: number | null;
    }
  | {
      type: 'TEMPLATE_DRAG_END';
      pointerId: number;
      clientX: number;
      clientY: number;
      overCanvas: boolean;
      canvasX: number | null;
      canvasY: number | null;
      cancelled?: boolean;
    }
  | { type: 'TEMPLATE_DRAG_CANCEL' };

export const createTemplateDragContext = (): TemplateDragContext => ({
  pointerId: null,
  templateType: null,
  clientX: 0,
  clientY: 0,
  overCanvas: false,
  canvasX: null,
  canvasY: null,
});

const templateDragSetup = setup({
  types: {
    context: {} as TemplateDragContext,
    events: {} as TemplateDragEvent,
  },
  actions: {
    updatePreview: () => undefined,
    clearPreview: () => undefined,
    dropTemplate: () => undefined,
  },
});

export const templateDragMachine = templateDragSetup.createMachine({
  id: 'templateDrag',
  context: createTemplateDragContext,
  initial: 'idle',
  states: {
    idle: {
      on: {
        TEMPLATE_DRAG_START: {
          target: 'dragging',
          actions: [
            templateDragSetup.assign(({ event }) =>
              event.type === 'TEMPLATE_DRAG_START'
                ? {
                    pointerId: event.pointerId,
                    templateType: event.templateType,
                    clientX: event.clientX,
                    clientY: event.clientY,
                    overCanvas: event.overCanvas,
                    canvasX: event.canvasX,
                    canvasY: event.canvasY,
                  }
                : {},
            ),
            'updatePreview',
          ],
        },
      },
    },
    dragging: {
      on: {
        TEMPLATE_DRAG_MOVE: {
          guard: ({ context, event }) => context.pointerId === event.pointerId,
          actions: [
            templateDragSetup.assign(({ event }) =>
              event.type === 'TEMPLATE_DRAG_MOVE'
                ? {
                    clientX: event.clientX,
                    clientY: event.clientY,
                    overCanvas: event.overCanvas,
                    canvasX: event.canvasX,
                    canvasY: event.canvasY,
                  }
                : {},
            ),
            'updatePreview',
          ],
        },
        TEMPLATE_DRAG_END: [
          {
            guard: ({ context, event }) =>
              context.pointerId === event.pointerId && !event.cancelled,
            target: 'idle',
            actions: [
              templateDragSetup.assign(({ event }) =>
                event.type === 'TEMPLATE_DRAG_END'
                  ? {
                      clientX: event.clientX,
                      clientY: event.clientY,
                      overCanvas: event.overCanvas,
                      canvasX: event.canvasX,
                      canvasY: event.canvasY,
                    }
                  : {},
              ),
              'dropTemplate',
              'clearPreview',
              templateDragSetup.assign(() => createTemplateDragContext()),
            ],
          },
          {
            target: 'idle',
            actions: [
              'clearPreview',
              templateDragSetup.assign(() => createTemplateDragContext()),
            ],
          },
        ],
        TEMPLATE_DRAG_CANCEL: {
          target: 'idle',
          actions: [
            'clearPreview',
            templateDragSetup.assign(() => createTemplateDragContext()),
          ],
        },
      },
    },
  },
});

export type TemplateDragMachine = typeof templateDragMachine;
export type TemplateDragSnapshot = StateFrom<TemplateDragMachine>;
