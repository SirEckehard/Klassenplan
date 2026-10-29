// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import {
  render,
  screen,
  cleanup,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import '@/i18n';
import {
  PlanInspectorHeader,
  PlanSection,
} from '@/components/SeatingPlanGenerator/views/PlanInspectorParts';
import { getButton } from '@/__tests__/utils';
import type { RoomRecord, SavedPlan, SeatingArrangement } from '@/types';

const SEATED = [[{ id: 'anna', name: 'Anna' }]] as SeatingArrangement;

const mocks = vi.hoisted(() => ({
  planName: '',
  activePlanId: null as string | null,
  seatingHistory: [] as SavedPlan[],
  // One seat, the shape of `SEATED`: a plan is a plan for these tables.
  classroomScene: { tables: [{ seatCount: 1 }], features: [] },
  currentSeating: [] as SeatingArrangement,
  rooms: [] as RoomRecord[],
  activeRoomId: null as string | null,
  handleSaveSeatingPlan: vi.fn((..._args: unknown[]) => true),
  handleHistoryLoad: vi.fn(),
  renameSeatingPlan: vi.fn((..._args: unknown[]) => true),
  setPlanName: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanState: () => ({
    planName: mocks.planName,
    activePlanId: mocks.activePlanId,
    seatingHistory: mocks.seatingHistory,
    classroomScene: mocks.classroomScene,
    currentSeating: mocks.currentSeating,
    circleLayout: null,
    lockedPositions: {},
    seatingMode: 'table',
    rooms: mocks.rooms,
    activeRoomId: mocks.activeRoomId,
  }),
  useSeatingPlanActions: () => ({
    handleSaveSeatingPlan: mocks.handleSaveSeatingPlan,
    handleHistoryLoad: mocks.handleHistoryLoad,
    renameSeatingPlan: mocks.renameSeatingPlan,
    setPlanName: mocks.setPlanName,
  }),
}));

vi.mock('@/utils/ui/toast', () => ({ showToast: mocks.showToast }));

/** A plan saved as the stage shows it, in the open room. */
const savedPlan = (name: string, extra: Partial<SavedPlan> = {}) =>
  ({
    id: `id-${name}`,
    name,
    date: '2026-10-12',
    roomId: 'classroom',
    seating: SEATED,
    scene: mocks.classroomScene,
    ...extra,
  }) as SavedPlan;

const field = () =>
  screen.getByRole('textbox', {
    name: /Name des Sitzplans|Seating plan name/i,
  });
/** The plan's name in the header, opened as a field. */
const openNameField = async (user: ReturnType<typeof userEvent.setup>) => {
  const heading = screen.getByRole('heading', { level: 2 });
  await user.click(within(heading).getByRole('button'));
  // The field takes the focus and selects its name a frame later.
  await waitFor(() => expect(field()).toHaveFocus());
  return field();
};
const saveAsNewButton = () =>
  screen.queryByRole('button', {
    name: /Als neuen Plan speichern|Save as new plan/i,
  });
const openMenuButton = () =>
  screen.queryByRole('button', { name: /Plan öffnen|Open a plan/i });

