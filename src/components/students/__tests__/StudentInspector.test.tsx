// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@/i18n';
import StudentInspector from '../StudentInspector';
import type { Student } from '@/types';
import { getButton } from '@/__tests__/utils';

const alice: Student = {
  id: '1',
  name: 'Alice',
  restless: false,
  shy: false,
  concentrationIssues: false,
  needsFrontSeat: false,
};

const renderInspector = (
  props: Partial<React.ComponentProps<typeof StudentInspector>> = {},
) =>
  render(
    <StudentInspector
      student={alice}
      allStudents={[alice]}
      updateStudent={vi.fn()}
      position={{ index: 1, total: 1 }}
      {...props}
    />,
  );

afterEach(cleanup);

describe('StudentInspector', () => {
  it('groups the controls under the family they belong to', () => {
    renderInspector();

    for (const heading of [
      /^(Person)$/,
      /^(Lernen|Learning)$/,
      /^(Sprache|Language)$/,
      /^(Verhalten|Behaviour)$/,
      /^(Soziales|Social)$/,
      /^(Platz & Raum|Seat & room)$/,
    ]) {
      expect(screen.getByRole('heading', { name: heading })).toBeVisible();
    }
  });

  it('sets the gender from its row of choices', () => {
    const updateStudent = vi.fn();
    renderInspector({ updateStudent });

    fireEvent.click(getButton(/^(Männlich|Male)$/i));

    expect(updateStudent).toHaveBeenCalledWith('1', { gender: 'boy' });
  });

  it('sets gender to diverse', () => {
    const updateStudent = vi.fn();
    renderInspector({ updateStudent });

    fireEvent.click(getButton(/^(Divers|Diverse|Non-binary)$/i));

    expect(updateStudent).toHaveBeenCalledWith('1', { gender: 'diverse' });
  });

  it('toggles a behaviour flag in its own section', () => {
    const updateStudent = vi.fn();
    renderInspector({ updateStudent });

    // The flag is a switch beside its name now, not an icon tile.
    fireEvent.click(screen.getByRole('switch', { name: /unruhig|restless/i }));

    expect(updateStudent).toHaveBeenCalledWith('1', { restless: true });
  });

  it('steps to a neighbour only where there is one', () => {
    const onNext = vi.fn();
    renderInspector({ onNext, position: { index: 1, total: 2 } });

    const previous = screen.getByRole('button', {
      name: /Vorheriger Schüler|Previous student/i,
    });
    expect(previous).toBeDisabled();

    fireEvent.click(
      screen.getByRole('button', {
        name: /Nächster Schüler|Next student/i,
      }),
    );
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
