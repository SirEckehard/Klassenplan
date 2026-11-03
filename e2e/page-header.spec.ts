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
  'the status bar is equally high on every layer and page that has one',
  EVERY_DEVICE,
  async ({ page }) => {
    await openPlan(page);
    const bar = page.getByRole('region', { name: 'Statusleiste' });
    // The tallest thing the bar ever held: on a touch screen the fulfilment
    // once grew it by 8px, on this layer alone.
    await expect(bar.getByRole('button', { name: /^Erfüllung/ })).toBeVisible();
    const height = (await boxOf(bar)).height;

    for (const layer of ['Raum', 'Klasse']) {
      await page.getByRole('button', { name: layer, exact: true }).click();
      await test.step(layer, async () => {
        await expect.poll(async () => (await boxOf(bar)).height).toBe(height);
      });
    }

    for (const path of PAGES_WITH_A_STATUS_BAR) {
      await goInside(page, path);
      await test.step(path, async () => {
        await expect.poll(async () => (await boxOf(bar)).height).toBe(height);
      });
    }
  },
);

/**
 * The buttons of the bar on screen that a finger misses within 44px around the
 * middle of the button: a point there has to land on the button itself. It
 * stands 1px inside that edge, where two hit areas meet and a fraction of a
 * pixel falls to the neighbour. Undo/redo share an edge and a breadcrumb is as
 * wide as its word, so those two are held to the height alone.
 */
async function buttonsTooSmallToHit(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const reach = 21;
    const bar = document.querySelector('[data-shell-status-bar]');
    return [...(bar?.querySelectorAll('button') ?? [])]
      .filter((button) => button.getClientRects().length > 0)
      .filter((button) => {
        const box = button.getBoundingClientRect();
        const x = box.left + box.width / 2;
        const y = box.top + box.height / 2;
        const heightOnly =
          button.closest('nav') !== null ||
          button.parentElement?.classList.contains('divide-x');
        const points = [
          [x, y - reach],
          [x, y + reach],
          ...(heightOnly
            ? []
            : [
                [x - reach, y],
                [x + reach, y],
              ]),
        ];
        return points.some(([px, py]) => {
          const hit = document.elementFromPoint(px, py);
          return !hit || !button.contains(hit);
        });
      })
      .map((button) => button.getAttribute('aria-label') ?? button.innerText);
  });
}

test(
  "a finger hits the status bar's buttons at 44px without the bar growing",
  EVERY_DEVICE,
  async ({ page }) => {
    const coarse = await page.evaluate(
      () => window.matchMedia('(pointer: coarse)').matches,
    );
    test.skip(!coarse, 'A mouse keeps the size it sees.');

    await openPlan(page);
    expect(await buttonsTooSmallToHit(page)).toEqual([]);

    for (const layer of ['Raum', 'Klasse']) {
      await page.getByRole('button', { name: layer, exact: true }).click();
      await test.step(layer, async () => {
        await expect
          .poll(() =>
            page
              .getByRole('region', { name: 'Statusleiste' })
              .getByRole('button', { name: /^Zurück/ })
              .count(),
          )
          .toBe(layer === 'Klasse' ? 0 : 1);
        expect(await buttonsTooSmallToHit(page)).toEqual([]);
      });
    }

    for (const path of PAGES_WITH_A_STATUS_BAR) {
      await goInside(page, path);
      await test.step(path, async () => {
        await expect(
          page
            .getByRole('region', { name: 'Statusleiste' })
            .getByRole('button', { name: /^Zurück/ }),
        ).toBeVisible();
        expect(await buttonsTooSmallToHit(page)).toEqual([]);
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

    // It names the product larger than the head of the pages beside it.
    await page.goto('/faq');
    const logoBeside = await boxOf(head(page).getByRole('link'));
    expect(logo.width).toBeGreaterThan(logoBeside.width);
  },
);

test("the start page's larger logo fits the narrowest phone beside its way back", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/faq');
  // Until the page has set its own title it still wears the start page's, and
  // `goInside` would wait for a change that has already been.
  await expect(page).not.toHaveTitle(/Intelligente Sitzpläne/);
  await goInside(page, '/');

  await boxOf(backInHead(page));
  await expectNoSidewaysScroll(page);
});

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

/**
 * The logo's flight between the start page and the workspace rests on the old
 * and the new head changing in one commit, which only a real router and a real
 * browser show. The copies live for a moment, so a watcher notes each flight:
 * how many letters, and where the mark's copy leaves and lands, as boxes.
 */
interface BrandFlight {
  letters: number;
  from: { x: number; y: number; width: number };
  to: { x: number; y: number; width: number };
}

async function watchBrandFlight(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const seen: unknown[] = [];
    (window as unknown as { brandFlights: unknown[] }).brandFlights = seen;
    const boxOfFrame = (frame: Keyframe | undefined, base: number) => {
      const [, x, y, scale] =
        /translate\(([-\d.]+)px, ([-\d.]+)px\) scale\(([-\d.]+)\)/.exec(
          String(frame?.transform),
        ) ?? [];
      return { x: Number(x), y: Number(y), width: Number(scale) * base };
    };
    new MutationObserver((records) => {
      for (const { addedNodes } of records) {
        for (const node of addedNodes) {
          if (!(node instanceof Element)) continue;
          if (!node.classList.contains('kp-flight')) continue;
          const mark = node.querySelector<SVGSVGElement>(':scope > .kp-mark');
          const effect = mark?.getAnimations()[0]?.effect as KeyframeEffect;
          const frames = effect.getKeyframes();
          const base = parseFloat(mark?.style.width ?? '0');
          seen.push({
            letters: node.querySelectorAll('.kp-flight-letter').length,
            from: boxOfFrame(frames[0], base),
            to: boxOfFrame(frames[frames.length - 1], base),
          });
        }
      }
      // The document, as an init script runs before it has a root element.
    }).observe(document, { childList: true, subtree: true });
  });
}

