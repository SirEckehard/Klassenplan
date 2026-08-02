// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import '@/i18n';
import StudentListHeader from '@/components/students/StudentListHeader';

const selectAll = () =>
  screen.getByRole('checkbox', { name: /Alle auswählen|Select all/i });

describe('StudentListHeader', () => {
  it('offers no checkbox while multi-select is off', () => {
    render(<StudentListHeader />);

    expect(
      screen.queryByRole('checkbox', { name: /Alle auswählen|Select all/i }),
    ).not.toBeInTheDocument();
  });

  it('toggles every visible student', async () => {
    const onToggleAllVisible = vi.fn();
    render(<StudentListHeader onToggleAllVisible={onToggleAllVisible} />);
    const user = userEvent.setup();

    await user.click(selectAll());

    expect(onToggleAllVisible).toHaveBeenCalledTimes(1);
  });

  it('shows a partial selection as indeterminate rather than checked', () => {
    render(
      <StudentListHeader
        allVisibleSelected={false}
        someVisibleSelected
        onToggleAllVisible={vi.fn()}
      />,
    );

    const checkbox = selectAll() as HTMLInputElement;
    expect(checkbox).not.toBeChecked();
    expect(checkbox.indeterminate).toBe(true);
  });

  it('drops the indeterminate mark once everything is selected', () => {
    render(
      <StudentListHeader
        allVisibleSelected
        someVisibleSelected
        onToggleAllVisible={vi.fn()}
      />,
    );

    const checkbox = selectAll() as HTMLInputElement;
    expect(checkbox).toBeChecked();
    expect(checkbox.indeterminate).toBe(false);
  });

  it('keeps the column captions out of the accessibility tree', () => {
    render(<StudentListHeader onToggleAllVisible={vi.fn()} />);

    // Every control the captions sit above carries its own accessible name;
    // reading "Geschl." before each row would only add noise.
    expect(screen.queryByText(/Geschl\./)).not.toBeInTheDocument();
  });
});
