// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Nothing moves on the first drawing (`docs/DESIGNSYSTEM.md` § 6g), and the
 * workspace keeps the "good" Core Web Vitals that `docs/ARCHITECTURE.md`
 * promises: a first visit and a reload with a class each add up to a layout
 * shift (CLS) of at most 0.05, half the limit of "good".
 *
 * Measured with the browser's own `layout-shift` entries, buffered from the
 * start of the navigation, the way Lighthouse adds them up — without the
 * shifts a click caused (`hadRecentInput`). Only a real browser lays out.
 */
import { test, expect, type Page } from '@playwright/test';

test.use({ locale: 'de-DE', viewport: { width: 1280, height: 720 } });

// Loading the sample class draws 24 pictures.
test.setTimeout(120_000);

const MAX_LAYOUT_SHIFT = 0.05;

/** How long after loading a late shift is still counted. */
const SETTLE_MS = 1_500;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('cookieConsent', 'true');
    // The coach marks stand above the page and shift nothing, but they hold
    // the focus; the views underneath are what is measured.
    window.localStorage.setItem(
      'spg.onboardingTour',
      JSON.stringify({ version: 1, seen: [], skipped: true }),
    );
  });
});

/** The layout shift since the page was loaded, and what moved in it. */
async function layoutShift(page: Page): Promise<{
  value: number;
  moved: string[];
}> {
  await page.waitForLoadState('load');
  await page.waitForTimeout(SETTLE_MS);
  return page.evaluate(
    () =>
      new Promise<{ value: number; moved: string[] }>((resolve) => {
        type Shift = PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
          sources?: Array<{ node?: Node | null }>;
        };
        const name = (node?: Node | null) => {
          if (!(node instanceof Element)) return String(node?.nodeName);
          const label =
            node.getAttribute('aria-label') ||
            node.id ||
            (node.getAttribute('class') ?? '').slice(0, 60);
          return `${node.tagName.toLowerCase()} ${label}`.trim();
        };
        new PerformanceObserver((list) => {
          const shifts = (list.getEntries() as Shift[]).filter(
            (entry) => !entry.hadRecentInput,
          );
          resolve({
            value: shifts.reduce((sum, entry) => sum + entry.value, 0),
            moved: shifts.flatMap((entry) =>
              (entry.sources ?? []).map(
                (source) => `${entry.value.toFixed(3)} ${name(source.node)}`,
              ),
            ),
          });
        }).observe({ type: 'layout-shift', buffered: true });
        // No entry at all: the observer is never called.
        setTimeout(() => resolve({ value: 0, moved: [] }), 500);
      }),
  );
}

async function expectSteady(page: Page) {
  const shift = await layoutShift(page);
  expect(
    shift.value,
    `layout shift ${shift.value.toFixed(3)}:\n${shift.moved.join('\n')}`,
  ).toBeLessThanOrEqual(MAX_LAYOUT_SHIFT);
}

test('a first visit to the workspace draws it in place', async ({ page }) => {
  await page.goto('/generator');
  await expect(
    page.getByRole('textbox', { name: 'Name der neuen Klasse' }),
  ).toBeVisible();

  await expectSteady(page);
});

test('a reload with a class draws the workspace in place', async ({ page }) => {
  await page.goto('/generator');
  await page
    .getByRole('button', { name: 'Beispielklasse laden', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: /Aktive Klasse: Beispielklasse/ }),
  ).toContainText('24 Schüler');

  // A reload opens the class layer, the class read back from storage.
  await page.reload();
  await expect(
    page.getByRole('button', { name: /^Emma Becker im Inspektor/ }),
  ).toBeVisible();
  await expectSteady(page);
});
