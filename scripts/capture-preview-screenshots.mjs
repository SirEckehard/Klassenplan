// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
//
// Captures the start page screenshots — the PNG masters in public/preview/ —
// from the app, for every slide in German and English, light and dark. The
// script starts its own Vite dev server.
//
// Each language gets a fresh browser profile. The sample class is loaded
// through the UI, so its pictures are drawn and stored the way a visitor's
// would be. Its room is then replaced by a more varied one, written straight
// into the class record in IndexedDB, and the plan layer shuffles once. The English
// class takes over the German seating and circle — the two sample classes list
// the same students in the same order — so every slide shows the same plan in
// all four variants.
//
// The workspace fills the window from `lg` up — header, toolbar, stage,
// inspector, status bar — so a slide is the whole window rather than a cut-out:
// 1440 × 960, the 3:2 shape of the start page's slot. The projection is the
// exception, shot on a portrait tablet. Screenshots are taken at a device scale
// factor of 3, then scaled down to the master's size in the browser. The sizes
// are the ones HeroMockup and the web app manifest (vite.config.ts) declare;
// changing one means changing those too. A canvas only writes RGBA
// PNGs, so each master takes a lossless round trip through cwebp and dwebp and
// is stored as RGB, a third smaller.
//
// Afterwards generate-preview-images.mjs encodes the AVIF/WebP files. Both
// steps need libwebp and libavif on the PATH (see that script).
//
// Usage: npm run capture:preview-screenshots
// Needs Chromium for Playwright: npx playwright install chromium
import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { logError, logInfo } from './utils/logger.mjs';

const SOURCE = 'capture-preview-screenshots';
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const previewDir = path.join(projectRoot, 'public', 'preview');
const localesDir = path.join(projectRoot, 'src', 'i18n', 'locales');

const LANGUAGES = ['de', 'en'];
const THEMES = ['light', 'dark'];
const CAPTURE_SCALE = 3;
/** A laptop window in the slot's 3:2 shape, half the master's size. */
const DESKTOP_VIEWPORT = { width: 1440, height: 960 };
const WIDE_MASTER = { width: 2880, height: 1920 };
/** A portrait tablet, half the master's size. */
const PRESENT_VIEWPORT = { width: 712, height: 1118 };
const PORTRAIT_MASTER = { width: 1424, height: 2236 };
const STUDENT_COUNT = 24;
/**
 * The student the class slide opens in the inspector: restless, tall, a wish
 * and an avoid wish, so the panel shows three families at once. Its position
 * in the sample class (`DEMO_STUDENTS` in src/utils/demo/demoClass.ts).
 */
const INSPECTED_STUDENT = 1;

// Table sizes from TABLE_PRESETS in src/utils/constants.ts.
const TABLE_SIZES = {
  single: { width: 55, height: 65, seatCount: 1 },
  double: { width: 55, height: 130, seatCount: 2 },
  group4: { width: 110, height: 130, seatCount: 4 },
  group6: { width: 165, height: 130, seatCount: 6 },
};

/** A table of the given template, centred on (cx, cy) in the 900 × 600 room. */
function table(templateType, cx, cy, rotation, zIndex) {
  const { width, height, seatCount } = TABLE_SIZES[templateType];
  return {
    x: cx - width / 2,
    y: cy - height / 2,
    width,
    height,
    rotation,
    seatCount,
    locked: false,
    zIndex,
    templateType,
  };
}

function feature(id, type, x, y, width, height, anchor, rotation) {
  return {
    id,
    type,
    visible: true,
    x,
    y,
    width,
    height,
    anchor,
    movable: anchor === 'free',
    label: type,
    rotation,
  };
}

