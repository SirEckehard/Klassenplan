// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import type { ClassroomTable } from '@/types';
import PlanFeedbackPicker from '../PlanFeedbackPicker';
import MixFeedbackQuestion from '../MixFeedbackQuestion';
import type { PlanFeedbackTable } from '@/hooks/plan/usePlanFeedbackTables';

const desk = (x: number): ClassroomTable => ({
  x,
  y: 100,
  width: 120,
  height: 60,
  rotation: 0,
  seatCount: 2,
  locked: false,
  zIndex: 0,
  templateType: 'double',
});

const units: PlanFeedbackTable[] = [
  {
    key: '["anna","ben"]',
    ids: ['anna', 'ben'],
    names: 'Anna · Ben',
    tables: [0],
    join: null,
  },
  {
    key: '["cem","dana"]',
    ids: ['cem', 'dana'],
    names: 'Cem · Dana',
    tables: [1],
    join: null,
  },
  // Ben and Cem at the join of the two desks pushed together.
  {
    key: '["ben","cem"]',
    ids: ['ben', 'cem'],
    names: 'Ben · Cem',
    tables: [],
    join: [
      { tableIndex: 0, seatIndex: 1 },
      { tableIndex: 1, seatIndex: 0 },
    ],
  },
];

afterEach(cleanup);

describe('PlanFeedbackPicker', () => {
  const renderPicker = (chosen: string[] = []) => {
    const onToggle = vi.fn();
    render(
      <PlanFeedbackPicker
        width={900}
        height={600}
        tables={[desk(100), desk(220)]}
        units={units}
        chosen={new Set(chosen)}
        onToggle={onToggle}
      />,
    );
    return onToggle;
  };
  const table = (names: RegExp) => screen.getByRole('button', { name: names });

  it('makes every table a button named by who sat there, the join included', () => {
    renderPicker(['["cem","dana"]']);

    expect(table(/Anna · Ben/)).toHaveAttribute('aria-pressed', 'false');
    expect(table(/Cem · Dana/)).toHaveAttribute('aria-pressed', 'true');
    expect(table(/Ben · Cem/)).toBeInTheDocument();
  });

  it('starts with the focus on the first table', () => {
    renderPicker();

    expect(table(/Anna · Ben/)).toHaveFocus();
  });

  it('chooses a table by a tap and by the keyboard', async () => {
    const user = userEvent.setup();
    const onToggle = renderPicker();

    // The focus starts on the first table.
    await user.keyboard('{Enter}');
    expect(onToggle).toHaveBeenLastCalledWith(['anna', 'ben']);

    await user.click(table(/Cem · Dana/));
    expect(onToggle).toHaveBeenLastCalledWith(['cem', 'dana']);
  });
});

describe('MixFeedbackQuestion', () => {
  const question = {
    record: {
      id: 'u1',
      fingerprint: 'fp',
      pairs: ['anna::ben'],
      firstSeenAt: '2026-11-12T08:00:00.000Z',
      lastSeenAt: '2026-11-20T08:00:00.000Z',
      sources: ['presented' as const],
      confidence: 1,
    },
    planName: 'Deutsch 7b',
  };
  const renderQuestion = () => {
    const onAnswer = vi.fn();
    render(
      <MixFeedbackQuestion
        question={question}
        onAnswer={onAnswer}
        insideRef={{ current: null }}
      />,
    );
    return onAnswer;
  };

  it('names the plan and starts on mixing without an answer', () => {
    renderQuestion();

    expect(screen.getByRole('alertdialog')).toHaveAccessibleName(/Deutsch 7b/);
    expect(
      screen.getByRole('button', {
        name: /Überspringen & mischen|Skip & mix/i,
      }),
    ).toHaveFocus();
  });

  it('answers by its buttons and goes away on Escape', async () => {
    const user = userEvent.setup();
    const onAnswer = renderQuestion();

    await user.click(screen.getByRole('button', { name: /^(Gut|Good)$/i }));
    expect(onAnswer).toHaveBeenLastCalledWith('good');
    await user.click(
      screen.getByRole('button', { name: /^(Nicht gut|Not good)$/i }),
    );
    expect(onAnswer).toHaveBeenLastCalledWith('poor');
    await user.keyboard('{Escape}');
    expect(onAnswer).toHaveBeenLastCalledWith('dismiss');
  });
});
