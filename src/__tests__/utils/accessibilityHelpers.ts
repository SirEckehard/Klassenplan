// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { screen, within } from '@testing-library/react';
import { expect } from 'vitest';

/**
 * Accessibility-focused test helpers for robust component testing
 *
 * These helpers prioritize ARIA attributes and semantic HTML over
 * fragile text-based queries, making tests more resilient to UI changes.
 */

/**
 * Find alert by optional name pattern
 */
export function getAlert(name?: string | RegExp) {
  if (name) {
    return screen.getByRole('alert', { name });
  }
  return screen.getByRole('alert');
}

/**
 * Query alert by optional name pattern (non-throwing)
 */
export function queryAlert(name?: string | RegExp) {
  if (name) {
    return screen.queryByRole('alert', { name });
  }
  return screen.queryByRole('alert');
}

/**
 * Expect alert to be present with optional text content
 */
export function expectAlert(textContent?: string) {
  const alert = getAlert();
  expect(alert).toBeInTheDocument();

  if (textContent) {
    expect(alert).toHaveTextContent(textContent);
  }

  return alert;
}

/**
 * Find button by accessible name (handles aria-label and visible text)
 */
export function getButton(name: string | RegExp) {
  return screen.getByRole('button', { name });
}

/**
 * Find toggle button and check its pressed state
 */
export function getToggleButton(
  name: string | RegExp,
  expectedPressed?: boolean,
) {
  const button = screen.getByRole('button', { name });

  if (expectedPressed !== undefined) {
    expect(button).toHaveAttribute('aria-pressed', expectedPressed.toString());
  }

  return button;
}

/**
 * Find expanded/collapsed section by name
 */
export function getExpandableSection(
  name: string | RegExp,
  expectedExpanded?: boolean,
) {
  const section = screen.getByRole('button', {
    name,
    expanded: expectedExpanded,
  });

  if (expectedExpanded !== undefined) {
    expect(section).toHaveAttribute(
      'aria-expanded',
      expectedExpanded.toString(),
    );
  }

  return section;
}

/**
 * Find form field by label text
 */
export function getField(labelText: string | RegExp) {
  return screen.getByLabelText(labelText);
}

/**
 * Find slider input by label
 */
export function getSlider(labelText: string | RegExp) {
  const slider = screen.getByLabelText(labelText);
  expect(slider).toHaveAttribute('type', 'range');
  return slider as HTMLInputElement;
}

/**
 * Find slider and verify its value
 */
export function expectSliderValue(
  labelText: string | RegExp,
  expectedValue: number,
) {
  const slider = getSlider(labelText);
  expect(slider.value).toBe(expectedValue.toString());
  return slider;
}

/**
 * Find checkbox by label and verify checked state
 */
export function getCheckbox(
  labelText: string | RegExp,
  expectedChecked?: boolean,
) {
  const checkbox = screen.getByRole('checkbox', { name: labelText });

  if (expectedChecked !== undefined) {
    if (expectedChecked) {
      expect(checkbox).toBeChecked();
    } else {
      expect(checkbox).not.toBeChecked();
    }
  }

  return checkbox;
}

/**
 * Find navigation links
 */
export function getNavLink(name: string | RegExp) {
  return screen.getByRole('link', { name });
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
 * Find list items within a specific list
 */
export function getListItems(listLabel?: string | RegExp): HTMLElement[] {
  if (listLabel) {
    const list = screen.getByRole('list', { name: listLabel });
    return within(list).getAllByRole('listitem');
  }
  return screen.getAllByRole('listitem');
}

/**
 * Find combobox/select by label
 */
export function getCombobox(labelText: string | RegExp) {
  return screen.getByRole('combobox', { name: labelText });
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
 * Query dialog/modal by title (non-throwing)
 */
export function queryDialog(title?: string | RegExp) {
  if (title) {
    return screen.queryByRole('dialog', { name: title });
  }
  return screen.queryByRole('dialog');
}

/**
 * Expect dialog to be open with optional title
 */
export function expectDialog(title?: string | RegExp) {
  const dialog = getDialog(title);
  expect(dialog).toBeInTheDocument();
  return dialog;
}

/**
 * Expect dialog to be closed
 */
export function expectDialogClosed() {
  const dialog = queryDialog();
  expect(dialog).not.toBeInTheDocument();
}

/**
 * Find status/live region
 */
export function getStatus(name?: string | RegExp) {
  if (name) {
    return screen.getByRole('status', { name });
  }
  return screen.getByRole('status');
}

/**
 * Find progress bar
 */
export function getProgressBar(name?: string | RegExp) {
  if (name) {
    return screen.getByRole('progressbar', { name });
  }
  return screen.getByRole('progressbar');
}

/**
 * Helper to test keyboard navigation
 */
export function expectFocusable(element: HTMLElement) {
  expect(element).toHaveAttribute('tabindex');
  return element;
}

/**
 * Helper to verify element has accessible name
 */
export function expectAccessibleName(
  element: HTMLElement,
  name: string | RegExp,
) {
  const accessibleName =
    element.getAttribute('aria-label') || element.textContent;
  if (typeof name === 'string') {
    expect(accessibleName).toBe(name);
  } else {
    expect(accessibleName).toMatch(name);
  }
  return element;
}
