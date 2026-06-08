// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { cleanup, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useKeyboardInteraction } from '../../../hooks/ui/useKeyboardInteraction';
import { DEFAULT_ROTATION_SNAP_STEP } from '@/utils';
import type { ClassroomScene, ClassroomTable } from '../../../types';

describe('useKeyboardInteraction', () => {
  const createMockTable = (index: number): ClassroomTable => ({
    x: 100 + index * 50,
    y: 100 + index * 30,
    width: 130,
    height: 120,
    seatCount: 4,
    rotation: 0,
    zIndex: index,
    locked: false,
    templateType: 'group4',
  });

  const createParams = (
    overrides: Partial<Parameters<typeof useKeyboardInteraction>[0]> = {},
  ) => {
    const sceneTables = overrides?.sceneTables ?? [
      createMockTable(0),
      createMockTable(1),
    ];
    const classroomScene: ClassroomScene = overrides?.classroomScene ?? {
      tables: sceneTables,
      totalStudents: 8,
    };

    return {
      selectedTableIds: [0],
      sceneTables,
      classroomScene,
      updateClassroomScene: vi.fn(),
      snapToGrid: false,
      classroomWidth: 800,
      classroomHeight: 600,
      snapshot: vi.fn(),
      deleteSelectedTables: vi.fn(),
      copySelectedTables: vi.fn(),
      cutSelectedTables: vi.fn(),
      pasteTablesAt: vi.fn(),
      closeCanvasContextMenu: vi.fn(),
      clipboard: null,
      ...overrides,
    };
  };

  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('returns empty object interface', () => {
    const params = createParams();
    const { result, unmount } = renderHook(() =>
      useKeyboardInteraction(params),
    );
    expect(result.current).toEqual({});
    unmount();
  });

  it('handles arrow key navigation', async () => {
    const updateClassroomScene = vi.fn();
    const snapshot = vi.fn();
    const params = createParams({ updateClassroomScene, snapshot });
    const { unmount } = renderHook(() => useKeyboardInteraction(params));

    const user = userEvent.setup();
    updateClassroomScene.mockClear();
    snapshot.mockClear();

    await user.keyboard('{ArrowRight}');

    expect(snapshot).toHaveBeenCalled();
    expect(updateClassroomScene).toHaveBeenCalled();

    unmount();
  });

  it('handles delete key for selected tables', async () => {
    const params = createParams();
    const { unmount } = renderHook(() => useKeyboardInteraction(params));

    const user = userEvent.setup();
    await user.keyboard('{Delete}');

    expect(params.deleteSelectedTables).toHaveBeenCalled();

    unmount();
  });

  it('handles copy shortcut (Ctrl+C)', async () => {
    const params = createParams();
    const { unmount } = renderHook(() => useKeyboardInteraction(params));

    const user = userEvent.setup();
    await user.keyboard('{Control>}c{/Control}');

    expect(params.copySelectedTables).toHaveBeenCalled();

    unmount();
  });

  it('handles paste shortcut when clipboard has content', async () => {
    const params = createParams({ clipboard: [createMockTable(0)] });
    const { unmount } = renderHook(() => useKeyboardInteraction(params));

    const user = userEvent.setup();
    await user.keyboard('{Control>}v{/Control}');

    expect(params.pasteTablesAt).toHaveBeenCalled();
    expect(params.closeCanvasContextMenu).toHaveBeenCalled();

    unmount();
  });

  it('does not handle shortcuts when input is focused', async () => {
    const mockInput = document.createElement('input');
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(mockInput);

    const params = createParams();
    const { unmount } = renderHook(() => useKeyboardInteraction(params));

    const user = userEvent.setup();
    await user.keyboard('{Control>}c{/Control}');

    expect(params.copySelectedTables).not.toHaveBeenCalled();

    unmount();
  });

  it('does not move tables when none are selected', async () => {
    const params = createParams({ selectedTableIds: [] });
    const { unmount } = renderHook(() => useKeyboardInteraction(params));

    const user = userEvent.setup();
    await user.keyboard('{ArrowRight}');

    expect(params.updateClassroomScene).not.toHaveBeenCalled();

    unmount();
  });

  it('moves selected tables with arrow keys', async () => {
    const updateClassroomScene = vi.fn();
    const params = createParams({ updateClassroomScene });
    const { unmount } = renderHook(() => useKeyboardInteraction(params));

    const user = userEvent.setup();
    updateClassroomScene.mockClear();
    await user.keyboard('{ArrowRight}');

    expect(updateClassroomScene).toHaveBeenCalled();
    const updatedScene = updateClassroomScene.mock
      .calls[0][0] as ClassroomScene;
    const firstTable = updatedScene.tables[0] as ClassroomTable;
    expect(firstTable.x).toBe(101);

    unmount();
  });

  it('ignores arrow shortcuts when system modifiers are pressed', async () => {
    const updateClassroomScene = vi.fn();
    const params = createParams({ updateClassroomScene });
    const { unmount } = renderHook(() => useKeyboardInteraction(params));

    const user = userEvent.setup();
    await user.keyboard('{Alt>}{ArrowRight}{/Alt}');
    await user.keyboard('{Meta>}{ArrowRight}{/Meta}');
    await user.keyboard('{Control>}{ArrowRight}{/Control}');

    expect(updateClassroomScene).not.toHaveBeenCalled();

    unmount();
  });

  it('applies snap to grid when enabled', async () => {
    const updateClassroomScene = vi.fn();
    const params = createParams({ snapToGrid: true, updateClassroomScene });
    const { unmount } = renderHook(() => useKeyboardInteraction(params));

    const user = userEvent.setup();
    updateClassroomScene.mockClear();
    await user.keyboard('{Shift>}{ArrowRight}{/Shift}');

    expect(updateClassroomScene).toHaveBeenCalled();
    const updatedScene = updateClassroomScene.mock
      .calls[0][0] as ClassroomScene;
    const firstTable = updatedScene.tables[0] as ClassroomTable;
    // With snapToGrid: baseStep=10, stepSize=GRID_SNAP_SIZE(5) → delta=50
    expect(firstTable.x).toBe(150);

    unmount();
  });

  it('skips locked tables during movement', async () => {
    const lockedTable = { ...createMockTable(0), locked: true };
    const secondaryTable = createMockTable(1);
    const updateClassroomScene = vi.fn();
    const params = createParams({
      sceneTables: [lockedTable, secondaryTable],
      classroomScene: {
        tables: [lockedTable, secondaryTable],
        totalStudents: 8,
      },
      updateClassroomScene,
    });

    const { unmount } = renderHook(() => useKeyboardInteraction(params));

    const user = userEvent.setup();
    updateClassroomScene.mockClear();
    await user.keyboard('{ArrowRight}');

    expect(updateClassroomScene).toHaveBeenCalled();
    const updatedScene = updateClassroomScene.mock
      .calls[0][0] as ClassroomScene;
    const tables = updatedScene.tables as ClassroomTable[];
    const locked = tables.find((table) => table.locked);
    expect(locked?.x).toBe(100);

    unmount();
  });

  it('rotates selected tables clockwise with E', async () => {
    const updateClassroomScene = vi.fn();
    const snapshot = vi.fn();
    const params = createParams({ updateClassroomScene, snapshot });
    const { unmount } = renderHook(() => useKeyboardInteraction(params));

    const user = userEvent.setup();
    await user.keyboard('e');

    expect(snapshot).toHaveBeenCalled();
    expect(updateClassroomScene).toHaveBeenCalled();
    const updatedScene = updateClassroomScene.mock
      .calls[0][0] as ClassroomScene;
    const firstTable = updatedScene.tables[0] as ClassroomTable;
    expect(firstTable.rotation).toBe(DEFAULT_ROTATION_SNAP_STEP);

    unmount();
  });

  it('ignores rotation shortcuts with system modifiers', async () => {
    const updateClassroomScene = vi.fn();
    const params = createParams({ updateClassroomScene });
    const { unmount } = renderHook(() => useKeyboardInteraction(params));

    const user = userEvent.setup();
    await user.keyboard('{Meta>}e{/Meta}');
    await user.keyboard('{Alt>}e{/Alt}');
    await user.keyboard('{Control>}q{/Control}');

    expect(updateClassroomScene).not.toHaveBeenCalled();

    unmount();
  });

  it('rotates selected tables counter-clockwise with Q', async () => {
    const updateClassroomScene = vi.fn();
    const params = createParams({ updateClassroomScene });
    const { unmount } = renderHook(() => useKeyboardInteraction(params));

    const user = userEvent.setup();
    await user.keyboard('q');

    expect(updateClassroomScene).toHaveBeenCalled();
    const updatedScene = updateClassroomScene.mock
      .calls[0][0] as ClassroomScene;
    const firstTable = updatedScene.tables[0] as ClassroomTable;
    expect(firstTable.rotation).toBe(360 - DEFAULT_ROTATION_SNAP_STEP);

    unmount();
  });

  it('rotates in 90 degree steps when Shift is pressed', async () => {
    const updateClassroomScene = vi.fn();
    const params = createParams({ updateClassroomScene });
    const { unmount } = renderHook(() => useKeyboardInteraction(params));

    const user = userEvent.setup();
    await user.keyboard('{Shift>}e{/Shift}');

    expect(updateClassroomScene).toHaveBeenCalled();
    const updatedScene = updateClassroomScene.mock
      .calls[0][0] as ClassroomScene;
    const firstTable = updatedScene.tables[0] as ClassroomTable;
    expect(firstTable.rotation).toBe(90);

    unmount();
  });

  it('ignores rotation shortcuts when all selected tables are locked', async () => {
    const lockedTable = { ...createMockTable(0), locked: true };
    const params = createParams({
      selectedTableIds: [0],
      sceneTables: [lockedTable],
      classroomScene: { tables: [lockedTable], totalStudents: 4 },
    });
    const { unmount } = renderHook(() => useKeyboardInteraction(params));

    const user = userEvent.setup();
    await user.keyboard('e');

    expect(params.updateClassroomScene).not.toHaveBeenCalled();

    unmount();
  });
});
