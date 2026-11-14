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
 * above the stage pushed an iPad's room under the status bar, the plan's
 * frame shrank to the 300px an SVG falls back to, and on a phone it shrank
 * to nothing when the stage's height did not count for its `cqh`.
 */
async function expectCanvasInSight(page: Page): Promise<void> {
  const frame = page.getByTestId('classroom-canvas');
  await expect(frame).toBeVisible();
  const frameBox = await boxOf(frame);
  const stageBox = await boxOf(frame.locator('..'));
  const barBox = await boxOf(statusBar(page));
  // The plan fits its stage, so whichever dimension binds it fills: the
  // width, or — a plan turned upright on a phone — the height.
  expect(
    Math.max(
      frameBox.width / stageBox.width,
      frameBox.height / stageBox.height,
    ),
  ).toBeGreaterThanOrEqual(0.95);
  expect(frameBox.y + 100).toBeLessThan(barBox.y);
}

/**
 * The list of the students missing today is open, above the bar's count and
 * inside the window — on a phone the bar's row scrolls and clips what is in
 * it, and in fullscreen only the projection itself is on screen.
 */
async function expectAbsentListOverBar(
  page: Page,
  name: string,
): Promise<Locator> {
  const list = page.getByRole('dialog', { name });
  await expect(list).toBeVisible();
  const listBox = await boxOf(list);
  const countBox = await boxOf(page.getByRole('button', { name }));
  const width = page.viewportSize()?.width ?? 0;
  expect(listBox.y).toBeGreaterThanOrEqual(0);
  expect(listBox.y + listBox.height).toBeLessThanOrEqual(countBox.y);
  expect(listBox.x).toBeGreaterThanOrEqual(0);
  expect(listBox.x + listBox.width).toBeLessThanOrEqual(width);
  await expect(list.getByRole('button', { name: 'Alle da' })).toBeVisible();
  return list;
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
  await page
    .getByRole('button', { name: 'Schüler löschen', exact: true })
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
  // Below xl the line is the count of seats alone, the check says it fits;
  // the long one came out as "26 Plä…". Its figures stand in spans of their
  // own, the hidden long line's too, so the visible one is asked for.
  await expect(
    statusBar(page).getByText('26', { exact: true }).filter({ visible: true }),
  ).toHaveCount(1);
  await expectCanvasInSight(page);

  await page.getByRole('button', { name: 'Weiter zum Sitzplan' }).click();
  const plan = page.getByRole('group', { name: /^Sitzplan:/ });
  await expect(plan).toHaveAccessibleName('Sitzplan: 24 von 26 Plätzen belegt');
  await expectCanvasInSight(page);

  // The plan's inspector has no column here: the switch at the right end of
  // the status bar opens it. It names what it shows, and once open what it
  // hides.
  const criteriaSwitch = statusBar(page).getByRole('button', {
    name: /^(Plan einblenden|Inspektor ausblenden)$/,
  });
  await criteriaSwitch.click();
  await expect(criteriaSwitch).toHaveAttribute('aria-expanded', 'true');
  // The heading says how many of the criteria carry weight, the preset
  // under it what they add up to.
  const criteria = page.getByRole('complementary', { name: 'Plan' });
  await expect(criteria.getByText(/Kriterien aktiv/)).toBeVisible();
  await expect(
    criteria.getByRole('button', { name: /^Voreinstellung:/ }),
  ).toBeVisible();
  await criteriaSwitch.click();
  await expect(criteriaSwitch).toHaveAttribute('aria-expanded', 'false');

  await statusBar(page)
    .getByRole('button', { name: /^Mischen/ })
    .click();
  await expect(plan).toHaveAccessibleName('Sitzplan: 24 von 26 Plätzen belegt');
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
    await expect(tables).toHaveCount(13);

    await test.step('a table is tapped and copied in the inspector', async () => {
      await tables.first().tap();
      const drawerSwitch = statusBar(page).getByRole('button', {
        name: /^(Eigenschaften einblenden|Inspektor ausblenden)$/,
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
      // An iPad in portrait draws the room turned a quarter (600 × 900,
      // `data-turn`); the floor at (200, 300) of the stored room is found
      // where the turn draws it.
      const roomSvg = canvas.locator(
        'svg[viewBox="0 0 900 600"], svg[viewBox="0 0 600 900"]',
      );
      const room = await boxOf(roomSvg);
      const turn = await roomSvg.getAttribute('data-turn');
      const drawn =
        turn === '90'
          ? { x: (600 - 300) / 600, y: 200 / 900 }
          : turn === '270'
            ? { x: 300 / 600, y: (900 - 200) / 900 }
            : { x: 200 / 900, y: 300 / 600 };
      const floor = {
        x: room.x + room.width * drawn.x,
        y: room.y + room.height * drawn.y,
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
          .locator('[data-context-menu]')
          .getByRole('menuitem', { name: 'Einfügen' }),
      ).toBeVisible();
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });

      await expect(
        page.getByText('Raum vorübergehend nicht verfügbar'),
      ).toHaveCount(0);
      await expect(tables).toHaveCount(13);
    });

    await test.step('the menu outlives the finger and pastes on a tap', async () => {
      // Lifting the finger must not close the menu, or no entry could ever be
      // tapped.
      const paste = page
        .locator('[data-context-menu]')
        .getByRole('menuitem', { name: 'Einfügen' });
      await expect(paste).toBeVisible();
      await paste.tap();

      await expect(tables).toHaveCount(14);
    });
  },
);

