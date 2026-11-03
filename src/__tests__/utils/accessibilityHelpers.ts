// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { expect } from 'vitest';

/**
 * Accessibility-focused test helpers for robust component testing
 *
 * These helpers prioritize ARIA attributes and semantic HTML over
 * fragile text-based queries, making tests more resilient to UI changes.
 */

/**
 * Find button by accessible name (handles aria-label and visible text)
 */
export function getButton(name: string | RegExp) {
  return screen.getByRole('button', { name });
}

/**
 * Find heading by level and text
 */
export function getHeading(
  name: string | RegExp,
  level?: 1 | 2 | 3 | 4 | 5 | 6,
) {
  if (level) {
    return screen.getByRole('heading', { name, level });
  }
  return screen.getByRole('heading', { name });
}

/**
 * Find dialog/modal by title
 */
export function getDialog(title?: string | RegExp) {
  if (title) {
    return screen.getByRole('dialog', { name: title });
  }
  return screen.getByRole('dialog');
}

/**
 * Answers a question at its button with yes, once it takes a press: its confirm
 * ignores the second click of the double click that asked (`InlineQuestion`).
 */
export async function confirmInlineQuestion(name: RegExp): Promise<void> {
  const question = await screen.findByRole('alertdialog', { name });
  const buttons = within(question).getAllByRole('button');
  const confirm = buttons[buttons.length - 1];
  await waitFor(() => expect(confirm).not.toHaveAttribute('aria-disabled'));
  fireEvent.click(confirm);
}
