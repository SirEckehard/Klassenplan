// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import '@/i18n'; // Initialize i18n for tests
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ClassroomCanvas from '../ClassroomCanvas';
import type { ClassroomFeature } from '@/types';
import { CLASSROOM_WIDTH, CLASSROOM_HEIGHT } from '@/utils';

const makeFeature = (
  overrides: Partial<ClassroomFeature> = {},
): ClassroomFeature => ({
  id: 'feature-1',
  type: 'window',
  visible: true,
  x: 0,
  y: 90,
  width: 12,
  height: 160,
  anchor: 'left',
  movable: false,
  rotation: 0,
  ...overrides,
});

const baseProps: React.ComponentProps<typeof ClassroomCanvas> = {
  canvasRef: React.createRef<SVGSVGElement>(),
  canvasWidth: CLASSROOM_WIDTH,
  classroomHeight: CLASSROOM_HEIGHT,
  showGrid: false,
  sceneTables: [],
  selectedTableIds: [],
  placeholderSeating: [],
  selectionBox: null,
  templateDragPreview: null,
  onPointerMove: vi.fn(),
  onPointerUp: vi.fn(),
  onPointerDown: vi.fn(),
  onContextMenu: vi.fn(),
  onTablePointerDown: vi.fn(),
  onTableUpdate: vi.fn(),
  onTransformStart: vi.fn(),
};

const getResizeHandles = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll(
      'g[role="button"][aria-label*="anpassen" i], g[role="button"][aria-label*="adjust" i]',
    ),
  );

describe('ClassroomCanvas resize handles', () => {
  it('shows two length handles on a selected wall feature', () => {
    const feature = makeFeature();
    const { container } = render(
      <ClassroomCanvas
        {...baseProps}
        features={[feature]}
        selectedFeatureIds={[feature.id]}
        onFeatureResizeStart={vi.fn()}
      />,
    );
    const handles = getResizeHandles(container);
    expect(handles).toHaveLength(2);
    handles.forEach((handle) => {
      expect(handle.getAttribute('aria-label')).toMatch(
        /Höhe anpassen|Adjust height/i,
      );
    });
  });

  it('shows all edge and corner handles on a selected free feature', () => {
    const podium = makeFeature({
      id: 'podium-1',
      type: 'podium',
      anchor: 'free',
      movable: true,
      x: 100,
      y: 50,
      width: 90,
      height: 60,
    });
    const { container } = render(
      <ClassroomCanvas
        {...baseProps}
        features={[podium]}
        selectedFeatureIds={[podium.id]}
        onFeatureResizeStart={vi.fn()}
      />,
    );
    expect(getResizeHandles(container)).toHaveLength(8);
  });

  it('skips the south-east grip when the rotate handle is shown', () => {
    const podium = makeFeature({
      id: 'podium-1',
      type: 'podium',
      anchor: 'free',
      movable: true,
      x: 100,
      y: 50,
      width: 90,
      height: 60,
    });
    const { container } = render(
      <ClassroomCanvas
        {...baseProps}
        features={[podium]}
        selectedFeatureIds={[podium.id]}
        onFeatureResizeStart={vi.fn()}
        onFeatureRotateStart={vi.fn()}
      />,
    );
    expect(getResizeHandles(container)).toHaveLength(7);
    expect(container.querySelector('[aria-label="rotate table"]')).toBeTruthy();
  });

  it('hides handles when the feature is not selected', () => {
    const feature = makeFeature();
    const { container } = render(
      <ClassroomCanvas
        {...baseProps}
        features={[feature]}
        selectedFeatureIds={[]}
        onFeatureResizeStart={vi.fn()}
      />,
    );
    expect(getResizeHandles(container)).toHaveLength(0);
  });
});

describe('ClassroomCanvas drag previews', () => {
  it('renders a translucent table ghost at the drop placement', () => {
    const { container } = render(
      <ClassroomCanvas
        {...baseProps}
        templateDragPreview={{
          type: 'double',
          clientX: 300,
          clientY: 300,
          overCanvas: true,
          canvasX: 300,
          canvasY: 300,
          placement: { x: 245, y: 235, width: 55, height: 130, seatCount: 2 },
        }}
      />,
    );
    const ghost = container.querySelector(
      'svg g[opacity="0.5"][pointer-events="none"]',
    );
    expect(ghost).toBeTruthy();
    // The banner overlay is replaced by the ghost while over the canvas.
    expect(container.textContent).not.toMatch(/Doppelplatz|Double/i);
  });

  it('falls back to the label banner while outside the canvas', () => {
    const { container } = render(
      <ClassroomCanvas
        {...baseProps}
        templateDragPreview={{
          type: 'double',
          clientX: -40,
          clientY: 300,
          overCanvas: false,
          canvasX: -40,
          canvasY: 300,
          placement: null,
        }}
      />,
    );
    expect(
      container.querySelector('svg g[opacity="0.5"][pointer-events="none"]'),
    ).toBeNull();
    expect(container.textContent).toMatch(/Doppelplatz|Double/i);
  });

  it('renders a feature ghost with the wall-snapped placement', () => {
    const { container } = render(
      <ClassroomCanvas
        {...baseProps}
        featureDragPreview={{
          type: 'window',
          width: 12,
          height: 160,
          clientX: 10,
          clientY: 300,
          overCanvas: true,
          label: 'Fenster',
          canvasX: 10,
          canvasY: 300,
          placement: {
            x: 0,
            y: 220,
            width: 12,
            height: 160,
            anchor: 'left',
            rotation: 0,
            movable: false,
          },
        }}
      />,
    );
    const ghost = container.querySelector(
      '[data-feature-id="__drag-preview__"]',
    );
    expect(ghost).toBeTruthy();
    expect(container.textContent).not.toMatch(/Fenster \(/);
  });
});
