// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * A saved plan in "Bibliothek": whether it was really in use is marked here
 * by hand, and the class's detection is switched off or on beside it.
 */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import {
  createMockClassroomScene,
  createMockSavedPlan,
  createMockStudent,
} from '@/__tests__/utils';
import type { PlanUsageRecordsReturn } from '@/hooks/plan/usePlanUsageRecords';
import type { PlanUsage, SavedPlan } from '@/types';
import {
  collectSeatingPairKeys,
  computePlanFingerprint,
} from '@/utils/data/planUsage';
import PlanPanel from '../PlanPanel';

const usageRecords = vi.hoisted(() => ({
  current: null as PlanUsageRecordsReturn | null,
}));

vi.mock('@/hooks/plan/usePlanUsageRecords', () => ({
  usePlanUsageRecords: () => usageRecords.current,
}));

const records = (
  overrides: Partial<PlanUsageRecordsReturn> = {},
): PlanUsageRecordsReturn => ({
  planUsage: [],
  planUsageSince: null,
  planUsageManual: false,
  setUsageConfirmed: vi.fn(),
  setUsageManual: vi.fn(),
  markUsed: vi.fn(),
  resetUsage: vi.fn().mockResolvedValue(null),
  undoReset: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const plan: SavedPlan = createMockSavedPlan({
  id: 'p1',
  name: 'Herbst',
  date: '2026-09-01',
  roomId: 'r1',
  scene: createMockClassroomScene(1),
  seating: [
    [
      createMockStudent({ id: 'a', name: 'Anna' }),
      createMockStudent({ id: 'b', name: 'Ben' }),
    ],
  ],
});

const recordOf = (overrides: Partial<PlanUsage> = {}): PlanUsage => {
  const pairs = collectSeatingPairKeys(plan.seating);
  return {
    id: 'u1',
    fingerprint: computePlanFingerprint(pairs),
    pairs,
    firstSeenAt: '2026-09-02T08:00:00.000Z',
    lastSeenAt: '2026-09-02T08:00:00.000Z',
    sources: ['presented'],
    confidence: 1,
    ...overrides,
  };
};

const renderPanel = () =>
  render(
    <PlanPanel
      plan={plan}
      classId="c1"
      rooms={[
        {
          id: 'r1',
          name: 'Klassenraum',
          scene: plan.scene,
          isOpen: true,
        },
      ]}
      plans={[plan]}
      studentCount={2}
      onRename={() => null}
      onMove={() => null}
      onDuplicate={vi.fn()}
      onDelete={vi.fn()}
      renameRequest={0}
    />,
  );

const usedSwitch = () =>
  screen.getByRole('switch', { name: /^(Genutzt|Used)$/i });
const detectSwitch = () =>
  screen.getByRole('switch', {
    name: /Automatisch erkennen|Detect automatically/i,
  });

describe('PlanPanel', () => {
  beforeEach(() => {
    usageRecords.current = records();
  });

  it('marks a plan nobody detected as used, dated the day it was made', async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(usedSwitch()).toHaveAttribute('aria-checked', 'false');
    await user.click(usedSwitch());

    expect(usageRecords.current?.markUsed).toHaveBeenCalledWith(
      plan.seating,
      true,
      new Date(2026, 8, 1).toISOString(),
    );
  });

  it('shows a detected plan as used and takes it out by hand', async () => {
    usageRecords.current = records({ planUsage: [recordOf()] });
    const user = userEvent.setup();
    renderPanel();

    expect(usedSwitch()).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText(/präsentiert|presented/i)).toBeInTheDocument();
    await user.click(usedSwitch());

    expect(usageRecords.current?.markUsed).toHaveBeenCalledWith(
      plan.seating,
      false,
      expect.any(String),
    );
  });

  it('switches the detection of the class off', async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(detectSwitch()).toHaveAttribute('aria-checked', 'true');
    await user.click(detectSwitch());

    expect(usageRecords.current?.setUsageManual).toHaveBeenCalledWith(true);
  });

  it('says that only marked plans count while the detection is off', () => {
    usageRecords.current = records({ planUsageManual: true });
    renderPanel();

    expect(detectSwitch()).toHaveAttribute('aria-checked', 'false');
    expect(
      screen.getByText(/nur Pläne, die du selbst|only the plans you mark/i),
    ).toBeInTheDocument();
  });
});
