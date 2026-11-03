// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Every page wears one head (`AppHeader`), on every device.
 *
 * The rule that matters is a position, which no role or name notices: Help and
 * the settings stand on the same spot wherever a page has them, and "Zurück"
 * beside them, right up to the settings where a page has no help. That "Zurück"
 * once took the pages beside the app past the edge of a phone went unnoticed
 * for the same reason, so this also measures the page's width.
 *
 * A page with a bar of its own at the bottom — the layers, the export page,
 * "Bibliothek", the projection — keeps its way back there, not in the head.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';

test.use({ locale: 'de-DE' });
test.setTimeout(120_000);

const EVERY_DEVICE = { tag: ['@tablet', '@phone', '@whiteboard'] };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'spg.onboardingTour',
      JSON.stringify({ version: 1, seen: [], skipped: true }),
    );
    window.localStorage.setItem('cookieConsent', 'true');
  });
});

const head = (page: Page) => page.getByRole('banner');
const backInHead = (page: Page) =>
  head(page).getByRole('button', { name: /^Zurück/ });
const helpInHead = (page: Page) =>
  head(page).getByRole('button', { name: 'Hilfe', exact: true });
const gearInHead = (page: Page) =>
  head(page).getByRole('button', { name: 'Einstellungen' });

async function boxOf(locator: Locator) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  if (!box) throw new Error(`${locator} has no box on screen`);
  return box;
}

/** A class with a plan on the stage, kept in memory: the pages below show it. */
async function openPlan(page: Page): Promise<void> {
  await page.goto('/generator');
  await page
    .getByRole('button', { name: 'Beispielklasse laden', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: /Aktive Klasse: Beispielklasse/ }),
  ).toContainText('24 Schüler');
  await page.getByRole('button', { name: 'Sitzplan', exact: true }).click();
  await expect(
    page.getByRole('button', { name: /Exportieren/ }).first(),
  ).toBeVisible({ timeout: 30_000 });
}

/**
 * Goes to a page as a link inside the site does: no reload, so the plan on the
 * stage stays, and with the state that makes a page offer its way back.
 */
async function goInside(page: Page, path: string): Promise<void> {
  const titleBefore = await page.title();
  await page.evaluate((target) => {
    window.history.pushState(
      {
        usr: { fromApp: true, fromWorkspace: true },
        key: target,
        idx: window.history.length,
      },
      '',
      target,
    );
    window.dispatchEvent(
      new PopStateEvent('popstate', { state: window.history.state }),
    );
  }, path);
  await expect(page).toHaveURL(new RegExp(`${path}$`));
  // The address changes at once, the page once its code has come: until then
  // the head on screen is still the last page's.
  await expect(page).not.toHaveTitle(titleBefore);
}

async function expectNoSidewaysScroll(page: Page): Promise<void> {
  const width = page.viewportSize()?.width ?? 0;
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  expect(scrollWidth).toBeLessThanOrEqual(width);
}

const PAGES_WITH_A_STATUS_BAR = ['/export', '/bibliothek'];
const TOOLS = [
  '/wer-kommt-dran',
  '/wo-sitzt-wer',
  '/gruppen',
  '/dienste',
  '/namensspiel',
];
const PAGES_BESIDE_THE_APP = [
  '/faq',
  '/support',
  '/feedback',
  '/changelog',
  '/impressum',
  '/datenschutz',
  '/gibt-es-nicht',
];

