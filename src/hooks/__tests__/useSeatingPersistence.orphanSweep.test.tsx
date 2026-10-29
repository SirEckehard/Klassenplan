// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { act, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { memory } = vi.hoisted(() => ({ memory: new Map<string, unknown>() }));

vi.mock('idb-keyval', async () =>
  (await import('@/__tests__/utils/memoryIdbKeyval')).createMemoryIdbKeyval(
    memory,
  ),
);

import '@/i18n';
import { createMockStudent } from '@/__tests__/utils';
import {
  resetSeatingRepository,
  unmountAndSettle,
} from '@/__tests__/utils/resetSeatingRepository';
import {
  SeatingPlanGeneratorProvider,
  useSeatingPlanActions,
  useSeatingPlanState,
} from '@/contexts/SeatingPlanContext';
import {
  getAllPhotoIds,
  setStudentPhoto,
} from '@/repositories/studentPhotoStore';

type Snapshot = {
  state: ReturnType<typeof useSeatingPlanState>;
  actions: ReturnType<typeof useSeatingPlanActions>;
};

function Probe({ onRender }: { onRender: (snapshot: Snapshot) => void }) {
  onRender({ state: useSeatingPlanState(), actions: useSeatingPlanActions() });
  return null;
}

/**
 * Orphaned photos are swept at start-up only. A reload of the classes later on
 * — "Bibliothek" making a class beside the open one — keeps the open class's
 * undo history, and the student it can bring back must find the photo again.
 */
describe('orphan sweep', () => {
  beforeEach(async () => {
    memory.clear();
    vi.stubGlobal('indexedDB', {});
    await resetSeatingRepository();
  });

  afterEach(async () => {
    await unmountAndSettle();
    vi.unstubAllGlobals();
  });

  it('keeps the photo of a removed student while the removal can be undone', async () => {
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

    const students = [
      createMockStudent({ id: 's-mia', name: 'Mia', hasPhoto: true }),
      createMockStudent({ id: 's-ben', name: 'Ben' }),
    ];
    await act(() =>
      current().actions.createClass(
        { name: '7a', students },
        { activate: true },
      ),
    );
    await waitFor(() => expect(current().state.students).toHaveLength(2));
    await setStudentPhoto('s-mia', new Blob(['x'], { type: 'image/jpeg' }));

    act(() => {
      current().actions.removeStudent('s-mia');
    });

    // "Bibliothek" adds a class without opening it, which reloads the classes.
    await act(() =>
      current().actions.createClass({ name: '8b' }, { activate: false }),
    );
    await waitFor(() => expect(current().state.classSummaries).toHaveLength(2));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(current().state.canUndoStudents).toBe(true);
    act(() => {
      current().actions.undoStudents();
    });
    expect(current().state.students.map((s) => s.id)).toContain('s-mia');

    const ids = await getAllPhotoIds();
    expect(ids.success && ids.data).toContain('s-mia');
  });
});
