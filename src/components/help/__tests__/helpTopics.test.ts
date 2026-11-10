// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import deGenerator from '@/i18n/locales/de/generator.json';
import dePages from '@/i18n/locales/de/pages.json';
import enGenerator from '@/i18n/locales/en/generator.json';
import enPages from '@/i18n/locales/en/pages.json';
import { PAGE_HELP_TOPICS } from '../pageHelpTopics';
import { WORKSPACE_HELP_TOPICS } from '../workspaceHelpTopics';

const BUNDLES = {
  de: { generator: deGenerator, pages: dePages },
  en: { generator: enGenerator, pages: enPages },
};

/** Reads `ns:dotted.key` (namespace `generator` by default) out of a language. */
const lookup = (bundles: (typeof BUNDLES)['de'], fullKey: string): unknown => {
  const [namespace, key] = fullKey.includes(':')
    ? fullKey.split(':')
    : ['generator', fullKey];
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object'
          ? (node as Record<string, unknown>)[part]
          : undefined,
      bundles[namespace as keyof typeof bundles],
    );
};

const ALL_TOPICS = [
  ...Object.values(WORKSPACE_HELP_TOPICS),
  ...Object.values(PAGE_HELP_TOPICS),
].flat();

describe('help topics', () => {
  // The texts are looked up with computed keys; this is what sees them.
  it('have a title and a body in both languages', () => {
    for (const { key } of ALL_TOPICS) {
      for (const bundles of Object.values(BUNDLES)) {
        expect(lookup(bundles, `${key}.title`), key).toEqual(
          expect.any(String),
        );
        expect(lookup(bundles, `${key}.body`), key).toEqual(expect.any(String));
      }
    }
  });

  it('name each topic once per screen', () => {
    for (const topics of [
      ...Object.values(WORKSPACE_HELP_TOPICS),
      ...Object.values(PAGE_HELP_TOPICS),
    ]) {
      const keys = topics.map((topic) => topic.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
