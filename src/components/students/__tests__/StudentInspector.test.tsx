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

  // The rows stood at different pitches on an iPad: the partners' buttons
  // stayed small while the chips, the switches and the role's menu took a
  // fingertip's 44px. Every value is one size now, and so is every row.
  it('gives every value and every row one height', () => {
    renderInspector();

    const values = [
      ...screen.getAllByRole('button', { pressed: false }),
      ...screen
        .getAllByRole('button')
        .filter((button) => button.getAttribute('aria-haspopup') === 'dialog'),
    ].filter((button) => button.closest('section'));
    // Gender and height chips, two partner buttons, the role, the language.
    expect(values.length).toBeGreaterThanOrEqual(9);
    for (const value of values) {
      expect(value).toHaveClass(
        'min-h-7',
        'pointer-coarse:min-h-11',
        'pointer-coarse:px-2.5',
      );
    }
    for (const toggle of screen.getAllByRole('switch')) {
      expect(toggle.closest('label')).toHaveClass(
        'min-h-7',
        'pointer-coarse:min-h-11',
      );
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
