// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@/i18n/i18n';
import deGenerator from '@/i18n/locales/de/generator.json';
import enGenerator from '@/i18n/locales/en/generator.json';
import PlanReasons from '../PlanReasons';
import type { PlanReason } from '@/utils/algorithm/planReasons';
import { SCALAR_MIX_SETTING_KEYS } from '@/utils';
import { createMockStudent } from '@/__tests__/utils';

const students = [
  createMockStudent({ id: 'ada', name: 'Ada Lovelace' }),
  createMockStudent({ id: 'ben', name: 'Ben Berg' }),
  createMockStudent({ id: 'cem', name: 'Cem Cakir' }),
];

const reason = (overrides: Partial<PlanReason> = {}): PlanReason => ({
  key: 'avoidRestlessTogether',
  tone: 'met',
  named: true,
  percentage: 100,
  fulfilled: 2,
  total: 2,
  studentIds: ['ada', 'ben'],
  moreStudents: 0,
  ...overrides,
});

describe('PlanReasons', () => {
  it('says nothing before there is a plan to explain', () => {
    const { container } = render(
      <PlanReasons reasons={[]} students={students} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('spells the students into the sentence', () => {
    render(<PlanReasons reasons={[reason()]} students={students} />);

    expect(
      screen.getByRole('heading', { name: /Warum dieser Plan|Why this plan/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Ada Lovelace und Ben Berg sitzen nicht nebeneinander|Ada Lovelace and Ben Berg do not sit next to each other/,
      ),
    ).toBeInTheDocument();
  });

  it('shortens the names the way the seats do', () => {
    render(
      <PlanReasons
        reasons={[reason()]}
        students={students}
        nameDisplay="firstNameInitial"
      />,
    );

    expect(
      screen.getByText(/Ada L\. und Ben B\.|Ada L\. and Ben B\./),
    ).toBeInTheDocument();
  });

  it('counts the students it left out of the list', () => {
    render(
      <PlanReasons
        reasons={[
          reason({ studentIds: ['ada', 'ben', 'cem'], moreStudents: 2 }),
        ]}
        students={students}
      />,
    );

    expect(screen.getByText(/und 2 weitere|and 2 more/)).toBeInTheDocument();
  });

  it('falls back to the plain count when it has no name to give', () => {
    render(
      <PlanReasons
        reasons={[
          reason({
            tone: 'open',
            percentage: 40,
            studentIds: [],
            fulfilled: 1,
          }),
        ]}
        students={students}
      />,
    );

    // The criterion's own sentence needs names, so the count speaks instead.
    expect(screen.getByText(/40\s?%/)).toBeInTheDocument();
  });

  it('has a sentence for every criterion in both languages', () => {
    // The keys are computed from the criterion, so `check:i18n` cannot see them.
    const keys = SCALAR_MIX_SETTING_KEYS.filter(
      // Distractibility is one criterion in the panel, under the other key.
      (key) => key !== 'avoidConcentrationNearRestless',
    );

    for (const bundle of [deGenerator, enGenerator]) {
      const reasons = (
        bundle.mix as unknown as Record<string, Record<string, unknown>>
      ).reasons;
      for (const key of keys) {
        expect(reasons[key]).toEqual({
          met: expect.any(String),
          open: expect.any(String),
        });
      }
      expect(reasons.generic).toEqual({
        met: expect.any(String),
        open: expect.any(String),
      });
    }
  });
});
