// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * A class keeps its rooms, and "Bibliothek" shows which room a plan
 * belongs to (decision 0024): a plan saved in the classroom, a lab made as a
 * room of its own with a plan of its own, both found again as folders in
 * columns — after a reload too — and a plan opened from there in the
 * workspace, its room with it.
 *
 * The locale is pinned to German, as in the core flow.
 */
import { test, expect, type Page } from '@playwright/test';

test.use({ locale: 'de-DE' });

// Two rooms, two automatic mixes and a reload.
test.setTimeout(150_000);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'spg.onboardingTour',
      JSON.stringify({ version: 1, seen: [], skipped: true }),
    );
  });
});

const STUDENTS = [
  'Ada Lovelace',
  'Grace Hopper',
  'Alan Turing',
  'Edsger Dijkstra',
];

async function createClassWithStudents(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Neue Klasse' }).click();
  const dialog = page.getByRole('dialog', { name: 'Neue Klasse erstellen' });
  await dialog.getByRole('textbox', { name: /Klassenname/ }).fill('E2E Räume');
  await dialog.getByRole('button', { name: 'Klasse anlegen' }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole('button', { name: 'Schüler hinzufügen' }).click();
  const popover = page.getByRole('dialog', { name: 'Schüler hinzufügen' });
  const nameField = popover.getByRole('textbox', { name: /Neuer Schüler/ });
  for (const name of STUDENTS) {
    await nameField.fill(name);
    await popover.getByRole('button', { name: 'Schüler hinzufügen' }).click();
    await expect(
      page.getByRole('button', { name: `${name} im Inspektor öffnen` }),
    ).toBeVisible();
  }
  await page.keyboard.press('Escape');
  await expect(popover).toBeHidden();
}

/** The room inspector while nothing is selected: the room itself. */
const roomInspector = (page: Page) =>
  page.getByRole('complementary', { name: 'Eigenschaften' });

async function setUpDoubleTables(page: Page): Promise<void> {
  await roomInspector(page)
    .getByRole('button', { name: /^Doppelplätze/ })
    .click();
  await expect(
    page.getByRole('region', { name: 'Statusleiste' }),
  ).toContainText('4 Plätze für 4 Schüler');
}

async function mixAndSave(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'Weiter zum Sitzplan' }).click();
  await expect(
    page.getByRole('group', { name: /^Sitzplan:/ }),
  ).toHaveAccessibleName('Sitzplan: 4 von 4 Plätzen belegt');

  await page.getByRole('button', { name: 'Plan speichern' }).click();
  const field = page.getByRole('textbox', { name: 'Name des Sitzplans' });
  await field.fill(name);
  await field.press('Enter');
  await expect(
    page.getByTestId('toast-item').filter({ hasText: name }),
  ).toBeVisible();
}

const statusBar = (page: Page) =>
  page.getByRole('region', { name: 'Statusleiste' });

async function openLibrary(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Bibliothek' }).click();
  await expect(page).toHaveURL(/\/bibliothek$/);
}

test('a plan is found in its room, and a lab is a room of its own', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await test.step('a plan for the classroom', async () => {
    await page.goto('/generator');
    await createClassWithStudents(page);
    await page.getByRole('button', { name: 'Weiter zum Raum' }).click();
    await setUpDoubleTables(page);
    await mixAndSave(page, 'Woche 1');
  });

  await test.step('"Bibliothek" opens on it, in its room', async () => {
    await openLibrary(page);

    await expect(
      page
        .getByRole('listbox', { name: 'Klassen', exact: true })
        .getByRole('option', { name: /^E2E Räume/ }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(
      page.getByRole('option', { name: /^Klassenraum/ }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(
      page.getByRole('option', { name: /^Woche 1/ }),
    ).toHaveAttribute('aria-selected', 'true');
    await expect(
      page.getByRole('heading', { level: 2, name: 'Woche 1' }),
    ).toBeVisible();

    await statusBar(page).getByRole('button', { name: 'Zurück' }).click();
    await expect(page).toHaveURL(/\/generator$/);
  });

  await test.step('a lab, made as a room of its own, with its own plan', async () => {
    await page.getByRole('button', { name: 'Raum', exact: true }).click();
    await roomInspector(page)
      .getByRole('button', { name: 'Neuer Raum' })
      .click();
    const name = roomInspector(page).getByRole('textbox', {
      name: 'Name des Raums',
    });
    await name.fill('Labor');
    await name.press('Enter');

    await expect(
      roomInspector(page).getByRole('heading', { level: 2, name: 'Labor' }),
    ).toBeVisible();
    await setUpDoubleTables(page);
    await mixAndSave(page, 'Laborplan');
  });

  await test.step('both rooms keep their plans, also after a reload', async () => {
    await openLibrary(page);
    await page.reload();

    await expect(
      page.getByRole('option', { name: /^Klassenraum/ }),
    ).toBeVisible();
    await expect(page.getByRole('option', { name: /^Labor/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(
      page.getByRole('option', { name: /^Laborplan/ }),
    ).toBeVisible();

    await page.getByRole('option', { name: /^Klassenraum/ }).click();
    await expect(page.getByRole('option', { name: /^Woche 1/ })).toBeVisible();
    await expect(page.getByRole('option', { name: /^Laborplan/ })).toHaveCount(
      0,
    );
  });

  await test.step('a plan opens in the workspace, its room with it', async () => {
    await page.getByRole('option', { name: /^Woche 1/ }).click();
    await statusBar(page).getByRole('button', { name: 'Öffnen' }).click();

    await expect(page).toHaveURL(/\/generator$/);
    await expect(
      page.getByRole('group', { name: /^Sitzplan:/ }),
    ).toHaveAccessibleName('Sitzplan: 4 von 4 Plätzen belegt');

    await page.getByRole('button', { name: 'Raum', exact: true }).click();
    await expect(
      roomInspector(page).getByRole('heading', {
        level: 2,
        name: 'Klassenraum',
      }),
    ).toBeVisible();
  });

  expect(consoleErrors).toEqual([]);
});
