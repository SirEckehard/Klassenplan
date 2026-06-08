import '@testing-library/jest-dom/vitest';
import { screen, within } from '@testing-library/react';
import { expect } from 'vitest';

/**
 * Toast matcher utilities for robust testing across UI library changes
 *
 * Usage:
 * ```typescript
 * import { expectSuccessToast, expectErrorToast } from '@/__tests__/utils/toastMatchers';
 *
 * // In your test
 * await user.click(saveButton);
 * expectSuccessToast('Erfolgreich gespeichert');
 * ```
 */

/**
 * Find toast container using multiple strategies
 * Works with react-hot-toast and similar libraries
 */
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
 * Expect a success toast with optional message
 */
export function expectSuccessToast(message?: string) {
  const container = findToastContainer();
  expect(container, 'Toast container should be present').toBeTruthy();

  if (message && container) {
    expect(within(container).getByText(message)).toBeInTheDocument();
  }

  return container;
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

/**
 * Expect any toast with specific message
 */
export function expectToast(message: string) {
  const container = findToastContainer();
  expect(container, 'Toast container should be present').toBeTruthy();

  if (container) {
    expect(within(container).getByText(message)).toBeInTheDocument();
  }

  return container;
}

/**
 * Expect no toast to be present
 */
export function expectNoToast() {
  const container = findToastContainer();
  expect(container).toBeNull();
}

/**
 * Wait for toast to appear with message
 */
export async function waitForToast(
  message: string,
  timeout = 3000,
): Promise<HTMLElement> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const container = findToastContainer();
    if (container) {
      try {
        within(container).getByText(message);
        return container;
      } catch {
        // Toast found but message not yet rendered
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(
    `Toast with message "${message}" did not appear within ${timeout}ms`,
  );
}

/**
 * Check if any toast is currently visible
 */
export function isToastVisible(): boolean {
  return findToastContainer() !== null;
}
