// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The question how the last plan in use went (decision 0054): on the plan
 * layer while "Erfahrung" counts; "Gut" and "Nicht gut" keep the feedback,
 * "Später" lets the plan go.
 */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import type { PlanUsage, SavedPlan, SeatingArrangement } from '@/types';
import { createMockStudent } from '@/__tests__/utils';
import PlanFeedbackReminder from '../PlanFeedbackReminder';

const ada = createMockStudent({ id: 'a', name: 'Ada' });
const ben = createMockStudent({ id: 'b', name: 'Ben' });
const cem = createMockStudent({ id: 'c', name: 'Cem' });
const lastPlan: SeatingArrangement = [[ada, ben], [cem]];
const shownPlan: SeatingArrangement = [[ada, cem], [ben]];

const mocks = vi.hoisted(() => ({
  step: 3,
  weight: 6,
  planUsage: [] as PlanUsage[],
  seatingHistory: [] as SavedPlan[],
  setPlanUsageFeedback: vi.fn(async () => undefined),
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingAlgorithmContext: () => ({ step: mocks.step }),
  useSeatingPlanState: () => ({
    activeClass: { id: 'c1' },
    currentSeating: shownPlan,
    mixSettings: { considerPlanFeedback: mocks.weight },
    planUsage: mocks.planUsage,
    seatingHistory: mocks.seatingHistory,
  }),
}));

vi.mock('@/repositories/planUsageStore', () => ({
  setPlanUsageFeedback: mocks.setPlanUsageFeedback,
}));

const DAY = 24 * 3600 * 1000;

const card = () =>
  screen.queryByRole('region', {
    name: /Wie lief der letzte Plan|How did the last plan go/i,
  });

beforeEach(async () => {
  localStorage.clear();
  vi.clearAllMocks();
  const { collectSeatingPairKeys, computePlanFingerprint } =
    await import('@/utils/data/planUsage');
  const pairs = collectSeatingPairKeys(lastPlan);
  mocks.step = 3;
  mocks.weight = 6;
  mocks.planUsage = [
    {
      id: 'r1',
      fingerprint: computePlanFingerprint(pairs),
      pairs,
      firstSeenAt: new Date(Date.now() - 10 * DAY).toISOString(),
      lastSeenAt: new Date(Date.now() - DAY).toISOString(),
      sources: ['presented'],
      confidence: 1,
    },
  ];
  mocks.seatingHistory = [
    { id: 'p1', name: 'Herbstplan', seating: lastPlan } as SavedPlan,
  ];
  await i18n.changeLanguage('de');
});

describe('PlanFeedbackReminder', () => {
  it('asks about the plan used before, by its name', () => {
    render(<PlanFeedbackReminder />);
    expect(card()).toHaveTextContent(/„Herbstplan“/);
  });

  it('keeps "Gut" as the plan’s feedback and goes', async () => {
    render(<PlanFeedbackReminder />);
    await userEvent.click(screen.getByRole('button', { name: 'Gut' }));

    expect(mocks.setPlanUsageFeedback).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ id: 'r1' }),
      expect.objectContaining({ rating: 'good' }),
    );
    expect(card()).not.toBeInTheDocument();
  });

  it('lets the plan go with "Später", for good', async () => {
    const { unmount } = render(<PlanFeedbackReminder />);
    await userEvent.click(screen.getByRole('button', { name: 'Später' }));
    expect(card()).not.toBeInTheDocument();
    expect(mocks.setPlanUsageFeedback).not.toHaveBeenCalled();

    unmount();
    render(<PlanFeedbackReminder />);
    expect(card()).not.toBeInTheDocument();
  });

  it('asks nothing while "Erfahrung" is off or off the plan layer', () => {
    mocks.weight = 0;
    const { unmount } = render(<PlanFeedbackReminder />);
    expect(card()).not.toBeInTheDocument();
    unmount();

    mocks.weight = 6;
    mocks.step = 1;
    render(<PlanFeedbackReminder />);
    expect(card()).not.toBeInTheDocument();
  });
});
