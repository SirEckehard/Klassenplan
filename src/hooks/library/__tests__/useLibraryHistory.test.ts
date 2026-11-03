// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The undo of "Bibliothek" (decision 0041): what goes back, what the selection
 * does with it, and the moments its steps no longer hold.
 */
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import type { ClassroomTemplate, ClassSummary, OwnMixPreset } from '@/types';
import { createMockClassroomScene } from '@/__tests__/utils';
import {
  addMixPreset,
  loadMixPresets,
  setMixPresetOverride,
} from '@/repositories/mixPresetStore';
import { findMixRecipe, fullRecipeWeights } from '@/utils';
import type { ClassParts } from '@/utils/data/classRooms';
import { subscribeToToasts, type ToastInstance } from '@/utils/ui/toast';
import {
  useLibraryHistory,
  type LibraryHistoryDeps,
  type LibraryStep,
} from '../useLibraryHistory';

const { memory } = vi.hoisted(() => ({ memory: new Map<string, unknown>() }));
vi.mock('idb-keyval', async () =>
  (await import('@/__tests__/utils/memoryIdbKeyval')).createMemoryIdbKeyval(
    memory,
  ),
);

const summary = (id: string, name = id): ClassSummary => ({
  id,
  name,
  createdAt: '2026-10-04',
  updatedAt: '2026-10-04',
  studentCount: 0,
});

const parts = (activePlanId: string | null): ClassParts => ({
  seatingHistory: [],
  mixHistory: [],
  rooms: [],
  activeRoomId: null,
  activePlanId,
});

const classStep = (plan: string, classId = '7b'): LibraryStep => ({
  kind: 'class',
  classId,
  parts: parts(plan),
});

const PATH = ['class:7b', 'room:r1'];

function setup(overrides: Partial<LibraryHistoryDeps> = {}) {
  const deps: LibraryHistoryDeps = {
    classes: [summary('7b'), summary('8c')],
    openClassId: '7b',
    reloadGeneration: 0,
    path: ['class:7b'],
    choosePath: vi.fn(),
    editClass: vi.fn(async () => ({ ok: true as const, before: parts('now') })),
    updateClassMetadata: vi.fn(async () => true),
    loadTemplates: vi.fn(async () => []),
    restoreTemplate: vi.fn(async () => true),
    onTemplatesChanged: vi.fn(),
    ...overrides,
  };
  const view = renderHook(
    (props: LibraryHistoryDeps) => useLibraryHistory(props),
    {
      initialProps: deps,
    },
  );
  return { deps, ...view };
}

let toasts: ToastInstance[] = [];
let unsubscribe: () => void = () => undefined;

beforeEach(() => {
  memory.clear();
  vi.stubGlobal('indexedDB', {});
  toasts = [];
  unsubscribe = subscribeToToasts((event) => {
    if (event.action === 'add') {
      toasts = [
        ...toasts.filter((toast) => toast.id !== event.toast.id),
        event.toast,
      ];
    } else if (event.action === 'dismiss') {
      toasts = toasts.filter((toast) => toast.id !== event.id);
    }
  });
});

afterEach(() => {
  unsubscribe();
  vi.unstubAllGlobals();
});

