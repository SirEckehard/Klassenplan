// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { screen, within } from '@testing-library/react';
import { expect } from 'vitest';

/**
 * Finds the toast region, so a test asserts what a toast says rather than how
 * it is built:
 *
 * ```typescript
 * await user.click(saveButton);
 * expectErrorToast(/Speichern fehlgeschlagen|Saving failed/);
 * ```
 */

/** The toast region: a status role, a toast class, or an aria-live region. */
function findToastContainer(): HTMLElement | null {
  // Strategy 1: Look for common toast container attributes
  const byRole = screen.queryByRole('status');
  if (byRole) return byRole;

  // Strategy 2: Look for common toast class names
  const byClass = document.querySelector('[class*="toast"]') as HTMLElement;
  if (byClass) return byClass;

  // Strategy 3: Look for aria-live regions
  const byAriaLive = document.querySelector(
    '[aria-live="polite"]',
  ) as HTMLElement;
  if (byAriaLive) return byAriaLive;

  return null;
}

/**
 * Expect an error toast with optional message
 */
export function expectErrorToast(message?: string | RegExp) {
  const container = findToastContainer();
  expect(container, 'Toast container should be present').toBeTruthy();

  if (message && container) {
    expect(within(container).getByText(message)).toBeInTheDocument();
  }

  return container;
}
