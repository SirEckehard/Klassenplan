// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * "Pläne & Verlauf" (decision 0024): the open plan stands in its room in its
 * class from the first moment, what is selected is read in the inspector, and
 * the status bar opens it in the workspace or says why it cannot.
 */
import '@testing-library/jest-dom/vitest';
import type React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import type { LibraryClass } from '@/hooks/library/useClassLibrary';
import type { ClassSummary } from '@/types';
import {
  createMockClassroomScene,
  createMockMixResult,
  createMockSavedPlan,
  createMockStudent,
} from '@/__tests__/utils';
import PlanLibrary from '../PlanLibrary';

const mocks = vi.hoisted(() => ({
  state: {} as Record<string, unknown>,
  actions: {} as Record<string, ReturnType<typeof vi.fn>>,
  library: {} as Record<string, LibraryClass | null>,
  edit: vi.fn(),
  selectClass: vi.fn(),
  openCreate: vi.fn(),
  openEdit: vi.fn(),
  requestDelete: vi.fn(),
  confirmDialog: vi.fn(),
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanState: () => mocks.state,
  useSeatingPlanActions: () => mocks.actions,
}));
vi.mock('@/contexts/seatingPlan/ClassManagementContext', () => ({
  useClassManagementContext: () => ({ selectClass: mocks.selectClass }),
}));
vi.mock('@/contexts/ClassDialogsContext', () => ({
  ClassDialogsProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  useClassDialogs: () => ({
    openCreate: mocks.openCreate,
    openEdit: mocks.openEdit,
    requestDelete: mocks.requestDelete,
    isBusy: false,
  }),
}));
// The header is the workspace's and has its own tests.
vi.mock('@/components/SeatingPlanGenerator/SeatingPlanHeader', () => ({
  default: () => null,
}));
vi.mock('@/hooks/library/useClassLibrary', () => ({
  useClassLibrary: (selectedClassId: string | null) => ({
    classes: summaries,
    openClassId: '7b',
    selected: selectedClassId ? (mocks.library[selectedClassId] ?? null) : null,
    loading: false,
    edit: mocks.edit,
  }),
}));
vi.mock('@/hooks/plan/usePlanUsageRecords', () => ({
  usePlanUsageRecords: () => ({
    planUsage: [],
    planUsageSince: null,
    setUsageConfirmed: vi.fn(),
    resetUsage: vi.fn(),
    undoReset: vi.fn(),
  }),
}));
vi.mock('@/services/ui/dialogs', () => ({
  confirmDialog: mocks.confirmDialog,
}));

const summaries: ClassSummary[] = [
  {
    id: '7b',
    name: '7b',
    createdAt: '2026-10-04',
    updatedAt: '2026-10-04',
    studentCount: 2,
  },
  {
    id: '8c',
    name: '8c',
    createdAt: '2026-10-04',
    updatedAt: '2026-10-04',
    studentCount: 0,
  },
];

const ada = createMockStudent({ id: 'ada', name: 'Ada' });
const ben = createMockStudent({ id: 'ben', name: 'Ben' });
const september = createMockSavedPlan({
  id: 'sept',
  name: 'September',
  roomId: 'classroom',
  date: '2026-09-02',
  seating: [[ada, ben]],
  scene: createMockClassroomScene(1),
});
const october = createMockSavedPlan({
  id: 'oct',
  name: 'Oktober',
  roomId: 'classroom',
  date: '2026-10-04',
  seating: [[ben, ada]],
  scene: createMockClassroomScene(1),
});

