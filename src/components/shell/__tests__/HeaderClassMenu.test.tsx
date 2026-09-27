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
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@/i18n';
import HeaderClassMenu from '@/components/shell/HeaderClassMenu';
import { getButton } from '@/__tests__/utils';

const mocks = vi.hoisted(() => ({
  selectClass: vi.fn(),
  openCreate: vi.fn(),
  openEdit: vi.fn(),
  requestDelete: vi.fn(),
  activeClassId: 'class-1' as string | null,
}));

vi.mock('@/contexts/seatingPlan/ClassManagementContext', () => ({
  useClassManagementContext: () => ({
    classSummaries: [
      { id: 'class-1', name: 'Testklasse', label: '', notes: '' },
      { id: 'class-2', name: 'Parallelklasse', label: '', notes: '' },
    ],
    activeClass: { id: mocks.activeClassId, name: 'Testklasse' },
    selectClass: mocks.selectClass,
  }),
}));

vi.mock('@/contexts/ClassDialogsContext', () => ({
  useClassDialogs: () => ({
    openCreate: mocks.openCreate,
    openEdit: mocks.openEdit,
    requestDelete: mocks.requestDelete,
    isBusy: false,
  }),
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanState: () => ({ students: [{ id: 's1' }, { id: 's2' }] }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.activeClassId = 'class-1';
});

const openMenu = () =>
  fireEvent.click(getButton(/Klasse wechseln|Switch class/i));

describe('HeaderClassMenu', () => {
  it('states the open class and how many students are in it', () => {
    render(<HeaderClassMenu />);

    expect(screen.getByText('Testklasse')).toBeVisible();
    expect(screen.getByText(/2 Schüler|2 students/i)).toBeVisible();
  });

  it('switches to another class from the dropdown', async () => {
    render(<HeaderClassMenu />);
    openMenu();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Parallelklasse' }),
    );

    expect(mocks.selectClass).toHaveBeenCalledWith('class-2');
  });

  it('offers renaming and deleting next to the class they act on', async () => {
    render(<HeaderClassMenu />);
    openMenu();

    fireEvent.click(
      await screen.findByRole('button', {
        name: /Klasse löschen Parallelklasse|Delete class Parallelklasse/i,
      }),
    );
    expect(mocks.requestDelete).toHaveBeenCalledWith('class-2');

    openMenu();
    fireEvent.click(
      await screen.findByRole('button', {
        name: /Klasse bearbeiten Testklasse|Edit class Testklasse/i,
      }),
    );
    expect(mocks.openEdit).toHaveBeenCalledWith('class-1');
  });

  // Without a class the button keeps its shape; creating the first one is in
  // the dropdown, where creating any other one is too.
  it('says that no class is open and offers to create one', async () => {
    mocks.activeClassId = null;
    render(<HeaderClassMenu />);

    const button = getButton(/Keine Klasse ausgewählt|No class selected/i);
    fireEvent.click(button);
    fireEvent.click(
      await screen.findByRole('button', { name: /Neue Klasse|New class/i }),
    );

    expect(mocks.openCreate).toHaveBeenCalledTimes(1);
  });

  // The list is portalled to the end of the page; the keyboard used to tab
  // past it without ever reaching a class.
  it('takes the focus to the open class and steps on with the arrow keys', async () => {
    render(<HeaderClassMenu />);
    openMenu();

    const current = await screen.findByRole('button', { name: 'Testklasse' });
    expect(current).toHaveAttribute('aria-current', 'true');
    await waitFor(() => expect(current).toHaveFocus());

    fireEvent.keyDown(current, { key: 'ArrowDown' });
    expect(
      screen.getByRole('button', {
        name: /Klasse bearbeiten Testklasse|Edit class Testklasse/i,
      }),
    ).toHaveFocus();
  });

  it('closes on Escape with the focus back on the button', async () => {
    render(<HeaderClassMenu />);
    const trigger = getButton(/Klasse wechseln|Switch class/i);
    openMenu();
    const current = await screen.findByRole('button', { name: 'Testklasse' });
    await waitFor(() => expect(current).toHaveFocus());

    fireEvent.keyDown(current, { key: 'Escape' });

    expect(
      screen.queryByRole('dialog', { name: /Klasse wechseln|Switch class/i }),
    ).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
