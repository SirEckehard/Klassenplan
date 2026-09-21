// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * A first visit: the sample class and the onboarding tours.
 *
 * The unit tests pin the tour's rules against a stubbed layout — jsdom measures
 * every element as 0 × 0, so they have to pretend the anchors are on screen.
 * Only a real browser shows that the anchors really sit in the finished views,
 * that each tour stays out of the wizard's way, and that the sample class
 * arrives with pictures a canvas actually drew and the photo store accepted.
 *
 * The locale is pinned for the same reason as in `core-flow.spec.ts`: the tour
 * titles are asserted word for word.
 */
import { test, expect, type Page } from '@playwright/test';

test.use({ locale: 'de-DE' });

// Loading the sample class draws 24 pictures, and step 3 waits on a real
// algorithm run before its tour may start.
test.setTimeout(120_000);

test.beforeEach(async ({ page }) => {
  // The storage notice spans the bottom of the page on a first visit and is not
  // what these tests are about.
  await page.addInitScript(() => {
    window.localStorage.setItem('cookieConsent', 'true');
  });
});

/**
 * Longer than a due tour takes to appear (two anchor checks, 250 ms apart).
 * Only used where the point is that nothing appears — there is no event to
 * wait for then.
 */
const TOUR_START_WINDOW_MS = 1_500;

/** The coach mark on screen, whichever mark it is. */
const tourPopover = (page: Page) =>
  page
    .getByRole('dialog')
    .filter({ has: page.getByRole('button', { name: 'Nicht mehr zeigen' }) });

/** Clicks through the running tour and returns the titles in the order shown. */
async function walkTour(page: Page): Promise<string[]> {
  const tour = tourPopover(page);
  await expect(tour).toBeVisible();

  const counter = await tour.getByText(/^\d+ von \d+$/).innerText();
  const total = Number(counter.split(' von ')[1]);
  const titles: string[] = [];

  for (let position = 1; position <= total; position += 1) {
    await expect(
      tour.getByText(`${position} von ${total}`, { exact: true }),
    ).toBeVisible();
    titles.push((await tour.getByRole('heading').innerText()).trim());
    await tour
      .getByRole('button', {
        name: position === total ? 'Fertig' : 'Weiter',
        exact: true,
      })
      .click();
  }

  await expect(tour).toBeHidden();
  return titles;
}

const activeClassButton = (page: Page, className: string) =>
  page.getByRole('button', { name: new RegExp(`Aktive Klasse: ${className}`) });

test('a first visitor tries the sample class with the tours as a guide', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/generator');

  await test.step('step 1 — the welcome tour points at the empty class list', async () => {
    expect(await walkTour(page)).toEqual(['Willkommen bei Klassenplan!']);
  });

  await test.step('step 1 — the sample class arrives with every picture', async () => {
    await page
      .getByRole('button', { name: 'Beispielklasse laden', exact: true })
      .click();

    await expect(activeClassButton(page, 'Beispielklasse')).toContainText(
      '24 Schüler',
    );
    // The list rows are avatars, not upload buttons — the photo is edited in
    // the inspector, where "Foto ändern" only replaces "Foto hinzufügen" for a
    // student whose picture was drawn and stored.
    await page
      .getByRole('button', { name: /^Emma Becker im Inspektor/ })
      .click();
    await expect(
      page.getByRole('button', { name: /^Foto ändern – / }),
    ).toBeVisible();
  });

  await test.step('step 1 — the class list tour ends with backup and help', async () => {
    expect(await walkTour(page)).toEqual([
      'Deine Klassen',
      'Schüler hinzufügen',
      'Schüler bearbeiten',
      'Weiter zum Klassenraum',
      'Daten sichern',
      'Hilfe und Tour',
    ]);
  });

  await test.step('step 2 — the room is furnished and its tour closes on Escape', async () => {
    await page.getByRole('button', { name: 'Weiter zum Klassenraum' }).click();

    // The sample class brings its own room, so the quick setup stays shut and
    // the status bar can confirm a seat for everyone.
    await expect(
      page.getByRole('region', { name: 'Statusleiste' }),
    ).toContainText('24 Plätze für 24 Schüler');

    const tour = tourPopover(page);
    await expect(tour.getByRole('heading')).toHaveText('Dein Klassenraum');
    await page.keyboard.press('Escape');
    await expect(tour).toBeHidden();
  });

  await test.step('step 3 — the plan tour waits for the first shuffle', async () => {
    await page.getByRole('button', { name: 'Weiter zum Sitzplan' }).click();

    await expect(
      page.getByRole('group', { name: /^Sitzplan:/ }),
    ).toHaveAccessibleName('Sitzplan: 24 von 24 Plätzen belegt');

    // The fulfilment mark is only there when the tour started after the
    // automatic shuffle had produced statistics.
    expect(await walkTour(page)).toEqual([
      'Mischen',
      'Werkzeuge',
      'Sidebar erweitern und minimieren',
      'Von Hand anpassen',
      'Kriterien und Erfüllung',
      'Sitzkreis',
      'Präsentieren und exportieren',
    ]);
  });

  expect(consoleErrors).toEqual([]);
});

