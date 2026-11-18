// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * What a teacher waits for, on the slowest computer Klassenplan supports.
 *
 * Classrooms run whiteboard PCs, old laptops and older iPads, not the
 * machines the app is written on. Chromium slows its main thread down by a
 * factor (`Emulation.setCPUThrottlingRate`), and each step is timed at every
 * factor of `SLOW_DEVICE_CPU` (default `1,6`; the reference device is 6, see
 * `docs/PERFORMANCE.md`), `SLOW_DEVICE_RUNS` times (default 3), the median
 * printed:
 *
 * - opening the workspace with the sample class (a reload, files cached);
 * - going to the plan layer;
 * - "Mischen" until the students have landed on their new seats;
 * - dragging one student onto another's seat until both have landed;
 * - the seating plan and the name cards as PDF, from the click to the file;
 * - an encrypted backup, from the click to the file.
 *
 * For each step the longest input event (the Event Timing API's duration,
 * what INP is made of) is printed beside the time.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';

const RATES = (process.env.SLOW_DEVICE_CPU ?? '1,6')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => value >= 1);
const RUNS = Math.max(1, Number(process.env.SLOW_DEVICE_RUNS ?? 3));

type Measure = { ms: number; longestInputMs: number };
type Row = { step: string; rate: number; runs: Measure[] };
const rows: Row[] = [];

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('cookieConsent', 'true');
    window.localStorage.setItem(
      'spg.onboardingTour',
      JSON.stringify({ version: 1, seen: [], skipped: true }),
    );
    // Chromium has a save dialog, which a measurement cannot answer; without
    // it the app downloads, which Playwright sees.
    Object.defineProperty(window, 'showSaveFilePicker', { value: undefined });

    type Perf = {
      events: Array<{ start: number; duration: number }>;
      ready: number | null;
    };
    const perf: Perf = { events: [], ready: null };
    (window as unknown as { __perf: Perf }).__perf = perf;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        perf.events.push({ start: entry.startTime, duration: entry.duration });
      }
    }).observe({ type: 'event', durationThreshold: 16, buffered: true });
    // The workspace counts as open once the class list shows its first
    // student.
    const ready = new MutationObserver(() => {
      if (
        document.querySelector('[aria-label="Emma Becker im Inspektor öffnen"]')
      ) {
        perf.ready = performance.now();
        ready.disconnect();
      }
    });
    ready.observe(document, { childList: true, subtree: true });
  });
});

/** Slows the page's main thread down; it stays so across reloads. */
async function throttle(page: Page, rate: number): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
}

/** The layer switch's "Sitzplan". */
const planLayer = (page: Page) =>
  page
    .getByRole('group', { name: 'Ebene wechseln' })
    .getByRole('button', { name: 'Sitzplan' });

const now = (page: Page) => page.evaluate(() => performance.now());

/**
 * Starts watching, in the page and frame by frame, for what `kind` names;
 * the returned function resolves with the page time it first showed.
 * Playwright's own waiting polls at growing intervals (100, 250, 500 ms …),
 * which would round every wait up to its next step.
 */
async function watchFor(
  page: Page,
  kind: 'plan' | 'download-question',
): Promise<() => Promise<number>> {
  await page.evaluate((watched) => {
    const holds = () =>
      watched === 'plan'
        ? /^Sitzplan: 24 von/.test(
            document
              .querySelector('[aria-label^="Sitzplan:"]')
              ?.getAttribute('aria-label') ?? '',
          )
        : Array.from(document.querySelectorAll('[aria-modal="true"]')).some(
            (dialog) => dialog.textContent?.includes('Datei herunterladen?'),
          );
    (window as unknown as { __watch: Promise<number> }).__watch =
      new Promise<number>((resolve) => {
        const look = () =>
          holds() ? resolve(performance.now()) : requestAnimationFrame(look);
        look();
      });
  }, kind);
  return () =>
    page.evaluate(
      () => (window as unknown as { __watch: Promise<number> }).__watch,
    );
}

/** The longest input event since `since` (page time), 0 when none was slow. */
const longestInputSince = (page: Page, since: number) =>
  page.evaluate(
    (from) =>
      Math.max(
        0,
        ...(
          window as unknown as {
            __perf: { events: Array<{ start: number; duration: number }> };
          }
        ).__perf.events
          .filter((entry) => entry.start >= from)
          .map((entry) => entry.duration),
      ),
    since,
  );

/** Who sits where on the plan, in seat order. */
const seating = (page: Page) =>
  page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-seat-student]'))
      .map((seat) => seat.getAttribute('data-seat-student'))
      .join('|'),
  );

