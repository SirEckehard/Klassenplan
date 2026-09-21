// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/i18n'; // Initialize i18n for tests
import GenderSelector from '../GenderSelector';
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

describe('GenderSelector', () => {
  it('shows the three options and which one is set', () => {
    render(
      <GenderSelector
        student={createMockStudent({ gender: 'girl' })}
        updateStudent={vi.fn()}
      />,
    );

    expect(chip(/Weiblich|Female/)).toHaveAttribute('aria-pressed', 'true');
    expect(chip(/^(Männlich|Male)$/)).toHaveAttribute('aria-pressed', 'false');
    expect(chip(/Divers|Diverse/)).toHaveAttribute('aria-pressed', 'false');
  });

  it('sets the gender that is pressed', async () => {
    const user = userEvent.setup();
    const updateStudent = vi.fn();
    render(
      <GenderSelector
        student={createMockStudent({ gender: undefined })}
        updateStudent={updateStudent}
      />,
    );

    await user.click(chip(/Divers|Diverse/));

    expect(updateStudent).toHaveBeenCalledWith('1', { gender: 'diverse' });
  });

  it('clears the gender when the option it already has is pressed', async () => {
    const user = userEvent.setup();
    const updateStudent = vi.fn();
    render(
      <GenderSelector
        student={createMockStudent({ gender: 'boy' })}
        updateStudent={updateStudent}
      />,
    );

    // "Not decided" has to stay reachable, or every student ends up with an
    // opinion the teacher never gave.
    await user.click(chip(/^(Männlich|Male)$/));

    expect(updateStudent).toHaveBeenCalledWith('1', { gender: undefined });
  });
});
