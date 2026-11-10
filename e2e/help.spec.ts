// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The help beside the stage, in the inspector's column: its keyboard
 * shortcuts unfold below the instructions, so the column has to bring them
 * into view — otherwise pressing "Tastenkürzel" seems to do nothing. jsdom
 * lays nothing out, so only a browser can tell.
 */
import { test, expect } from '@playwright/test';

test.use({ locale: 'de-DE' });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'spg.onboardingTour',
      JSON.stringify({ version: 1, seen: [], skipped: true }),
    );
  });
});

test('the keyboard shortcuts scroll into view as they unfold', async ({
  page,
}) => {
  await page.goto('/generator');
  const field = page.getByRole('textbox', { name: 'Name der neuen Klasse' });
  await field.fill('7b');
  await page.getByRole('button', { name: 'Klasse anlegen' }).click();
  await expect(field).toBeHidden();

  await page.getByRole('button', { name: 'Hilfe', exact: true }).click();
  const help = page.getByRole('complementary', { name: 'Hilfe' });
  await expect(
    help.getByRole('heading', { name: 'Klassenliste', level: 2 }),
  ).toBeVisible();

  const toggle = help.getByRole('button', { name: 'Tastenkürzel' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();

  // The row stays in view above the keys it opened, and the first of them
  // is seen whole.
  await expect(help.getByRole('heading', { name: 'Allgemein' })).toBeInViewport(
    { ratio: 1 },
  );
  await expect(toggle).toBeInViewport({ ratio: 1 });
});
