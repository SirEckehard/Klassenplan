// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { screen } from '@testing-library/react';

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
