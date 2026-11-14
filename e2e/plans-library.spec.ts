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
  const classField = page.getByRole('textbox', {
    name: 'Name der neuen Klasse',
  });
  await classField.fill('E2E Räume');
  await page.getByRole('button', { name: 'Klasse anlegen' }).click();
  await expect(classField).toBeHidden();

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

  // The plan is named in the inspector's header, and Enter saves under the
  // name.
  const inspector = page.getByRole('complementary', { name: 'Plan' });
  await inspector
    .getByRole('heading', { level: 2 })
    .getByRole('button')
    .click();
  const field = inspector.getByRole('textbox', { name: 'Name des Sitzplans' });
  await field.fill(name);
  await field.press('Enter');
  // Its head says it was saved; no card says it over the stage.
  await expect(inspector.getByText('Heute gespeichert')).toBeVisible();
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
    // "Neuer Raum" is a row of the room's section that names the room
    // before it is made; the open room's own name is the header's.
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
    await expect(
      page.getByRole('option', { name: /^Labor\b/ }),
    ).toHaveAttribute('aria-selected', 'true');
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

// Decision 0038: a mix kept as a preset of one's own is offered in every
// class and listed in "Bibliothek", which applies a preset without mixing.
test('a preset of your own is kept and found in "Bibliothek"', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  const inspector = page.getByRole('complementary', { name: 'Plan' });
  const presetButton = inspector.getByRole('button', {
    name: /^Voreinstellung:/,
  });

  await test.step('a shipped preset, changed and kept as a new one', async () => {
    await page.goto('/generator');
    await createClassWithStudents(page);
    // Two genders, so mixing them is a criterion this class can weigh.
    for (const [student, gender] of [
      ['Ada Lovelace', 'Weiblich'],
      ['Alan Turing', 'Männlich'],
    ] as const) {
      await page
        .getByRole('button', { name: `${student} im Inspektor öffnen` })
        .click();
      const choice = page
        .getByRole('group', { name: 'Geschlecht' })
        .getByRole('button', { name: gender });
      await choice.click();
      await expect(choice).toHaveAttribute('aria-pressed', 'true');
    }
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Weiter zum Raum' }).click();
    await setUpDoubleTables(page);
    await page.getByRole('button', { name: 'Weiter zum Sitzplan' }).click();

    await presetButton.click();
    await page
      .getByRole('dialog', { name: 'Voreinstellung' })
      .getByRole('button', { name: /^Klassenarbeit/ })
      .click();
    await expect(presetButton).toHaveAccessibleName(
      'Voreinstellung: Klassenarbeit',
    );

    await inspector
      .getByRole('button', { name: 'Geschlechter: Wichtig', exact: true })
      .click();
    await expect(presetButton).toHaveAccessibleName(
      'Voreinstellung: Klassenarbeit · geändert',
    );

    await inspector
      .getByRole('button', { name: 'Als neue Voreinstellung speichern …' })
      .click();
    const name = inspector.getByRole('textbox', {
      name: 'Name der Voreinstellung',
    });
    await name.fill('Stillarbeit');
    await name.press('Enter');
    await expect(presetButton).toHaveAccessibleName(
      'Voreinstellung: Stillarbeit',
    );

    // The class keeps which preset its criteria came from. The way to the
    // plan waits for the class to be read back: before its students are
    // there, the plan layer refuses (no students) and the page stays put.
    await page.reload();
    await expect(
      page.getByRole('button', { name: `${STUDENTS[0]} im Inspektor öffnen` }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Sitzplan', exact: true }).click();
    await expect(presetButton).toHaveAccessibleName(
      'Voreinstellung: Stillarbeit',
    );
  });

  await test.step('"Bibliothek" lists it, also after a reload', async () => {
    await openLibrary(page);
    await page.reload();
    await page.getByRole('option', { name: /^Voreinstellungen/ }).click();
    await page.getByRole('option', { name: /^Stillarbeit/ }).click();

    await expect(
      page.getByRole('heading', { level: 2, name: 'Stillarbeit' }),
    ).toBeVisible();
  });

  await test.step('"Übernehmen" sets the open class to a preset', async () => {
    await page.getByRole('option', { name: /^Standard/ }).click();
    await statusBar(page).getByRole('button', { name: 'Übernehmen' }).click();

    await expect(page).toHaveURL(/\/generator$/);
    await expect(presetButton).toHaveAccessibleName('Voreinstellung: Standard');
  });

  expect(consoleErrors).toEqual([]);
});

// As a class and a room are added: under a free name, ready to be typed over.
test('"Bibliothek" adds a preset and a room template', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/generator');
  await createClassWithStudents(page);
  await openLibrary(page);

  await test.step('a preset, named in its inspector', async () => {
    await page.getByRole('button', { name: 'Neue Voreinstellung' }).click();
    const name = page.getByRole('textbox', {
      name: 'Name der Voreinstellung',
    });
    await name.fill('Diktat');
    await name.press('Enter');

    await expect(page.getByRole('option', { name: /^Diktat/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(
      page.getByRole('heading', { level: 2, name: 'Diktat' }),
    ).toBeVisible();
  });

  await test.step('a template, empty until a room opened from it replaces it', async () => {
    await page.getByRole('button', { name: 'Neue Raumvorlage' }).click();
    const name = page.getByRole('textbox', { name: 'Name der Vorlage' });
    await name.fill('Labor');
    await name.press('Enter');

    await expect(page.getByText(/^Noch ohne Tische/)).toBeVisible();
    await statusBar(page)
      .getByRole('button', { name: 'Als Raum öffnen' })
      .click();
    await expect(page).toHaveURL(/\/generator$/);

    await setUpDoubleTables(page);
    await roomInspector(page)
      .getByRole('button', { name: 'Raum als Vorlage speichern' })
      .click();
    await roomInspector(page)
      .getByRole('button', { name: 'Vorlage „Labor“ ersetzen' })
      .click();

    await openLibrary(page);
    await page.getByRole('option', { name: /^Raumvorlagen/ }).click();
    await page.getByRole('option', { name: /^Labor/ }).click();
    await expect(
      page
        .getByRole('complementary', { name: 'Bibliothek' })
        .getByText('2 Tische · 4 Plätze'),
    ).toBeVisible();
    await expect(page.getByText(/^Noch ohne Tische/)).toBeHidden();
  });

  await test.step('the template as a file, opened again beside itself (decision 0046)', async () => {
    // Without a save dialog the file arrives as a download.
    await page.evaluate(() => {
      Object.defineProperty(window, 'showSaveFilePicker', {
        value: undefined,
        configurable: true,
      });
    });
    await page
      .getByRole('complementary', { name: 'Bibliothek' })
      .getByRole('button', { name: 'Als Datei speichern' })
      .click();
    const downloading = page.waitForEvent('download');
    await page
      .getByRole('dialog', { name: 'Datei herunterladen?' })
      .getByRole('button', { name: 'Herunterladen' })
      .click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe('Raumvorlage Labor.klassenplan');
    const file = await download.path();

    const choosing = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Raumvorlage aus Datei …' }).click();
    await (await choosing).setFiles(file);

    const question = page.getByRole('dialog', {
      name: 'Raumvorlage „Labor (2)“ übernehmen?',
    });
    await expect(question.getByText('Tische')).toBeVisible();
    await question.getByRole('button', { name: 'Übernehmen' }).click();
    await expect(question).toBeHidden();
    await expect(
      page.getByRole('option', { name: /^Labor \(2\)/ }),
    ).toHaveAttribute('aria-selected', 'true');

    // Undo takes back what the file added.
    await statusBar(page)
      .getByRole('button', { name: 'Letzte Aktion rückgängig machen' })
      .click();
    await expect(
      page.getByRole('option', { name: /^Labor \(2\)/ }),
    ).toHaveCount(0);
    await expect(page.getByRole('option', { name: /^Labor/ })).toHaveCount(1);
  });

  expect(consoleErrors).toEqual([]);
});