beforeEach(() => {
  mocks.planName = 'Deutsch';
  mocks.activePlanId = 'id-Deutsch';
  mocks.seatingHistory = [savedPlan('Deutsch'), savedPlan('Mathe')];
  mocks.currentSeating = SEATED;
  mocks.rooms = [{ id: 'classroom', name: 'Klassenraum', createdAt: '' }];
  mocks.activeRoomId = 'classroom';
  mocks.handleSaveSeatingPlan.mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PlanSection', () => {
  it('names the plan only in the header, not in a field of its own', () => {
    render(<PlanSection />);

    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('saves the open plan under its name', async () => {
    const user = userEvent.setup();
    render(<PlanSection />);

    await user.click(getButton(/^(Plan speichern|Save plan)$/));

    expect(mocks.handleSaveSeatingPlan).toHaveBeenCalledWith(
      'Deutsch',
      mocks.classroomScene,
      { rename: true },
    );
  });

  it('keeps a copy beside the open plan under a free name', async () => {
    const user = userEvent.setup();
    render(<PlanSection />);

    await user.click(saveAsNewButton() as HTMLElement);

    expect(mocks.handleSaveSeatingPlan).toHaveBeenCalledWith(
      'Deutsch (2)',
      mocks.classroomScene,
    );
  });

  it('saves a plan never saved as a new one, with nothing to copy', async () => {
    mocks.planName = 'Englisch';
    mocks.activePlanId = null;
    const user = userEvent.setup();
    render(<PlanSection />);

    expect(saveAsNewButton()).not.toBeInTheDocument();
    await user.click(getButton(/^(Plan speichern|Save plan)$/));

    expect(mocks.handleSaveSeatingPlan).toHaveBeenCalledWith(
      'Englisch',
      mocks.classroomScene,
      { rename: false },
    );
  });

  it('goes by the id a save writes to, not by the name', async () => {
    // A name that matches a saved plan the persistence does not consider
    // open: a save would be refused.
    mocks.activePlanId = null;
    render(<PlanSection />);

    expect(getButton(/^(Plan speichern|Save plan)$/)).toBeDisabled();
    expect(
      screen.getByText(
        /trägt schon ein anderer Plan|Another plan already has/i,
      ),
    ).toBeInTheDocument();
  });

  it('offers nothing to save while nobody is seated', () => {
    mocks.currentSeating = [];
    render(<PlanSection />);

    expect(getButton(/^(Plan speichern|Save plan)$/)).toBeDisabled();
  });

  it('opens a plan of the class from its menu, the open room’s first', async () => {
    mocks.seatingHistory = [
      savedPlan('Chemie', { roomId: 'lab' }),
      savedPlan('Deutsch'),
      savedPlan('Mathe'),
    ];
    mocks.rooms = [
      { id: 'classroom', name: 'Klassenraum', createdAt: '' },
      { id: 'lab', name: 'Labor', createdAt: '' },
    ];
    const user = userEvent.setup();
    render(<PlanSection />);

    await user.click(openMenuButton() as HTMLElement);
    const menu = screen.getByRole('dialog', {
      name: /Pläne dieser Klasse|Plans of this class/i,
    });
    const rows = within(menu).getAllByRole('button');
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^Deutsch.*Klassenraum/),
      expect.stringMatching(/^Mathe.*Klassenraum/),
      expect.stringMatching(/^Chemie.*Labor/),
    ]);
    expect(rows[0]).toHaveAttribute('aria-pressed', 'true');

    // A plan of another room is offered too; opening it opens its room.
    await user.click(within(menu).getByRole('button', { name: /Chemie/ }));

    expect(mocks.handleHistoryLoad).toHaveBeenCalledWith(
      mocks.seatingHistory[0],
    );
    expect(mocks.showToast).toHaveBeenCalledWith(
      'success',
      expect.stringMatching(/Chemie/),
    );
  });

  it('names no room while the class has one', async () => {
    const user = userEvent.setup();
    render(<PlanSection />);

    await user.click(openMenuButton() as HTMLElement);
    expect(
      within(screen.getByRole('dialog')).queryByText(/Klassenraum/),
    ).toBeNull();
  });

  it('offers the menu once a plan is saved, the open one alone included', () => {
    mocks.seatingHistory = [savedPlan('Deutsch')];
    const { unmount } = render(<PlanSection />);
    expect(openMenuButton()).not.toBeNull();
    unmount();

    mocks.seatingHistory = [];
    render(<PlanSection />);
    expect(openMenuButton()).toBeNull();
  });
});

