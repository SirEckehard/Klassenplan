// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The circle's actions in the status bar. The canvas, the inspector and the
 * toolbar have tests of their own and stand in as empty components here.
 */
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { getButton } from '@/__tests__/utils';
import EnhancedSeatingPlanView from '@/components/SeatingPlanGenerator/EnhancedSeatingPlanView';

const mocks = vi.hoisted(() => ({
  actions: {
    generateCircleSeating: vi.fn(),
    swapStudentPositions: vi.fn(),
    batchSwapStudentPositions: vi.fn(),
    toggleCircleLock: vi.fn(),
  },
  swaps: [{ studentId: 'a', targetPosition: 1 }],
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanState: () => ({
    circleLayout: { students: [], lockedStudentIds: [] },
  }),
  useSeatingPlanActions: () => mocks.actions,
}));
vi.mock('@/contexts/seatingPlan/CanvasPreferencesContext', () => ({
  useCanvasPreferences: () => ({
    showGrid: false,
    photoDisplayMode: 'off',
    setPhotoDisplayMode: vi.fn(),
    nameDisplay: 'firstName',
    setNameDisplay: vi.fn(),
    badgeDisplay: 'all',
    setBadgeDisplay: vi.fn(),
    badgeHover: { tooltip: true, highlight: true },
    setBadgeHover: vi.fn(),
  }),
}));
vi.mock('@/hooks/canvas/useSeatBadgeView', () => ({
  useSeatBadgeView: () => ({
    badgeView: undefined,
    badgeFocus: null,
    reportBadgeFocus: vi.fn(),
  }),
}));
vi.mock('@/hooks/circle/useEnsureCircleLayout', () => ({
  useEnsureCircleLayout: () => vi.fn(),
}));
vi.mock('@/hooks/plan/usePlanExits', () => ({
  usePlanExits: () => ({ exportPlan: vi.fn() }),
}));
vi.mock('@/hooks/plan/usePlanShortcuts', () => ({
  usePlanShortcuts: vi.fn(),
}));
vi.mock('@/hooks/ui/useFirstVisit', () => ({ useFirstVisit: vi.fn() }));
vi.mock('@/services/circleLayoutService', () => ({
  circleShuffleSwaps: () => mocks.swaps,
}));
vi.mock('@/components/circle/SimpleCircleView', () => ({
  default: () => null,
}));
vi.mock('@/components/circle/CircleInspector', () => ({
  default: () => null,
}));
vi.mock('@/components/ui/panels/SmartSidebar', () => ({
  default: () => null,
}));
// The bar's slot lives in the shell; here the actions render in place.
vi.mock('@/components/shell/StatusBarPortal', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const renderCircle = () =>
  render(
    <EnhancedSeatingPlanView
      {...({
        step: 3,
        seatingMode: 'circle',
        showModeToggle: true,
        onModeChange: vi.fn(),
        settings: {},
        currentSeating: [],
        saveSeatingPlan: vi.fn(),
        planName: '',
        classroomScene: { tables: [], features: [], totalStudents: 0 },
      } as unknown as React.ComponentProps<typeof EnhancedSeatingPlanView>)}
    />,
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('EnhancedSeatingPlanView in the circle', () => {
  // Mixing is the blue action in the circle as on the table plan; fitting the
  // circle to the plan stands quietly before it.
  it('puts the shuffle beside the fitting as the one blue button', () => {
    renderCircle();

    const align = getButton(/^(Angleichen|Align)$/i);
    const shuffle = getButton(/^(Zufällig mischen|Shuffle randomly)$/i);
    expect(shuffle).toHaveClass('primary-button');
    expect(align).toHaveClass('secondary-button');
    expect(align.compareDocumentPosition(shuffle)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    // The word is visible from `sm` up and part of the name at every width.
    expect(shuffle).toHaveTextContent(/^(Mischen|Shuffle)$/);
  });

  it('shuffles the circle and fits it to the plan', async () => {
    renderCircle();

    await userEvent.click(getButton(/^(Zufällig mischen|Shuffle randomly)$/i));
    expect(mocks.actions.batchSwapStudentPositions).toHaveBeenCalledWith(
      mocks.swaps,
    );

    await userEvent.click(getButton(/^(Angleichen|Align)$/i));
    expect(mocks.actions.generateCircleSeating).toHaveBeenCalledTimes(1);
  });
});
