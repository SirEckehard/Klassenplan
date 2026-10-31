// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * "Bibliothek" (decision 0024): the open plan stands in its room in its
 * class from the first moment, what is selected is read in the inspector, and
 * the status bar opens it in the workspace or says why it cannot.
 */
import '@testing-library/jest-dom/vitest';
import type React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import type { LibraryClass } from '@/hooks/library/useClassLibrary';
import type { ClassSummary, ClassroomTemplate } from '@/types';
import { subscribeToToasts, type ToastInstance } from '@/utils/ui/toast';
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
  create: vi.fn(),
  updateClassMetadata: vi.fn(),
  requestDelete: vi.fn(),
  confirmDialog: vi.fn(),
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanState: () => mocks.state,
  useSeatingPlanActions: () => mocks.actions,
}));
vi.mock('@/contexts/seatingPlan/ClassManagementContext', () => ({
  useClassManagementContext: () => ({
    selectClass: mocks.selectClass,
    updateClassMetadata: mocks.updateClassMetadata,
  }),
}));
vi.mock('@/contexts/ClassDialogsContext', () => ({
  ClassDialogsProvider: ({ children }: { children: React.ReactNode }) =>
    children,
  useClassDialogs: () => ({
    create: mocks.create,
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
    <MemoryRouter
      initialEntries={['/generator', '/bibliothek']}
      initialIndex={1}
    >
      <Routes>
        <Route path="/bibliothek" element={<PlanLibrary />} />
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
      screen.getByRole('button', { name: /^(Raum|Room): Klassenraum$/ }),
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

  it('deletes and duplicates a plan from its menu, chosen by the right-click', async () => {
    const user = userEvent.setup();
    renderPage();

    fireEvent.contextMenu(
      await screen.findByRole('option', { name: /^September/ }),
    );
    expect(screen.getByRole('option', { name: /^September/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await user.click(
      screen.getByRole('menuitem', { name: /^(Duplizieren|Duplicate)$/ }),
    );
    expect(mocks.edit).toHaveBeenCalledWith('7b', {
      kind: 'duplicatePlan',
      planId: 'sept',
    });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    fireEvent.contextMenu(screen.getByRole('option', { name: /^September/ }));
    await user.click(
      screen.getByRole('menuitem', { name: /^(Löschen|Delete)$/ }),
    );
    await waitFor(() =>
      expect(mocks.edit).toHaveBeenCalledWith('7b', {
        kind: 'deletePlan',
        planId: 'sept',
      }),
    );
  });

  it('greys out removing the open room in its menu and says why', async () => {
    renderPage();

    fireEvent.contextMenu(
      await screen.findByRole('option', { name: /^Klassenraum/ }),
    );
    const remove = screen.getByRole('menuitem', { name: /^(Löschen|Delete)$/ });
    expect(remove).toHaveAttribute('aria-disabled', 'true');
    expect(remove).toHaveAccessibleDescription(/offenen Raum|open room/);
  });

  it('opens no menu on a folder that has nothing to act on', async () => {
    renderPage();

    fireEvent.contextMenu(
      await screen.findByRole('option', { name: /^Letzte Mischungen/ }),
    );
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
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

  // As a room is added: under a free name, without opening it.
  it('adds a class from the toolbar without opening it', async () => {
    const user = userEvent.setup();
    mocks.create.mockResolvedValue(null);
    renderPage();

    await screen.findByRole('option', { name: /^Oktober/ });
    await user.click(
      screen.getByRole('button', { name: /^(Neue Klasse|New class)$/ }),
    );

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.stringMatching(/Neue Klasse|New class/),
        { activate: false },
      ),
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

  // Before rooms existed every plan went into one room; a lab plan stands
  // out by its tables, and the inspector says so.
  it('suggests a room of its own for a plan with other tables', async () => {
    const lab = createMockSavedPlan({
      id: 'chem',
      name: 'Chemie',
      roomId: 'classroom',
      date: '2026-10-01',
      seating: [[ada], [ben], [null]],
      scene: createMockClassroomScene(3),
    });
    mocks.library['7b'] = { ...sevenB(), plans: [september, october, lab] };
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('option', { name: /^Chemie/ }));

    expect(
      screen.getByText(
        /andere Tische als „Klassenraum“|other tables than “Klassenraum”/,
      ),
    ).toBeInTheDocument();
  });
});

describe('PlanLibrary when a change is not made', () => {
  let toasts: ToastInstance[] = [];
  let stopListening = () => {};

  beforeEach(() => {
    toasts = [];
    stopListening = subscribeToToasts((event) => {
      if (event.action === 'add') toasts.push(event.toast);
    });
  });

  afterEach(() => {
    stopListening();
  });

  it('says that storage refused to delete a plan', async () => {
    const user = userEvent.setup();
    mocks.edit.mockResolvedValue({ ok: false, reason: 'storage' });
    renderPage();

    await user.click(await screen.findByRole('option', { name: /^September/ }));
    await user.click(
      screen.getByRole('button', { name: /Plan löschen|Delete plan/ }),
    );

    await waitFor(() =>
      expect(toasts.map((toast) => toast.type)).toEqual(['error']),
    );
  });

  it('says a template is deleted only when it was', async () => {
    const user = userEvent.setup();
    const template: ClassroomTemplate = {
      id: 4,
      name: 'Hufeisen',
      scene: createMockClassroomScene(4),
    };
    mocks.actions.loadTemplate = vi.fn(async () => [template]);
    mocks.actions.deleteTemplate = vi.fn(async () => false);
    renderPage();

    await user.click(
      await screen.findByRole('option', {
        name: /^(Raumvorlagen|Room templates)/,
      }),
    );
    await user.click(await screen.findByRole('option', { name: /^Hufeisen/ }));
    await user.click(
      screen.getByRole('button', { name: /Vorlage löschen|Delete template/ }),
    );

    await waitFor(() =>
      expect(mocks.actions.deleteTemplate).toHaveBeenCalledWith(4),
    );
    await waitFor(() =>
      expect(toasts.map((toast) => toast.type)).toEqual(['error']),
    );
  });
});
