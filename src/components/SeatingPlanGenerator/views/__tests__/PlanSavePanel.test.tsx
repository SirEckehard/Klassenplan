// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import '@/i18n';
import PlanSavePanel from '@/components/SeatingPlanGenerator/views/PlanSavePanel';
import { getButton } from '@/__tests__/utils';
import type { RoomRecord, SavedPlan } from '@/types';

const mocks = vi.hoisted(() => ({
  planName: '',
  activePlanId: null as string | null,
  seatingHistory: [] as SavedPlan[],
  classroomScene: { tables: [], features: [] },
  rooms: [] as RoomRecord[],
  activeRoomId: null as string | null,
  handleSaveSeatingPlan: vi.fn((..._args: unknown[]) => true),
  isCoarsePointer: false,
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanState: () => ({
    planName: mocks.planName,
    activePlanId: mocks.activePlanId,
    seatingHistory: mocks.seatingHistory,
    classroomScene: mocks.classroomScene,
    rooms: mocks.rooms,
    activeRoomId: mocks.activeRoomId,
  }),
  useSeatingPlanActions: () => ({
    handleSaveSeatingPlan: mocks.handleSaveSeatingPlan,
  }),
}));

vi.mock('@/hooks/ui/useCoarsePointer', () => ({
  useIsCoarsePointer: () => mocks.isCoarsePointer,
}));

const savedPlan = (name: string) => ({ id: `id-${name}`, name }) as SavedPlan;

const field = () =>
  screen.getByRole('textbox', {
    name: /Name des Sitzplans|Seating plan name/i,
  });
const saveAsNewButton = () =>
  screen.queryByRole('button', {
    name: /Als neuen Plan speichern|Save as new plan/i,
  });

const renderPanel = () => {
  const onDone = vi.fn();
  render(<PlanSavePanel onDone={onDone} />);
  return onDone;
};

beforeEach(() => {
  mocks.planName = 'Deutsch';
  mocks.activePlanId = 'id-Deutsch';
  mocks.seatingHistory = [savedPlan('Deutsch'), savedPlan('Mathe')];
  mocks.isCoarsePointer = false;
  mocks.rooms = [{ id: 'classroom', name: 'Klassenraum', createdAt: '' }];
  mocks.activeRoomId = 'classroom';
  mocks.handleSaveSeatingPlan.mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PlanSavePanel', () => {
  it('opens on the plan’s name, ready to be typed over', () => {
    renderPanel();

    expect(field()).toHaveValue('Deutsch');
    expect(field()).toHaveFocus();
    expect(field()).toHaveProperty('selectionStart', 0);
    expect(field()).toHaveProperty('selectionEnd', 'Deutsch'.length);
  });

  it('leaves a finger without the keyboard until it asks for it', () => {
    mocks.isCoarsePointer = true;
    renderPanel();

    expect(field()).not.toHaveFocus();
  });

  it('saves the open plan under its name and closes', async () => {
    const user = userEvent.setup();
    const onDone = renderPanel();

    await user.click(getButton(/^(Speichern|Save)$/));

    expect(mocks.handleSaveSeatingPlan).toHaveBeenCalledWith(
      'Deutsch',
      mocks.classroomScene,
      { rename: true },
    );
    expect(onDone).toHaveBeenCalled();
    // Without a new name there is nothing a new plan could be called.
    expect(saveAsNewButton()).not.toBeInTheDocument();
  });

  it('renames the open plan on Enter once the name is new', async () => {
    const user = userEvent.setup();
    renderPanel();

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
    const onDone = renderPanel();

    await user.clear(field());
    await user.type(field(), 'Deutsch II');
    await user.click(saveAsNewButton() as HTMLElement);

    expect(mocks.handleSaveSeatingPlan).toHaveBeenCalledWith(
      'Deutsch II',
      mocks.classroomScene,
    );
    expect(onDone).toHaveBeenCalled();
  });

  it('refuses a name another plan carries', async () => {
    const user = userEvent.setup();
    const onDone = renderPanel();

    await user.clear(field());
    await user.type(field(), 'Mathe{Enter}');

    expect(field()).toHaveAttribute('aria-invalid', 'true');
    expect(field()).toHaveAccessibleDescription(/anderer Plan|Another plan/i);
    expect(
      getButton(/Umbenennen und speichern|Rename and save/i),
    ).toBeDisabled();
    expect(saveAsNewButton()).not.toBeInTheDocument();
    expect(mocks.handleSaveSeatingPlan).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it('keeps the open plan’s name when the field is emptied', async () => {
    const user = userEvent.setup();
    renderPanel();

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
    renderPanel();

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
    renderPanel();

    await user.keyboard('{Enter}');

    expect(mocks.handleSaveSeatingPlan).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        /trägt schon ein anderer Plan|Another plan already has/i,
      ),
    ).toBeInTheDocument();
  });

  it('stays open when the plan could not be saved', async () => {
    mocks.handleSaveSeatingPlan.mockReturnValue(false);
    const user = userEvent.setup();
    const onDone = renderPanel();

    await user.keyboard('{Enter}');

    expect(mocks.handleSaveSeatingPlan).toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  // With one room there is nothing to tell apart; with more the panel says
  // where the plan goes (decision 0024).
  it('names the room the plan goes into once the class has more than one', () => {
    renderPanel();
    expect(screen.queryByText(/Klassenraum/)).toBeNull();
    cleanup();

    mocks.rooms = [
      { id: 'classroom', name: 'Klassenraum', createdAt: '' },
      { id: 'lab', name: 'Chemie-Fachraum', createdAt: '' },
    ];
    mocks.activeRoomId = 'lab';
    renderPanel();

    expect(screen.getByText(/Chemie-Fachraum/)).toBeInTheDocument();
  });

  // The backup import holds a plan's name to 120 characters; a longer one
  // made the whole backup unreadable.
  it('takes no longer a name than a backup can read back', () => {
    renderPanel();

    expect(field()).toHaveAttribute('maxlength', '120');
  });
});