describe('PlanInspectorHeader', () => {
  const subtitle = () => screen.getByRole('heading', { level: 2 }).nextSibling;

  it('shows the plan’s name without opening it as a field', () => {
    render(<PlanInspectorHeader />);

    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('renames the open plan at once, leaving what it holds', async () => {
    const user = userEvent.setup();
    render(<PlanInspectorHeader />);

    const input = await openNameField(user);
    expect(input).toHaveValue('Deutsch');
    await user.clear(input);
    await user.type(input, 'Deutsch ab Oktober{Enter}');

    expect(mocks.renameSeatingPlan).toHaveBeenCalledWith(
      'id-Deutsch',
      'Deutsch ab Oktober',
    );
    expect(mocks.handleSaveSeatingPlan).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('refuses a name another plan carries', async () => {
    const user = userEvent.setup();
    render(<PlanInspectorHeader />);

    const input = await openNameField(user);
    await user.clear(input);
    await user.type(input, 'Mathe{Enter}');

    expect(field()).toHaveAttribute('aria-invalid', 'true');
    expect(field()).toHaveAccessibleDescription(/anderer Plan|Another plan/i);
    expect(mocks.renameSeatingPlan).not.toHaveBeenCalled();
  });

  it('takes a typed name back on Escape', async () => {
    const user = userEvent.setup();
    render(<PlanInspectorHeader />);

    const input = await openNameField(user);
    await user.clear(input);
    await user.type(input, 'Entwurf{Escape}');

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Deutsch' }),
    ).toBeInTheDocument();
    expect(mocks.renameSeatingPlan).not.toHaveBeenCalled();
  });

  it('keeps the open plan’s name when the field is emptied', async () => {
    const user = userEvent.setup();
    render(<PlanInspectorHeader />);

    const input = await openNameField(user);
    await user.clear(input);
    await user.keyboard('{Enter}');

    expect(mocks.renameSeatingPlan).not.toHaveBeenCalled();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Deutsch' }),
    ).toBeInTheDocument();
  });

  it('names a plan never saved for its first save', async () => {
    mocks.planName = '';
    mocks.activePlanId = null;
    const user = userEvent.setup();
    render(<PlanInspectorHeader />);

    const input = await openNameField(user);
    expect(input).toHaveValue('');
    await user.type(input, 'Englisch{Enter}');

    expect(mocks.setPlanName).toHaveBeenCalledWith('Englisch');
    expect(mocks.handleSaveSeatingPlan).not.toHaveBeenCalled();
  });

  it('saves under the typed name on Ctrl/⌘+S', async () => {
    const user = userEvent.setup();
    render(<PlanInspectorHeader />);

    const input = await openNameField(user);
    await user.clear(input);
    await user.type(input, 'Deutsch II');
    await user.keyboard('{Control>}s{/Control}');

    expect(mocks.handleSaveSeatingPlan).toHaveBeenCalledWith(
      'Deutsch II',
      mocks.classroomScene,
      { rename: true },
    );
  });

  it('offers no field while nobody is seated', () => {
    mocks.currentSeating = [];
    render(<PlanInspectorHeader />);

    expect(
      within(screen.getByRole('heading', { level: 2 })).queryByRole('button'),
    ).toBeNull();
  });

  // The backup import holds a plan's name to 120 characters; a longer one
  // made the whole backup unreadable.
  it('takes no longer a name than a backup can read back', async () => {
    const user = userEvent.setup();
    render(<PlanInspectorHeader />);

    expect(await openNameField(user)).toHaveAttribute('maxlength', '120');
  });

  it('names the open plan and says it is saved', () => {
    render(<PlanInspectorHeader />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Deutsch' }),
    ).toBeInTheDocument();
    expect(subtitle()).toHaveTextContent(/Gespeichert am|Saved on/);
  });

  it('says when the stage differs from the saved plan', () => {
    mocks.currentSeating = [[{ id: 'ben', name: 'Ben' }]] as SeatingArrangement;
    render(<PlanInspectorHeader />);

    expect(subtitle()).toHaveTextContent(
      /Änderungen noch nicht gespeichert|Changes not saved yet/,
    );
  });

  it('calls a plan never saved new', () => {
    mocks.planName = '';
    mocks.activePlanId = null;
    render(<PlanInspectorHeader />);

    expect(
      screen.getByRole('heading', { level: 2, name: /Neuer Plan|New plan/ }),
    ).toBeInTheDocument();
    expect(subtitle()).toHaveTextContent(
      /Noch nicht gespeichert|Not saved yet/,
    );
  });

  it('says that nothing is mixed yet while nobody is seated', () => {
    mocks.currentSeating = [];
    render(<PlanInspectorHeader />);

    expect(subtitle()).toHaveTextContent(
      /Noch kein Sitzplan gemischt|No seating plan/,
    );
  });

  // With one room there is nothing to tell apart; with more the heading says
  // where the plan belongs (decision 0024).
  it('names the room once the class has more than one', () => {
    render(<PlanInspectorHeader />);
    expect(screen.queryByText(/Klassenraum/)).toBeNull();
    cleanup();

    mocks.rooms = [
      { id: 'classroom', name: 'Klassenraum', createdAt: '' },
      { id: 'lab', name: 'Chemie-Fachraum', createdAt: '' },
    ];
    mocks.activeRoomId = 'lab';
    render(<PlanInspectorHeader />);

    expect(subtitle()).toHaveTextContent(/Chemie-Fachraum/);
  });
});