/** 24 seats at every table template, some of them turned. The board is on the right wall. */
const SCREENSHOT_SCENE = {
  totalStudents: STUDENT_COUNT,
  tables: [
    table('group4', 150, 170, -20, 0),
    table('group4', 150, 410, 20, 1),
    table('double', 420, 110, 90, 2),
    table('group6', 420, 300, 0, 3),
    table('double', 420, 490, 90, 4),
    table('double', 610, 200, 0, 5),
    table('double', 610, 420, 0, 6),
    table('single', 745, 260, 0, 7),
    table('single', 745, 370, 0, 8),
  ],
  features: [
    feature('window-top-1', 'window', 200, 0, 160, 20, 'top', -90),
    feature('window-top-2', 'window', 420, 0, 160, 20, 'top', -90),
    feature('window-top-3', 'window', 640, 0, 160, 20, 'top', -90),
    feature('board-main', 'board', 880, 200, 20, 200, 'right', 180),
    feature('door-main', 'door', 600, 580, 70, 20, 'bottom', 90),
    feature('cabinet-1', 'cabinet', 220, 560, 100, 40, 'free', 0),
    feature('cabinet-2', 'cabinet', 320, 560, 100, 40, 'free', 0),
    feature('podium-main', 'podium', 770, 80, 90, 60, 'free', 90),
  ],
};

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf-8' });
  if (result.error?.code === 'ENOENT') {
    throw new Error(
      `${command} not found — install libwebp and libavif (see generate-preview-images.mjs)`,
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed: ${result.stderr || result.stdout}`,
    );
  }
}

async function readTranslations(lang) {
  const read = async (namespace) =>
    JSON.parse(
      await fs.readFile(
        path.join(localesDir, lang, `${namespace}.json`),
        'utf-8',
      ),
    );
  const generator = await read('generator');
  const students = await read('students');
  return (key, values = {}) => {
    const [namespace, keyPath] = key.split(':');
    const source = { generator, students }[namespace];
    const text = keyPath
      .split('.')
      .reduce((node, part) => node?.[part], source);
    if (typeof text !== 'string') {
      throw new Error(`missing translation ${lang}/${key}`);
    }
    // A placeholder without a value stays, for translationPattern to open up.
    return text.replace(/\{\{(\w+)\}\}/g, (placeholder, name) =>
      name in values ? String(values[name]) : placeholder,
    );
  };
}

/**
 * Reads the active class record from `spg.classCollection` and, given
 * `changes`, overwrites those fields of it. Returns the record as it was read.
 */
async function accessActiveClass(page, baseUrl, changes = null) {
  // A static file of the same origin: the app must not be running while its
  // storage is rewritten underneath it, or its persist queue writes it back.
  await page.goto(`${baseUrl}/robots.txt`);
  return page.evaluate(async (fields) => {
    const request = (target) =>
      new Promise((resolve, reject) => {
        target.onsuccess = () => resolve(target.result);
        target.onerror = () => reject(target.error);
      });
    const db = await request(indexedDB.open('keyval-store'));
    const collection = await request(
      db.transaction('keyval').objectStore('keyval').get('spg.classCollection'),
    );
    const activeClass = collection.classes.find(
      (entry) => entry.id === collection.activeClassId,
    );
    const snapshot = structuredClone(activeClass);
    if (fields) {
      Object.assign(activeClass, fields);
      const transaction = db.transaction('keyval', 'readwrite');
      transaction.objectStore('keyval').put(collection, 'spg.classCollection');
      await new Promise((resolve, reject) => {
        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
    }
    db.close();
    return snapshot;
  }, changes);
}

/**
 * Replaces the German students in a stored value with the English ones at the
 * same position: whole student objects as well as bare ids.
 */
function remapStudents(value, idMap, studentsById) {
  if (Array.isArray(value)) {
    return value.map((item) => remapStudents(item, idMap, studentsById));
  }
  if (value && typeof value === 'object') {
    if (idMap.has(value.id) && 'name' in value) {
      return studentsById.get(idMap.get(value.id));
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        remapStudents(item, idMap, studentsById),
      ]),
    );
  }
  return typeof value === 'string' && idMap.has(value)
    ? idMap.get(value)
    : value;
}

async function settle(page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
}

/** Scales a screenshot to the master size in the browser and returns a PNG. */
async function scaleTo(page, screenshot, target) {
  const base64 = await page.evaluate(
    async ({ data, width, height }) => {
      const bytes = Uint8Array.from(atob(data), (char) => char.charCodeAt(0));
      const bitmap = await createImageBitmap(
        new Blob([bytes], { type: 'image/png' }),
        {
          resizeWidth: width,
          resizeHeight: height,
          resizeQuality: 'high',
          colorSpaceConversion: 'none',
        },
      );
      const canvas = new OffscreenCanvas(width, height);
      canvas.getContext('2d').drawImage(bitmap, 0, 0);
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      const output = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      for (let i = 0; i < output.length; i += 0x8000) {
        binary += String.fromCharCode(...output.subarray(i, i + 0x8000));
      }
      return btoa(binary);
    },
    { data: screenshot.toString('base64'), ...target },
  );
  return Buffer.from(base64, 'base64');
}

/**
 * Writes one master. `output` holds the page that scales screenshots and the
 * directory for the intermediate files.
 */
async function saveSlide(page, output, slug, lang, theme, target, clip) {
  const screenshot = await page.screenshot({
    clip,
    animations: 'disabled',
    caret: 'hide',
  });
  const name = `${slug}_${lang}_${theme}`;
  const rgbaPng = path.join(output.tmpDir, `${name}.png`);
  const losslessWebp = path.join(output.tmpDir, `${name}.webp`);
  const file = path.join(previewDir, `${name}.png`);
  await fs.writeFile(
    rgbaPng,
    await scaleTo(output.scalePage, screenshot, target),
  );
  run('cwebp', ['-quiet', '-lossless', rgbaPng, '-o', losslessWebp]);
  run('dwebp', ['-quiet', losslessWebp, '-o', file]);
  logInfo('Captured', { file: path.relative(projectRoot, file) }, SOURCE);
}

/** The scene SVG's room coordinates as a point on the page. */
async function roomPointOnPage(container, x, y) {
  return container.evaluate(
    (element, point) => {
      const svg = [...element.querySelectorAll('svg')].sort(
        (a, b) =>
          b.getBoundingClientRect().width - a.getBoundingClientRect().width,
      )[0];
      const matrix = svg.getScreenCTM();
      return {
        x: matrix.a * point.x + matrix.c * point.y + matrix.e,
        y: matrix.b * point.x + matrix.d * point.y + matrix.f,
      };
    },
    { x, y },
  );
}

/** Resolves once the class layer lists every student with a drawn picture. */
async function waitForClassList(page) {
  await page.waitForFunction((count) => {
    const pictures = [
      ...document.querySelectorAll('[data-tour="student-row"] img'),
    ];
    return (
      pictures.length === count &&
      pictures.every((picture) => picture.complete && picture.naturalWidth > 0)
    );
  }, STUDENT_COUNT);
  await settle(page);
}

async function openGenerator(page, baseUrl, prefix, t) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto(`${baseUrl}${prefix}/generator`);
  await goToLayer(page, t, 'class');
  await waitForClassList(page);
}

/**
 * Moves the pointer off whatever it last pressed, so no hover state lands in a
 * slide: the right edge of the inspector, which reacts to nothing.
 */
async function restPointer(page) {
  await page.mouse.move(
    DESKTOP_VIEWPORT.width - 2,
    DESKTOP_VIEWPORT.height / 2,
  );
}

/** Klasse, Raum or Sitzplan in the header's layer switcher. */
async function goToLayer(page, t, layer) {
  await page
    .getByRole('tab', { name: t(`generator:shell.layers.${layer}`) })
    .click();
}

/** Sitzplan or Sitzkreis in the plan layer's toolbar. */
async function showArrangement(page, t, layer) {
  await page
    .getByRole('button', {
      name: t(`generator:shell.layers.${layer}`),
      exact: true,
    })
    .click();
}

/** A pattern for a translation with its placeholders left open. */
function translationPattern(text) {
  return new RegExp(
    text
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\{\\\{\w+\\\}\\\}/g, '.+?'),
  );
}

/**
 * Picks a recipe above the criteria and shuffles with it, so the plan slide
 * shows a named lesson rather than the settings a first shuffle left behind.
 */
async function mixWithRecipe(page, t, recipe) {
  await page
    .getByRole('button', { expanded: false })
    .filter({
      hasText: translationPattern(t('generator:mix.recipes.activeCount')),
    })
    .click();
  await page
    .getByRole('group', { name: t('generator:mix.recipes.title') })
    .getByRole('button', {
      name: translationPattern(t(`generator:mix.recipes.${recipe}.label`)),
    })
    .click();
  await page.locator('[data-tour="mix-button"]').first().click();
  await waitForPlan(page, t);
  // The worker reports no end of its run on screen beyond the plan itself.
  await page.waitForTimeout(1500);
  await settle(page);
}

async function waitForPlan(page, t) {
  await page
    .getByRole('group', {
      name: t('generator:editor.canvasLabel', {
        occupied: STUDENT_COUNT,
        total: STUDENT_COUNT,
      }),
    })
    .waitFor();
  await page.locator('[data-tour="plan-fulfillment"]').first().waitFor();
}

/**
 * Loads the sample class, furnishes the screenshot room and settles the plan:
 * a fresh shuffle in German, the German plan carried over in English.
 */
async function prepareClass(page, baseUrl, prefix, t, germanPlan) {
  await page.goto(`${baseUrl}${prefix}/generator`);
  await page
    .getByRole('button', { name: t('generator:demoClass.button'), exact: true })
    .click();
  await waitForClassList(page);

  if (germanPlan) {
    const { students } = await accessActiveClass(page, baseUrl);
    const idMap = new Map(
      germanPlan.studentIds.map((id, index) => [id, students[index].id]),
    );
    const studentsById = new Map(
      students.map((student) => [student.id, student]),
    );
    await accessActiveClass(page, baseUrl, {
      classroomScene: SCREENSHOT_SCENE,
      ...remapStudents(germanPlan.plan, idMap, studentsById),
    });
    return null;
  }

  await accessActiveClass(page, baseUrl, {
    classroomScene: SCREENSHOT_SCENE,
    currentSeating: [],
    lockedPositions: {},
    mixHistory: [],
    circleLayout: null,
  });
  await openGenerator(page, baseUrl, prefix, t);
  await goToLayer(page, t, 'plan');
  await waitForPlan(page, t);
  await mixWithRecipe(page, t, 'recommended');
  // Opening the circle view generates the circle in the worker. Nothing on
  // screen marks the end of that run, hence the fixed wait; the check below
  // fails loudly if it was not enough.
  await showArrangement(page, t, 'circle');
  await settle(page);
  await page.waitForTimeout(2000);
  await showArrangement(page, t, 'plan');
  await settle(page);

  const germanClass = await accessActiveClass(page, baseUrl);
  if (!germanClass.currentSeating.length || !germanClass.circleLayout) {
    throw new Error('the shuffled plan or its circle was not stored');
  }
  return {
    studentIds: germanClass.students.map((student) => student.id),
    plan: {
      currentSeating: germanClass.currentSeating,
      circleLayout: germanClass.circleLayout,
      mixHistory: germanClass.mixHistory,
      // The first shuffle switches on the criteria the class needs.
      mixSettings: germanClass.mixSettings,
      lockedPositions: germanClass.lockedPositions,
    },
  };
}

async function captureTheme(page, output, baseUrl, prefix, lang, theme, t) {
  const fullWindow = { x: 0, y: 0, ...DESKTOP_VIEWPORT };

  // View preferences a previous pass may have left behind. The toolbar shows
  // its labels: a slide is looked at, not used, and the words say what the
  // icons would leave to a tooltip.
  await page.evaluate((value) => {
    localStorage.setItem('theme', value);
    localStorage.removeItem('spg.seatingMode');
    localStorage.setItem('spg.sidebarExpanded', 'true');
  }, theme);

  // 01 — the class layer with one student open in the inspector.
  await openGenerator(page, baseUrl, prefix, t);
  await page
    .locator('[data-tour="student-row"]')
    .nth(INSPECTED_STUDENT)
    .getByRole('button')
    .click();
  await restPointer(page);
  await settle(page);
  await saveSlide(
    page,
    output,
    '01_schuelerliste',
    lang,
    theme,
    WIDE_MASTER,
    fullWindow,
  );

  // 02 — the room layer with the group table selected.
  await goToLayer(page, t, 'room');
  const layoutCanvas = page.locator('[data-tour="layout-canvas"]').first();
  await layoutCanvas.waitFor();
  await settle(page);
  const groupTable = await roomPointOnPage(layoutCanvas, 420, 300);
  await page.mouse.click(groupTable.x, groupTable.y);
  await settle(page);
  await saveSlide(
    page,
    output,
    '02_editor',
    lang,
    theme,
    WIDE_MASTER,
    fullWindow,
  );

  // 03 — the plan layer: the plan, and the criteria beside it.
  await goToLayer(page, t, 'plan');
  await waitForPlan(page, t);
  await restPointer(page);
  await settle(page);
  await saveSlide(
    page,
    output,
    '03_sitzplan',
    lang,
    theme,
    WIDE_MASTER,
    fullWindow,
  );

  // 04 — the same plan as a seating circle.
  await showArrangement(page, t, 'circle');
  await settle(page);
  await saveSlide(
    page,
    output,
    '04_sitzkreis',
    lang,
    theme,
    WIDE_MASTER,
    fullWindow,
  );
  await page.evaluate(() => localStorage.removeItem('spg.seatingMode'));

  // 05 — presentation, student view, as on a portrait tablet.
  await page.setViewportSize(PRESENT_VIEWPORT);
  await page.goto(`${baseUrl}${prefix}/present`);
  await settle(page);
  await saveSlide(
    page,
    output,
    '05_praesentation',
    lang,
    theme,
    PORTRAIT_MASTER,
    { x: 0, y: 0, ...PRESENT_VIEWPORT },
  );

  // 06 — the export page: the sheet on the stage, its settings beside it.
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page.goto(`${baseUrl}${prefix}/export`);
  await page
    .locator('iframe')
    .first()
    .contentFrame()
    .locator('svg')
    .first()
    .waitFor();
  await settle(page);
  await saveSlide(
    page,
    output,
    '06_export',
    lang,
    theme,
    WIDE_MASTER,
    fullWindow,
  );
}

async function main() {
  // Fail before the browser work rather than at the first slide.
  run('cwebp', ['-version']);
  run('dwebp', ['-version']);

  const server = await createServer({
    root: projectRoot,
    // The app's own console output would otherwise be echoed into this log.
    server: {
      port: 5199,
      strictPort: false,
      open: false,
      forwardConsole: false,
    },
    logLevel: 'warn',
  });
  await server.listen();
  const baseUrl = server.resolvedUrls.local[0].replace(/\/$/, '');
  const browser = await chromium.launch();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kp-capture-'));

  try {
    const output = { scalePage: await browser.newPage(), tmpDir };
    let germanPlan = null;

    for (const lang of LANGUAGES) {
      const t = await readTranslations(lang);
      const prefix = lang === 'de' ? '' : `/${lang}`;
      const context = await browser.newContext({
        viewport: DESKTOP_VIEWPORT,
        deviceScaleFactor: CAPTURE_SCALE,
        locale: lang === 'de' ? 'de-DE' : 'en-GB',
        reducedMotion: 'reduce',
        serviceWorkers: 'block',
      });
      await context.addInitScript(() => {
        if (localStorage.getItem('cookieConsent')) return;
        localStorage.setItem('cookieConsent', 'true');
        localStorage.setItem('theme', 'light');
        localStorage.setItem('spg.photoDisplayMode', JSON.stringify('all'));
        localStorage.setItem(
          'spg.onboardingTour',
          JSON.stringify({ version: 1, seen: [], skipped: true }),
        );
      });
      const page = await context.newPage();

      try {
        const result = await prepareClass(page, baseUrl, prefix, t, germanPlan);
        germanPlan ??= result;

        // A view's first visit makes the dev server discover the dependencies
        // it pulls in, and a discovery reloads the page — mid-capture, as like
        // as not. The first language therefore takes one throwaway pass that
        // warms every view up; the pass after it overwrites what it wrote.
        const themes = lang === LANGUAGES[0] ? [THEMES[0], ...THEMES] : THEMES;
        for (const theme of themes) {
          await captureTheme(page, output, baseUrl, prefix, lang, theme, t);
        }
      } catch (error) {
        // What was on screen when a step gave up says more than its selector.
        const failure = path.join(os.tmpdir(), 'kp-capture-failure.png');
        await page.screenshot({ path: failure }).catch(() => {});
        logError('Screen at the failure', { file: failure }, SOURCE);
        throw error;
      }
      await context.close();
    }
  } finally {
    await browser.close();
    await server.close();
    await fs.rm(tmpDir, { recursive: true, force: true });
  }

  const encode = spawnSync(
    process.execPath,
    [path.join(projectRoot, 'scripts', 'generate-preview-images.mjs')],
    { stdio: 'inherit' },
  );
  if (encode.status !== 0) {
    throw new Error('encoding the preview images failed');
  }
}

main().catch((error) => {
  logError(
    'Capturing preview screenshots failed',
    { error: error.message },
    SOURCE,
  );
  process.exitCode = 1;
});
