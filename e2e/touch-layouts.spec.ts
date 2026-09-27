// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The workspace below `lg`, where the inspector and the toolbar have no column.
 *
 * An iPad in portrait once opened students into a column that stayed hidden,
 * and nothing noticed: every other spec runs at desktop width. These run in
 * the `tablet` and `phone` projects (`playwright.config.ts`) and walk what
 * only exists there — the inspector as a drawer or a sheet, the switch in the
 * status bar that opens a layer's panel, and on a phone the toolbar as a
 * sheet — through the same journey: a class, a student edited, the plan mixed.
 */
import { test, expect, type Page } from '@playwright/test';

test.use({ locale: 'de-DE' });
test.setTimeout(120_000);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'spg.onboardingTour',
      JSON.stringify({ version: 1, seen: [], skipped: true }),
    );
    // The consent banner lies over the status bar on a narrow screen.
    window.localStorage.setItem('cookieConsent', 'true');
  });
});

const statusBar = (page: Page) =>
  page.getByRole('region', { name: 'Statusleiste' });

async function loadSampleClass(page: Page): Promise<void> {
  await page.goto('/generator');
  await page
    .getByRole('button', { name: 'Beispielklasse laden', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: /Aktive Klasse: Beispielklasse/ }),
  ).toContainText('24 Schüler');
}

/** Opens a student and sets a gender in whatever form the inspector takes. */
async function editStudent(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Emma Becker im Inspektor/ }).click();
  const gender = page.getByRole('group', { name: 'Geschlecht' });
  await expect(gender).toBeVisible();
  const diverse = gender.getByRole('button', { name: 'Divers' });
  await diverse.click();
  await expect(diverse).toHaveAttribute('aria-pressed', 'true');
}

/** From the class to the mixed plan, opening the criteria on the way. */
async function mixThePlan(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Weiter zum Klassenraum' }).click();
  await expect(statusBar(page)).toContainText('24 Plätze für 24 Schüler');

  await page.getByRole('button', { name: 'Weiter zum Sitzplan' }).click();
  const plan = page.getByRole('group', { name: /^Sitzplan:/ });
  await expect(plan).toHaveAccessibleName('Sitzplan: 24 von 24 Plätzen belegt');

  // The criteria have no column here: the switch at the right end of the
  // status bar opens them.
  const criteriaSwitch = statusBar(page).getByRole('button', {
    name: 'Mischkriterien',
  });
  await criteriaSwitch.click();
  await expect(criteriaSwitch).toHaveAttribute('aria-expanded', 'true');
  // The recipe above the criteria says how many of them carry weight.
  await expect(
    page
      .getByRole('complementary', { name: 'Mischkriterien' })
      .getByRole('button', { name: /Kriterien aktiv/ }),
  ).toBeVisible();
  await criteriaSwitch.click();
  await expect(criteriaSwitch).toHaveAttribute('aria-expanded', 'false');

  await statusBar(page)
    .getByRole('button', { name: /^Mischen/ })
    .click();
  await expect(plan).toHaveAccessibleName('Sitzplan: 24 von 24 Plätzen belegt');
}

// Each test belongs to one project, which picks it by its tag.
test(
  'an iPad in portrait edits in a drawer and mixes the plan',
  { tag: '@tablet' },
  async ({ page }) => {
    await loadSampleClass(page);

    await test.step('the toolbar is a column of icons with its switch below', async () => {
      const expand = statusBar(page).getByRole('button', {
        name: 'Werkzeugleiste erweitern',
      });
      await expect(expand).toHaveAttribute('aria-expanded', 'false');
      await expand.click();
      await expect(
        statusBar(page).getByRole('button', {
          name: 'Werkzeugleiste minimieren',
        }),
      ).toHaveAttribute('aria-expanded', 'true');
    });

    await test.step('a student opens in the drawer on the right', async () => {
      await editStudent(page);
      await expect(
        page.getByRole('complementary', { name: /Merkmale/ }),
      ).toBeVisible();
    });

    await test.step('the plan is mixed with the criteria in reach', async () => {
      await page.keyboard.press('Escape');
      await mixThePlan(page);
    });
  },
);

test(
  'a phone reaches the toolbar and the inspector as sheets',
  { tag: '@phone' },
  async ({ page }) => {
    await loadSampleClass(page);

    await test.step('the toolbar opens from the status bar, nothing floats', async () => {
      const open = statusBar(page).getByRole('button', {
        name: 'Werkzeugleiste öffnen',
      });
      await expect(open).toHaveAttribute('aria-expanded', 'false');
      await open.click();

      const sheet = page.getByRole('dialog', { name: 'Werkzeugleiste' });
      await expect(
        sheet.getByRole('button', { name: 'Schüler hinzufügen' }),
      ).toBeVisible();
      await sheet.getByRole('button', { name: 'Schließen' }).click();
      await expect(sheet).toBeHidden();
      await expect(open).toHaveAttribute('aria-expanded', 'false');
    });

    await test.step('a student opens in a sheet from the bottom', async () => {
      await editStudent(page);
    });

    await test.step('the plan is mixed with the criteria in reach', async () => {
      await page.keyboard.press('Escape');
      await mixThePlan(page);
    });
  },
);