/**
 * Page times once the seating differs from `before` (the new plan stands)
 * and once nothing moves any more (the students have landed).
 */
const settledAfter = (page: Page, before: string) =>
  page.evaluate(
    (previous) =>
      new Promise<{ changed: number; landed: number }>((resolve) => {
        let changed = 0;
        const look = () => {
          if (!changed) {
            const current = Array.from(
              document.querySelectorAll('[data-seat-student]'),
            )
              .map((seat) => seat.getAttribute('data-seat-student'))
              .join('|');
            if (current !== previous) changed = performance.now();
          }
          // A flying student's seat stays hidden until its copy lands;
          // other animations (a toast's timer) are none of the plan's.
          const moving =
            document.querySelector(
              '[data-seat-flight][style*="opacity: 0"], [data-seat-flight-part][style*="opacity: 0"]',
            ) !== null;
          if (changed && !moving) {
            resolve({ changed, landed: performance.now() });
          } else requestAnimationFrame(look);
        };
        look();
      }),
    before,
  );

function record(step: string, rate: number, measure: Measure) {
  let row = rows.find((entry) => entry.step === step && entry.rate === rate);
  if (!row) {
    row = { step, rate, runs: [] };
    rows.push(row);
  }
  row.runs.push(measure);
}

async function loadSampleClass(page: Page) {
  await page.goto('/generator');
  await page
    .getByRole('button', { name: 'Beispielklasse laden', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: /Aktive Klasse: Beispielklasse/ }),
  ).toContainText('24 Schüler');
}

async function openWorkspace(page: Page, rate: number) {
  // The throttling set before stays across the reload, so the whole start
  // runs slowed down.
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Emma Becker im Inspektor öffnen' }),
  ).toBeVisible();
  const ready = await page.evaluate(
    () => (window as unknown as { __perf: { ready: number } }).__perf.ready,
  );
  record('Arbeitsfläche öffnen', rate, {
    ms: ready,
    longestInputMs: 0,
  });
}

async function toPlan(page: Page, rate: number) {
  const shown = await watchFor(page, 'plan');
  const before = await now(page);
  await planLayer(page).click();
  const at = await shown();
  record('Zur Plan-Ebene', rate, {
    ms: at - before,
    longestInputMs: await longestInputSince(page, before),
  });
}

async function mix(page: Page, rate: number) {
  const before = await seating(page);
  const start = await now(page);
  await page.getByRole('button', { name: 'Mischen', exact: true }).click();
  const { changed, landed } = await settledAfter(page, before);
  const longestInputMs = await longestInputSince(page, start);
  record('Mischen, bis der neue Plan steht', rate, {
    ms: changed - start,
    longestInputMs,
  });
  record('Mischen, bis alle gelandet sind', rate, {
    ms: landed - start,
    longestInputMs,
  });
}

/** From letting go of a student on another's seat until both have landed. */
async function drag(page: Page, rate: number) {
  const seats = page.locator('[data-seat-student]');
  const from = await seats.nth(0).boundingBox();
  const to = await seats.nth(5).boundingBox();
  if (!from || !to) throw new Error('No seats to drag between');
  const before = await seating(page);
  const start = await now(page);
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
    steps: 12,
  });
  const dropped = await now(page);
  await page.mouse.up();
  const { landed } = await settledAfter(page, before);
  record('Schüler ablegen, bis beide gelandet sind', rate, {
    ms: landed - dropped,
    longestInputMs: await longestInputSince(page, start),
  });
}

/**
 * What a file keeps a teacher waiting, in wall time: from the click to the
 * question "Datei herunterladen?", and from "Herunterladen" to the file. The
 * time to answer the question is no wait.
 */
async function download(page: Page, click: () => Promise<void>) {
  const asked = await watchFor(page, 'download-question');
  const start = await now(page);
  await click();
  const askedAt = await asked();
  const question = page.getByRole('dialog', { name: 'Datei herunterladen?' });
  const file = page.waitForEvent('download', { timeout: 300_000 });
  const confirmed = Date.now();
  await question.getByRole('button', { name: 'Herunterladen' }).click();
  await file;
  const saved = Date.now();
  return {
    ms: askedAt - start + (saved - confirmed),
    longestInputMs: await longestInputSince(page, start),
  };
}

/**
 * Shows the export view `label` and waits for the preview to draw it: the
 * PDF button saves what the preview shows. The view stays chosen across
 * visits, so every run chooses it.
 */
