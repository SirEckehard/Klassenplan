// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@/i18n';
import AttributeFocusMode from '../AttributeFocusMode';
import { createMockStudent } from '@/__tests__/utils';
import type { Student } from '@/types';

const ada = createMockStudent({ id: 'a', name: 'Ada' });
const grace = createMockStudent({ id: 'g', name: 'Grace' });

const renderMode = (students: Student[] = [ada, grace]) => {
  const updateStudent = vi.fn();
  const onFinish = vi.fn();
  render(
    <AttributeFocusMode
      students={students}
      updateStudent={updateStudent}
      onFinish={onFinish}
    />,
  );
  return { updateStudent, onFinish };
};

const tile = (name: string) => screen.getByRole('button', { name });
const nextPass = () => screen.getByRole('button', { name: /^(Weiter|Next):/ });

afterEach(cleanup);

describe('AttributeFocusMode', () => {
  it('opens on the first question with nobody marked', () => {
    renderMode();

    expect(
      screen.getByRole('heading', {
        name: /Wer zeigt Unruhe\?|Who is restless\?/i,
      }),
    ).toBeVisible();
    expect(tile('Ada')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText(/Merkmal 1 von 8|Attribute 1 of 8/i)).toBeVisible();
  });

  it('sets the flag of the tile that was tapped', () => {
    const { updateStudent } = renderMode();

    fireEvent.click(tile('Ada'));

    expect(updateStudent).toHaveBeenCalledWith('a', { restless: true });
  });

  it('clears a flag that is already set', () => {
    const { updateStudent } = renderMode([{ ...ada, restless: true }, grace]);

    expect(tile('Ada')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(tile('Ada'));

    expect(updateStudent).toHaveBeenCalledWith('a', { restless: false });
  });

  it('keeps the two performance flags mutually exclusive', () => {
    const { updateStudent } = renderMode([
      createMockStudent({ id: 'a', name: 'Ada', performanceWeak: true }),
    ]);

    // Walk to the "strong learner" pass: restless → distracted → shy → strong.
    fireEvent.click(nextPass());
    fireEvent.click(nextPass());
    fireEvent.click(nextPass());
    fireEvent.click(tile('Ada'));

    expect(updateStudent).toHaveBeenCalledWith('a', {
      performanceStrong: true,
      performanceWeak: false,
    });
  });

  it('clears the whole pass at once', () => {
    const { updateStudent } = renderMode([
      { ...ada, restless: true },
      { ...grace, restless: true },
    ]);

    fireEvent.click(
      screen.getByRole('button', { name: /Auswahl leeren|Clear selection/i }),
    );

    expect(updateStudent).toHaveBeenCalledTimes(2);
    expect(updateStudent).toHaveBeenCalledWith('a', { restless: false });
    expect(updateStudent).toHaveBeenCalledWith('g', { restless: false });
  });

  it('ends the pass at the last question', () => {
    const { onFinish } = renderMode();

    for (let step = 0; step < 7; step += 1) {
      fireEvent.click(nextPass());
    }

    const finish = screen.getByRole('button', {
      name: /Durchgang beenden|Finish pass/i,
    });
    fireEvent.click(finish);
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
