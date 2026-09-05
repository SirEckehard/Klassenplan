// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import WorkbenchSelect from '@/components/students/WorkbenchSelect';

const options = [
  { value: 'all', label: 'Alle Schüler' },
  { value: 'restless', label: 'Nur unruhige' },
  { value: 'shy', label: 'Nur schüchterne' },
];

const renderSelect = (props: Partial<Parameters<typeof WorkbenchSelect>[0]>) =>
  render(
    <WorkbenchSelect
      label="Nach Merkmal filtern"
      value="all"
      options={options}
      onChange={vi.fn()}
      widthClass="w-36"
      {...props}
    />,
  );

const trigger = () => screen.getByRole('button', { name: /Nach Merkmal/i });

// `FloatingDropdown` renders nothing until it has measured the anchor, so the
// list only reaches the accessibility tree once that pass has run.
const list = () => screen.findByRole('listbox');

describe('WorkbenchSelect', () => {
  it('shows the active option on the closed trigger', () => {
    renderSelect({ value: 'restless' });

    expect(trigger()).toHaveTextContent('Nur unruhige');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('marks the current value as selected in the list', async () => {
    renderSelect({ value: 'shy' });
    const user = userEvent.setup();

    await user.click(trigger());

    const selected = within(await list()).getByRole('option', {
      selected: true,
    });
    expect(selected).toHaveTextContent('Nur schüchterne');
  });

  it('reports the picked value and closes', async () => {
    const onChange = vi.fn();
    renderSelect({ onChange });
    const user = userEvent.setup();

    await user.click(trigger());
    await user.click(
      within(await list()).getByRole('option', { name: /Nur unruhige/i }),
    );

    expect(onChange).toHaveBeenCalledWith('restless');
    await waitFor(() =>
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument(),
    );
  });

  it('opens on ArrowDown and lands on the current value', async () => {
    renderSelect({ value: 'restless' });
    const user = userEvent.setup();

    trigger().focus();
    await user.keyboard('{ArrowDown}');

    await waitFor(() =>
      expect(
        within(screen.getByRole('listbox')).getByRole('option', {
          name: /Nur unruhige/i,
        }),
      ).toHaveFocus(),
    );
  });

  it('closes on Escape and hands focus back to the trigger', async () => {
    renderSelect({});
    const user = userEvent.setup();

    await user.click(trigger());
    expect(await list()).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument(),
    );
    expect(trigger()).toHaveFocus();
  });
});
