// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFeaturePaletteDrag } from '@/hooks/canvas/useFeaturePaletteDrag';
import type { FeatureTemplate } from '@/hooks/canvas/featureTemplates';
import type {
  SceneTransactionState,
  SceneTransactionRunner,
} from '@/hooks/scene/useSceneManager';
import type {
  ClassroomFeature,
  ClassroomFeatureType,
  ClassroomTable,
} from '@/types';
import { CLASSROOM_HEIGHT, CLASSROOM_WIDTH } from '@/utils';

const TEMPLATES: FeatureTemplate[] = [
  {
    type: 'cabinet',
    label: 'Schrank',
    width: 100,
    height: 40,
    movable: true,
    allowMultiple: true,
  },
  {
    type: 'window',
    label: 'Fenster',
    width: 20,
    height: 160,
    movable: false,
    allowMultiple: true,
  },
  {
    type: 'board',
    label: 'Tafel',
    width: 20,
    height: 200,
    movable: false,
    allowMultiple: false,
  },
];

/** Whether two boxes overlap. */
const overlaps = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

describe('useFeaturePaletteDrag – adding by click', () => {
  let features: ClassroomFeature[];
  let tables: ClassroomTable[];
  let snapshot: ReturnType<typeof vi.fn<() => void>>;
  let selectFeature: ReturnType<
    typeof vi.fn<(featureId: string, additive: boolean) => void>
  >;
  let onFeatureAdded: ReturnType<
    typeof vi.fn<(feature: ClassroomFeature) => void>
  >;
  let runSceneTransaction: ReturnType<typeof vi.fn<SceneTransactionRunner>>;

  beforeEach(() => {
    features = [];
    tables = [];
    snapshot = vi.fn();
    selectFeature = vi.fn();
    onFeatureAdded = vi.fn();
    // Runs the change against the room as it stands and keeps the result.
    runSceneTransaction = vi.fn((mutator) => {
      const base: SceneTransactionState = {
        scene: { tables, features, totalStudents: 0 },
        tables,
        features,
        seating: [],
      };
      const result = mutator(base) ?? {};
      features = result.features ?? features;
      return result;
    });
  });

  const renderAdd = () =>
    renderHook(() =>
      useFeaturePaletteDrag({
        rotateSelection: vi.fn(),
        featureTemplateMap: new Map<ClassroomFeatureType, FeatureTemplate>(
          TEMPLATES.map((template) => [template.type, template]),
        ),
        sceneFeatures: features,
        runSceneTransaction,
        setSceneFeatures: vi.fn() as unknown as React.Dispatch<
          React.SetStateAction<ClassroomFeature[]>
        >,
        snapshot,
        snapToGrid: true,
        classroomWidth: CLASSROOM_WIDTH,
        classroomHeight: CLASSROOM_HEIGHT,
        selectedFeatureIds: [],
        selectedTableIds: [],
        sceneTables: tables,
        updateSceneTables: vi.fn(),
        commitScene: vi.fn(),
        toSceneCoordinates: (_svg, x, y) => ({ x, y }),
        sceneToClient: (point) => point,
        canvasRef: { current: null },
        onFeatureAdded,
        selectFeature,
        alignmentGuidesEnabled: false,
        setActiveAlignmentGuides: vi.fn(),
      }),
    );

  it('puts a free element on the floor, clear of the tables', () => {
    // A table in the very middle of the room.
    tables = [
      {
        x: 390,
        y: 270,
        width: 120,
        height: 60,
        rotation: 0,
        seatCount: 2,
        locked: false,
        zIndex: 0,
        templateType: 'double',
      },
    ];
    const { result } = renderAdd();

    let added = false;
    act(() => {
      added = result.current.addFeature('cabinet');
    });

    expect(added).toBe(true);
    expect(snapshot).toHaveBeenCalledTimes(1);
    const [cabinet] = features;
    expect(cabinet).toMatchObject({ type: 'cabinet', anchor: 'free' });
    expect(overlaps(cabinet, tables[0])).toBe(false);
    // It becomes the selection, as a dropped one does.
    expect(onFeatureAdded).toHaveBeenCalledWith(cabinet);
  });

  it('hangs a window in the middle of the first free wall', () => {
    const { result } = renderAdd();

    act(() => {
      result.current.addFeature('window');
    });

    const [window] = features;
    expect(window).toMatchObject({ anchor: 'top', y: 0, width: 160 });
    expect(window.x + window.width / 2).toBe(CLASSROOM_WIDTH / 2);
  });

  it('hangs a second window beside the first', () => {
    const { result, rerender } = renderAdd();

    act(() => {
      result.current.addFeature('window');
    });
    rerender();
    act(() => {
      result.current.addFeature('window');
    });

    expect(features).toHaveLength(2);
    expect(overlaps(features[0], features[1])).toBe(false);
  });

  // The board is one of a kind; a click on it finds the one there is
  // instead of replacing it somewhere else.
  it('selects the board that is there instead of adding another', () => {
    features = [
      {
        id: 'board-1',
        type: 'board',
        x: 350,
        y: 0,
        width: 200,
        height: 20,
        anchor: 'top',
        movable: false,
        rotation: -90,
      },
    ];
    const { result } = renderAdd();

    act(() => {
      result.current.addFeature('board');
    });

    expect(selectFeature).toHaveBeenCalledWith('board-1', false);
    expect(runSceneTransaction).not.toHaveBeenCalled();
    expect(snapshot).not.toHaveBeenCalled();
  });

  it('reports a room without space left', () => {
    // A cabinet as big as the room.
    features = [
      {
        id: 'wall-to-wall',
        type: 'cabinet',
        x: 0,
        y: 0,
        width: CLASSROOM_WIDTH,
        height: CLASSROOM_HEIGHT,
        anchor: 'free',
        movable: true,
        rotation: 0,
      },
    ];
    const { result } = renderAdd();

    let added = true;
    act(() => {
      added = result.current.addFeature('cabinet');
    });

    expect(added).toBe(false);
    expect(runSceneTransaction).not.toHaveBeenCalled();
  });
});