test(
  'a finger pulls the student away by the head of the panel, over its edge',
  { tag: ['@phone', '@tablet'] },
  async ({ page }, testInfo) => {
    await loadSampleClass(page);
    await editStudent(page);
    const gender = page.getByRole('group', { name: 'Geschlecht' });
    const head = await boxOf(page.locator('[data-inspector-head]').first());
    const start = {
      x: head.x + head.width / 2,
      y: head.y + head.height / 2,
      id: 1,
      radiusX: 8,
      radiusY: 8,
      force: 1,
    };
    const cdp = await page.context().newCDPSession(page);
    const swipe = async (axis: 'x' | 'y') => {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [start],
      });
      for (const by of [20, 60, 120, 200]) {
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ ...start, [axis]: start[axis] + by }],
        });
      }
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });
    };

    // A phone's sheet came from the bottom, a tablet's drawer from the right.
    const isPhone = testInfo.project.name === 'phone';
    await swipe(isPhone ? 'x' : 'y');
    await expect(gender).toBeVisible();

    await swipe(isPhone ? 'y' : 'x');
    await expect(gender).toBeHidden();
    await expect(
      page.getByRole('button', { name: /^Emma Becker im Inspektor/ }),
    ).toBeVisible();
  },
);

test(
  '"Bibliothek" shows the columns that fit and leads up to the rest above them',
  { tag: ['@phone', '@tablet'] },
  async ({ page }, testInfo) => {
    await loadSampleClass(page);
    await page.goto('/bibliothek');
    const isPhone = testInfo.project.name === 'phone';
    const path = page.getByRole('navigation', { name: 'Pfad' });
    const column = (name: string) =>
      page.getByRole('listbox', { name, exact: true });

    await test.step('the path stands above the columns, not in the bar', async () => {
      await expect(column('Klassenraum')).toBeVisible();
      await expect(path).toHaveCount(1);
      await expect(statusBar(page).getByRole('navigation')).toHaveCount(0);
      // A phone has room for one column, an iPad in portrait for two, which
      // share the card's width rather than scroll sideways.
      await expect(column('Beispielklasse')).toHaveCount(isPhone ? 0 : 1);
      await expect(column('Klassen')).toHaveCount(0);
      const card = await boxOf(page.locator('[data-tour="library-columns"]'));
      const shown = await boxOf(column('Klassenraum'));
      expect(shown.x + shown.width).toBeGreaterThan(card.x + card.width - 4);
      expect(shown.width).toBeGreaterThanOrEqual(
        isPhone ? card.width - 4 : 256,
      );
    });

    await test.step('the way up names the folder above', async () => {
      await path
        .getByRole('button', {
          name: isPhone ? 'Zurück zu Beispielklasse' : 'Zurück zu Bibliothek',
        })
        .click();
      await expect(
        column(isPhone ? 'Beispielklasse' : 'Klassen'),
      ).toBeVisible();
    });

    await test.step('the path opens as a menu of its steps', async () => {
      await page.getByRole('option', { name: /^Klassenraum/ }).click();
      await expect(column('Klassenraum')).toBeVisible();
      await path.getByRole('button', { name: /– Pfad zeigen$/ }).click();
      const menu = page.getByRole('dialog', { name: 'Pfad' });
      await expect(
        menu.getByRole('button', { name: 'Klassenraum' }),
      ).toHaveAttribute('aria-current', 'location');
      await menu.getByRole('button', { name: 'Bibliothek' }).click();
      await expect(column('Klassen')).toBeVisible();
      await expect(path).toHaveCount(0);
    });
  },
);

