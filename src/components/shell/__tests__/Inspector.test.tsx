// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import '@/i18n';
import Inspector from '@/components/shell/Inspector';
import { InspectorProvider, useInspector } from '@/contexts/InspectorContext';
import { createMockStudent, getButton } from '@/__tests__/utils';
import type { Student } from '@/types';

const mocks = vi.hoisted(() => ({
  state: { step: 1, students: [] as Student[] },
  updateStudent: vi.fn(),
  removeStudent: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanState: () => mocks.state,
  useSeatingPlanActions: () => ({
    updateStudent: mocks.updateStudent,
    removeStudent: mocks.removeStudent,
  }),
}));

vi.mock('@/services/ui/dialogs', () => ({
  confirmDialog: (...args: unknown[]) => mocks.confirm(...args),
}));

const ada = createMockStudent({ id: 'a', name: 'Ada' });
const grace = createMockStudent({ id: 'g', name: 'Grace' });

/** Lets a case drive the selection the way a row click would. */
const Picker = () => {
  const { selectStudent } = useInspector();
  return (
    <button type="button" onClick={() => selectStudent('g')}>
      pick-grace
    </button>
  );
};

const renderInspector = () =>
  render(
    <InspectorProvider>
      <Picker />
      <Inspector />
    </InspectorProvider>,
  );

beforeEach(() => {
  mocks.state.step = 1;
  mocks.state.students = [ada, grace];
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Inspector', () => {
  it('asks for a selection while nothing is picked', () => {
    renderInspector();

    expect(
      screen.getByText(/Kein Schüler ausgewählt|No student selected/i),
    ).toBeVisible();
  });

  it('shows the picked student and where they sit in the list', () => {
    renderInspector();

    fireEvent.click(screen.getByRole('button', { name: 'pick-grace' }));

    expect(
      screen.getByRole('complementary', { name: /Merkmale|Attributes/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Schüler 2 von 2|Student 2 of 2/i),
    ).toBeInTheDocument();
  });

  it('stays out of the room and plan layers, which have no inspector yet', () => {
    mocks.state.step = 2;
    const { container } = renderInspector();

    expect(container).not.toHaveTextContent(
      /Kein Schüler ausgewählt|No student selected/i,
    );
  });

  it('drops a selection whose student was removed', () => {
    const { rerender } = renderInspector();
    fireEvent.click(screen.getByRole('button', { name: 'pick-grace' }));
    expect(screen.getByText(/Schüler 2 von 2|Student 2 of 2/i)).toBeVisible();

    mocks.state.students = [ada];
    rerender(
      <InspectorProvider>
        <Picker />
        <Inspector />
      </InspectorProvider>,
    );

    expect(
      screen.getByText(/Kein Schüler ausgewählt|No student selected/i),
    ).toBeVisible();
  });

  it('removes the student it is showing, once that is confirmed', async () => {
    mocks.confirm.mockResolvedValue(true);
    renderInspector();
    fireEvent.click(screen.getByRole('button', { name: 'pick-grace' }));

    fireEvent.click(getButton(/^(Löschen|Delete)$/i));
    await waitFor(() => expect(mocks.removeStudent).toHaveBeenCalledWith('g'));
    // The panel lets go of what it just deleted.
    expect(
      screen.getByText(/Kein Schüler ausgewählt|No student selected/i),
    ).toBeVisible();
  });

  it('keeps the student when the question is answered with no', async () => {
    mocks.confirm.mockResolvedValue(false);
    renderInspector();
    fireEvent.click(screen.getByRole('button', { name: 'pick-grace' }));

    fireEvent.click(getButton(/^(Löschen|Delete)$/i));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalled());
    expect(mocks.removeStudent).not.toHaveBeenCalled();
  });
});
