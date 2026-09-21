// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/i18n'; // Initialize i18n for tests
import HeightSelector from '../HeightSelector';
import type { Student } from '@/types';

const createMockStudent = (overrides?: Partial<Student>): Student => ({
  id: '1',
  name: 'Max Mustermann',
  gender: 'boy',
  wishPartnerId: null,
  avoidPartnerId: null,
  needsFrontSeat: false,
  restless: false,
  shy: false,
  concentrationIssues: false,
  ...overrides,
});

const chip = (name: RegExp) => screen.getByRole('button', { name });

describe('HeightSelector', () => {
  it('shows the three categories and which one is set', () => {
    render(
      <HeightSelector
        student={createMockStudent({ height: 'tall' })}
        updateStudent={vi.fn()}
      />,
    );

    expect(chip(/Groß|Tall/)).toHaveAttribute('aria-pressed', 'true');
    expect(chip(/Klein|Small/)).toHaveAttribute('aria-pressed', 'false');
  });

  it('sets the category that is pressed', async () => {
    const user = userEvent.setup();
    const updateStudent = vi.fn();
    render(
      <HeightSelector
        student={createMockStudent({ height: undefined })}
        updateStudent={updateStudent}
      />,
    );

    await user.click(chip(/Klein|Small/));

    expect(updateStudent).toHaveBeenCalledWith('1', { height: 'small' });
  });

  it('clears the category when the one it already has is pressed', async () => {
    const user = userEvent.setup();
    const updateStudent = vi.fn();
    render(
      <HeightSelector
        student={createMockStudent({ height: 'small' })}
        updateStudent={updateStudent}
      />,
    );

    await user.click(chip(/Klein|Small/));

    expect(updateStudent).toHaveBeenCalledWith('1', { height: undefined });
  });
});