test(
  'the room takes its tables from "Hinzufügen" at the status bar',
  { tag: ['@phone', '@tablet'] },
  async ({ page }) => {
    await loadSampleClass(page);
    await page.getByRole('button', { name: 'Weiter zum Raum' }).click();
    await expectCanvasInSight(page);

    // Below `lg` neither the toolbar nor the stage holds the tables: under
    // the room they were out of sight until the page was scrolled.
    await expect(
      page.getByRole('button', { name: 'Doppelplatz', exact: true }),
    ).toHaveCount(0);

    const add = statusBar(page).getByRole('button', {
      name: 'Hinzufügen',
      exact: true,
    });
    await expect(add).toHaveAttribute('aria-expanded', 'false');
    await add.click();
    await expect(add).toHaveAttribute('aria-expanded', 'true');

    // The tray rises out of the bar and comes to stand on it.
    const tray = page.getByRole('group', {
      name: 'Tische und Raumelemente hinzufügen',
    });
    await expect(tray).toBeVisible();
    await expect
      .poll(async () => {
        const trayBox = await boxOf(tray);
        const barBox = await boxOf(statusBar(page));
        return Math.round(trayBox.y + trayBox.height - barBox.y);
      })
      .toBe(0);
    await expect(
      tray.getByRole('button', { name: 'Raumtrenner' }),
    ).toBeInViewport();

    // A tap puts a double on a free spot and leaves the tray open for the next.
    await tray
      .getByRole('button', { name: 'Doppelplatz', exact: true })
      .click();
    await expect(
      statusBar(page)
        .getByText('28', { exact: true })
        .filter({ visible: true }),
    ).toHaveCount(1);
    await expect(tray).toBeVisible();

    // A piece dragged out sinks the tray, so the whole room takes the drop,
    // and the tray is back once it is let go.
    const single = await boxOf(
      tray.getByRole('button', { name: 'Einzelplatz', exact: true }),
    );
    const room = await boxOf(page.getByTestId('classroom-canvas'));
    await page.mouse.move(
      single.x + single.width / 2,
      single.y + single.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(room.x + room.width / 2, room.y + 40, { steps: 8 });
    await expect(tray).toBeHidden();
    await page.mouse.up();
    await expect(
      statusBar(page)
        .getByText('29', { exact: true })
        .filter({ visible: true }),
    ).toHaveCount(1);
    await expect(tray).toBeVisible();

    await add.click();
    await expect(tray).toBeHidden();
    await expectCanvasInSight(page);
  },
);

test(
  'a drawer ends where the status bar begins, whatever the safe area does',
  { tag: '@phone' },
  async ({ page }) => {
    await loadSampleClass(page);
    await page.getByRole('button', { name: 'Weiter zum Raum' }).click();
    await statusBar(page)
      .getByRole('button', { name: 'Eigenschaften einblenden' })
      .click();
    const drawer = page.getByRole('complementary', { name: 'Eigenschaften' });
    await expect(drawer).toBeVisible();

    // Safari gives the bar its bottom safe area only while its own toolbar is
    // collapsed: the bar grows by its padding alone, its content stays as high.
    await statusBar(page).evaluate((bar) => {
      bar.style.paddingBottom = '34px';
    });

    await expect
      .poll(async () => {
        const drawerBox = await boxOf(drawer);
        const barBox = await boxOf(statusBar(page));
        return Math.round(drawerBox.y + drawerBox.height - barBox.y);
      })
      .toBe(0);
  },
);

test(
  'a phone reaches the toolbar as a drawer and the inspector as a sheet',
  { tag: '@phone' },
  async ({ page }) => {
    await loadSampleClass(page);

    await test.step('the header keeps all three layers in reach', async () => {
      // An iPhone 16 Pro is 402px wide; the class's name must not push the
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
      // The drawer has no close button of its own: Escape put the menu
      // away and left the drawer open, the switch closes it.
      await expect(drawer).toBeVisible();
      await toolbarSwitch.click();
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
    await expect(tables).toHaveCount(13);

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
      const menu = page.locator('[data-context-menu]');
      await expect(
        menu.getByRole('menuitem', { name: 'Kopieren' }),
      ).toBeVisible();
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      });

      // It outlives the finger, lies clear of where it lifted — the lift
      // would pick the entry under it — and took no table with it.
      await expect(
        menu.getByRole('menuitem', { name: 'Kopieren' }),
      ).toBeVisible();
      const menuBox = await boxOf(menu);
      const clearOfFinger =
        finger.x + 22 <= menuBox.x ||
        finger.x - 22 >= menuBox.x + menuBox.width ||
        finger.y + 22 <= menuBox.y ||
        finger.y - 22 >= menuBox.y + menuBox.height;
      expect(clearOfFinger).toBe(true);
      await expect(tables).toHaveCount(13);

      await page.keyboard.press('Escape');
      await expect(menu).toHaveCount(0);
    });

    await test.step('the projection frames the tables, not the walls', async () => {
      await page.getByRole('button', { name: 'Weiter zum Sitzplan' }).click();
      await expect(
        page.getByRole('group', { name: /^Sitzplan:/ }),
      ).toHaveAccessibleName('Sitzplan: 24 von 26 Plätzen belegt');
      await statusBar(page)
        .getByRole('button', { name: /Präsentieren/ })
        .click();
      await expect(page).toHaveURL(/\/present/);
      // The address changes first; the router keeps the plan editor on
      // screen until the projection has loaded, and its tables match the
      // locator below too.
      await expect(
        page.getByRole('button', { name: 'Präsentation beenden' }),
      ).toBeVisible();

      const projected = page.locator('svg g[data-table-index]');
      await expect(projected).toHaveCount(13);
      const boxes = await Promise.all((await projected.all()).map(boxOf));
      const top = Math.min(...boxes.map((box) => box.y));
      const bottom = Math.max(...boxes.map((box) => box.y + box.height));
      // Framed on the walls the tables filled 36 % of the height; on the
      // tables they take most of it.
      expect(bottom - top).toBeGreaterThan(1080 * 0.55);
    });

    await test.step('a tap marks who is missing today, the count lists them', async () => {
      // Decision 0045: the seat stays and is veiled; nothing is stored.
      const name = page.locator('svg g[data-table-index] text').first();
      const box = await boxOf(name);
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      await expect(page.locator('svg [data-absent]')).toHaveCount(1);
      const count = page.getByRole('button', { name: '1 fehlt heute' });
      await expect(count).toBeVisible();

      // A press on the count takes nothing back: it shows who is missing.
      await count.click();
      await expect(page.locator('svg [data-absent]')).toHaveCount(1);
      await expectAbsentListOverBar(page, '1 fehlt heute');

      await page
        .getByRole('dialog', { name: '1 fehlt heute' })
        .getByRole('button', { name: 'Alle da' })
        .click();
      await expect(page.locator('svg [data-absent]')).toHaveCount(0);
      await expect(count).toHaveCount(0);
      await expect(page.getByRole('dialog')).toHaveCount(0);
    });
  },
);