test('the sample class exists only once — asking again switches to it', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'spg.onboardingTour',
      JSON.stringify({ version: 1, seen: [], skipped: true }),
    );
  });
  await page.goto('/generator');

  await page
    .getByRole('button', { name: 'Beispielklasse laden', exact: true })
    .click();
  await expect(activeClassButton(page, 'Beispielklasse')).toContainText(
    '24 Schüler',
  );

  await test.step('a class of the teacher’s own becomes active', async () => {
    await activeClassButton(page, 'Beispielklasse').click();
    await page.getByRole('button', { name: 'Neue Klasse' }).click();
    const dialog = page.getByRole('dialog', { name: 'Neue Klasse erstellen' });
    await dialog.getByRole('textbox', { name: /Klassenname/ }).fill('7b');
    await dialog.getByRole('button', { name: 'Klasse anlegen' }).click();
    await expect(dialog).toBeHidden();
    await expect(activeClassButton(page, '7b')).toBeVisible();
  });

  await test.step('the import entry offers the existing sample class', async () => {
    await page
      .getByRole('button', { name: 'Klassenliste importieren' })
      .click();
    const menu = page.getByRole('dialog', {
      name: 'Klassenliste importieren',
    });
    await menu
      .getByRole('button', { name: 'Zur Beispielklasse wechseln' })
      .click();

    await expect(activeClassButton(page, 'Beispielklasse')).toContainText(
      '24 Schüler',
    );
  });

  await test.step('no copy was made, and the open sample class is not offered', async () => {
    await activeClassButton(page, 'Beispielklasse').click();
    await expect(page.getByRole('option')).toHaveCount(2);
    await expect(
      page.getByRole('option', { name: 'Beispielklasse', exact: true }),
    ).toHaveCount(1);
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Schüler hinzufügen' }).click();
    const addPanel = page.getByRole('dialog', { name: 'Schüler hinzufügen' });
    await expect(addPanel.getByRole('textbox')).toBeVisible();
    await page.keyboard.press('Escape');

    await page
      .getByRole('button', { name: 'Klassenliste importieren' })
      .click();
    const importPanel = page.getByRole('dialog', {
      name: 'Klassenliste importieren',
    });
    await expect(
      importPanel.getByRole('button', { name: /Beispielklasse/ }),
    ).toHaveCount(0);
  });
});

test('tours can be switched off and started again from the help dialog', async ({
  page,
}) => {
  await page.goto('/generator');

  const tour = tourPopover(page);
  await expect(tour.getByRole('heading')).toHaveText(
    'Willkommen bei Klassenplan!',
  );
  await tour.getByRole('button', { name: 'Nicht mehr zeigen' }).click();
  await expect(tour).toBeHidden();

  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Beispielklasse laden', exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(TOUR_START_WINDOW_MS);
  await expect(tour).toBeHidden();

  await page.getByRole('button', { name: 'Hilfe', exact: true }).click();
  await page.getByRole('button', { name: 'Tour starten' }).click();
  await expect(tour.getByRole('heading')).toHaveText(
    'Willkommen bei Klassenplan!',
  );
});

test('a teacher who used the app before the tours existed is not greeted', async ({
  page,
}) => {
  // Set by `useFirstVisit` in every installation that has opened step 2, step 3
  // or the export page.
  await page.addInitScript(() => {
    window.localStorage.setItem('spg.hasVisitedApp', 'true');
  });
  await page.goto('/generator');

  await expect(
    page.getByRole('button', { name: 'Beispielklasse laden', exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(TOUR_START_WINDOW_MS);
  await expect(tourPopover(page)).toBeHidden();
});
