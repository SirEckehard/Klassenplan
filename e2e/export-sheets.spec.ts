// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The export sheets as pictures: the seating plan, the circle, the list and
 * the substitute's sheet, each upright and across, compared with the
 * snapshots in `e2e/__screenshots__/`. No unit test renders a sheet, and a
 * sheet is what a teacher prints: a name that slips off its seat, a legend
 * that overlaps the plan or a header that loses a line shows here first.
 *
 * The class comes from a backup (`e2e/fixtures/sheets.klassenplan`, written by
 * `src/__tests__/e2eFixtures/sheetsFixture.test.ts`), restored through the
 * app's own import: a mix is random, a restored plan is not. The clock stands
 * still, so the date on every sheet does too.
 *
 * Chromium draws text a little differently on every system, so the snapshots
 * are drawn on Linux, the system CI runs on, and the spec runs nowhere else.
 * On a Mac, `npm run test:visual` and `npm run test:visual:update` run it in
 * Docker, in the image of the Playwright version the project uses.
 */
import path from 'node:path';
import { test, expect, type Locator, type Page } from '@playwright/test';

test.use({ locale: 'de-DE', timezoneId: 'Europe/Berlin' });
test.skip(
  process.platform !== 'linux',
  'The snapshots are drawn on Linux; on a Mac run npm run test:visual',
);
test.setTimeout(120_000);

const FIXTURE = path.join(
  import.meta.dirname,
  'fixtures',
  'sheets.klassenplan',
);
/** The fixture's password: it guards invented data only. */
const FIXTURE_PASSWORD = 'klassenplan-e2e';
/** The day every sheet is printed on. */
const PRINT_DAY = new Date('2026-09-15T08:00:00+02:00');

const VIEWS = [
  { label: 'Sitzplan', slug: 'sitzplan' },
  { label: 'Sitzkreis', slug: 'sitzkreis' },
  { label: 'Liste', slug: 'liste' },
  { label: 'Vertretung', slug: 'vertretung' },
] as const;

const ORIENTATIONS = [
  { label: 'Hochformat', slug: 'hoch' },
  { label: 'Querformat', slug: 'quer' },
] as const;

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(PRINT_DAY);
  // A fresh browser is a first visit; the tour would stand over the sheet.
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'spg.onboardingTour',
      JSON.stringify({ version: 1, seen: [], skipped: true }),
    );
  });
});

async function restoreFixture(page: Page): Promise<void> {
  await page.goto('/generator');
  await page
    .locator('input[type="file"][accept*=".klassenplan"]')
    .setInputFiles(FIXTURE);

  const unlock = page.getByRole('dialog', { name: 'Backup entschlüsseln' });
  await unlock.getByLabel('Passwort', { exact: true }).fill(FIXTURE_PASSWORD);
  await unlock.getByRole('button', { name: 'Entschlüsseln' }).click();

  const restore = page.getByRole('dialog', {
    name: 'Backup wiederherstellen',
  });
  await restore.getByText('Alles ersetzen').click();
  await restore.getByRole('button', { name: 'Wiederherstellen' }).click();
  await expect(restore).toBeHidden();
  await expect(
    page.getByRole('button', { name: 'Emma Becker im Inspektor öffnen' }),
  ).toBeVisible();
}

/** What the preview frame shows right now, as a short fingerprint. */
const previewSignature = (frame: Locator): Promise<string> =>
  frame.evaluate((node) => {
    const source = (node as HTMLIFrameElement).srcdoc;
    let hash = 0;
    for (let index = 0; index < source.length; index += 1) {
      hash = (hash * 31 + source.charCodeAt(index)) | 0;
    }
    return `${source.length}:${hash}`;
  });

/**
 * Presses a toolbar or inspector button unless it is pressed already, and
 * waits for the preview to show what it chose.
 */
async function choose(frame: Locator, button: Locator): Promise<void> {
  if ((await button.getAttribute('aria-pressed')) === 'true') return;
  const before = await previewSignature(frame);
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => previewSignature(frame)).not.toBe(before);
}

/** The sheet once it has drawn: no circle in the making, every font loaded. */
async function settled(page: Page, frame: Locator): Promise<void> {
  await expect(page.locator('[aria-busy="true"]:has(iframe)')).toHaveCount(0);
  const sheet = page.frameLocator('iframe[title="Vorschau"]');
  await expect(sheet.locator('svg').first()).toBeAttached();
  await frame.evaluate(async (node) => {
    const doc = (node as HTMLIFrameElement).contentDocument;
    await doc?.fonts.ready;
    await Promise.all(
      Array.from(doc?.images ?? []).map((image) => image.decode()),
    );
  });
}

test('the export sheets look as they did', async ({ page }) => {
  await restoreFixture(page);
  await page.goto('/export');

  const frame = page.locator('iframe[title="Vorschau"]');
  await expect(
    page.frameLocator('iframe[title="Vorschau"]').locator('svg').first(),
  ).toBeAttached();
  const toolbar = page.getByRole('complementary', { name: 'Werkzeugleiste' });
  const orientation = page.getByRole('group', { name: 'Ausrichtung' });

  for (const view of VIEWS) {
    for (const turn of ORIENTATIONS) {
      await test.step(`${view.label}, ${turn.label}`, async () => {
        await choose(frame, toolbar.getByRole('button', { name: view.label }));
        await choose(
          frame,
          orientation.getByRole('button', { name: turn.label }),
        );
        await settled(page, frame);
        await expect
          .soft(frame)
          .toHaveScreenshot(`${view.slug}-${turn.slug}.png`);
      });
    }
  }
});
