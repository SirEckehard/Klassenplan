// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { test, expect } from '@playwright/test';

// Minimal smoke coverage: the app boots, the start page renders and the
// generator wizard is reachable. UI texts are matched bilingually because the
// active language depends on the browser locale.

test('start page renders hero, preview carousel and CTA', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /Sitzplan erstellen leicht gemacht|Seating plans made easy/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', {
      name: /Plane jetzt deine Klasse|Plan your class now/i,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: /App-Vorschau|App preview/i }),
  ).toBeVisible();
});

test('generator wizard loads step 1', async ({ page }) => {
  await page.goto('/generator');
  await expect(page.locator('#main')).toBeVisible();
  // Step 1 offers creating a class or importing a CSV before students exist.
  await expect(
    page.getByRole('button', { name: /Klasse|Class/i }).first(),
  ).toBeVisible();
});

test('export page shows an empty state without a seating plan', async ({
  page,
}) => {
  await page.goto('/export');
  await expect(
    page.getByText(
      /Noch kein Sitzplan zum Exportieren|No seating plan to export yet/i,
    ),
  ).toBeVisible();
});