describe('useLibraryHistory', () => {
  it('has nothing to take back at first', () => {
    const { result } = setup();
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('takes a step back and forward, and chooses what was chosen', async () => {
    const { result, deps } = setup();
    act(() => result.current.record(classStep('then'), { path: PATH }));
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    await waitFor(() => expect(result.current.canRedo).toBe(true));
    expect(result.current.canUndo).toBe(false);
    expect(deps.editClass).toHaveBeenLastCalledWith('7b', {
      kind: 'restoreParts',
      parts: parts('then'),
      expected: undefined,
    });
    expect(deps.choosePath).toHaveBeenLastCalledWith(PATH);

    // Forward is how the undo found it.
    act(() => result.current.redo());
    await waitFor(() => expect(result.current.canUndo).toBe(true));
    expect(result.current.canRedo).toBe(false);
    expect(deps.editClass).toHaveBeenLastCalledWith('7b', {
      kind: 'restoreParts',
      parts: parts('now'),
      expected: undefined,
    });
    expect(deps.choosePath).toHaveBeenLastCalledWith(['class:7b']);
  });

  it('runs quick presses one after the other', async () => {
    const order: string[] = [];
    const editClass = vi.fn(async (_id: string, edit: unknown) => {
      const { parts: stand } = edit as { parts: ClassParts };
      order.push(`start ${stand.activePlanId}`);
      await Promise.resolve();
      order.push(`end ${stand.activePlanId}`);
      return { ok: true as const, before: parts('now') };
    });
    const { result } = setup({ editClass });
    act(() => {
      result.current.record(classStep('a'), { path: PATH });
      result.current.record(classStep('b'), { path: PATH });
    });

    act(() => {
      result.current.undo();
      result.current.undo();
    });

    await waitFor(() => expect(order).toHaveLength(4));
    expect(order).toEqual(['start b', 'end b', 'start a', 'end a']);
  });

  it('a new change ends what could be brought forward', async () => {
    const { result } = setup();
    act(() => result.current.record(classStep('a'), { path: PATH }));
    act(() => result.current.undo());
    await waitFor(() => expect(result.current.canRedo).toBe(true));

    act(() => result.current.record(classStep('b'), { path: PATH }));

    expect(result.current.canRedo).toBe(false);
  });

  it('keeps a step storage refused, to try again', async () => {
    const { result, deps } = setup({
      editClass: vi.fn(async () => ({
        ok: false as const,
        reason: 'storage' as const,
      })),
    });
    act(() => result.current.record(classStep('a'), { path: PATH }));

    act(() => result.current.undo());

    await waitFor(() => expect(toasts.map((t) => t.type)).toEqual(['error']));
    expect(result.current.canUndo).toBe(true);
    expect(deps.choosePath).not.toHaveBeenCalled();
  });

  it('lets a step go that another window overtook, and says so', async () => {
    const { result } = setup({
      editClass: vi.fn(async () => ({
        ok: false as const,
        reason: 'changed-elsewhere' as const,
      })),
    });
    act(() => result.current.record(classStep('a'), { path: PATH }));

    act(() => result.current.undo());

    await waitFor(() => expect(result.current.canUndo).toBe(false));
    expect(toasts.map((t) => t.type)).toEqual(['error']);
  });

  it('forgets a deleted class with its steps', () => {
    const { result, rerender, deps } = setup();
    act(() => result.current.record(classStep('a', '8c'), { path: PATH }));
    expect(result.current.canUndo).toBe(true);

    rerender({ ...deps, classes: [summary('7b')] });

    expect(result.current.canUndo).toBe(false);
  });

  it('forgets the steps of the class when another opens, not the others', () => {
    const { result, rerender, deps } = setup();
    act(() =>
      result.current.record(
        { kind: 'template', templateId: 1, template: null, index: 0 },
        { path: PATH },
      ),
    );
    act(() => result.current.record(classStep('a'), { path: PATH }));

    rerender({ ...deps, openClassId: '8c' });
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(deps.editClass).not.toHaveBeenCalled();
  });

  it('forgets everything when the open class is replaced from outside', () => {
    const { result, rerender, deps } = setup();
    act(() => result.current.record(classStep('a'), { path: PATH }));

    rerender({ ...deps, reloadGeneration: 1 });

    expect(result.current.canUndo).toBe(false);
  });

  it('forgets everything when everything is wiped', () => {
    const { result, rerender, deps } = setup();
    act(() =>
      result.current.record(
        { kind: 'template', templateId: 1, template: null, index: 0 },
        { path: PATH },
      ),
    );

    rerender({ ...deps, classes: [], openClassId: null });

    expect(result.current.canUndo).toBe(false);
  });

  it('offers the undo on a card, which goes with the next step', async () => {
    const { result, deps } = setup();
    act(() =>
      result.current.record(classStep('a'), {
        path: PATH,
        offer: 'Plan gelöscht.',
      }),
    );
    expect(toasts.map((toast) => toast.message)).toEqual(['Plan gelöscht.']);

    act(() => toasts[0]?.action?.onClick());
    await waitFor(() => expect(result.current.canRedo).toBe(true));
    expect(deps.editClass).toHaveBeenCalledTimes(1);

    act(() =>
      result.current.record(classStep('b'), {
        path: PATH,
        offer: 'Plan gelöscht.',
      }),
    );
    expect(toasts).toHaveLength(1);
    act(() => result.current.record(classStep('c'), { path: PATH }));
    await waitFor(() => expect(toasts).toHaveLength(0));
  });

  it('takes the card along when the page goes', async () => {
    const { result, unmount } = setup();
    act(() =>
      result.current.record(classStep('a'), { path: PATH, offer: 'Weg.' }),
    );
    expect(toasts).toHaveLength(1);

    unmount();

    await waitFor(() => expect(toasts).toHaveLength(0));
  });

  it('puts a class name back as it stood, and forward', async () => {
    const { result, rerender, deps } = setup({
      classes: [{ ...summary('7b', 'Neu'), notes: 'Notiz' }],
    });
    act(() =>
      result.current.record(
        {
          kind: 'classMeta',
          classId: '7b',
          name: 'Alt',
          label: '',
          notes: '',
        },
        { path: PATH },
      ),
    );

    act(() => result.current.undo());
    await waitFor(() => expect(result.current.canRedo).toBe(true));
    expect(deps.updateClassMetadata).toHaveBeenLastCalledWith('7b', {
      name: 'Alt',
      label: '',
      notes: '',
    });

    rerender({ ...deps, classes: [summary('7b', 'Alt')] });
    act(() => result.current.redo());
    await waitFor(() => expect(result.current.canUndo).toBe(true));
    expect(deps.updateClassMetadata).toHaveBeenLastCalledWith('7b', {
      name: 'Neu',
      label: '',
      notes: 'Notiz',
    });
  });

  it('puts one template back, and takes it away going forward', async () => {
    const template: ClassroomTemplate = {
      id: 4,
      name: 'Hufeisen',
      scene: createMockClassroomScene(4),
    };
    const { result, deps, rerender } = setup();
    act(() =>
      result.current.record(
        { kind: 'template', templateId: 4, template, index: 2 },
        { path: PATH },
      ),
    );

    act(() => result.current.undo());
    await waitFor(() => expect(result.current.canRedo).toBe(true));
    expect(deps.restoreTemplate).toHaveBeenLastCalledWith(4, template, 2);
    expect(deps.onTemplatesChanged).toHaveBeenCalledTimes(1);

    rerender({ ...deps, loadTemplates: vi.fn(async () => [template]) });
    act(() => result.current.redo());
    await waitFor(() => expect(result.current.canUndo).toBe(true));
    expect(deps.restoreTemplate).toHaveBeenLastCalledWith(4, null, 2);

    // And back again, to where forward found it.
    act(() => result.current.undo());
    await waitFor(() =>
      expect(deps.restoreTemplate).toHaveBeenLastCalledWith(4, template, 0),
    );
  });

  it('takes a new preset away and brings it back in its place', async () => {
    const weights = fullRecipeWeights({});
    const first = (await addMixPreset('Eins', weights)) as OwnMixPreset;
    const made = (await addMixPreset('Zwei', weights)) as OwnMixPreset;
    const { result } = setup();
    act(() =>
      result.current.record(
        { kind: 'ownPreset', presetId: made.id, preset: null, index: 1 },
        { path: PATH },
      ),
    );

    act(() => result.current.undo());
    await waitFor(() => expect(result.current.canRedo).toBe(true));
    expect((await loadMixPresets()).presets.map((p) => p.id)).toEqual([
      first.id,
    ]);

    act(() => result.current.redo());
    await waitFor(() => expect(result.current.canUndo).toBe(true));
    expect((await loadMixPresets()).presets).toEqual([first, made]);
  });

  it('gives a shipped preset the weights it had', async () => {
    const original = fullRecipeWeights(findMixRecipe('exam')!.weights);
    const changed = {
      ...original,
      preferGenderMix: original.preferGenderMix === 3 ? 4 : 3,
    };
    await setMixPresetOverride('exam', changed);
    const { result } = setup();
    act(() =>
      result.current.record(
        { kind: 'presetOverride', builtin: 'exam', weights: null },
        { path: PATH },
      ),
    );

    act(() => result.current.undo());
    await waitFor(() => expect(result.current.canRedo).toBe(true));
    expect((await loadMixPresets()).overrides.exam).toBeUndefined();

    act(() => result.current.redo());
    await waitFor(() => expect(result.current.canUndo).toBe(true));
    expect((await loadMixPresets()).overrides.exam?.weights).toEqual(changed);
  });
});
