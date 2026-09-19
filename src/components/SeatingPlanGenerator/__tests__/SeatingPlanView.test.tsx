// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@/i18n/i18n';
import SeatingPlanView, {
  type Props as SeatingPlanViewProps,
} from '../SeatingPlanView';
import { BOARD_WIDTH, CLASSROOM_HEIGHT } from '../../../utils/constants';
import { DEFAULT_MIX_WEIGHTS } from '@/utils';
import {
  renderWithProvidersAndRouter,
  createMockSeatingPlanViewProps,
  setupCleanStorage,
  neutralSettings,
} from '../../../__tests__/utils';

describe('SeatingPlanView board visibility', () => {
  beforeEach(() => {
    setupCleanStorage();
    ['useViewportSize', 'classroomWidth', 'classroomHeight'].forEach((key) => {
      localStorage.removeItem(key);
    });
  });

  it('keeps the board visible in auto mode', async () => {
    localStorage.setItem('useViewportSize', 'true');
    await act(async () => {
      renderWithProvidersAndRouter(
        <SeatingPlanView {...createMockSeatingPlanViewProps()} />,
      );
    });
    const canvas = screen.getByTestId('classroom-canvas');
    expect(parseInt(canvas.style.width, 10)).toBeGreaterThanOrEqual(
      BOARD_WIDTH,
    );
  });

  it('keeps the board visible in manual mode with small width', async () => {
    localStorage.setItem('useViewportSize', 'false');
    localStorage.setItem('classroomWidth', '20');
    localStorage.setItem('classroomHeight', `${CLASSROOM_HEIGHT}`);
    await act(async () => {
      renderWithProvidersAndRouter(
        <SeatingPlanView {...createMockSeatingPlanViewProps()} />,
      );
    });
    const canvas = screen.getByTestId('classroom-canvas');
    expect(parseInt(canvas.style.width, 10)).toBeGreaterThanOrEqual(
      BOARD_WIDTH,
    );
  });

  it('renders mix controls sidebar with neutral settings', async () => {
    await act(async () => {
      renderWithProvidersAndRouter(
        <SeatingPlanView
          {...createMockSeatingPlanViewProps({
            step: 3,
            settings: neutralSettings,
          })}
        />,
      );
    });
    // SmartMixControls is in a collapsed sidebar, so check for the sidebar presence
    const sidebar = screen.getByLabelText(/Optionen-Sidebar|Options Sidebar/i);
    expect(sidebar).toBeInTheDocument();
    expect(sidebar).toHaveAttribute('aria-expanded', 'false');
  });

  it('clears the weights of criteria without data while the sidebar is collapsed', async () => {
    const setMixSettings = vi.fn<SeatingPlanViewProps['setMixSettings']>();
    await act(async () => {
      renderWithProvidersAndRouter(
        <SeatingPlanView
          {...createMockSeatingPlanViewProps({
            step: 3,
            settings: DEFAULT_MIX_WEIGHTS,
            setMixSettings,
          })}
        />,
      );
    });

    expect(screen.getByRole('complementary')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    const updates = setMixSettings.mock.calls.map(([update]) =>
      typeof update === 'function' ? update(DEFAULT_MIX_WEIGHTS) : update,
    );
    // The class has no students, so nothing but the history criterion stays.
    expect(updates).toContainEqual({
      ...neutralSettings,
      avoidPreviousPairs: DEFAULT_MIX_WEIGHTS.avoidPreviousPairs,
    });
  });

  it('settles when the settings setter returns a new object on every call', async () => {
    let setterCalls = 0;
    function StoreLikeView() {
      const [settings, setSettings] = React.useState(DEFAULT_MIX_WEIGHTS);
      const setMixSettings = React.useCallback<
        SeatingPlanViewProps['setMixSettings']
      >((update) => {
        setterCalls += 1;
        // Stops a loop instead of hanging the test run.
        if (setterCalls > 20) return;
        setSettings((prev) => ({
          ...(typeof update === 'function' ? update(prev) : update),
        }));
      }, []);

      return (
        <SeatingPlanView
          {...createMockSeatingPlanViewProps({
            step: 3,
            settings,
            setMixSettings,
          })}
        />
      );
    }

    await act(async () => {
      renderWithProvidersAndRouter(<StoreLikeView />);
    });

    // One update clears the weights the empty class has no data for; after
    // that there is nothing left to send.
    expect(setterCalls).toBe(1);
  });

  it('shows auto-mix progress indicators and disables mix button', async () => {
    await act(async () => {
      renderWithProvidersAndRouter(
        <SeatingPlanView
          {...createMockSeatingPlanViewProps({
            step: 3,
            autoMixing: true,
          })}
        />,
      );
    });
    expect(
      screen.getAllByText(
        /Automatisches Mischen läuft|Auto-shuffle in progress/i,
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByLabelText(/Mischvorgang läuft|Shuffling in progress/i),
    ).toBeInTheDocument();
  });

  it('renders auto-mix error banner with retry button', async () => {
    await act(async () => {
      renderWithProvidersAndRouter(
        <SeatingPlanView
          {...createMockSeatingPlanViewProps({
            step: 3,
            autoMixError: 'Worker exploded',
          })}
        />,
      );
    });
    expect(
      screen.getByText(
        /Automatisches Mischen fehlgeschlagen|Auto-shuffle failed/i,
      ),
    ).toBeInTheDocument();
    const retryButton = screen.getByRole('button', {
      name: /Erneut mischen|Try again/i,
    });
    expect(retryButton).toBeInTheDocument();
    expect(retryButton).not.toBeDisabled();
  });
});
