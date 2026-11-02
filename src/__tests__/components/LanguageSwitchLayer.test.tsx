// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LanguageSelector from '@/components/LanguageSelector';
import {
  useSeatingWizard,
  type WizardConfig,
} from '@/hooks/wizard/useSeatingWizard';
import i18n from '@/i18n';
import { resetAlgorithmStore } from '@/stores/algorithmStore';
import { neutralSettings, normalizeMixSettings } from '@/utils';
import {
  createMockClassroomScene,
  createMockStudent,
} from '@/__tests__/utils/testHelpers';

const students = [createMockStudent({ id: '1', name: 'Alice' })];

const config: WizardConfig = {
  students,
  currentSeating: [[students[0] ?? null]],
  planName: '',
  hasUnsavedSeatingChanges: false,
  classroomScene: createMockClassroomScene(1),
  classroomEdited: false,
  mixSettings: normalizeMixSettings(neutralSettings),
  saveSeatingPlan: vi.fn(() => true),
  circleLayout: null,
  setPlanName: vi.fn(),
  setMixSettings: vi.fn(),
  generateSeatingPlan: vi.fn(),
  setClassroomEdited: vi.fn(),
  markClassroomSynced: vi.fn(),
  syncSeatingSnapshot: vi.fn(),
};

/** The workspace's hook, the router's real history and the language switch. */
const Workspace = () => {
  const wizard = useSeatingWizard(config);
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <>
      <output data-testid="step">{wizard.step}</output>
      <output data-testid="address">{location.pathname}</output>
      <output data-testid="state">{JSON.stringify(location.state)}</output>
      <button
        type="button"
        onClick={() => navigate('/generator', { state: { step: 3 } })}
      >
        from library
      </button>
      <button
        type="button"
        onClick={() =>
          navigate('/present', {
            state: { mode: 'circle', fromWorkspace: true },
          })
        }
      >
        to projection
      </button>
      <button type="button" onClick={() => wizard.setStep(1)}>
        to class
      </button>
      <LanguageSelector />
    </>
  );
};

// Waits for the language itself: its bundle loads first, and a switch still on
// its way would turn the next test's language under it.
const switchLanguage = async () => {
  fireEvent.click(screen.getByRole('button', { name: /English|Englisch/i }));
  await waitFor(() => expect(i18n.language).toBe('en'));
};

beforeEach(() => {
  resetAlgorithmStore();
});

afterEach(async () => {
  await act(async () => {
    await i18n.changeLanguage('de');
  });
});

describe('switching the language in the workspace', () => {
  // The entry still carried the layer "Bibliothek" asked for, and a new entry
  // with it asked again: the teacher on the class layer landed on the plan.
  it('stays on the layer the teacher went to since', async () => {
    render(
      <MemoryRouter initialEntries={['/generator']}>
        <Workspace />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'from library' }));
    expect(screen.getByTestId('step')).toHaveTextContent('3');
    fireEvent.click(screen.getByRole('button', { name: 'to class' }));
    expect(screen.getByTestId('step')).toHaveTextContent('1');

    await switchLanguage();

    expect(screen.getByTestId('address')).toHaveTextContent('/en/generator');
    expect(screen.getByTestId('step')).toHaveTextContent('1');
  });

  // The projection reads its view from the router state after the remount.
  it('carries the rest of the router state over', async () => {
    render(
      <MemoryRouter initialEntries={['/generator']}>
        <Workspace />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'to projection' }));

    await switchLanguage();

    expect(screen.getByTestId('address')).toHaveTextContent('/en/present');
    expect(JSON.parse(screen.getByTestId('state').textContent ?? '')).toEqual({
      mode: 'circle',
      fromWorkspace: true,
    });
  });
});
