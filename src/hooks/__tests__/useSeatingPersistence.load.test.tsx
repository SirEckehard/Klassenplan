// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { memory } = vi.hoisted(() => ({ memory: new Map<string, unknown>() }));

vi.mock('idb-keyval', async () =>
  (await import('@/__tests__/utils/memoryIdbKeyval')).createMemoryIdbKeyval(
    memory,
  ),
);

import { set } from 'idb-keyval';
import '@/i18n';
import { unmountAndSettle } from '@/__tests__/utils/resetSeatingRepository';
import { createMockStudent } from '@/__tests__/utils';
import type { ClassCollectionState } from '@/types';
import { createClassRecord } from '@/utils/data/classCollection';
import { DB_KEYS } from '@/utils/data/storageKeys';
import { useSeatingState } from '../useSeatingState';
import { useSeatingPersistence } from '../useSeatingPersistence';

/**
 * Loading stamps the data version after reading the classes. On a full disk
 * that write fails, and the classes it had read already must still open —
 * otherwise the app shows its first screen, as if every class were gone.
 */
describe('loading the classes', () => {
  beforeEach(() => {
    memory.clear();
    vi.stubGlobal('indexedDB', {});
    memory.set(`default::${DB_KEYS.classCollection}`, {
      version: 2,
      activeClassId: 'A',
      classes: [
        createClassRecord({
          id: 'A',
          name: 'Klasse A',
          students: [createMockStudent({ id: 'a1', name: 'Anna' })],
        }),
      ],
    } satisfies ClassCollectionState);

    const write = vi.mocked(set).getMockImplementation()!;
    vi.mocked(set).mockImplementation(async (key, value, store) => {
      if (key === DB_KEYS.version) {
        throw new DOMException('The disk is full.', 'QuotaExceededError');
      }
      return write(key, value, store);
    });
  });

  afterEach(async () => {
    await unmountAndSettle();
    vi.unstubAllGlobals();
  });

  it('opens the stored class when the version stamp cannot be written', async () => {
    const { result } = renderHook(() => {
      const state = useSeatingState();
      useSeatingPersistence(state);
      return state;
    });

    await waitFor(() =>
      expect(result.current.classState.activeClass.id).toBe('A'),
    );
    expect(
      result.current.studentState.students.map((student) => student.name),
    ).toEqual(['Anna']);
  });
});
