// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
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
  classroomScene: { tables: [], features: [] },
  currentSeating: [] as SeatingArrangement,
  rooms: [] as RoomRecord[],
  activeRoomId: null as string | null,
  handleSaveSeatingPlan: vi.fn((..._args: unknown[]) => true),
  handleHistoryLoad: vi.fn(),
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
    seatingMode: 'table',
    rooms: mocks.rooms,
    activeRoomId: mocks.activeRoomId,
  }),
  useSeatingPlanActions: () => ({
    handleSaveSeatingPlan: mocks.handleSaveSeatingPlan,
    handleHistoryLoad: mocks.handleHistoryLoad,
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
  it('shows the plan’s name without taking the focus', () => {
    render(<PlanSection />);

    expect(field()).toHaveValue('Deutsch');
    expect(field()).not.toHaveFocus();
  });

  it('saves the open plan under its name', async () => {
    const user = userEvent.setup();
    render(<PlanSection />);

    await user.click(getButton(/^(Speichern|Save)$/));

    expect(mocks.handleSaveSeatingPlan).toHaveBeenCalledWith(
      'Deutsch',
      mocks.classroomScene,
      { rename: true },
    );
    // Without a new name there is nothing a new plan could be called.
    expect(saveAsNewButton()).not.toBeInTheDocument();
  });

  it('renames the open plan on Enter once the name is new', async () => {
    const user = userEvent.setup();
    render(<PlanSection />);

    await user.clear(field());
    await user.type(field(), 'Deutsch ab Oktober');

    expect(
      getButton(/Umbenennen und speichern|Rename and save/i),
    ).toBeInTheDocument();

    await user.keyboard('{Enter}');

    expect(mocks.handleSaveSeatingPlan).toHaveBeenCalledWith(
      'Deutsch ab Oktober',
      mocks.classroomScene,
      { rename: true },
    );
  });

  it('keeps the open plan when the new name starts another', async () => {
    const user = userEvent.setup();
    render(<PlanSection />);

    await user.clear(field());
    await user.type(field(), 'Deutsch II');
    await user.click(saveAsNewButton() as HTMLElement);

    expect(mocks.handleSaveSeatingPlan).toHaveBeenCalledWith(
      'Deutsch II',
      mocks.classroomScene,
    );
  });

  it('takes a typed name back on Escape', async () => {
    const user = userEvent.setup();
    render(<PlanSection />);

    await user.clear(field());
    await user.type(field(), 'Entwurf{Escape}');

    expect(field()).toHaveValue('Deutsch');
    expect(mocks.handleSaveSeatingPlan).not.toHaveBeenCalled();
  });

  it('refuses a name another plan carries', async () => {
    const user = userEvent.setup();
    render(<PlanSection />);

    await user.clear(field());
    await user.type(field(), 'Mathe{Enter}');

    expect(field()).toHaveAttribute('aria-invalid', 'true');
    expect(field()).toHaveAccessibleDescription(/anderer Plan|Another plan/i);
    expect(
      getButton(/Umbenennen und speichern|Rename and save/i),
    ).toBeDisabled();
    expect(saveAsNewButton()).not.toBeInTheDocument();
    expect(mocks.handleSaveSeatingPlan).not.toHaveBeenCalled();
  });

  it('keeps the open plan’s name when the field is emptied', async () => {
    const user = userEvent.setup();
    render(<PlanSection />);

    await user.clear(field());
    expect(field()).toHaveAttribute('placeholder', 'Deutsch');

    await user.keyboard('{Control>}s{/Control}');

    expect(mocks.handleSaveSeatingPlan).toHaveBeenCalledWith(
      'Deutsch',
      mocks.classroomScene,
      { rename: true },
    );
  });

  it('saves a plan never saved as a new one', async () => {
    mocks.planName = '';
    mocks.activePlanId = null;
    const user = userEvent.setup();
    render(<PlanSection />);

    expect(field()).toHaveValue('');
    await user.type(field(), 'Englisch{Enter}');

    expect(mocks.handleSaveSeatingPlan).toHaveBeenCalledWith(
      'Englisch',
      mocks.classroomScene,
      { rename: false },
    );
    expect(saveAsNewButton()).not.toBeInTheDocument();
  });

  it('goes by the id a save writes to, not by the name', async () => {
    // A name that matches a saved plan the persistence does not consider
    // open: offering a rename here would end in a refused save.
    mocks.activePlanId = null;
    const user = userEvent.setup();
    render(<PlanSection />);

    await user.click(field());
    await user.keyboard('{Enter}');

    expect(mocks.handleSaveSeatingPlan).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        /trägt schon ein anderer Plan|Another plan already has/i,
      ),
    ).toBeInTheDocument();
  });

  it('offers nothing to save while nobody is seated', () => {
    mocks.currentSeating = [];
    render(<PlanSection />);

    expect(field()).toBeDisabled();
    expect(getButton(/^(Speichern|Save)$/)).toBeDisabled();
  });

  // The backup import holds a plan's name to 120 characters; a longer one
  // made the whole backup unreadable.
  it('takes no longer a name than a backup can read back', () => {
    render(<PlanSection />);

    expect(field()).toHaveAttribute('maxlength', '120');
  });

  it('opens another plan of this room from its menu', async () => {
    mocks.seatingHistory = [
      savedPlan('Deutsch'),
      savedPlan('Mathe'),
      savedPlan('Chemie', { roomId: 'lab' }),
    ];
    const user = userEvent.setup();
    render(<PlanSection />);

    await user.click(openMenuButton() as HTMLElement);
    const menu = screen.getByRole('dialog', {
      name: /Pläne dieses Raums|Plans of this room/i,
    });
    // The open plan is checked; a plan of another room is not offered.
    expect(
      within(menu).getByRole('button', { name: /Deutsch/ }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(within(menu).queryByRole('button', { name: /Chemie/ })).toBeNull();

    await user.click(within(menu).getByRole('button', { name: /Mathe/ }));

    expect(mocks.handleHistoryLoad).toHaveBeenCalledWith(
      mocks.seatingHistory[1],
    );
    expect(mocks.showToast).toHaveBeenCalledWith(
      'success',
      expect.stringMatching(/Mathe/),
    );
  });

  it('leaves the menu out while the open plan is the room’s only one', () => {
    mocks.seatingHistory = [savedPlan('Deutsch')];
    render(<PlanSection />);

    expect(openMenuButton()).toBeNull();
  });
});

describe('PlanInspectorHeader', () => {
  const subtitle = () => screen.getByRole('heading', { level: 2 }).nextSibling;

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
