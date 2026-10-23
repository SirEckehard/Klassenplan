// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { memory } = vi.hoisted(() => ({ memory: new Map<string, unknown>() }));

vi.mock('idb-keyval', async () =>
  (await import('@/__tests__/utils/memoryIdbKeyval')).createMemoryIdbKeyval(
    memory,
  ),
);

import '@/i18n';
import { createMockStudent } from '@/__tests__/utils';
import { resetSeatingRepository } from '@/__tests__/utils/resetSeatingRepository';
import {
  SeatingPlanGeneratorProvider,
  useSeatingPlanActions,
  useSeatingPlanState,
} from '@/contexts/SeatingPlanContext';

type Snapshot = {
  state: ReturnType<typeof useSeatingPlanState>;
  actions: ReturnType<typeof useSeatingPlanActions>;
};

/** Reads the generator the way the views do: through the store bridge. */
function Probe({ onRender }: { onRender: (snapshot: Snapshot) => void }) {
  onRender({ state: useSeatingPlanState(), actions: useSeatingPlanActions() });
  return null;
}

/**
 * Creating a class or deleting one reloads the open class from storage. That
 * class is read back as it was written, so its undo steps stay — only another
 * class opening takes them.
 */
describe('useSeatingGenerator undo across class changes', () => {
  beforeEach(async () => {
    memory.clear();
    vi.stubGlobal('indexedDB', {});
    await resetSeatingRepository();
    return () => vi.unstubAllGlobals();
  });

  const renderWithOpenClass = async () => {
    const probe: { current: Snapshot | null } = { current: null };
    render(
      <MemoryRouter>
        <SeatingPlanGeneratorProvider>
          <Probe
            onRender={(snapshot) => {
              probe.current = snapshot;
            }}
          />
        </SeatingPlanGeneratorProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(probe.current).not.toBeNull());
    const current = () => probe.current!;

    const students = ['Anna', 'Ben', 'Cem'].map((name, index) =>
      createMockStudent({ id: `s-${index}`, name }),
    );
    await act(() =>
      current().actions.createClass(
        { name: '7a', students },
        { activate: true },
      ),
    );
    await waitFor(() => expect(current().state.students).toHaveLength(3));

    // One step to undo.
    act(() => {
      current().actions.removeStudent('s-2');
    });
    expect(current().state.canUndoStudents).toBe(true);
    return current;
  };

  it('keeps the undo steps when another class is created beside it', async () => {
    const current = await renderWithOpenClass();

    await act(() =>
      current().actions.createClass({ name: '8b' }, { activate: false }),
    );
    await waitFor(() => expect(current().state.classSummaries).toHaveLength(2));

    expect(current().state.canUndoStudents).toBe(true);
    act(() => {
      current().actions.undoStudents();
    });
    expect(current().state.students.map((student) => student.name)).toEqual([
      'Anna',
      'Ben',
      'Cem',
    ]);
  });

  it('keeps the undo steps when another class is deleted', async () => {
    const current = await renderWithOpenClass();
    await act(() =>
      current().actions.createClass({ name: '8b' }, { activate: false }),
    );
    const other = current().state.classSummaries.find(
      (entry) => entry.name === '8b',
    )!;

    await act(() => current().actions.deleteClass(other.id));
    await waitFor(() => expect(current().state.classSummaries).toHaveLength(1));

    expect(current().state.canUndoStudents).toBe(true);
  });

  it('drops them when another class opens', async () => {
    const current = await renderWithOpenClass();

    await act(() =>
      current().actions.createClass({ name: '8b' }, { activate: true }),
    );
    await waitFor(() => expect(current().state.activeClass.name).toBe('8b'));

    expect(current().state.canUndoStudents).toBe(false);
  });
});
