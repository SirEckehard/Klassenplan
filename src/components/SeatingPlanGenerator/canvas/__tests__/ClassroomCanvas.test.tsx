// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import '@/i18n'; // Initialize i18n for tests
import React from 'react';
import { render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ClassroomCanvas from '../ClassroomCanvas';
import type { ClassroomFeature, ClassroomTable } from '@/types';
import { CLASSROOM_WIDTH, CLASSROOM_HEIGHT } from '@/utils';
import { subscribeToToasts, type ToastEvent } from '@/utils/ui/toast';
import { createMockStudent } from '@/__tests__/utils';

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
    expect(
      within(container).getByRole('button', {
        name: /Tisch drehen|Rotate table/i,
      }),
    ).toBeTruthy();
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

describe('ClassroomCanvas alignment guides', () => {
  it('renders full-length guide lines, canvas centers dashed', () => {
    const { container } = render(
      <ClassroomCanvas
        {...baseProps}
        alignmentGuides={[
          { orientation: 'vertical', position: 100, kind: 'edge' },
          { orientation: 'horizontal', position: 300, kind: 'canvasCenter' },
        ]}
      />,
    );
    const group = container.querySelector(
      '[data-testid="alignment-guides"]',
    ) as SVGGElement;
    expect(group).toBeTruthy();
    expect(group.getAttribute('pointer-events')).toBe('none');

    const lines = Array.from(group.querySelectorAll('line'));
    expect(lines).toHaveLength(2);

    const vertical = lines[0];
    expect(vertical.getAttribute('x1')).toBe('100');
    expect(vertical.getAttribute('x2')).toBe('100');
    expect(vertical.getAttribute('y1')).toBe('0');
    expect(vertical.getAttribute('y2')).toBe(String(CLASSROOM_HEIGHT));
    expect(vertical.getAttribute('stroke-dasharray')).toBeNull();

    const horizontal = lines[1];
    expect(horizontal.getAttribute('y1')).toBe('300');
    expect(horizontal.getAttribute('y2')).toBe('300');
    expect(horizontal.getAttribute('x1')).toBe('0');
    expect(horizontal.getAttribute('x2')).toBe(String(CLASSROOM_WIDTH));
    expect(horizontal.getAttribute('stroke-dasharray')).toBe('6 4');
  });

  it('renders nothing for null or empty guides', () => {
    const { container, rerender } = render(
      <ClassroomCanvas {...baseProps} alignmentGuides={null} />,
    );
    expect(
      container.querySelector('[data-testid="alignment-guides"]'),
    ).toBeNull();

    rerender(<ClassroomCanvas {...baseProps} alignmentGuides={[]} />);
    expect(
      container.querySelector('[data-testid="alignment-guides"]'),
    ).toBeNull();
  });
});

describe('ClassroomCanvas photo overlap warnings', () => {
  const makeTable = (overrides: Partial<ClassroomTable>): ClassroomTable => ({
    x: 300,
    y: 200,
    width: 60,
    height: 40,
    rotation: 0,
    seatCount: 1,
    locked: false,
    zIndex: 0,
    templateType: 'single',
    ...overrides,
  });

  // Left-docked photo circles of these two singles overlap by 8 units.
  const collidingTables = [makeTable({}), makeTable({ x: 320 })];
  const collidingSeating = [[null], [null]];
  const studentsWithPhoto = [createMockStudent({ hasPhoto: true })];

  it('marks colliding photo positions with warning rings', () => {
    const { container } = render(
      <ClassroomCanvas
        {...baseProps}
        sceneTables={collidingTables}
        placeholderSeating={collidingSeating}
        allStudents={studentsWithPhoto}
        showPhotoOverlapWarning
      />,
    );
    const group = container.querySelector(
      '[data-testid="photo-overlap-warnings"]',
    ) as SVGGElement;
    expect(group).toBeTruthy();
    expect(group.getAttribute('pointer-events')).toBe('none');
    expect(group.querySelectorAll('circle')).toHaveLength(2);
  });

  it('labels each warning ring with a hover tooltip', () => {
    const { container } = render(
      <ClassroomCanvas
        {...baseProps}
        sceneTables={collidingTables}
        placeholderSeating={collidingSeating}
        allStudents={studentsWithPhoto}
        showPhotoOverlapWarning
      />,
    );
    const titles = Array.from(
      container.querySelectorAll(
        '[data-testid="photo-overlap-warnings"] circle title',
      ),
    );
    expect(titles).toHaveLength(2);
    titles.forEach((title) => {
      expect(title.textContent).toMatch(/Fotokollision|Photo collision/i);
    });
  });

  it('announces a new collision with a warning toast', () => {
    const events: ToastEvent[] = [];
    const unsubscribe = subscribeToToasts((event) => {
      events.push(event);
    });
    try {
      render(
        <ClassroomCanvas
          {...baseProps}
          sceneTables={collidingTables}
          placeholderSeating={collidingSeating}
          allStudents={studentsWithPhoto}
          showPhotoOverlapWarning
        />,
      );
      const added = events.filter((event) => event.action === 'add');
      expect(added).toHaveLength(1);
      expect(added[0]!.toast.type).toBe('warning');
      expect(added[0]!.toast.message).toMatch(
        /Schülerfotos würden sich überlappen|Student photos would overlap/i,
      );
    } finally {
      unsubscribe();
    }
  });

  it('renders nothing while no student photo exists', () => {
    const { container, rerender } = render(
      <ClassroomCanvas
        {...baseProps}
        sceneTables={collidingTables}
        placeholderSeating={collidingSeating}
        allStudents={[createMockStudent({ hasPhoto: false })]}
        showPhotoOverlapWarning
      />,
    );
    expect(
      container.querySelector('[data-testid="photo-overlap-warnings"]'),
    ).toBeNull();

    // Omitted student list counts as "no photos" as well.
    rerender(
      <ClassroomCanvas
        {...baseProps}
        sceneTables={collidingTables}
        placeholderSeating={collidingSeating}
        showPhotoOverlapWarning
      />,
    );
    expect(
      container.querySelector('[data-testid="photo-overlap-warnings"]'),
    ).toBeNull();
  });

  it('renders nothing while the warning is disabled', () => {
    const { container, rerender } = render(
      <ClassroomCanvas
        {...baseProps}
        sceneTables={collidingTables}
        placeholderSeating={collidingSeating}
        allStudents={studentsWithPhoto}
        showPhotoOverlapWarning={false}
      />,
    );
    expect(
      container.querySelector('[data-testid="photo-overlap-warnings"]'),
    ).toBeNull();

    // Omitted prop defaults to off as well.
    rerender(
      <ClassroomCanvas
        {...baseProps}
        sceneTables={collidingTables}
        placeholderSeating={collidingSeating}
        allStudents={studentsWithPhoto}
      />,
    );
    expect(
      container.querySelector('[data-testid="photo-overlap-warnings"]'),
    ).toBeNull();
  });

  it('renders nothing when no photos collide', () => {
    const { container } = render(
      <ClassroomCanvas
        {...baseProps}
        sceneTables={[makeTable({}), makeTable({ x: 600, y: 400 })]}
        placeholderSeating={collidingSeating}
        allStudents={studentsWithPhoto}
        showPhotoOverlapWarning
      />,
    );
    expect(
      container.querySelector('[data-testid="photo-overlap-warnings"]'),
    ).toBeNull();
  });
});
