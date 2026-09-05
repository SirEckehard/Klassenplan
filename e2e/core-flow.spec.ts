// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The one journey the app exists for: create a class, add students, lay out the
 * room, let the algorithm seat everyone, save the plan and reach the export.
 *
 * Unit tests cover each of those pieces in isolation; this spec is the only
 * thing that proves they still add up — the wizard steps, three state layers
 * (context, Zustand stores, XState machines), the algorithm worker and the
 * IndexedDB persistence all have to agree for it to pass.
 *
 * The locale is pinned: `LanguageWrapper` forces German on every path without
 * an `/en` prefix anyway, and a twenty-step flow written with bilingual regexes
 * would be unreadable. `/en` coverage belongs in its own spec.
 */
import { test, expect, type Page } from '@playwright/test';

test.use({ locale: 'de-DE' });

// The flow walks four wizard steps and waits on a real algorithm run, so it
// needs considerably more than the 30s default.
test.setTimeout(120_000);

const STUDENTS = [
  'Ada Lovelace',
  'Grace Hopper',
  'Alan Turing',
  'Edsger Dijkstra',
];

async function createClass(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'Neue Klasse' }).click();
  const dialog = page.getByRole('dialog', { name: 'Neue Klasse erstellen' });
  await dialog.getByRole('textbox', { name: /Klassenname/ }).fill(name);
  await dialog.getByRole('button', { name: 'Klasse anlegen' }).click();
  await expect(dialog).toBeHidden();
}

async function addStudents(page: Page, names: string[]): Promise<void> {
  await page.getByRole('button', { name: 'Hinzufügen' }).click();
  const popover = page.getByRole('dialog', { name: 'Schüler hinzufügen' });
  const nameField = popover.getByRole('textbox', { name: /Neuer Schüler/ });

  // The popover deliberately stays open after each add so a whole class can be
  // typed in one go.
  for (const name of names) {
    await nameField.fill(name);
    await popover.getByRole('button', { name: 'Schüler hinzufügen' }).click();
    await expect(
      page.getByRole('button', { name: `Namen bearbeiten: ${name}` }),
    ).toBeVisible();
  }

  await page.keyboard.press('Escape');
  await expect(popover).toBeHidden();
}

test('a teacher can go from an empty app to an exportable seating plan', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await test.step('step 1 — create a class and fill it', async () => {
    await page.goto('/generator');
    await createClass(page, 'E2E Klasse');
    await addStudents(page, STUDENTS);

    await expect(
      page.getByRole('button', { name: /Aktive Klasse: E2E Klasse/ }),
    ).toContainText('4 Schüler');
  });

  await test.step('step 2 — let the quick setup build a room', async () => {
    await page.getByRole('button', { name: 'Weiter zum Klassenraum' }).click();

    await page
      .getByRole('dialog', { name: 'Klassenraum einrichten' })
      .getByRole('button', { name: /Doppelplatz/ })
      .click();

    // The badge is the editor's own verdict on whether the room fits the class.
    // Named explicitly because toasts also carry role="status".
    await expect(
      page.getByRole('status', { name: '4 Schüler, 4 Plätze.' }),
    ).toBeVisible();
  });

  await test.step('step 3 — the algorithm seats every student', async () => {
    await page.getByRole('button', { name: 'Weiter zum Sitzplan' }).click();

    // Entering step 3 triggers the automatic first mix.
    const plan = page.getByRole('group', { name: /^Sitzplan:/ });
    await expect(plan).toHaveAccessibleName('Sitzplan: 4 von 4 Plätzen belegt');

    for (const name of STUDENTS) {
      await expect(
        plan.getByRole('button', { name: new RegExp(`^${name} – Tisch`) }),
      ).toBeVisible();
    }
  });

  await test.step('step 3 — a manual mix reseats everyone', async () => {
    await page.getByRole('button', { name: 'Sitzplan mischen' }).click();

    const plan = page.getByRole('group', { name: /^Sitzplan:/ });
    await expect(plan).toHaveAccessibleName('Sitzplan: 4 von 4 Plätzen belegt');
    for (const name of STUDENTS) {
      await expect(
        plan.getByRole('button', { name: new RegExp(`^${name} – Tisch`) }),
      ).toBeVisible();
    }
  });

  await test.step('step 3 — save the plan under a name', async () => {
    await page
      .getByRole('textbox', { name: /Namen für diesen Sitzplan/ })
      .fill('E2E Plan');
    await page.getByRole('button', { name: 'Plan speichern' }).click();

    // Filtered rather than indexed: earlier toasts (class created, plan mixed)
    // may still be on screen and their order is not this test's business.
    await expect(
      page.getByTestId('toast-item').filter({ hasText: 'E2E Plan' }),
    ).toBeVisible();
  });

  await test.step('step 4 — the export renders a preview', async () => {
    await page.getByRole('button', { name: 'Exportieren' }).click();

    await expect(page).toHaveURL(/\/export$/);
    await expect(
      page.getByRole('button', { name: 'Sitzplan PDF' }),
    ).toBeEnabled();

    // The preview is an iframe with the rendered plan inside; reaching into it
    // proves the SVG renderer produced something, not just that a frame exists.
    const preview = page.frameLocator('iframe').locator('svg').first();
    await expect(preview).toBeAttached();
  });

  expect(consoleErrors).toEqual([]);
});

test('the class and its plan survive a reload', async ({ page }) => {
  await page.goto('/generator');
  await createClass(page, 'Persistenz 8c');
  await addStudents(page, ['Ada Lovelace', 'Grace Hopper']);

  // Writes are queued behind an idle callback, so give the flush a beat before
  // pulling the page out from under it.
  await expect(
    page.getByRole('button', { name: /Aktive Klasse: Persistenz 8c/ }),
  ).toContainText('2 Schüler');

  await page.reload();

  await expect(
    page.getByRole('button', { name: /Aktive Klasse: Persistenz 8c/ }),
  ).toContainText('2 Schüler');
  await expect(
    page.getByRole('button', { name: 'Namen bearbeiten: Ada Lovelace' }),
  ).toBeVisible();
});
