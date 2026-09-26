// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import commonDe from '../locales/de/common.json';
import generatorDe from '../locales/de/generator.json';
import pagesDe from '../locales/de/pages.json';
import studentsDe from '../locales/de/students.json';
import toastDe from '../locales/de/toast.json';
import commonEn from '../locales/en/common.json';
import generatorEn from '../locales/en/generator.json';
import pagesEn from '../locales/en/pages.json';
import studentsEn from '../locales/en/students.json';
import toastEn from '../locales/en/toast.json';

/**
 * Keyboard shortcuts are written one way: the Windows name first, the Mac
 * symbol second, no spaces around "+" — `Strg/⌘+S`, `Alt/⌥+←`,
 * `Strg/⌘+Umschalt+Z`, in English `Ctrl/⌘+S`, `Alt/⌥+←`, `Ctrl/⌘+Shift+Z`.
 *
 * The changelog is left out on purpose: it quotes what earlier versions said.
 */
const namespaces = {
  de: { commonDe, generatorDe, pagesDe, studentsDe, toastDe },
  en: { commonEn, generatorEn, pagesEn, studentsEn, toastEn },
};

const strings = (value: unknown, path = ''): Array<[string, string]> => {
  if (typeof value === 'string') return [[path, value]];
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) =>
      strings(child, path ? `${path}.${key}` : key),
    );
  }
  return [];
};

const OLD_NOTATION: Array<[string, RegExp]> = [
  ['"Cmd" instead of ⌘', /\bCmd\b/],
  ['the Mac key first', /⌘\s*\//],
  ['"(Windows) / (Mac)" spelled out', /\((?:Windows|Mac)\)/],
  ['"Alt/Option" instead of Alt/⌥', /Alt\s*\/\s*Option/],
  [
    'spaces around "+"',
    /(?:Strg|Ctrl|⌘|⌥|Umschalt|Shift)\s+\+|\+\s+(?:Strg|Ctrl|⌘|Umschalt|Shift)/,
  ],
];

describe('shortcut notation', () => {
  for (const [lang, bundles] of Object.entries(namespaces)) {
    const all = Object.entries(bundles).flatMap(([name, bundle]) =>
      strings(bundle).map(
        ([path, text]) => [`${name}:${path}`, text] as [string, string],
      ),
    );

    it.each(OLD_NOTATION)(`${lang} has no %s`, (_, pattern) => {
      expect(
        all.filter(([, text]) => pattern.test(text)).map(([path]) => path),
      ).toEqual([]);
    });
  }

  it('names the keys in the language of the text', () => {
    const german = Object.values(namespaces.de).flatMap((bundle) =>
      strings(bundle),
    );
    const english = Object.values(namespaces.en).flatMap((bundle) =>
      strings(bundle),
    );

    expect(
      german.filter(([, text]) => /\bShift\b|\bCtrl\b/.test(text)),
    ).toEqual([]);
    expect(
      english.filter(([, text]) => /\bStrg\b|Umschalt/.test(text)),
    ).toEqual([]);
  });
});
