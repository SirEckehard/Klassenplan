// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Two states side by side: each row counts both, a row that differs says by
 * how much, a row neither holds is left out.
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClockCounterClockwiseIcon } from '@phosphor-icons/react';
import ConfirmDialog from '../ConfirmDialog';

describe('ConfirmDialog comparison', () => {
  it('shows both states and the difference of a row that differs', () => {
    render(
      <ConfirmDialog
        open
        title="Stand vor dem Update wiederherstellen?"
        icon={ClockCounterClockwiseIcon}
        comparison={{
          columns: ['Jetzt', 'Vor dem Update'],
          rows: [
            { label: 'Klassen', counts: [2, 2] },
            { label: 'Schüler', counts: [24, 26] },
            { label: 'Räume', counts: [0, 0] },
          ],
          notes: ['Nur vor dem Update: 8b'],
        }}
        confirmLabel="Wiederherstellen"
        cancelLabel="Abbrechen"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const table = screen.getByRole('table');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent),
    ).toEqual(['Jetzt', 'Vor dem Update']);
    expect(
      within(table).getByRole('row', { name: /Schüler/ }).textContent,
    ).toBe('Schüler24+226');
    expect(
      within(table).getByRole('row', { name: /Klassen/ }).textContent,
    ).toBe('Klassen22');
    expect(within(table).queryByRole('row', { name: /Räume/ })).toBeNull();
    expect(screen.getByText('Nur vor dem Update: 8b')).toBeInTheDocument();
  });
});