const sevenB = (): LibraryClass => ({
  id: '7b',
  name: '7b',
  isOpen: true,
  students: [ada, ben],
  rooms: [
    {
      id: 'classroom',
      name: 'Klassenraum',
      scene: createMockClassroomScene(1),
      isOpen: true,
    },
    {
      id: 'lab',
      name: 'Labor',
      scene: createMockClassroomScene(3),
      isOpen: false,
    },
  ],
  activeRoomId: 'classroom',
  activePlanId: 'oct',
  plans: [september, october],
  mixes: [
    createMockMixResult({
      id: 9,
      roomId: 'lab',
      seating: [[ada, ben]],
      timestamp: '2026-10-03T08:00:00.000Z',
    }),
  ],
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/generator', '/plaene']} initialIndex={1}>
      <Routes>
        <Route path="/plaene" element={<PlanLibrary />} />
        <Route path="/generator" element={<p>Arbeitsfläche</p>} />
      </Routes>
    </MemoryRouter>,
  );

const statusBar = () =>
  screen.getByRole('region', { name: /Statusleiste|Status bar/i });
const openButton = () =>
  within(statusBar()).getByRole('button', {
    name: /^(Öffnen|Open|Als Raum öffnen|Open as a room)$/,
  });

beforeEach(() => {
  mocks.state = {
    activeClass: { id: '7b', name: '7b' },
    activeRoomId: 'classroom',
    activePlanId: 'oct',
    seatingHistory: [september, october],
    mixHistory: [],
  };
  mocks.actions = {
    loadTemplate: vi.fn(async () => []),
    handleHistoryLoad: vi.fn(),
    handleMixLoad: vi.fn(() => true),
    openRoom: vi.fn(),
    createRoomFromTemplate: vi.fn(),
    saveTemplate: vi.fn(async () => ({ success: true })),
    deleteTemplate: vi.fn(),
    renameTemplate: vi.fn(),
  };
  mocks.library = { '7b': sevenB(), '8c': null };
  mocks.edit.mockResolvedValue({ ok: true });
  mocks.selectClass.mockResolvedValue(true);
  mocks.confirmDialog.mockResolvedValue(true);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('PlanLibrary', () => {
  it('opens on the open plan, in its room, in its class', async () => {
    renderPage();

    expect(
      await screen.findByRole('listbox', { name: /^(Klassen|Classes)$/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /^7b/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(
      screen.getByRole('option', { name: /^Klassenraum/ }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: /^Oktober/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    // The inspector names the plan and the room it belongs to.
    expect(
      screen.getByRole('heading', { level: 2, name: 'Oktober' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Klassenraum', pressed: true }),
    ).toBeInTheDocument();
    // The path says the same.
    expect(
      within(statusBar()).getByRole('button', { name: 'Oktober' }),
    ).toHaveAttribute('aria-current', 'location');
  });

  it('opens another plan of the class in the workspace', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('option', { name: /^September/ }));
    await user.click(openButton());

    expect(mocks.actions.handleHistoryLoad).toHaveBeenCalledWith(september);
    expect(await screen.findByText('Arbeitsfläche')).toBeInTheDocument();
  });

  it('takes the open plan to the workspace as it is', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('option', { name: /^Oktober/ });
    await user.click(openButton());

    expect(mocks.actions.handleHistoryLoad).not.toHaveBeenCalled();
    expect(await screen.findByText('Arbeitsfläche')).toBeInTheDocument();
  });

  it('opens another class before opening something of it', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('option', { name: /^8c/ }));
    await user.click(openButton());

    await waitFor(() => expect(mocks.selectClass).toHaveBeenCalledWith('8c'));
  });

  it('goes up the path from the status bar', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await within(statusBar()).findByRole('button', { name: '7b' }),
    );

    expect(
      screen.queryByRole('listbox', { name: 'Klassenraum' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: '7b' }),
    ).toBeInTheDocument();
  });

  it('says why the recent mixes, as a folder, open nothing', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('option', { name: /^Letzte Mischungen/ }),
    );

    expect(openButton()).toHaveAttribute('aria-disabled', 'true');
  });

  it('deletes a plan after asking, and goes up to its room', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('option', { name: /^September/ }));
    await user.click(
      screen.getByRole('button', { name: /Plan löschen|Delete plan/ }),
    );

    await waitFor(() =>
      expect(mocks.edit).toHaveBeenCalledWith('7b', {
        kind: 'deletePlan',
        planId: 'sept',
      }),
    );
    expect(mocks.confirmDialog).toHaveBeenCalled();
  });

  it('keeps the open room from being deleted and says why', async () => {
    renderPage();

    await screen.findByRole('option', { name: /^Oktober/ });
    await userEvent.click(screen.getByRole('option', { name: /^Klassenraum/ }));

    const remove = screen.getByRole('button', {
      name: /Raum löschen|Delete room/,
    });
    expect(remove).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(remove);
    expect(mocks.edit).not.toHaveBeenCalled();
  });

  it('adds a room to the chosen class from the toolbar', async () => {
    const user = userEvent.setup();
    mocks.edit.mockResolvedValue({ ok: true, roomId: 'new-room' });
    renderPage();

    await screen.findByRole('option', { name: /^Oktober/ });
    await user.click(
      screen.getByRole('button', { name: /^(Neuer Raum|New room)$/ }),
    );

    await waitFor(() =>
      expect(mocks.edit).toHaveBeenCalledWith('7b', {
        kind: 'createRoom',
        name: expect.stringMatching(/Neuer Raum|New room/),
      }),
    );
  });

  it('refuses to open a mix that no longer fits its room', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('option', { name: /^Letzte Mischungen/ }),
    );
    await user.click(screen.getAllByRole('option').at(-1)!);

    // Made for a table of two in the lab, whose three tables it no longer fits.
    expect(openButton()).toHaveAttribute('aria-disabled', 'true');
  });
});
