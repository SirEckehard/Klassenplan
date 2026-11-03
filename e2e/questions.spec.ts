// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * What a deletion asks depends on what it takes along (decision 0041): a student
 * goes at once with "Rückgängig" on a card, a plan asks at the inspector's foot,
 * and a class asks in a dialog that counts what goes.
 *
 * The locale is pinned to German, as in the core flow.
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
  });
});

const STUDENTS = ['Ada Lovelace', 'Grace Hopper'];
const rowOf = (page: Page, name: string) =>
  page.getByRole('button', { name: `${name} im Inspektor öffnen` });
const statusBar = (page: Page) =>
  page.getByRole('region', { name: 'Statusleiste' });

async function createClass(page: Page): Promise<void> {
  await page.goto('/generator');
  const classField = page.getByRole('textbox', {
    name: 'Name der neuen Klasse',
  });
  await classField.fill('8b');
  await page.getByRole('button', { name: 'Klasse anlegen' }).click();
  await expect(classField).toBeHidden();

  await page.getByRole('button', { name: 'Schüler hinzufügen' }).click();
  const popover = page.getByRole('dialog', { name: 'Schüler hinzufügen' });
  const nameField = popover.getByRole('textbox', { name: /Neuer Schüler/ });
  for (const name of STUDENTS) {
    await nameField.fill(name);
    await popover.getByRole('button', { name: 'Schüler hinzufügen' }).click();
    await expect(rowOf(page, name)).toBeVisible();
  }
  await page.keyboard.press('Escape');
  await expect(popover).toBeHidden();
}

async function saveAPlan(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: 'Weiter zum Raum' }).click();
  await page
    .getByRole('complementary', { name: 'Eigenschaften' })
    .getByRole('button', { name: /^Doppelplätze/ })
    .click();
  await page.getByRole('button', { name: 'Weiter zum Sitzplan' }).click();
  await expect(page.getByRole('group', { name: /^Sitzplan:/ })).toBeVisible();

  const inspector = page.getByRole('complementary', { name: 'Plan' });
  await inspector
    .getByRole('heading', { level: 2 })
    .getByRole('button')
    .click();
  const field = inspector.getByRole('textbox', { name: 'Name des Sitzplans' });
  await field.fill(name);
  await field.press('Enter');
  await expect(inspector.getByText('Heute gespeichert')).toBeVisible();
}

test('a student goes without a question and comes back from the card', async ({
  page,
}) => {
  await createClass(page);
  const undo = page.getByRole('button', { name: 'Rückgängig', exact: true });

  await rowOf(page, 'Ada Lovelace').click();
  await page
    .getByRole('button', { name: 'Schüler löschen', exact: true })
    .click();
  await expect(rowOf(page, 'Ada Lovelace')).toHaveCount(0);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);

  await undo.click();
  await expect(rowOf(page, 'Ada Lovelace')).toBeVisible();
  await expect(undo).toHaveCount(0);

  // A later change to the list takes the card away: its undo would take back
  // that change instead of the deletion it speaks of.
  await rowOf(page, 'Ada Lovelace').click();
  await page
    .getByRole('button', { name: 'Schüler löschen', exact: true })
    .click();
  await expect(undo).toBeVisible();
  await page.getByRole('button', { name: 'Schüler hinzufügen' }).click();
  const popover = page.getByRole('dialog', { name: 'Schüler hinzufügen' });
  await popover
    .getByRole('textbox', { name: /Neuer Schüler/ })
    .fill('Alan Turing');
  await popover.getByRole('button', { name: 'Schüler hinzufügen' }).click();
  await expect(rowOf(page, 'Alan Turing')).toBeVisible();
  await expect(undo).toHaveCount(0);
});

test('a plan asks at the inspector foot, a class in a dialog that counts', async ({
  page,
}) => {
  await createClass(page);
  await saveAPlan(page, 'Woche 1');

  await page.getByRole('link', { name: 'Bibliothek' }).click();
  await expect(page).toHaveURL(/\/bibliothek$/);
  const planRow = page.getByRole('option', { name: /^Woche 1/ });
  await expect(planRow).toHaveAttribute('aria-selected', 'true');

  await test.step('Entf asks at the foot, and Escape takes it back', async () => {
    await planRow.focus();
    await page.keyboard.press('Delete');
    const question = page.getByRole('alertdialog', { name: 'Plan löschen?' });
    await expect(
      question.getByRole('button', { name: 'Abbrechen' }),
    ).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(question).toHaveCount(0);
    await expect(planRow).toBeFocused();
  });

  await test.step('the foot deletes once it is answered', async () => {
    await page.getByRole('button', { name: 'Plan löschen' }).click();
    await page
      .getByRole('alertdialog', { name: 'Plan löschen?' })
      .getByRole('button', { name: 'Löschen' })
      .click();
    await expect(planRow).toHaveCount(0);
  });

  await test.step('the class counts what goes with it', async () => {
    await page.getByRole('option', { name: /^8b/ }).click();
    await page.getByRole('button', { name: 'Klasse löschen' }).click();
    const dialog = page.getByRole('alertdialog', { name: '„8b“ löschen?' });
    await expect(dialog.getByRole('listitem').first()).toHaveText(
      /Schüler\s*2/,
    );
    await expect(
      dialog.getByRole('button', { name: 'Backup sichern' }),
    ).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: 'Abbrechen' }),
    ).toBeFocused();
    await dialog.getByRole('button', { name: 'Klasse löschen' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('option', { name: /^8b/ })).toHaveCount(0);
  });

  await expect(statusBar(page)).toBeVisible();
});
