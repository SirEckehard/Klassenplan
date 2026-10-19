// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * A saved plan in "Bibliothek": whether it was really in use is marked here
 * by hand, and the class's detection is switched off or on beside it.
 */
import '@testing-library/jest-dom/vitest';
import type React from 'react';
import { render, screen, within } from '@testing-library/react';
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

const usageRecords = {
  current: null as PlanUsageRecordsReturn | null,
};

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

const renderPanel = (
  overrides: Partial<React.ComponentProps<typeof PlanPanel>> = {},
) =>
  render(
    <PlanPanel
      plan={plan}
      records={usageRecords.current!}
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
      {...overrides}
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

  // A class may have many rooms: the plan's room is a menu, as a student's
  // language level is, not a list that grows with every room.
  it('moves the plan to another room from the menu', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn().mockReturnValue(null);
    renderPanel({
      onMove,
      rooms: [
        { id: 'r1', name: 'Klassenraum', scene: plan.scene, isOpen: true },
        { id: 'r2', name: 'Fachraum', scene: plan.scene, isOpen: false },
      ],
    });

    await user.click(
      screen.getByRole('button', { name: /^(Raum|Room): Klassenraum$/ }),
    );
    const menu = screen.getByRole('dialog', { name: /^(Raum|Room)$/ });
    await user.click(within(menu).getByRole('button', { name: 'Fachraum' }));

    expect(onMove).toHaveBeenCalledWith({ roomId: 'r2' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('names a new room for the plan from the end of the menu', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(
      screen.getByRole('button', { name: /^(Raum|Room): Klassenraum$/ }),
    );
    await user.click(
      screen.getByRole('button', {
        name: /In einen neuen Raum verschieben|Move to a new room/i,
      }),
    );

    expect(
      screen.getByRole('textbox', {
        name: /Name des neuen Raums|Name of the new room/i,
      }),
    ).toBeInTheDocument();
  });
});
