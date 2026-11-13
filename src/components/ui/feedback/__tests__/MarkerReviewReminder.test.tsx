// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The question whether a class's markers still hold (decision 0044): on the
 * plan layer only, once they stood still, and gone for a week after "Später".
 */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import type { Student } from '@/types';
import { createMockStudent } from '@/__tests__/utils';
import MarkerReviewReminder from '../MarkerReviewReminder';

const mocks = vi.hoisted(() => ({
  step: 3,
  students: [] as Student[],
  createdAt: '2025-01-01T08:00:00.000Z' as string | undefined,
  reviewedAt: undefined as string | undefined,
  handleStepChange: vi.fn(),
  updateClassMetadata: vi.fn(async () => true),
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingAlgorithmContext: () => ({ step: mocks.step }),
  useSeatingPlanActions: () => ({ handleStepChange: mocks.handleStepChange }),
  useSeatingPlanState: () => ({ students: mocks.students }),
}));

vi.mock('@/contexts/seatingPlan/ClassManagementContext', () => ({
  useClassManagementContext: () => ({
    activeClass: {
      id: 'c1',
      name: '7b',
      createdAt: mocks.createdAt,
      markersReviewedAt: mocks.reviewedAt,
    },
    updateClassMetadata: mocks.updateClassMetadata,
  }),
}));

const card = () =>
  screen.queryByRole('region', { name: /Merkmale prüfen|Review markers/i });

beforeEach(async () => {
  localStorage.clear();
  vi.clearAllMocks();
  mocks.step = 3;
  mocks.students = [
    createMockStudent({ id: 'a', name: 'Ada', restless: true }),
    createMockStudent({ id: 'b', name: 'Ben' }),
  ];
  mocks.createdAt = '2025-01-01T08:00:00.000Z';
  mocks.reviewedAt = undefined;
  await i18n.changeLanguage('de');
});

describe('MarkerReviewReminder', () => {
  it('asks on the plan layer once markers stood still', () => {
    render(<MarkerReviewReminder />);

    expect(card()).toBeInTheDocument();
    expect(card()).toHaveTextContent(/1 Schüler|1 student/);
  });

  it('says nothing on the class layer, where the list is', () => {
    mocks.step = 1;
    render(<MarkerReviewReminder />);

    expect(card()).not.toBeInTheDocument();
  });

  it('says nothing while the markers were said to hold lately', () => {
    mocks.reviewedAt = new Date().toISOString().slice(0, 10);
    render(<MarkerReviewReminder />);

    expect(card()).not.toBeInTheDocument();
  });

  it('notes the day on "Passt noch"', async () => {
    render(<MarkerReviewReminder />);

    await userEvent.click(
      screen.getByRole('button', { name: /Passt noch|Still right/i }),
    );

    expect(mocks.updateClassMetadata).toHaveBeenCalledWith('c1', {
      markersReviewedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
  });

  it('leads to the class list', async () => {
    render(<MarkerReviewReminder />);

    await userEvent.click(
      screen.getByRole('button', { name: /Zur Klassenliste|class list/i }),
    );

    expect(mocks.handleStepChange).toHaveBeenCalledWith(1);
  });

  it('goes for a week on "Später"', async () => {
    render(<MarkerReviewReminder />);

    await userEvent.click(
      screen.getByRole('button', { name: /Später|Later/i }),
    );

    expect(card()).not.toBeInTheDocument();
  });
});
