// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import '@/i18n';
import HeaderPlanName from '@/components/shell/HeaderPlanName';
import type { SavedPlan } from '@/types';

const mocks = vi.hoisted(() => ({
  planName: '',
  seatingHistory: [] as SavedPlan[],
  classroomScene: { tables: [], features: [] },
  inputRef: { current: null as HTMLInputElement | null },
  handleSaveSeatingPlan: vi.fn(),
  setPlanNameError: vi.fn(),
  rerender: null as null | (() => void),
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanState: () => ({
    planName: mocks.planName,
    planNameError: false,
    planNameInputRef: mocks.inputRef,
    seatingHistory: mocks.seatingHistory,
    classroomScene: mocks.classroomScene,
  }),
  useSeatingPlanActions: () => ({
    // The name is state the field writes back to, as in the real context.
    setPlanName: (next: string) => {
      mocks.planName = next;
      mocks.rerender?.();
    },
    setPlanNameError: mocks.setPlanNameError,
    handleSaveSeatingPlan: mocks.handleSaveSeatingPlan,
  }),
}));

function Harness() {
  const [, rerender] = React.useReducer((count: number) => count + 1, 0);
  React.useEffect(() => {
    mocks.rerender = rerender;
  }, [rerender]);
  return <HeaderPlanName />;
}

const savedPlan = (name: string) => ({ id: name, name }) as SavedPlan;

const field = () =>
  screen.getByRole('textbox', {
    name: /Namen für diesen Sitzplan|name for this seating plan/i,
  });
const saveButton = () =>
  screen.queryByRole('button', {
    name: /Unter diesem Namen speichern|Save under this name/i,
  });

beforeEach(() => {
  mocks.planName = 'Deutsch ab Oktober';
  mocks.seatingHistory = [savedPlan('Deutsch ab Oktober')];
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('HeaderPlanName', () => {
  it('rests as a name with a pencil, not with a save button', () => {
    render(<Harness />);

    expect(field()).toHaveValue('Deutsch ab Oktober');
    expect(saveButton()).not.toBeInTheDocument();
  });

  it('offers saving while the name is edited and saves on Enter', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(field());
    expect(saveButton()).toBeInTheDocument();

    await user.clear(field());
    await user.type(field(), 'Mathe{Enter}');

    expect(mocks.handleSaveSeatingPlan).toHaveBeenCalledWith(
      'Mathe',
      mocks.classroomScene,
    );
    expect(field()).not.toHaveFocus();
  });

  it('saves from its button without losing what was typed', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(field());
    await user.type(field(), ' II');
    await user.click(saveButton() as HTMLElement);

    expect(mocks.handleSaveSeatingPlan).toHaveBeenCalledWith(
      'Deutsch ab Oktober II',
      mocks.classroomScene,
    );
  });

  it('takes an edit back on Escape', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(field());
    await user.type(field(), ' Entwurf');
    await user.keyboard('{Escape}');

    expect(field()).toHaveValue('Deutsch ab Oktober');
    expect(field()).not.toHaveFocus();
    expect(mocks.handleSaveSeatingPlan).not.toHaveBeenCalled();
  });

  it('keeps the save button up for a name no saved plan carries', () => {
    mocks.seatingHistory = [];
    render(<Harness />);

    expect(saveButton()).toBeInTheDocument();
  });
});