async function showView(page: Page, label: string) {
  const button = page
    .getByRole('complementary', { name: 'Werkzeugleiste' })
    .getByRole('button', { name: label });
  const preview = page.locator('iframe[title="Vorschau"]');
  const drawn = () =>
    preview.evaluate((node) => (node as HTMLIFrameElement).srcdoc);
  await expect(preview).toBeAttached();
  if ((await button.getAttribute('aria-pressed')) !== 'true') {
    const before = await drawn();
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(drawn).not.toBe(before);
  }
  await expect(page.locator('[aria-busy="true"]:has(iframe)')).toHaveCount(0);
  await expect(
    page.frameLocator('iframe[title="Vorschau"]').locator('svg').first(),
  ).toBeAttached();
}

async function exports(page: Page, rate: number) {
  await page.getByRole('button', { name: 'Exportieren' }).click();
  await expect(page).toHaveURL(/\/export$/);
  const pdf = () => page.getByRole('button', { name: 'PDF-Dokument' }).click();

  await showView(page, 'Sitzplan');
  record('PDF des Sitzplans', rate, await download(page, pdf));

  await showView(page, 'Namensschilder');
  record('PDF der Namensschilder', rate, await download(page, pdf));
  await page.goBack();
}

async function backup(page: Page, rate: number) {
  await page.getByRole('button', { name: 'Backup', exact: true }).click();
  await page.getByRole('button', { name: 'Backup exportieren' }).click();
  const dialog = page.getByRole('dialog', { name: 'Backup verschlüsseln' });
  await dialog.getByLabel('Passwort', { exact: true }).fill('langsames-geraet');
  await dialog.getByLabel('Passwort wiederholen').fill('langsames-geraet');
  record(
    'Backup verschlüsselt speichern',
    rate,
    await download(page, () =>
      dialog.getByRole('button', { name: 'Backup erstellen' }).click(),
    ),
  );
  await expect(dialog).toBeHidden();
}

for (const rate of RATES) {
  test(`a teacher's day at CPU ÷${rate}`, async ({ page }) => {
    await loadSampleClass(page);
    // Every file of the bundle in the cache once, as on any day after the
    // first; the first mix happens on entering the plan.
    await planLayer(page).click();
    await expect(page.getByRole('group', { name: /^Sitzplan:/ })).toBeVisible();
    await throttle(page, rate);

    for (let run = 0; run < RUNS; run += 1) {
      await openWorkspace(page, rate);
      await toPlan(page, rate);
      await mix(page, rate);
      await drag(page, rate);
      await exports(page, rate);
      await backup(page, rate);
    }
  });
}

// Chromium slows down the page's main thread only, never a worker
// ("Operation is only supported for pages, not workers"), and the mix runs in
// one. Without `Worker` the app mixes on the main thread instead
// (`algorithmWorkerClient`'s fallback), which the throttling reaches: the time
// until the new plan stands as a slow device takes it. Its input delay says
// nothing — a real device keeps the main thread free.
for (const rate of RATES) {
  test(`mixing at CPU ÷${rate}, the computing slowed down too`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'Worker', { value: undefined });
    });
    await loadSampleClass(page);
    await planLayer(page).click();
    await expect(page.getByRole('group', { name: /^Sitzplan:/ })).toBeVisible();
    await throttle(page, rate);

    for (let run = 0; run < RUNS; run += 1) {
      const before = await seating(page);
      const start = await now(page);
      await page.getByRole('button', { name: 'Mischen', exact: true }).click();
      const { changed } = await settledAfter(page, before);
      record('Mischen ohne Worker, bis der neue Plan steht', rate, {
        ms: changed - start,
        longestInputMs: 0,
      });
    }
  });
}

test.afterAll(() => {
  const steps = [...new Set(rows.map((row) => row.step))];
  const lines = [
    `Median of ${RUNS} runs, ms (longest input event in brackets)`,
    ['Step', ...RATES.map((rate) => `CPU ÷${rate}`)].join(' | '),
  ];
  for (const step of steps) {
    const cells = RATES.map((rate) => {
      const row = rows.find(
        (entry) => entry.step === step && entry.rate === rate,
      );
      if (!row) return '–';
      const ms = Math.round(median(row.runs.map((run) => run.ms)));
      const input = Math.round(
        median(row.runs.map((run) => run.longestInputMs)),
      );
      return input > 0 ? `${ms} (${input})` : `${ms}`;
    });
    lines.push([step, ...cells].join(' | '));
  }
  console.log(`\n${lines.join('\n')}\n`);
  // Every run, for a look at the spread behind a median.
  mkdirSync('test-results', { recursive: true });
  writeFileSync(
    'test-results/slow-device.json',
    `${JSON.stringify({ runs: RUNS, rows }, null, 2)}\n`,
  );
});
