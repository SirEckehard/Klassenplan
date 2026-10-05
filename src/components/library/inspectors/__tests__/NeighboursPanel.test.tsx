// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The neighbourhoods' panels in "Bibliothek": what the pairs in the
 * columns rest on, a plan taken out of the count or let back in, the reset in
 * one click — and a pair of students on its own.
 */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { getButton } from '@/__tests__/utils';
import type { PlanUsageRecordsReturn } from '@/hooks/plan/usePlanUsageRecords';
import type { PlanUsage } from '@/types';
import NeighbourPairPanel from '../NeighbourPairPanel';
import NeighboursPanel from '../NeighboursPanel';

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

const records = (
  planUsage: PlanUsage[],
  overrides: Partial<PlanUsageRecordsReturn> = {},
): PlanUsageRecordsReturn => ({
  planUsage,
  planUsageSince: null,
  planUsageManual: false,
  setUsageConfirmed: vi.fn(),
  setUsageManual: vi.fn(),
  markUsed: vi.fn(),
  resetUsage: vi.fn().mockResolvedValue(null),
  undoReset: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('NeighboursPanel', () => {
  it('explains that nothing is recorded yet', () => {
    render(<NeighboursPanel className="7b" records={records([])} />);

    expect(
      screen.getByText(/Noch keine Auswertung|Nothing to evaluate/i),
    ).toBeInTheDocument();
  });

  it('says how a plan comes to count while the detection is off', () => {
    render(
      <NeighboursPanel
        className="7b"
        records={records([], { planUsageManual: true })}
      />,
    );

    expect(
      screen.getByText(
        /automatische Erkennung ist|Automatic detection is off/i,
      ),
    ).toBeInTheDocument();
  });

  it('names the data the neighbourhoods rest on', () => {
    render(
      <NeighboursPanel
        className="7b"
        records={records([record('u1', ['a::b'], '2026-08-01T00:00:00.000Z')])}
      />,
    );

    expect(
      screen.getByText(/Beruht auf 1 gewertetem|Based on 1 counted/i),
    ).toBeInTheDocument();
  });

  it('names each plan by its saved plan, date and room', () => {
    render(
      <NeighboursPanel
        className="7b"
        records={records([
          record('u1', ['a::b'], '2026-08-01T10:00:00.000Z'),
          record('u2', ['c::d'], '2026-08-02T10:00:00.000Z'),
        ])}
        origins={
          new Map([
            ['f-u1', { planNames: ['Herbst'], roomNames: ['Raum 104'] }],
          ])
        }
      />,
    );

    expect(screen.getByText(/^Herbst · .+ · Raum 104$/)).toBeInTheDocument();
    // A plan the class no longer holds keeps its date.
    expect(
      screen.getByText(/^(Sitzplan vom|Seating plan of) /),
    ).toBeInTheDocument();
  });

  it('lets a plan be taken out of the count', async () => {
    const value = records([record('u1', ['a::b'], '2026-08-01T00:00:00.000Z')]);
    render(<NeighboursPanel className="7b" records={value} />);

    await userEvent.click(getButton(/Nicht werten|Don't count/i));

    expect(value.setUsageConfirmed).toHaveBeenCalledExactlyOnceWith(
      'u1',
      false,
    );
  });

  it('lets a withdrawn plan be counted again', async () => {
    const value = records([
      record('u1', ['a::b'], '2026-08-01T00:00:00.000Z', { confirmed: false }),
    ]);
    render(<NeighboursPanel className="7b" records={value} />);

    await userEvent.click(getButton(/Wieder werten|Count again/i));

    expect(value.setUsageConfirmed).toHaveBeenCalledExactlyOnceWith('u1', true);
  });

  // A new school year, a class mixed up anew: one click forgets every
  // neighbourhood so far; the toast after it is the way back.
  it('resets every neighbourhood with one click', async () => {
    const value = records([record('u1', ['a::b'], '2026-08-01T00:00:00.000Z')]);
    render(<NeighboursPanel className="7b" records={value} />);

    await userEvent.click(getButton(/^(Zurücksetzen|Reset)$/i));

    expect(value.resetUsage).toHaveBeenCalledTimes(1);
  });

  it('says since when it counts after a reset', () => {
    render(
      <NeighboursPanel
        className="7b"
        records={records([], { planUsageSince: '2026-10-03T10:00:00.000Z' })}
      />,
    );

    expect(
      screen.getByText(/Gezählt wird seit|Counting since/i),
    ).toHaveTextContent(/2026/);
    // Nothing left to reset.
    expect(
      screen.queryByRole('button', { name: /^(Zurücksetzen|Reset)$/i }),
    ).not.toBeInTheDocument();
  });
});

describe('NeighbourPairPanel', () => {
  it('says how often two sat together, from the plans that count', () => {
    const onSetConfirmed = vi.fn();
    render(
      <NeighbourPairPanel
        studentId="b"
        neighbourId="a"
        studentName="Ben"
        neighbourName="Anna"
        planUsage={[
          record('u1', ['a::b'], '2026-08-01T00:00:00.000Z'),
          record('u2', ['a::b'], '2026-09-01T00:00:00.000Z', {
            confirmed: false,
          }),
          record('u3', ['c::d'], '2026-09-02T00:00:00.000Z'),
        ]}
        onSetConfirmed={onSetConfirmed}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Ben & Anna' }),
    ).toBeInTheDocument();
    expect(screen.getByText('1×')).toBeInTheDocument();
    // The two plans with the pair, the withdrawn one among them.
    expect(
      screen.getAllByRole('button', {
        name: /Nicht werten|Don't count|Wieder werten|Count again/i,
      }),
    ).toHaveLength(2);
  });
});
