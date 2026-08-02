// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
//
// Verifies the two translation bundles against each other and against the code.
//
// Two independent failure modes are covered:
//
//   1. Key drift — a key exists in one language but not the other, so the
//      English UI silently falls back to German (`fallbackLng: 'de'`).
//   2. Orphaned inline defaults — `t('some.key', 'Deutscher Text')` where
//      `some.key` exists in no bundle at all. i18next then renders the second
//      argument, which means German text ships to /en. This is not theoretical:
//      it was the state of 18 call sites before this script existed.
//
// Inline defaults are tolerated (there are several hundred), but only as long
// as they are unreachable. The moment one becomes the actual source of a
// string, this fails.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logError, logInfo } from './utils/logger.mjs';

const SOURCE = 'check-i18n';
const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const localesDir = path.join(rootDir, 'src', 'i18n', 'locales');
const srcDir = path.join(rootDir, 'src');

const LANGUAGES = ['de', 'en'];
const NAMESPACES = [
  'common',
  'toast',
  'pages',
  'generator',
  'students',
  'changelog',
];

/** i18next plural suffixes — `key_one` satisfies a lookup of `key`. */
const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other'];

async function loadBundles() {
  const bundles = {};
  for (const language of LANGUAGES) {
    bundles[language] = {};
    for (const namespace of NAMESPACES) {
      const file = path.join(localesDir, language, `${namespace}.json`);
      bundles[language][namespace] = JSON.parse(
        await fs.readFile(file, 'utf8'),
      );
    }
  }
  return bundles;
}

function flatten(value, prefix = '', out = new Set()) {
  for (const [key, child] of Object.entries(value)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      flatten(child, full, out);
    } else {
      out.add(full);
    }
  }
  return out;
}

function keySets(bundles) {
  const sets = {};
  for (const language of LANGUAGES) {
    sets[language] = {};
    for (const namespace of NAMESPACES) {
      sets[language][namespace] = flatten(bundles[language][namespace]);
    }
  }
  return sets;
}

function hasKey(sets, language, namespace, key) {
  const namespaceKeys = sets[language][namespace];
  if (!namespaceKeys) return false;
  if (namespaceKeys.has(key)) return true;
  return PLURAL_SUFFIXES.some((suffix) => namespaceKeys.has(`${key}${suffix}`));
}

function hasKeyAnywhere(sets, language, key) {
  return NAMESPACES.some((namespace) => hasKey(sets, language, namespace, key));
}

async function sourceFiles(dir, acc = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'locales') continue;
      await sourceFiles(full, acc);
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !/\.(test|spec)\.(ts|tsx)$/.test(entry.name)
    ) {
      acc.push(full);
    }
  }
  return acc;
}

/**
 * Matches `t('key', 'default')` and `t("key", "default")`, including the
 * template-literal spelling. Deliberately conservative: it only looks at calls
 * whose second argument is a plain string, which is exactly the pattern that
 * can shadow a missing key.
 */
const INLINE_DEFAULT_PATTERN =
  /\bt\(\s*(['"`])([^'"`]+)\1\s*,\s*(['"`])((?:[^'"`\\]|\\.)*)\3/g;

function checkParity(sets) {
  const problems = [];
  for (const namespace of NAMESPACES) {
    const de = sets.de[namespace];
    const en = sets.en[namespace];
    for (const key of de) {
      if (!en.has(key)) problems.push(`${namespace}:${key} — missing in EN`);
    }
    for (const key of en) {
      if (!de.has(key)) problems.push(`${namespace}:${key} — missing in DE`);
    }
  }
  return problems;
}

async function checkInlineDefaults(sets) {
  const problems = [];
  let total = 0;

  for (const file of await sourceFiles(srcDir)) {
    const contents = await fs.readFile(file, 'utf8');
    const relative = path.relative(rootDir, file);

    for (const match of contents.matchAll(INLINE_DEFAULT_PATTERN)) {
      total += 1;
      const raw = match[2];
      const fallbackText = match[4];
      const [namespace, key] = raw.includes(':') ? raw.split(':') : [null, raw];

      // Without an explicit `ns:` prefix the namespace depends on the
      // `useTranslation(...)` binding, which may live in the calling module
      // (helpers take `t` as a parameter). Accepting a hit in any namespace
      // avoids false positives while still catching keys that exist nowhere.
      const found = namespace
        ? hasKey(sets, 'en', namespace, key)
        : hasKeyAnywhere(sets, 'en', key);

      if (!found) {
        problems.push(`${relative}\n      t('${raw}') → "${fallbackText}"`);
      }
    }
  }

  return { problems, total };
}

async function run() {
  const bundles = await loadBundles();
  const sets = keySets(bundles);

  const parityProblems = checkParity(sets);
  const { problems: defaultProblems, total } = await checkInlineDefaults(sets);

  const keyCount = NAMESPACES.reduce(
    (sum, namespace) => sum + sets.de[namespace].size,
    0,
  );

  if (parityProblems.length > 0) {
    logError(
      'DE/EN key parity broken',
      { drifted: parityProblems.length },
      SOURCE,
    );
    for (const problem of parityProblems) {
      logError(`  ${problem}`, undefined, SOURCE);
    }
  }

  if (defaultProblems.length > 0) {
    logError(
      'Inline defaults with no translation key — this German text renders on /en',
      { orphaned: defaultProblems.length },
      SOURCE,
    );
    for (const problem of defaultProblems) {
      logError(`  ${problem}`, undefined, SOURCE);
    }
  }

  if (parityProblems.length > 0 || defaultProblems.length > 0) {
    process.exitCode = 1;
    return;
  }

  logInfo(
    'i18n verified',
    {
      keysPerLanguage: keyCount,
      namespaces: NAMESPACES.length,
      inlineDefaults: total,
    },
    SOURCE,
  );
}

run().catch((error) => {
  const context =
    error instanceof Error
      ? { name: error.name, message: error.message }
      : { detail: String(error) };
  logError('i18n check crashed', context, SOURCE);
  process.exitCode = 1;
});
