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
 * drawer whose panels open above it — through the same journey: a class, a
 * student edited, the plan mixed.
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

/**
 * "Schüler hinzufügen" from the toolbar: its panel asks for a name, the
 * student lands in the list. The panel opens beside the toolbar, wherever the
 * toolbar is — a column, or a drawer on a phone.
 */
async function addStudentFromToolbar(page: Page, name: string): Promise<void> {
  await page
    .getByRole('button', { name: 'Schüler hinzufügen', exact: true })
    .click();
  const panel = page.getByRole('dialog', { name: 'Schüler hinzufügen' });
  const field = panel.getByRole('textbox', { name: /Neuer Schüler/ });
  await expect(field).toBeVisible();
  await field.fill(name);
  await panel.getByRole('button', { name: 'Schüler hinzufügen' }).click();
  await expect(
    page.getByRole('button', { name: `${name} im Inspektor öffnen` }),
  ).toBeAttached();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();

  // On a phone the toolbar is a drawer over the list; it goes first.
  const phoneSwitch = statusBar(page).getByRole('button', {
    name: 'Werkzeugleiste',
    exact: true,
  });
  if (
    (await phoneSwitch.count()) > 0 &&
    (await phoneSwitch.getAttribute('aria-expanded')) === 'true'
  ) {
    await phoneSwitch.click();
  }

  // The room has a seat for each of the 24; the extra student leaves again
  // the way one does, from the inspector.
  await page
    .getByRole('button', { name: `${name} im Inspektor öffnen` })
    .click();
  await page.getByRole('button', { name: 'Löschen', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Schüler löschen' })
    .getByRole('button', { name: 'Löschen', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: `${name} im Inspektor öffnen` }),
  ).toHaveCount(0);
}

/** "Klassenwerkzeuge" at the foot of the toolbar opens its menu. */
async function openClassTools(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Klassenwerkzeuge' }).click();
  const menu = page.getByRole('dialog', { name: 'Klassenwerkzeuge' });
  await expect(
    menu.getByRole('button', { name: /Wer kommt dran/ }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
}

/** From the class to the mixed plan, opening the criteria on the way. */
async function mixThePlan(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Weiter zum Raum' }).click();
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

    await test.step('a toolbar panel takes a name, a toolbar menu opens', async () => {
      await addStudentFromToolbar(page, 'Tara Tablet');
      await openClassTools(page);
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
  'a phone reaches the toolbar as a drawer and the inspector as a sheet',
  { tag: '@phone' },
  async ({ page }) => {
    await loadSampleClass(page);

    await test.step('the header keeps all three layers in reach', async () => {
      // An iPhone 16 Pro is 402px wide; the class's name used to push the
      // layer switch off the header's left edge.
      const layers = page.getByRole('group', { name: /Ebene/ });
      for (const name of ['Klasse', 'Raum', 'Sitzplan']) {
        const layer = layers.getByRole('button', { name });
        await expect(layer).toBeInViewport({ ratio: 1 });
      }
      await layers.getByRole('button', { name: 'Raum' }).click();
      await layers.getByRole('button', { name: 'Klasse' }).click();
      await expect(
        page.getByRole('button', { name: /^Emma Becker im Inspektor/ }),
      ).toBeVisible();
    });

    const toolbarSwitch = statusBar(page).getByRole('button', {
      name: 'Werkzeugleiste',
    });
    const drawer = page.getByRole('complementary', { name: 'Werkzeugleiste' });

    await test.step('the toolbar opens as a drawer from the status bar', async () => {
      await expect(toolbarSwitch).toHaveAttribute('aria-expanded', 'false');
      await toolbarSwitch.click();
      await expect(toolbarSwitch).toHaveAttribute('aria-expanded', 'true');
      await expect(
        drawer.getByRole('button', { name: 'Schüler hinzufügen' }),
      ).toBeVisible();
    });

    await test.step('its panels and menus open above it', async () => {
      await addStudentFromToolbar(page, 'Paul Phone');
      await toolbarSwitch.click();
      await openClassTools(page);
      await drawer.getByRole('button', { name: 'Schließen' }).click();
      await expect(drawer).toBeHidden();
      await expect(toolbarSwitch).toHaveAttribute('aria-expanded', 'false');
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