const brandFlights = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { brandFlights: BrandFlight[] }).brandFlights,
  );

function expectSameBox(
  actual: BrandFlight['from'],
  expected: { x: number; y: number; width: number },
): void {
  expect(actual.x).toBeCloseTo(expected.x, 0);
  expect(actual.y).toBeCloseTo(expected.y, 0);
  expect(actual.width).toBeCloseTo(expected.width, 0);
}

test(
  'the letters of the logo fly into the workspace and back',
  EVERY_DEVICE,
  async ({ page }) => {
    await watchBrandFlight(page);
    await page.goto('/');
    expect(await brandFlights(page)).toEqual([]);
    const mark = head(page).locator('svg.kp-mark');
    const startBox = await boxOf(mark);

    await page.getByRole('link', { name: 'Plane jetzt deine Klasse!' }).click();
    await expect(page).toHaveURL(/\/generator$/);
    await expect.poll(async () => (await brandFlights(page)).length).toBe(1);

    // Landed: the copies are gone and the real head shows what they drew.
    await expect(page.locator('.kp-flight')).toHaveCount(0);
    await expect(mark).toHaveCSS('opacity', '1');
    await expect(gearInHead(page)).toBeVisible();
    const workspaceBox = await boxOf(mark);
    const [there] = await brandFlights(page);
    expect(there.letters).toBe(11);
    expectSameBox(there.from, startBox);
    expectSameBox(there.to, workspaceBox);

    await head(page).getByRole('link').first().click();
    await expect(page).toHaveURL(/\/$/);
    await expect.poll(async () => (await brandFlights(page)).length).toBe(2);
    await expect(page.locator('.kp-flight')).toHaveCount(0);
    await expect(head(page).locator('.kp-wordmark-text')).toHaveCSS(
      'opacity',
      '1',
    );
    const [, back] = await brandFlights(page);
    expect(back.letters).toBe(11);
    expectSameBox(back.from, workspaceBox);
    expectSameBox(back.to, await boxOf(mark));
  },
);

test('the logo jumps under reduced motion, and on the other pages', async ({
  page,
}) => {
  await watchBrandFlight(page);
  await page.goto('/');
  await goInside(page, '/faq');
  await expect(page.locator('.kp-flight')).toHaveCount(0);
  expect(await brandFlights(page)).toEqual([]);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await goInside(page, '/');
  await page.getByRole('link', { name: 'Plane jetzt deine Klasse!' }).click();
  await expect(page).toHaveURL(/\/generator$/);
  await expect(gearInHead(page)).toBeVisible();
  expect(await brandFlights(page)).toEqual([]);
});
