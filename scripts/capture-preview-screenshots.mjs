// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
//
// Captures the start page screenshots — the PNG masters in assets/preview/ —
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
// exception, shot on a portrait tablet. Beside the slides the script cuts the
// close-ups the start page shows next to its sections from `lg` up
// (`PreviewDetail`): whole pieces of the window, never a part of one, each in
// a state of its own — the brush, the room, a locked seat, a criterion's
// seats marked, and each class tool at work, its page in a window as narrow
// as its column — written at twice their size on screen.
// Screenshots are taken at a device scale
// factor of 3, then scaled down to the master's size in the browser. The sizes
// are the ones HeroMockup, PreviewDetail and the web app manifest
// (vite.config.ts) declare; changing one means changing those too. A canvas only writes RGBA
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
const masterDir = path.join(projectRoot, 'assets', 'preview');
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
/**
 * A close-up is written at twice its size on screen, and the start page
 * shows it as a picture of that density: at the size the app draws it, or
 * smaller where the space beside a section is.
 */
const DETAIL_SCALE = 2;
/**
 * The class tools' pages are a column of their own, at most 672 px wide. In
 * a window this narrow — `sm` still, so answers and groups stand in two
 * columns — what a close-up shows of them keeps its shape.
 */
const TOOL_VIEWPORT = { width: 664, height: 960 };
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
  const pages = await read('pages');
  return (key, values = {}) => {
    const [namespace, keyPath] = key.split(':');
    const source = { generator, students, pages }[namespace];
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
 * Reads the active class record and, given `changes`, overwrites those fields
 * of it. Returns the record as it was read. Every class lies under a key of
 * its own and `spg.classIndex` names the open one (decision 0049,
 * src/repositories/classStorage.ts); its seats are student ids (decision 0035).
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
    const read = (key) =>
      request(db.transaction('keyval').objectStore('keyval').get(key));
    const index = await read('spg.classIndex');
    if (!index?.activeClassId) {
      throw new Error('no open class in spg.classIndex');
    }
    const key = `spg.class:${index.activeClassId}`;
    const stored = await read(key);
    const snapshot = structuredClone(stored.record);
    if (fields) {
      Object.assign(stored.record, fields);
      const transaction = db.transaction('keyval', 'readwrite');
      transaction.objectStore('keyval').put(stored, key);
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
  const file = path.join(masterDir, `${name}.png`);
  await fs.writeFile(
    rgbaPng,
    await scaleTo(output.scalePage, screenshot, target),
  );
  run('cwebp', ['-quiet', '-lossless', rgbaPng, '-o', losslessWebp]);
  run('dwebp', ['-quiet', losslessWebp, '-o', file]);
  logInfo('Captured', { file: path.relative(projectRoot, file) }, SOURCE);
}

/**
 * A close-up's cut: whole pieces of the window, never a part of one — the box
 * around every box given, `margin` wider on each side (one number, or one per
 * side).
 */
function pieceClip(boxes, margin = 16) {
  const { top, right, bottom, left } =
    typeof margin === 'number'
      ? { top: margin, right: margin, bottom: margin, left: margin }
      : margin;
  const x = Math.min(...boxes.map((box) => box.x)) - left;
  const y = Math.min(...boxes.map((box) => box.y)) - top;
  const end = Math.max(...boxes.map((box) => box.x + box.width)) + right;
  const foot = Math.max(...boxes.map((box) => box.y + box.height)) + bottom;
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(end - x),
    height: Math.round(foot - y),
  };
}

/**
 * Writes a close-up: the cut at twice its size, or at up to the capture's
 * own scale for a piece the window draws small, which the start page then
 * shows larger than the app does.
 */
async function saveDetail(
  page,
  output,
  slug,
  lang,
  theme,
  clip,
  scale = DETAIL_SCALE,
) {
  const target = {
    width: clip.width * scale,
    height: clip.height * scale,
  };
  await saveSlide(page, output, slug, lang, theme, target, clip);
}

/**
 * The room on screen: the 900 × 600 units of the scene its tables stand in,
 * mapped through the drawing's own transform.
 */
