// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { memory } = vi.hoisted(() => ({ memory: new Map<string, unknown>() }));

vi.mock('idb-keyval', async () =>
  (await import('@/__tests__/utils/memoryIdbKeyval')).createMemoryIdbKeyval(
    memory,
  ),
);

import '@/i18n';
import { createMockStudent } from '@/__tests__/utils';
import type { ClassCollectionState } from '@/types';
import { createClassRecord } from '@/utils/data/classCollection';
import { useSeatingState } from '../useSeatingState';
import { useSeatingPersistence } from '../useSeatingPersistence';
import { useSeatingRepository } from '../useSeatingRepository';

const COLLECTION_KEY = 'default::spg.classCollection';

const storedNames = (classId: string) =>
  (memory.get(COLLECTION_KEY) as ClassCollectionState | undefined)?.classes
    .find((entry) => entry.id === classId)
    ?.students.map((student) => student.name) ?? [];

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 300));
  });

/**
 * A backup carries the class that was open when it was made twice: in its
 * collection and, for older readers, as its top-level fields. Restoring it
 * puts those fields on screen for a moment. They were queued for the class
 * open at that moment and written into that class of the restored collection
 * once the import reloaded — in Safari, without `requestIdleCallback`, every
 * time — so a restore on the same device turned class A into a copy of B.
 *
 * jsdom has no `requestIdleCallback` either: the queue takes Safari's path.
 */
describe('restoring a backup while another class is open', () => {
  beforeEach(() => {
    memory.clear();
    vi.stubGlobal('indexedDB', {});
    memory.set(COLLECTION_KEY, {
      version: 2,
      activeClassId: 'B',
      classes: [
        createClassRecord({
          id: 'A',
          name: 'Klasse A',
          students: [
            createMockStudent({ id: 'a1', name: 'Anna' }),
            createMockStudent({ id: 'a2', name: 'Arne' }),
          ],
        }),
        createClassRecord({
          id: 'B',
          name: 'Klasse B',
          students: [
            createMockStudent({ id: 'b1', name: 'Bea' }),
            createMockStudent({ id: 'b2', name: 'Ben' }),
          ],
        }),
      ],
    } satisfies ClassCollectionState);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('leaves each class as the backup holds it', async () => {
    const { result } = renderHook(() => {
      const state = useSeatingState();
      return {
        state,
        persistence: useSeatingPersistence(state),
        repository: useSeatingRepository(),
      };
    });
    await waitFor(() =>
      expect(result.current.state.classState.activeClass.id).toBe('B'),
    );
    await settle();

    // The backup is made while B is open…
    let backup = '';
    await act(async () => {
      backup = await result.current.persistence.exportAllAsJson();
    });

    // …and restored while A is.
    await act(async () => {
      await result.current.repository.setActiveClass('A');
      await result.current.persistence.reloadCurrentClassData();
    });
    await waitFor(() =>
      expect(result.current.state.classState.activeClass.id).toBe('A'),
    );
    await settle();

    // A file that is no backup changes nothing.
    await act(async () => {
      await expect(
        result.current.persistence.importAllFromJson('{"version":2}', {
          merge: false,
        }),
      ).rejects.toThrow();
    });
    await settle();
    expect(storedNames('A')).toEqual(['Anna', 'Arne']);
    expect(
      result.current.state.studentState.students.map((student) => student.name),
    ).toEqual(['Anna', 'Arne']);

    await act(async () => {
      await result.current.persistence.importAllFromJson(backup, {
        merge: false,
      });
    });
    await settle();

    expect(storedNames('A')).toEqual(['Anna', 'Arne']);
    expect(storedNames('B')).toEqual(['Bea', 'Ben']);
    // The restored collection opens the class open when it was made.
    expect(result.current.state.classState.activeClass.id).toBe('B');
    expect(
      result.current.state.studentState.students.map((student) => student.name),
    ).toEqual(['Bea', 'Ben']);
  });
});