test(
  '"Zurück", Help and the settings keep their places on every page',
  EVERY_DEVICE,
  async ({ page }) => {
    await openPlan(page);

    // The layers keep their way back at the bottom, and not twice.
    const backInStatusBar = page
      .getByRole('region', { name: 'Statusleiste' })
      .getByRole('button', { name: /^Zurück/ });
    await expect(backInHead(page)).toHaveCount(0);
    await expect(backInStatusBar).toBeVisible();
    const help = await boxOf(helpInHead(page));
    const gear = await boxOf(gearInHead(page));
    const height = (await boxOf(head(page))).height;
    await expectNoSidewaysScroll(page);

    // As do the two pages that wear the workspace's shell.
    for (const path of PAGES_WITH_A_STATUS_BAR) {
      await goInside(page, path);
      await test.step(path, async () => {
        await expect(backInStatusBar).toBeVisible();
        await expect(backInHead(page)).toHaveCount(0);
        expect(await boxOf(helpInHead(page))).toEqual(help);
        expect(await boxOf(gearInHead(page))).toEqual(gear);
        expect((await boxOf(head(page))).height).toBe(height);
        await expectNoSidewaysScroll(page);
      });
    }

    let back: Awaited<ReturnType<typeof boxOf>> | undefined;

    for (const path of TOOLS) {
      await goInside(page, path);
      await test.step(path, async () => {
        const box = await boxOf(backInHead(page));
        back ??= box;
        expect(box).toEqual(back);
        expect(await boxOf(helpInHead(page))).toEqual(help);
        expect(await boxOf(gearInHead(page))).toEqual(gear);
        expect((await boxOf(head(page))).height).toBe(height);
        await expectNoSidewaysScroll(page);
      });
    }

    // These have no help, so "Zurück" stands right beside the settings.
    let backBesideGear: Awaited<ReturnType<typeof boxOf>> | undefined;

    for (const path of PAGES_BESIDE_THE_APP) {
      await goInside(page, path);
      await test.step(path, async () => {
        const box = await boxOf(backInHead(page));
        backBesideGear ??= box;
        expect(box).toEqual(backBesideGear);
        expect(gear.x - (box.x + box.width)).toBeCloseTo(8, 0);
        expect(await boxOf(gearInHead(page))).toEqual(gear);
        expect((await boxOf(head(page))).height).toBe(height);
        await expectNoSidewaysScroll(page);
      });
    }
  },
);

test(
  'the head stays in view while a long page is read',
  EVERY_DEVICE,
  async ({ page }) => {
    await page.goto('/generator');
    await goInside(page, '/faq');
    const back = await boxOf(backInHead(page));

    await page.evaluate(() => window.scrollTo(0, 1200));
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(0);

    expect(await boxOf(backInHead(page))).toEqual(back);
  },
);

test(
  "the start page's head stands in the page's column",
  EVERY_DEVICE,
  async ({ page }) => {
    await page.goto('/');

    const logo = await boxOf(head(page).getByRole('link'));
    const title = await boxOf(page.getByRole('heading', { level: 1 }));
    expect(logo.x).toBeCloseTo(title.x, 0);

    const gear = await boxOf(gearInHead(page));
    const column = await boxOf(page.locator('main section').first());
    expect(gear.x + gear.width).toBeCloseTo(column.x + column.width, 0);

    await expectNoSidewaysScroll(page);
  },
);

test(
  'the projection has its way out in the bar, in sight on every device',
  EVERY_DEVICE,
  async ({ page }, testInfo) => {
    await openPlan(page);
    const help = await boxOf(helpInHead(page));
    const gear = await boxOf(gearInHead(page));

    await goInside(page, '/present');
    await expect(backInHead(page)).toHaveCount(0);
    expect(await boxOf(helpInHead(page))).toEqual(help);
    expect(await boxOf(gearInHead(page))).toEqual(gear);

    const end = await boxOf(
      page.getByRole('button', { name: 'Präsentation beenden' }),
    );
    const window = page.viewportSize();
    expect(end.x + end.width).toBeLessThanOrEqual(window?.width ?? 0);
    expect(end.y + end.height).toBeLessThanOrEqual(window?.height ?? 0);
    await expectNoSidewaysScroll(page);

    // Five rows of buttons took a third of a phone's screen; it is one now.
    if (testInfo.project.name === 'phone') {
      const bar = page.getByTestId('present-bar');
      expect((await boxOf(bar)).height).toBeLessThan(100);

      // Held sideways it has the width for two rows, but not the height.
      await page.setViewportSize({ width: 874, height: 402 });
      await expect
        .poll(async () => (await boxOf(bar)).height)
        .toBeLessThan(100);
    }
  },
);

test(
  'a tool keeps its action a button rather than a band across the window',
  EVERY_DEVICE,
  async ({ page }) => {
    await openPlan(page);
    await goInside(page, '/wer-kommt-dran');

    const action = await boxOf(page.getByRole('button', { name: 'Ziehen' }));
    const remPx = await page.evaluate(() =>
      parseFloat(getComputedStyle(document.documentElement).fontSize),
    );
    expect(action.width).toBeLessThanOrEqual(28 * remPx);
  },
);
