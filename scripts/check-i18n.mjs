// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
//
// Verifies the two translation bundles against each other and against the code.
//
// Three independent failure modes are covered:
//
//   1. Key drift — a key exists in one language but not the other, so the
//      English UI silently falls back to German (`fallbackLng: 'de'`).
//   2. Orphaned inline defaults — `t('some.key', 'Deutscher Text')` where
//      `some.key` exists in no bundle at all. i18next then renders the second
//      argument, which means German text ships to /en. This is not theoretical:
//      it was the state of 18 call sites before this script existed.
//   3. Unused keys — a key no code asks for any more. Every redesign left some
//      behind (216 of them before this check existed), and each one is text
//      that ships to every visitor and has to be kept in two languages.
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

/**
 * Every string the code could hand to `t()`: the quoted literals, and the
 * fixed start of each template literal that builds a key
 * (`mix.criteria.${key}.label`). Keys are built in many ways — maps of
 * labels, `TOAST_MESSAGES`, `textKey` + `.title` in the tours — but all of
 * them start from one of these.
 */
async function collectKeyReferences() {
  const literals = new Set();
  const templatePrefixes = new Set();
  for (const file of await sourceFiles(srcDir)) {
    const contents = await fs.readFile(file, 'utf8');
    for (const match of contents.matchAll(
      /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/g,
    )) {
      literals.add(match[1] ?? match[2]);
    }
    for (const match of contents.matchAll(/`((?:[^`\\]|\\.)*)`/gs)) {
      const parts = match[1].split(/\$\{[^}]*\}/);
      if (parts.length === 1) {
        literals.add(parts[0]);
        continue;
      }
      // `generator:${key}` alone says nothing about which key; a prefix only
      // counts once it names at least the start of one.
      const [, rest = parts[0]] = parts[0].split(':');
      if (/^[a-zA-Z]/.test(rest)) templatePrefixes.add(parts[0]);
    }
  }
  return { literals, templatePrefixes };
}

/**
 * A key counts as used when the code names it, names the start of a template
 * that can produce it, or names a parent of at least two segments that a
 * suffix is added to (`tour.plan.canvas` + `.title`). Lenient on purpose: a
 * key reported here is one nothing could possibly reach.
 */
function isReferenced(namespace, key, { literals, templatePrefixes }) {
  const base = PLURAL_SUFFIXES.reduce(
    (current, suffix) =>
      current.endsWith(suffix) ? current.slice(0, -suffix.length) : current,
    key,
  );
  const spellings = [base, `${namespace}:${base}`];
  if (spellings.some((spelling) => literals.has(spelling))) return true;
  for (const prefix of templatePrefixes) {
    if (spellings.some((spelling) => spelling.startsWith(prefix))) return true;
  }
  const segments = base.split('.');
  for (let length = segments.length - 1; length >= 2; length -= 1) {
    const parent = segments.slice(0, length).join('.');
    if (literals.has(parent) || literals.has(`${namespace}:${parent}`)) {
      return true;
    }
  }
  return false;
}

async function checkUnusedKeys(sets) {
  const references = await collectKeyReferences();
  const problems = [];
  for (const namespace of NAMESPACES) {
    for (const key of sets.de[namespace]) {
      if (!isReferenced(namespace, key, references)) {
        problems.push(`${namespace}:${key}`);
      }
    }
  }
  return problems;
}

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
  const unusedProblems = await checkUnusedKeys(sets);

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

  if (unusedProblems.length > 0) {
    logError(
      'Translation keys no code refers to — remove them from both languages',
      { unused: unusedProblems.length },
      SOURCE,
    );
    for (const problem of unusedProblems) {
      logError(`  ${problem}`, undefined, SOURCE);
    }
  }

  if (
    parityProblems.length > 0 ||
    defaultProblems.length > 0 ||
    unusedProblems.length > 0
  ) {
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
