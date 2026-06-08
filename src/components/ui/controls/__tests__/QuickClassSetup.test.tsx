// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, describe, vi } from 'vitest';
import '@/i18n/i18n';
import QuickClassSetup from '../QuickClassSetup';

const getStudentCountInput = () =>
  screen.getByLabelText(
    /Anzahl Platzhalter|Number of placeholder/i,
  ) as HTMLInputElement;
const getDecreaseButton = () =>
  screen.getByRole('button', { name: /Anzahl verringern|Decrease count/i });
const getIncreaseButton = () =>
  screen.getByRole('button', { name: /Anzahl erhöhen|Increase count/i });

describe('QuickClassSetup', () => {
  test('renders input field and button', () => {
    const onCreateClass = vi.fn();
    render(<QuickClassSetup onCreateClass={onCreateClass} />);

    expect(getStudentCountInput()).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Klasse anlegen|Create Class/i }),
    ).toBeInTheDocument();
  });

  test('Button zum Verringern resetet den Wert unterhalb von 1', async () => {
    const user = userEvent.setup();
    render(<QuickClassSetup onCreateClass={vi.fn()} />);

    const input = getStudentCountInput();
    await user.type(input, '1');
    await user.click(getDecreaseButton());

    expect(input.value).toBe('');
  });

  test('Button zum Erhöhen setzt leeres Feld auf 1', async () => {
    const user = userEvent.setup();
    render(<QuickClassSetup onCreateClass={vi.fn()} />);

    const input = getStudentCountInput();
    expect(input.value).toBe('');

    await user.click(getIncreaseButton());

    await waitFor(() => {
      expect(input.value).toBe('1');
    });
  });

  test('ArrowDownIcon resetet den Wert unterhalb von 1', async () => {
    const user = userEvent.setup();
    render(<QuickClassSetup onCreateClass={vi.fn()} />);

    const input = getStudentCountInput();
    await user.type(input, '1');
    await user.keyboard('{ArrowDownIcon}');

    expect(input.value).toBe('');
  });

  test('ArrowUpIcon setzt leeres Feld auf 1', async () => {
    const user = userEvent.setup();
    render(<QuickClassSetup onCreateClass={vi.fn()} />);

    const input = getStudentCountInput();
    expect(input.value).toBe('');

    await user.click(input);
    await user.keyboard('{ArrowUpIcon}');

    await waitFor(() => {
      expect(input.value).toBe('1');
    });
  });

  test('does not call onCreateClass when no count is entered', async () => {
    const user = userEvent.setup();
    const onCreateClass = vi.fn();
    render(<QuickClassSetup onCreateClass={onCreateClass} />);

    const button = screen.getByRole('button', {
      name: /Klasse anlegen|Create Class/i,
    });
    await user.click(button);

    expect(onCreateClass).not.toHaveBeenCalled();
  });

  test('ignores count 0 when creating class', async () => {
    const user = userEvent.setup();
    const onCreateClass = vi.fn();
    render(<QuickClassSetup onCreateClass={onCreateClass} />);

    const input = getStudentCountInput();
    await user.type(input, '0');

    const button = screen.getByRole('button', {
      name: /Klasse anlegen|Create Class/i,
    });
    await user.click(button);

    expect(onCreateClass).not.toHaveBeenCalled();
  });

  test('button is disabled when count exceeds MAX_STUDENTS (36)', async () => {
    const user = userEvent.setup();
    const onCreateClass = vi.fn();
    render(<QuickClassSetup onCreateClass={onCreateClass} />);

    const input = getStudentCountInput();
    await user.type(input, '37');

    const button = screen.getByRole('button', {
      name: /Klasse anlegen|Create Class/i,
    });
    await user.click(button);

    expect(onCreateClass).not.toHaveBeenCalled();
  });

  test('button is enabled when valid count is entered', async () => {
    const user = userEvent.setup();
    const onCreateClass = vi.fn();
    render(<QuickClassSetup onCreateClass={onCreateClass} />);

    const input = getStudentCountInput();
    await user.type(input, '24');

    const button = screen.getByRole('button', {
      name: /Klasse anlegen|Create Class/i,
    });
    expect(button).toBeEnabled();
  });

  test('calls onCreateClass with correct count when button is clicked', async () => {
    const user = userEvent.setup();
    const onCreateClass = vi.fn();
    render(<QuickClassSetup onCreateClass={onCreateClass} />);

    const input = getStudentCountInput();
    await user.type(input, '24');

    const button = screen.getByRole('button', {
      name: /Klasse anlegen|Create Class/i,
    });
    await user.click(button);

    expect(onCreateClass).toHaveBeenCalledWith(24);
    expect(onCreateClass).toHaveBeenCalledTimes(1);
  });

  test('calls onCreateClass when Enter is pressed in input field', async () => {
    const user = userEvent.setup();
    const onCreateClass = vi.fn();
    render(<QuickClassSetup onCreateClass={onCreateClass} />);

    const input = getStudentCountInput();
    await user.type(input, '18{Enter}');

    expect(onCreateClass).toHaveBeenCalledWith(18);
    expect(onCreateClass).toHaveBeenCalledTimes(1);
  });

  test('resets input field after successful creation', async () => {
    const user = userEvent.setup();
    const onCreateClass = vi.fn();
    render(<QuickClassSetup onCreateClass={onCreateClass} />);

    const input = getStudentCountInput();
    await user.type(input, '20');

    const button = screen.getByRole('button', {
      name: /Klasse anlegen|Create Class/i,
    });
    await user.click(button);

    expect(input.value).toBe('');
  });

  test('does not call onCreateClass when Enter is pressed with invalid count', async () => {
    const user = userEvent.setup();
    const onCreateClass = vi.fn();
    render(<QuickClassSetup onCreateClass={onCreateClass} />);

    const input = getStudentCountInput();
    await user.type(input, '50{Enter}');

    expect(onCreateClass).not.toHaveBeenCalled();
  });

  test('respects disabled prop', async () => {
    const user = userEvent.setup();
    const onCreateClass = vi.fn();
    render(<QuickClassSetup onCreateClass={onCreateClass} disabled={true} />);

    const input = getStudentCountInput();
    await user.type(input, '24');

    const button = screen.getByRole('button', {
      name: /Klasse anlegen|Create Class/i,
    });
    expect(button).toBeDisabled();

    await user.click(button);
    expect(onCreateClass).not.toHaveBeenCalled();
  });

  test('works with edge cases (1 and 36 students)', async () => {
    const user = userEvent.setup();
    const onCreateClass = vi.fn();
    const { rerender } = render(
      <QuickClassSetup onCreateClass={onCreateClass} />,
    );

    // Test with 1 student
    const input = getStudentCountInput();
    await user.type(input, '1');

    let button = screen.getByRole('button', {
      name: /Klasse anlegen|Create Class/i,
    });
    expect(button).toBeEnabled();
    await user.click(button);
    expect(onCreateClass).toHaveBeenCalledWith(1);

    // Re-render and test with 36 students
    rerender(<QuickClassSetup onCreateClass={onCreateClass} />);
    await user.type(getStudentCountInput(), '36');

    button = screen.getByRole('button', {
      name: /Klasse anlegen|Create Class/i,
    });
    expect(button).toBeEnabled();
    await user.click(button);
    expect(onCreateClass).toHaveBeenCalledWith(36);
  });

  test('increases value repeatedly while holding increment button', () => {
    vi.useFakeTimers();
    const onCreateClass = vi.fn();

    try {
      render(<QuickClassSetup onCreateClass={onCreateClass} />);
      const input = getStudentCountInput();
      const increaseButton = getIncreaseButton();

      fireEvent.pointerDown(increaseButton, {
        pointerType: 'mouse',
        button: 0,
        pointerId: 1,
      });

      act(() => {
        vi.advanceTimersByTime(360);
      });
      expect(input.value).toBe('1');

      act(() => {
        vi.advanceTimersByTime(180);
      });
      expect(input.value).toBe('3');

      fireEvent.pointerUp(increaseButton, {
        pointerType: 'mouse',
        button: 0,
        pointerId: 1,
      });
      fireEvent.click(increaseButton);

      expect(input.value).toBe('3');
    } finally {
      vi.useRealTimers();
    }
  });
});