async function roomBox(page) {
  return page
    .locator('g[data-table-index="0"]')
    .first()
    .evaluate((table) => {
      const matrix = table.parentElement.getScreenCTM();
      const [a, b] = [
        [0, 0],
        [900, 600],
      ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
      return {
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        width: Math.abs(b.x - a.x),
        height: Math.abs(b.y - a.y),
      };
    });
}

/** Opens one of the class tools' pages and waits for it to settle. */
async function openTool(page, baseUrl, prefix, route) {
  await page.goto(`${baseUrl}${prefix}${route}`);
  await page.getByRole('main').waitFor();
  await settle(page);
}

/** The box a table of the plan or the room takes on screen. */
async function tableBox(page, index) {
  return page.locator(`g[data-table-index="${index}"]`).first().boundingBox();
}

/**
 * The middle of the aisle between two columns of tables of the screenshot
 * room, given by their indices: the left edge of a cut that ends at the
 * window's right edge and cuts through no table.
 */
async function aisleBetween(page, before, after) {
  const boxes = (indices) =>
    Promise.all(indices.map((index) => tableBox(page, index)));
  const [left, right] = await Promise.all([boxes(before), boxes(after)]);
  const leftEnd = Math.max(...left.map((box) => box.x + box.width));
  const rightStart = Math.min(...right.map((box) => box.x));
  return (leftEnd + rightStart) / 2;
}

/**
 * Scrolls the column around `locator` so the element's top stands at `top`
 * in the window.
 */
async function scrollColumnTo(locator, top) {
  await locator.evaluate((element, target) => {
    const scrolls = (node) =>
      /auto|scroll/.test(getComputedStyle(node).overflowY) &&
      node.scrollHeight > node.clientHeight + 1;
    let column = element.parentElement;
    while (column && !scrolls(column)) {
      column = column.parentElement;
    }
    if (!column) return;
    column.scrollTop += element.getBoundingClientRect().top - target;
  }, top);
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

/**
 * Klasse, Raum or Sitzplan in the header's layer switcher — a group of toggle
 * buttons whose third one carries the same name as the toolbar's view entry.
 */
async function goToLayer(page, t, layer) {
  await page
    .getByRole('group', { name: t('generator:shell.layerSwitchLabel') })
    .getByRole('button', {
      name: t(`generator:shell.layers.${layer}`),
      exact: true,
    })
    .click();
}

/** Sitzplan or Sitzkreis in the plan layer's toolbar. */
async function showArrangement(page, t, layer) {
  await page
    .getByRole('complementary', { name: t('generator:sidebar.ariaLabel') })
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
  const title = t('generator:mix.recipes.title');
  await page.getByRole('button', { name: new RegExp(`^${title}: `) }).click();
  await page
    .getByRole('dialog', { name: title })
    .getByRole('button', {
      name: translationPattern(t(`generator:mix.recipes.${recipe}.label`)),
    })
    .first()
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
  await mixWithRecipe(page, t, 'standard');
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
    localStorage.setItem('spg.theme', value);
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

  // Close-up "Klasse" — the brush: the markers, the question the first one
  // asks of the class and the rows that answer it.
  await page
    .getByRole('button', { name: t('students:brush.start'), exact: true })
    .click();
  const brushHead = page.getByRole('group', {
    name: t('students:brush.title'),
    exact: true,
  });
  await brushHead.waitFor();
  // The window narrows until the list is 576 px wide, where a row puts its
  // markers under the name: the head and the first three rows, whole, with
  // the ring at their end that answers the question. The cut ends on the
  // line under the third.
  const wideBrushBox = await brushHead.boundingBox();
  await page.setViewportSize({
    width: DESKTOP_VIEWPORT.width - Math.round(wideBrushBox.width - 576),
    height: DESKTOP_VIEWPORT.height,
  });
  await restPointer(page);
  await settle(page);
  await saveDetail(
    page,
    output,
    'detail_klasse',
    lang,
    theme,
    pieceClip(
      [
        await brushHead.boundingBox(),
        await page.locator('[data-tour="student-row"]').nth(2).boundingBox(),
      ],
      { top: 12, right: 12, bottom: 0, left: 12 },
    ),
  );
  await page.setViewportSize(DESKTOP_VIEWPORT);
  await page
    .getByRole('button', { name: t('students:brush.done'), exact: true })
    .click();

  // 02 — the room layer with "Neu einrichten" open: the table types and the
  // arrangements, each with its small picture.
  await goToLayer(page, t, 'room');
  await page.locator('[data-tour="layout-canvas"]').first().waitFor();
  await settle(page);
  await page
    .getByRole('button', {
      name: t('generator:sceneInspector.setupChoose'),
      exact: true,
    })
    .click();
  await page
    .getByRole('dialog', { name: t('generator:sceneInspector.setup') })
    .waitFor();
  await restPointer(page);
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

  // Close-up "Raum" — the room as a whole: every table type, the windows,
  // the door, the board, the teacher's desk.
  await saveDetail(
    page,
    output,
    'detail_raum',
    lang,
    theme,
    pieceClip([await roomBox(page)], 12),
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

  // Close-up "Sitzplan" — the six-seat table with its students around it,
  // one of its seats locked the way a teacher locks it: the lock that shows
  // on a seat pointed at, tapped. The slides keep no lock, so it is taken off
  // again. The table is small in this window, so its close-up is written at
  // the capture's scale and shown half as large again as the app draws it.
  const groupTable = page.locator('g[data-table-index="3"]').first();
  const seatBox = await groupTable
    .locator('rect[data-seat-index="0"]')
    .first()
    .boundingBox();
  await page.mouse.move(
    seatBox.x + seatBox.width / 2,
    seatBox.y + seatBox.height / 2,
  );
  await groupTable
    .getByRole('button', { name: t('generator:seat.lockSeat'), exact: true })
    .first()
    .click();
  const unlockSeat = groupTable.getByRole('button', {
    name: t('generator:seat.unlockSeat'),
    exact: true,
  });
  await unlockSeat.waitFor();
  await restPointer(page);
  await settle(page);
  await saveDetail(
    page,
    output,
    'detail_sitzplan',
    lang,
    theme,
    pieceClip([await groupTable.boundingBox()], 16),
    CAPTURE_SCALE,
  );
  await unlockSeat.click();
  await unlockSeat.waitFor({ state: 'detached' });

  // Close-up "Was der Plan beachtet" — the values per criterion switched on
  // and "Vordere Plätze" marking its seats beside the inspector: the singles
  // by the board, or the doubles before them too where the shuffle put a
  // student needing a front seat there. The cut runs down an aisle, above
  // and below the tables it shows, and across the inspector between its
  // criteria, so it parts nothing.
  await page.locator('[data-tour="plan-fulfillment"]').first().click();
  const frontRow = page.locator(
    '[data-criterion="preferFrontForNeedsFrontSeat"]',
  );
  await frontRow
    .getByRole('button', {
      name: translationPattern(t('generator:mix.fulfillment.pinLabel')),
    })
    .click();
  const markedSeats = page.locator('[data-seat-highlight]');
  await markedSeats.first().waitFor();
  const markedLeft = Math.min(
    ...(await markedSeats.evaluateAll((marks) =>
      marks.map((mark) => mark.getBoundingClientRect().left),
    )),
  );
  const singlesAisle = await aisleBetween(page, [5, 6], [7, 8]);
  const planAisle =
    markedLeft > singlesAisle
      ? singlesAisle
      : await aisleBetween(page, [2, 3, 4], [5, 6]);
  const shownTables = pieceClip(
    await Promise.all(
      (planAisle === singlesAisle ? [7, 8] : [5, 6, 7, 8]).map((index) =>
        tableBox(page, index),
      ),
    ),
  );
  const tablesTop = shownTables.y;
  const tablesFoot = shownTables.y + shownTables.height;
  // The inspector's part starts on the hairline above the heading
  // "Platz & Raum", some 36 px above its first criterion, and ends 6 px
  // below a whole criterion: the first one whose foot makes the part as tall
  // as the tables need.
  const rowFeet = await page
    .locator('[data-criterion]')
    .evaluateAll((rows, key) => {
      const first = rows.findIndex((row) => row.dataset.criterion === key);
      const top = rows[first].getBoundingClientRect().top;
      return rows
        .slice(first)
        .map((row) => row.getBoundingClientRect().bottom - top);
    }, 'preferFrontForNeedsFrontSeat');
  const partHeight = (foot) => 36 + foot + 6;
  const cutHeight = partHeight(
    rowFeet.find((foot) => partHeight(foot) >= tablesFoot - tablesTop) ??
      rowFeet.at(-1),
  );
  // Where the column cannot scroll that far, the cut follows its criteria;
  // the tables' margin takes up the difference.
  await scrollColumnTo(frontRow, (tablesTop + tablesFoot - cutHeight) / 2 + 36);
  await restPointer(page);
  await settle(page);
  const cutTop = (await frontRow.boundingBox()).y - 36;
  await saveDetail(
    page,
    output,
    'detail_kriterien',
    lang,
    theme,
    pieceClip(
      [
        { x: planAisle, y: cutTop, width: 1, height: cutHeight },
        { x: DESKTOP_VIEWPORT.width - 1, y: cutTop, width: 1, height: 1 },
      ],
      0,
    ),
  );
  await frontRow
    .getByRole('button', {
      name: translationPattern(t('generator:mix.fulfillment.unpinLabel')),
    })
    .click();
  await page.locator('[data-tour="plan-fulfillment"]').first().click();
  await markedSeats.first().waitFor({ state: 'detached' });

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

  // 05 — presentation, student view, as on a portrait tablet, with one
  // student marked as missing today. That mark lives in memory alone
  // (decision 0045), so it is made the way a teacher makes it: a tap on the
  // seat, here on the first table's name.
  await page.setViewportSize(PRESENT_VIEWPORT);
  await page.goto(`${baseUrl}${prefix}/present`);
  await settle(page);
  const missingName = await page
    .locator('svg g[data-table-index] text')
    .first()
    .boundingBox();
  await page.mouse.click(
    missingName.x + missingName.width / 2,
    missingName.y + missingName.height / 2,
  );
  await page.locator('svg [data-absent]').first().waitFor();
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

  // 07 — the name cards, as they first come: animals, coloured paper,
  // writing lines, Andika. The sheet is the same frame; it shows the cards
  // once their font is part of its document.
  await page
    .getByRole('complementary', { name: t('generator:sidebar.ariaLabel') })
    .getByRole('button', {
      name: t('generator:export.cards.view'),
      exact: true,
    })
    .click();
  await page.waitForFunction(() =>
    /andika/i.test(document.querySelector('iframe')?.srcdoc ?? ''),
  );
  const sheetFrame = await (
    await page.locator('iframe').first().elementHandle()
  ).contentFrame();
  await sheetFrame.waitForLoadState('load');
  await sheetFrame.locator('svg').first().waitFor();
  await sheetFrame.evaluate(() => document.fonts.ready);
  await restPointer(page);
  await settle(page);
  await saveSlide(
    page,
    output,
    '07_namensschilder',
    lang,
    theme,
    WIDE_MASTER,
    fullWindow,
  );

  // Close-up "Namensschilder" — the first card's face as it stands on a
  // desk: the quarter of the sheet between the fold above it and the cut
  // below.
  const firstSheet = await sheetFrame.locator('svg').first().boundingBox();
  await saveDetail(
    page,
    output,
    'detail_namensschilder',
    lang,
    theme,
    pieceClip(
      [
        {
          x: firstSheet.x,
          y: firstSheet.y + firstSheet.height / 4,
          width: firstSheet.width,
          height: firstSheet.height / 4,
        },
      ],
      0,
    ),
  );

  await captureTools(page, output, baseUrl, prefix, lang, theme, t);
}

/**
 * The close-ups of the class tools beside "Mehr als ein Sitzplan", each page
 * in the state that shows what it is for, in a window as narrow as the
 * column. A tool keeps what it was given in the class (the duties) or in
 * memory alone (the rest), so each is set up only where it is not yet.
 */
async function captureTools(page, output, baseUrl, prefix, lang, theme, t) {
  const save = async (slug, boxes, margin = 12) => {
    await restPointer(page);
    await settle(page);
    await saveDetail(
      page,
      output,
      slug,
      lang,
      theme,
      pieceClip(
        await Promise.all(boxes.map((box) => box.boundingBox())),
        margin,
      ),
    );
  };
  const button = (key, values) =>
    page.getByRole('button', { name: t(key, values), exact: true });
  const main = page.getByRole('main');
  await page.setViewportSize(TOOL_VIEWPORT);

  // Namensspiel — a question of the photo quiz that shows a face and asks
  // its name; one that shows a name and asks for its face is drawn again.
  const photoToName = page.getByText(t('pages:nameGame.quiz.photoToName'), {
    exact: true,
  });
  for (let attempt = 0; ; attempt += 1) {
    await openTool(page, baseUrl, prefix, '/namensspiel');
    await page
      .getByRole('button', {
        name: new RegExp(
          `^${translationPattern(t('pages:nameGame.menu.quizTitle')).source}`,
        ),
      })
      .click();
    await main.locator('img').first().waitFor();
    if (await photoToName.isVisible()) break;
    if (attempt === 20) throw new Error('the quiz asked no name for a face');
  }
  await save('detail_namensspiel', [photoToName.locator('..')], 16);

  // Wer kommt dran? — the card of a student called up: face, name, seat.
  await openTool(page, baseUrl, prefix, '/wer-kommt-dran');
  const start = button('generator:tools.whoIsNext.start');
  await (
    (await start.count()) ? start : button('generator:tools.whoIsNext.next')
  ).click();
  await page.locator('[data-spotlight]').first().waitFor();
  await save('detail_werkommtdran', [main.getByRole('status').first()]);

  // Gruppen bilden — the group size and the first two groups of four.
  await openTool(page, baseUrl, prefix, '/gruppen');
  await button('generator:tools.groups.draw').click();
  const groupCard = (number) =>
    main
      .getByRole('listitem')
      .filter({
        has: page.getByText(t('generator:tools.groups.groupName', { number }), {
          exact: true,
        }),
      })
      .first();
  await groupCard(1).waitFor();
  await save('detail_gruppen', [
    page.locator('#group-size-label'),
    groupCard(1),
    groupCard(2),
  ]);

  // Dienste verteilen — board duty for one and sweeping for two, handed out.
  await openTool(page, baseUrl, prefix, '/dienste');
  const boardDuty = button('generator:tools.duties.suggestion.board');
  if (await boardDuty.count()) {
    await boardDuty.click();
    await button('generator:tools.duties.add').click();
    const sweeping = t('generator:tools.duties.suggestion.sweeping');
    await page
      .getByRole('textbox', {
        name: t('generator:tools.duties.nameLabel', { number: 2 }),
      })
      .fill(sweeping);
    await button('generator:tools.duties.more', { name: sweeping }).click();
    await button('generator:tools.duties.draw').click();
  }
  await button('generator:tools.duties.redraw').waitFor();
  await save('detail_dienste', [
    page.locator('section[aria-labelledby="round-heading"]'),
  ]);

  // Wo sitzt wer? — the first letters of a name typed in and the two or
  // three students they find. The answer below, with the plan, is taller
  // than the space beside the section allows.
  const { students } = await accessActiveClass(page, baseUrl);
  await openTool(page, baseUrl, prefix, '/wo-sitzt-wer');
  const search = page.getByRole('searchbox', {
    name: t('generator:tools.seatFinder.placeholder'),
  });
  const matches = main.getByRole('list');
  let found = false;
  for (const student of students) {
    // A single match opens at once and takes the list away.
    await search.fill(student.name.slice(0, 2));
    await settle(page);
    const count = (await matches.count())
      ? await matches.getByRole('button').count()
      : 0;
    if (count >= 2 && count <= 3) {
      found = true;
      break;
    }
  }
  if (!found) throw new Error('no two letters found two or three students');
  await save('detail_wositztwer', [search, matches]);

  await page.setViewportSize(DESKTOP_VIEWPORT);
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
        localStorage.setItem('spg.theme', 'light');
        localStorage.setItem('spg.photos', JSON.stringify('all'));
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
