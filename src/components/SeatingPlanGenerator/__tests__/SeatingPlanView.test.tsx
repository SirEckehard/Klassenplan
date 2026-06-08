import '@testing-library/jest-dom/vitest';
import { screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import '@/i18n/i18n';
import SeatingPlanView from '../SeatingPlanView';
import { BOARD_WIDTH, CLASSROOM_HEIGHT } from '../../../utils/constants';
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
    // Set hasVisitedApp to true to prevent first-visit expanded behavior in tests
    localStorage.setItem('spg.hasVisitedApp', 'true');
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
