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
  act,
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
import {
  fullRecipeWeights,
  MAX_MIX_PRESETS,
  MIX_RECIPES,
  neutralSettings,
  normalizeMixSettings,
} from '@/utils';
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
  setMixPresetOverride: vi.fn(async () => true),
  addMixPreset: vi.fn(),
  ownPresets: [] as { id: string; name: string; weights: object }[],
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
vi.mock('@/repositories/mixPresetStore', () => ({
  loadMixPresets: async () => ({
    version: 1,
    overrides: {},
    presets: mocks.ownPresets,
  }),
  subscribeToMixPresets: () => () => undefined,
  addMixPreset: mocks.addMixPreset,
  setMixPresetOverride: mocks.setMixPresetOverride,
  updateMixPreset: vi.fn(async () => true),
  deleteMixPreset: vi.fn(async () => true),
  restoreOwnMixPreset: vi.fn(async () => true),
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

const STAND = {
  seatingHistory: [september, october],
  mixHistory: [],
  rooms: [],
  activeRoomId: 'classroom',
  activePlanId: 'oct',
};

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
    restoreTemplate: vi.fn(async () => true),
  };
  mocks.library = { '7b': sevenB(), '8c': null };
  mocks.edit.mockResolvedValue({ ok: true, before: STAND });
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

  it('deletes a plan at once and offers it back, which goes up to its room', async () => {
    const user = userEvent.setup();
    const toasts: ToastInstance[] = [];
    const stop = subscribeToToasts((event) => {
      if (event.action === 'add') toasts.push(event.toast);
    });
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
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mocks.confirmDialog).not.toHaveBeenCalled();
    await waitFor(() => expect(toasts).toHaveLength(1));
    expect(toasts[0]?.message).toMatch(/September/);

    // Its card takes it back, and what was chosen is chosen again.
    mocks.edit.mockClear();
    await act(async () => toasts[0]?.action?.onClick());
    await waitFor(() =>
      expect(mocks.edit).toHaveBeenCalledWith('7b', {
        kind: 'restoreParts',
        parts: STAND,
        expected: undefined,
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('option', { name: /^September/ }),
      ).toHaveAttribute('aria-selected', 'true'),
    );
    stop();
  });

  it('removes on Entf at once, and the focus keeps a row to step from', async () => {
    const user = userEvent.setup();
    renderPage();

    const row = await screen.findByRole('option', { name: /^September/ });
    await user.click(row);
    row.focus();
    await user.keyboard('{Delete}');

    await waitFor(() =>
      expect(mocks.edit).toHaveBeenCalledWith('7b', {
        kind: 'deletePlan',
        planId: 'sept',
      }),
    );
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('takes a change back from the status bar and with the keys', async () => {
    const user = userEvent.setup();
    renderPage();
    const undo = within(statusBar()).getByRole('button', {
      name: /Letzte Aktion rückgängig|Undo last action/,
    });
    const redo = within(statusBar()).getByRole('button', {
      name: /Letzte Aktion wiederherstellen|Redo last action/,
    });
    expect(undo).toBeDisabled();
    expect(redo).toBeDisabled();

    fireEvent.contextMenu(
      await screen.findByRole('option', { name: /^September/ }),
    );
    await user.click(
      screen.getByRole('menuitem', { name: /^(Duplizieren|Duplicate)$/ }),
    );
    await waitFor(() => expect(undo).toBeEnabled());

    await user.click(undo);
    await waitFor(() => expect(redo).toBeEnabled());
    expect(undo).toBeDisabled();
    expect(mocks.edit).toHaveBeenLastCalledWith('7b', {
      kind: 'restoreParts',
      parts: STAND,
      expected: undefined,
    });

    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    await waitFor(() => expect(undo).toBeEnabled());
    await user.keyboard('{Control>}z{/Control}');
    await waitFor(() => expect(redo).toBeEnabled());
  });

  it('counts what a room takes along, and no longer calls it final', async () => {
    const user = userEvent.setup();
    const library = sevenB();
    library.plans = [{ ...september, roomId: 'lab' }, october];
    mocks.library = { '7b': library, '8c': null };
    renderPage();

    await user.click(await screen.findByRole('option', { name: /^Labor/ }));
    await user.click(
      screen.getByRole('button', { name: /Raum löschen|Delete room/ }),
    );

    await waitFor(() => expect(mocks.confirmDialog).toHaveBeenCalledTimes(1));
    expect(mocks.confirmDialog.mock.calls[0]?.[0]).not.toHaveProperty(
      'message',
    );
    await waitFor(() =>
      expect(mocks.edit).toHaveBeenCalledWith('7b', {
        kind: 'deleteRoom',
        roomId: 'lab',
      }),
    );
  });

  describe('with the inspector folded away', () => {
    const FOLDED_KEY = 'spg.inspectorFolded';
    const inspectorSwitch = () =>
      within(statusBar()).getByRole('button', {
        name: /einblenden|ausblenden|Show|Hide/i,
      });
    const expectColumnShown = (shown: boolean) =>
      expect(inspectorSwitch()).toHaveAttribute('aria-expanded', String(shown));

    beforeEach(() => {
      localStorage.setItem(FOLDED_KEY, 'true');
    });
    afterEach(() => {
      localStorage.removeItem(FOLDED_KEY);
    });

    it('shows it for a clicked plan and folds it back on a second click', async () => {
      renderPage();
      const plan = await screen.findByRole('option', { name: /^September/ });
      expectColumnShown(false);

      fireEvent.click(plan);
      expectColumnShown(true);

      fireEvent.click(plan);
      expectColumnShown(false);

      // The teacher's choice is what is remembered, whatever was opened.
      fireEvent.click(plan);
      expectColumnShown(true);
      expect(localStorage.getItem(FOLDED_KEY)).toBe('true');
    });

    it('leaves it folded for a folder, whose contents are the next column', async () => {
      renderPage();

      fireEvent.click(
        await screen.findByRole('option', { name: /^Klassenraum/ }),
      );

      expectColumnShown(false);
    });

    it('keeps it open for a folder chosen after a plan', async () => {
      renderPage();
      fireEvent.click(
        await screen.findByRole('option', { name: /^September/ }),
      );

      const folder = screen.getByRole('option', { name: /^Klassenraum/ });
      fireEvent.click(folder);
      fireEvent.click(folder);

      expectColumnShown(true);
    });

    it('does not fold it back on the second click of a double click', async () => {
      renderPage();
      const plan = await screen.findByRole('option', { name: /^September/ });

      fireEvent.click(plan, { detail: 1 });
      fireEvent.click(plan, { detail: 2 });

      expectColumnShown(true);
    });

    it('shows it while stepping through the plans with the keyboard', async () => {
      renderPage();

      fireEvent.keyDown(
        await screen.findByRole('option', { name: /^Oktober/ }),
        {
          key: 'ArrowDown',
        },
      );

      expectColumnShown(true);
      expect(
        screen.getByRole('option', { name: /^September/ }),
      ).toHaveAttribute('aria-selected', 'true');
    });

    it('shows it for a command of the menu, and a second click folds it back', async () => {
      const user = userEvent.setup();
      renderPage();

      fireEvent.contextMenu(
        await screen.findByRole('option', { name: /^September/ }),
      );
      expectColumnShown(false);
      await user.click(
        screen.getByRole('menuitem', { name: /^(Umbenennen|Rename)$/ }),
      );
      expectColumnShown(true);

      fireEvent.click(screen.getByRole('option', { name: /^September/ }));
      expectColumnShown(false);
      expect(localStorage.getItem(FOLDED_KEY)).toBe('true');
    });

    it('keeps it open on a second click once the teacher unfolded it', async () => {
      renderPage();
      const plan = await screen.findByRole('option', { name: /^September/ });

      fireEvent.click(inspectorSwitch());
      fireEvent.click(plan);
      fireEvent.click(plan);

      expectColumnShown(true);
      expect(localStorage.getItem(FOLDED_KEY)).toBe('false');
    });
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

  it('adds an empty room template, chosen with its name open', async () => {
    const user = userEvent.setup();
    let stored: ClassroomTemplate[] = [];
    mocks.actions.loadTemplate = vi.fn(async () => stored);
    mocks.actions.saveTemplate = vi.fn(async (name, scene) => {
      stored = [{ id: 9, name, scene }];
      return { success: true };
    });
    renderPage();

    await screen.findByRole('option', { name: /^Oktober/ });
    await user.click(
      screen.getByRole('button', {
        name: /^(Neue Raumvorlage|New room template)$/,
      }),
    );

    expect(
      await screen.findByRole('textbox', {
        name: /Name der Vorlage|Template name/,
      }),
    ).toHaveValue(stored[0]?.name);
    expect(stored[0]?.scene.tables).toEqual([]);
    expect(
      screen.getByRole('option', { name: /^(Neue Raumvorlage|New room)/ }),
    ).toHaveAttribute('aria-selected', 'true');
  });

  it('adds a preset from the weights of "Standard"', async () => {
    const user = userEvent.setup();
    mocks.addMixPreset.mockResolvedValue({ id: 'own' });
    renderPage();

    await screen.findByRole('option', { name: /^Oktober/ });
    await user.click(
      screen.getByRole('button', {
        name: /^(Neue Voreinstellung|New preset)$/,
      }),
    );

    await waitFor(() =>
      expect(mocks.addMixPreset).toHaveBeenCalledWith(
        expect.stringMatching(/Neue Voreinstellung|New preset/),
        fullRecipeWeights(MIX_RECIPES[0]?.weights ?? {}),
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

  it('adds no preset beyond the limit and says so', async () => {
    const user = userEvent.setup();
    mocks.ownPresets = Array.from({ length: MAX_MIX_PRESETS }, (_, index) => ({
      id: `own-${index}`,
      name: `Eigene ${index}`,
      weights: {},
    }));
    renderPage();

    await user.click(
      await screen.findByRole('option', {
        name: /^(Voreinstellungen|Presets)/,
      }),
    );
    await screen.findByRole('option', { name: /^Eigene 0/ });
    await user.click(
      screen.getByRole('button', {
        name: /^(Neue Voreinstellung|New preset)$/,
      }),
    );
    mocks.ownPresets = [];

    await waitFor(() =>
      expect(toasts.map((toast) => toast.type)).toEqual(['warning']),
    );
    expect(mocks.addMixPreset).not.toHaveBeenCalled();
  });

  it('says when a new template could not be kept', async () => {
    const user = userEvent.setup();
    mocks.actions.saveTemplate = vi.fn(async () => ({
      success: false,
      error: 'storage',
    }));
    renderPage();

    await screen.findByRole('option', { name: /^Oktober/ });
    await user.click(
      screen.getByRole('button', {
        name: /^(Neue Raumvorlage|New room template)$/,
      }),
    );

    await waitFor(() =>
      expect(toasts.map((toast) => toast.type)).toEqual(['error']),
    );
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

  // Decision 0038: a preset sets the open class's criteria; mixing is left
  // to the teacher.
  it('applies a preset to the open class and goes to the plan', async () => {
    const user = userEvent.setup();
    let settings = normalizeMixSettings({}, neutralSettings);
    mocks.state.students = [ada, ben];
    mocks.actions.setMixSettings = vi.fn((update) => {
      settings = typeof update === 'function' ? update(settings) : update;
    });
    renderPage();

    await user.click(
      await screen.findByRole('option', {
        name: /^(Voreinstellungen|Presets)/,
      }),
    );
    await user.click(
      await screen.findByRole('option', {
        name: /^(Klassenarbeit|Written test)/,
      }),
    );
    // A shipped preset keeps its name and cannot be deleted.
    expect(
      screen.queryByRole('button', {
        name: /Voreinstellung löschen|Delete preset/,
      }),
    ).not.toBeInTheDocument();
    await user.click(
      within(statusBar()).getByRole('button', { name: /^(Übernehmen|Apply)$/ }),
    );

    expect(settings.avoidPreviousPairs).toBe(8);
    expect(settings.considerWishPartners).toBe(0);
    expect(await screen.findByText('Arbeitsfläche')).toBeInTheDocument();
  });

  it('changes a shipped preset in its criteria, never "Standard"', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('option', {
        name: /^(Voreinstellungen|Presets)/,
      }),
    );
    await user.click(
      await screen.findByRole('option', { name: /^(Standard|Default)/ }),
    );
    // Every criterion is listed, whatever data the open class has.
    expect(
      screen.getByRole('button', {
        name: /^(Sprachförderung|Language support): (Wichtig|Important)$/,
      }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole('option', { name: /^(Klassenarbeit|Written test)/ }),
    );
    await user.click(
      screen.getByRole('button', {
        name: /^(Wiederholung|Repetition): (Wichtig|Important)$/,
      }),
    );

    expect(mocks.setMixPresetOverride).toHaveBeenCalledWith(
      'exam',
      expect.objectContaining({ avoidPreviousPairs: 5 }),
    );
  });
});
