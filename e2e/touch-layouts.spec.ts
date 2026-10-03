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
 *
 * Roles and names alone did not notice the tablet going wrong twice in one
 * day, so the journey also measures: the room and the plan have to fill their
 * stage and start in sight, beside the toolbar rather than under it.
 *
 * The `whiteboard` project is the other end: the desktop layout, worked by a
 * finger on a 1920px board — the toolbar's labels, a long press on a table
 * and the projection, which has to fill the wall.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';

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

async function boxOf(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error(`${locator} has no box on screen`);
  return box;
}

/**
 * The room or the plan fills its stage and starts in sight. Below `lg` both
 * once went wrong without a role or a name changing: the toolbar stacked
 * above the stage pushed an iPad's room under the status bar, and the plan's
 * frame shrank to the 300px an SVG falls back to.
 */
async function expectCanvasInSight(page: Page): Promise<void> {
  const frame = page.getByTestId('classroom-canvas');
  await expect(frame).toBeVisible();
  const frameBox = await boxOf(frame);
  const stageBox = await boxOf(frame.locator('..'));
  const barBox = await boxOf(statusBar(page));
  expect(frameBox.width).toBeGreaterThanOrEqual(stageBox.width * 0.95);
  expect(frameBox.y + 100).toBeLessThan(barBox.y);
}

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
  // Below xl the line is the count alone, the check says it fits; the long
  // one came out as "24 Plä…".
  await expect(statusBar(page).getByText('24', { exact: true })).toBeVisible();
  await expectCanvasInSight(page);

  await page.getByRole('button', { name: 'Weiter zum Sitzplan' }).click();
  const plan = page.getByRole('group', { name: /^Sitzplan:/ });
  await expect(plan).toHaveAccessibleName('Sitzplan: 24 von 24 Plätzen belegt');
  await expectCanvasInSight(page);

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
      // Beside the class list, not on top of it: stacked, the column took
      // the first screen and the list began halfway down.
      const toolbar = page.getByRole('complementary', {
        name: 'Werkzeugleiste',
      });
      const firstRow = page.getByRole('button', {
        name: /^Emma Becker im Inspektor/,
      });
      await expect(firstRow).toBeInViewport();
      const toolbarBox = await boxOf(toolbar);
      expect(toolbarBox.x + toolbarBox.width).toBeLessThanOrEqual(
        (await boxOf(firstRow)).x,
      );

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
  'a long press on the empty floor of the room offers to paste',
  { tag: '@tablet' },
  async ({ page }) => {
    await loadSampleClass(page);
    await page.getByRole('button', { name: 'Weiter zum Raum' }).click();
    const canvas = page.getByTestId('classroom-canvas');
    const tables = canvas.locator('g[data-table-index]');
    await expect(tables).toHaveCount(12);

    await test.step('a table is tapped and copied in the inspector', async () => {
      await tables.first().tap();
      const drawerSwitch = statusBar(page).getByRole('button', {
        name: 'Eigenschaften',
      });
      await drawerSwitch.click();
      await page
        .getByRole('complementary', { name: 'Eigenschaften' })
        .getByRole('button', { name: /^Kopieren/ })
        .click();
      await drawerSwitch.click();
    });

    await test.step('a finger held on the floor opens the paste menu', async () => {
      // The tap above left its pointer id behind, and the paste menu tried to
      // release that long-lifted finger: the browser threw, and the room gave
      // way to the error boundary on every touch screen.
      const room = await boxOf(canvas.locator('svg[viewBox^="0 0 900"]'));
      const floor = {
        x: room.x + room.width * (200 / 900),
        y: room.y + room.height * (300 / 600),
        id: 1,
        radiusX: 8,
        radiusY: 8,
        force: 1,
      };
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [floor],
      });
      await expect(
        page
          .locator('[data-context-action-menu]')
          .getByRole('button', { name: 'Einfügen' }),
      ).toBeVisible();
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });

      await expect(
        page.getByText('Layout-Editor vorübergehend nicht verfügbar'),
      ).toHaveCount(0);
      await expect(tables).toHaveCount(12);
    });

    await test.step('the menu outlives the finger and pastes on a tap', async () => {
      // Lifting the finger used to close the menu, so no entry could ever be
      // tapped.
      const paste = page
        .locator('[data-context-action-menu]')
        .getByRole('button', { name: 'Einfügen' });
      await expect(paste).toBeVisible();
      await paste.tap();

      await expect(tables).toHaveCount(13);
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

test(
  'a whiteboard shows labels, keeps the long-press menu off the finger and fills the wall',
  { tag: '@whiteboard' },
  async ({ page }) => {
    await loadSampleClass(page);

    await test.step('the toolbar starts with its labels', async () => {
      // No tooltip explains an icon to a finger.
      await expect(
        statusBar(page).getByRole('button', {
          name: 'Werkzeugleiste minimieren',
        }),
      ).toHaveAttribute('aria-expanded', 'true');
    });

    await page.getByRole('button', { name: 'Weiter zum Raum' }).click();
    const canvas = page.getByTestId('classroom-canvas');
    const tables = canvas.locator('g[data-table-index]');
    await expect(tables).toHaveCount(12);

    await test.step('a long press on a top-row table opens a menu clear of the finger', async () => {
      const boxes = await Promise.all((await tables.all()).map(boxOf));
      const top = boxes.reduce((a, b) => (b.y < a.y ? b : a));
      const finger = {
        x: top.x + top.width / 2,
        y: top.y + top.height / 2,
        id: 1,
        radiusX: 8,
        radiusY: 8,
        force: 1,
      };
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [finger],
      });
      const menu = page.locator('[data-context-action-menu]');
      await expect(
        menu.getByRole('button', { name: 'Kopieren' }),
      ).toBeVisible();
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });

      // It outlives the finger, lies clear of where it lifted — the lift
      // used to pick the entry under it — and took no table with it.
      await expect(
        menu.getByRole('button', { name: 'Kopieren' }),
      ).toBeVisible();
      const menuBox = await boxOf(menu);
      const clearOfFinger =
        finger.x + 22 <= menuBox.x ||
        finger.x - 22 >= menuBox.x + menuBox.width ||
        finger.y + 22 <= menuBox.y ||
        finger.y - 22 >= menuBox.y + menuBox.height;
      expect(clearOfFinger).toBe(true);
      await expect(tables).toHaveCount(12);

      await page.keyboard.press('Escape');
      await expect(menu).toHaveCount(0);
    });

    await test.step('the projection frames the tables, not the walls', async () => {
      await page.getByRole('button', { name: 'Weiter zum Sitzplan' }).click();
      await expect(
        page.getByRole('group', { name: /^Sitzplan:/ }),
      ).toHaveAccessibleName('Sitzplan: 24 von 24 Plätzen belegt');
      await statusBar(page)
        .getByRole('button', { name: /Präsentieren/ })
        .click();
      await expect(page).toHaveURL(/\/present/);

      const projected = page.locator('svg g[data-table-index]');
      await expect(projected).toHaveCount(12);
      const boxes = await Promise.all((await projected.all()).map(boxOf));
      const top = Math.min(...boxes.map((box) => box.y));
      const bottom = Math.max(...boxes.map((box) => box.y + box.height));
      // Framed on the walls the tables filled 36 % of the height; on the
      // tables they take most of it.
      expect(bottom - top).toBeGreaterThan(1080 * 0.55);
    });
  },
);