test(
  'a phone lists who is missing over the bar that scrolls',
  { tag: '@phone' },
  async ({ page }) => {
    await loadSampleClass(page);
    await mixThePlan(page);
    // On a phone the way to the projection is in the toolbar's drawer.
    await statusBar(page)
      .getByRole('button', { name: 'Werkzeugleiste' })
      .click();
    await page
      .getByRole('complementary', { name: 'Werkzeugleiste' })
      .getByRole('button', { name: 'Präsentieren' })
      .click();
    await expect(
      page.getByRole('button', { name: 'Präsentation beenden' }),
    ).toBeVisible();

    const names = page.locator('svg g[data-table-index] text');
    for (const index of [0, 1]) {
      const box = await boxOf(names.nth(index));
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    }
    await expect(page.locator('svg [data-absent]')).toHaveCount(2);

    // The bar is one row that scrolls sideways there: the list hangs on the
    // bar, not inside the row, which would clip it.
    await page.getByRole('button', { name: '2 fehlen heute' }).click();
    const list = await expectAbsentListOverBar(page, '2 fehlen heute');

    // A name brings that student back and leaves the list for the next.
    await list.getByRole('button').first().click();
    await expect(page.locator('svg [data-absent]')).toHaveCount(1);
    await expect(
      page.getByRole('dialog', { name: '1 fehlt heute' }),
    ).toBeVisible();
  },
);
