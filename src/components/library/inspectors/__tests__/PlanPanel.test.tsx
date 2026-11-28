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
  setFeedback: vi.fn(),
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
  const pairs = collectSeatingPairKeys(plan.seating, plan.scene);
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
      students={plan.seating.flat().filter((seat) => seat !== null)}
      experienceCounts
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

const NEW_ROOM_NAME = /Name des neuen Raums|Name of the new room/i;
const newRoomField = () => screen.getByRole('textbox', { name: NEW_ROOM_NAME });
const queryNewRoomField = () =>
  screen.queryByRole('textbox', { name: NEW_ROOM_NAME });
const openNewRoomField = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(
    screen.getByRole('button', { name: /^(Raum|Room): Klassenraum$/ }),
  );
  await user.click(
    screen.getByRole('button', {
      name: /In einen neuen Raum verschieben|Move to a new room/i,
    }),
  );
};

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
      plan.scene,
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
      plan.scene,
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

  // How a plan in use went (decision 0054).
  describe('feedback', () => {
    const wentWell = () =>
      screen.getByRole('button', { name: /^(Gut|Good)$/i });
    const wentPoorly = () =>
      screen.getByRole('button', {
        name: /^(Nicht gut|Not good)$/i,
      });

    it('says a plan went well, dated the day it was made', async () => {
      const user = userEvent.setup();
      renderPanel();

      await user.click(wentWell());

      expect(usageRecords.current?.setFeedback).toHaveBeenCalledWith(
        plan.seating,
        plan.scene,
        { rating: 'good', at: expect.any(String) },
        new Date(2026, 8, 1).toISOString(),
      );
    });

    it('takes the feedback back with the chip pressed again', async () => {
      usageRecords.current = records({
        planUsage: [
          recordOf({ feedback: { rating: 'good', at: '2026-10-01' } }),
        ],
      });
      const user = userEvent.setup();
      renderPanel();

      expect(wentWell()).toHaveAttribute('aria-pressed', 'true');
      await user.click(wentWell());

      expect(usageRecords.current?.setFeedback).toHaveBeenCalledWith(
        plan.seating,
        plan.scene,
        null,
        expect.any(String),
      );
    });

    it('names the tables by who sat there once it did not go well', async () => {
      usageRecords.current = records({
        planUsage: [
          recordOf({ feedback: { rating: 'poor', at: '2026-10-01' } }),
        ],
      });
      const user = userEvent.setup();
      renderPanel();

      const table = screen.getByRole('switch', {
        name: /(Tisch mit|Table with) Anna · Ben/i,
      });
      expect(table).toHaveAttribute('aria-checked', 'false');
      await user.click(table);

      expect(usageRecords.current?.setFeedback).toHaveBeenCalledWith(
        plan.seating,
        plan.scene,
        { rating: 'poor', poorTables: [['a', 'b']], at: expect.any(String) },
        expect.any(String),
      );
      expect(wentPoorly()).toHaveAttribute('aria-pressed', 'true');
    });

    it('names single desks pushed together as one table', async () => {
      // Two single desks edge to edge, a third a step away.
      const single = (y: number) => ({
        x: 600,
        y,
        width: 55,
        height: 65,
        rotation: 0,
        seatCount: 1,
        locked: false,
        zIndex: 0,
        templateType: 'single' as const,
      });
      const [anna, ben, carla] = [
        createMockStudent({ id: 'a', name: 'Anna' }),
        createMockStudent({ id: 'b', name: 'Ben' }),
        createMockStudent({ id: 'c', name: 'Carla' }),
      ];
      const desks: SavedPlan = {
        ...plan,
        scene: createMockClassroomScene(0, {
          tables: [single(100), single(165), single(400)],
        }),
        seating: [[anna!], [ben!], [carla!]],
      };
      const pairs = collectSeatingPairKeys(desks.seating, desks.scene);
      usageRecords.current = records({
        planUsage: [
          recordOf({
            pairs,
            fingerprint: computePlanFingerprint(pairs),
            feedback: { rating: 'poor', at: '2026-10-01' },
          }),
        ],
      });
      const user = userEvent.setup();
      renderPanel({
        plan: desks,
        plans: [desks],
        students: [anna!, ben!, carla!],
      });

      expect(pairs).toEqual(['a::b']);
      expect(
        screen.getAllByRole('switch', { name: /Tisch mit|Table with/i }),
      ).toHaveLength(1);
      await user.click(
        screen.getByRole('switch', {
          name: /(Tisch mit|Table with) Anna · Ben/i,
        }),
      );
      expect(usageRecords.current?.setFeedback).toHaveBeenCalledWith(
        desks.seating,
        desks.scene,
        { rating: 'poor', poorTables: [['a', 'b']], at: expect.any(String) },
        expect.any(String),
      );
    });

    it('says the feedback waits while "Erfahrung" is off', () => {
      usageRecords.current = records({
        planUsage: [
          recordOf({ feedback: { rating: 'good', at: '2026-10-01' } }),
        ],
      });
      renderPanel({ experienceCounts: false });

      expect(
        screen.getByText(/sobald das Kriterium|once the .Experience/i),
      ).toBeInTheDocument();
    });
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

    await openNewRoomField(user);

    expect(newRoomField()).toBeInTheDocument();
  });

  // The suggested name is a name like any other: Enter takes it.
  it('moves the plan into a new room under the suggested name', async () => {
    const user = userEvent.setup();
    const onMove = vi.fn().mockReturnValue(null);
    renderPanel({ onMove });

    await openNewRoomField(user);
    await user.type(newRoomField(), '{Enter}');

    expect(onMove).toHaveBeenCalledWith({ newRoomName: 'Neuer Raum' });
    expect(queryNewRoomField()).not.toBeInTheDocument();
  });

  // A new room is made only on purpose: Escape or leaving the field drops it.
  it.each([
    [
      'Escape',
      (user: ReturnType<typeof userEvent.setup>) => user.keyboard('{Escape}'),
    ],
    [
      'leaving the field',
      (user: ReturnType<typeof userEvent.setup>) => user.tab(),
    ],
  ])('drops the new room on %s', async (_label, leave) => {
    const user = userEvent.setup();
    const onMove = vi.fn().mockReturnValue(null);
    renderPanel({ onMove });

    await openNewRoomField(user);
    await user.click(newRoomField());
    await user.type(newRoomField(), ' 2');
    await leave(user);

    expect(onMove).not.toHaveBeenCalled();
    expect(queryNewRoomField()).not.toBeInTheDocument();
  });
});
