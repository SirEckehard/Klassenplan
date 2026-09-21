// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@/i18n'; // Initialize i18n for tests
import SpecialNeedsToggles from '../SpecialNeedsToggles';
import { STUDENT_FLAGS } from '@/utils';
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

const switchFor = (name: RegExp) => screen.getByRole('switch', { name });

describe('SpecialNeedsToggles', () => {
  it('is one row per flag, each with a switch', () => {
    render(
      <SpecialNeedsToggles
        student={createMockStudent()}
        updateStudent={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('switch')).toHaveLength(STUDENT_FLAGS.length);
  });

  it('shows only the flags the section asked for', () => {
    render(
      <SpecialNeedsToggles
        student={createMockStudent()}
        updateStudent={vi.fn()}
        keys={['restless', 'concentrationIssues']}
      />,
    );

    expect(screen.getAllByRole('switch')).toHaveLength(2);
    expect(switchFor(/unruhig|restless/i)).toBeInTheDocument();
  });

  it('says which flags are set', () => {
    render(
      <SpecialNeedsToggles
        student={createMockStudent({ restless: true })}
        updateStudent={vi.fn()}
        keys={['restless', 'shy']}
      />,
    );

    expect(switchFor(/unruhig|restless/i)).toBeChecked();
    expect(switchFor(/schüchtern|shy/i)).not.toBeChecked();
  });

  it('sets a flag when its switch is pressed', async () => {
    const user = userEvent.setup();
    const updateStudent = vi.fn();
    render(
      <SpecialNeedsToggles
        student={createMockStudent({ restless: false })}
        updateStudent={updateStudent}
        keys={['restless']}
      />,
    );

    await user.click(switchFor(/unruhig|restless/i));

    expect(updateStudent).toHaveBeenCalledWith('1', { restless: true });
  });

  it('keeps the two performance flags exclusive', async () => {
    const user = userEvent.setup();
    const updateStudent = vi.fn();
    render(
      <SpecialNeedsToggles
        student={createMockStudent({ performanceStrong: true })}
        updateStudent={updateStudent}
        keys={['performanceStrong', 'performanceWeak']}
      />,
    );

    await user.click(switchFor(/leistungsschwach|needs support/i));

    const [, patch] = updateStudent.mock.calls[0];
    expect(patch).toHaveProperty('performanceWeak', true);
    expect(patch).toHaveProperty('performanceStrong', false);
  });
});
