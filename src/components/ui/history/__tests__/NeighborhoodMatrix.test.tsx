// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '@/i18n'; // Initialize i18n for tests
import { createMockStudent, getButton } from '@/__tests__/utils';
import type { PlanUsage } from '@/types';
import NeighborhoodMatrix from '../NeighborhoodMatrix';

const anna = createMockStudent({ id: 'a', name: 'Anna' });
const ben = createMockStudent({ id: 'b', name: 'Ben' });
const carla = createMockStudent({ id: 'c', name: 'Carla' });
const dinah = createMockStudent({ id: 'd', name: 'Dinah' });

const students = [anna, ben, carla, dinah];

const record = (
  id: string,
  pairs: string[],
  lastSeenAt: string,
  overrides: Partial<PlanUsage> = {},
): PlanUsage => ({
  id,
  fingerprint: `f-${id}`,
  pairs,
  firstSeenAt: lastSeenAt,
  lastSeenAt,
  sources: ['presented'],
  confidence: 1,
  ...overrides,
});

const renderMatrix = (
  planUsage: PlanUsage[],
  onSetConfirmed = vi.fn<(id: string, confirmed: boolean) => void>(),
) => {
  render(
    <NeighborhoodMatrix
      planUsage={planUsage}
      students={students}
      onSetConfirmed={onSetConfirmed}
    />,
  );
  return onSetConfirmed;
};

describe('NeighborhoodMatrix', () => {
  it('explains that nothing is recorded yet', () => {
    renderMatrix([]);

    expect(
      screen.getByText(/Noch keine Auswertung|Nothing to evaluate/i),
    ).toBeInTheDocument();
  });

  it('lists pairs with how often they sat together, most frequent first', () => {
    renderMatrix([
      record('u1', ['a::b', 'c::d'], '2026-08-01T00:00:00.000Z'),
      record('u2', ['a::b'], '2026-09-01T00:00:00.000Z'),
    ]);

    const entries = screen.getAllByRole('listitem');
    expect(within(entries[0]).getByText(/Anna/)).toBeInTheDocument();
    expect(within(entries[0]).getByText('2×')).toBeInTheDocument();
    expect(within(entries[1]).getByText('1×')).toBeInTheDocument();
  });

  it('names the data the evaluation rests on', () => {
    renderMatrix([record('u1', ['a::b'], '2026-08-01T00:00:00.000Z')]);

    expect(
      screen.getByText(/Beruht auf 1 gewertetem|Based on 1 counted/i),
    ).toBeInTheDocument();
  });

  it('filters the list by student name', async () => {
    const user = userEvent.setup();
    renderMatrix([record('u1', ['a::b', 'c::d'], '2026-08-01T00:00:00.000Z')]);

    await user.type(screen.getByRole('searchbox'), 'Carla');

    const entries = screen.getAllByRole('listitem');
    expect(entries).toHaveLength(1);
    expect(within(entries[0]).getByText(/Carla/)).toBeInTheDocument();
  });

  it('says so when the search matches nothing', async () => {
    const user = userEvent.setup();
    renderMatrix([record('u1', ['a::b'], '2026-08-01T00:00:00.000Z')]);

    await user.type(screen.getByRole('searchbox'), 'Zoe');

    expect(
      screen.getByText(/Keine Nachbarschaft|No neighbourhood/i),
    ).toBeInTheDocument();
  });

  it('leaves a withdrawn plan out of the count', () => {
    renderMatrix([
      record('u1', ['a::b'], '2026-08-01T00:00:00.000Z', { confirmed: false }),
      record('u2', ['c::d'], '2026-09-01T00:00:00.000Z'),
    ]);

    expect(screen.queryByText(/Anna/)).not.toBeInTheDocument();
    expect(screen.getByText(/Carla/)).toBeInTheDocument();
  });

  it('lets a plan be taken out of the count', async () => {
    const user = userEvent.setup();
    const onSetConfirmed = renderMatrix([
      record('u1', ['a::b'], '2026-08-01T00:00:00.000Z'),
    ]);

    await user.click(getButton(/Datengrundlage anzeigen|Show the data/i));
    await user.click(getButton(/Nicht werten|Don't count/i));

    expect(onSetConfirmed).toHaveBeenCalledExactlyOnceWith('u1', false);
  });

  it('lets a withdrawn plan be counted again', async () => {
    const user = userEvent.setup();
    const onSetConfirmed = renderMatrix([
      record('u1', ['a::b'], '2026-08-01T00:00:00.000Z', { confirmed: false }),
    ]);

    await user.click(getButton(/Datengrundlage anzeigen|Show the data/i));
    await user.click(getButton(/Wieder werten|Count again/i));

    expect(onSetConfirmed).toHaveBeenCalledExactlyOnceWith('u1', true);
  });
});
