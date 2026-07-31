// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, test } from 'vitest';
import { buildCsvTemplate } from '@/utils/csv/csvTemplateDownload';
import { CSV_MAX_PARTNER_NAMES, type CsvLanguage } from '@/utils/csv/csvSchema';
import { parseCsvFlexible } from '@/utils/data/csvUtils';

const importTemplate = (language: CsvLanguage) => {
  const file = new File([buildCsvTemplate(language)], 'template.csv', {
    type: 'text/csv',
  });
  return parseCsvFlexible(file, undefined, { useWorker: false });
};

const NAMES: Record<CsvLanguage, Record<string, string>> = {
  de: {
    max: 'Max Mustermann',
    anna: 'Anna Beispiel',
    tom: 'Tom Weber',
    lisa: 'Lisa Müller',
    kim: 'Kim Fischer',
  },
  en: {
    max: 'Max Sample',
    anna: 'Anna Example',
    tom: 'Tom Baker',
    lisa: 'Lisa Miller',
    kim: 'Kim Fisher',
  },
};

describe.each(['de', 'en'] as const)('CSV template (%s)', (language) => {
  const names = NAMES[language];

  test('every example row is importable', async () => {
    const students = await importTemplate(language);
    expect(students.map((student) => student.name)).toEqual([
      names.max,
      names.anna,
      names.tom,
      names.lisa,
      names.kim,
    ]);
  });

  test('all attribute columns are understood by the parser', async () => {
    const students = await importTemplate(language);
    const byName = new Map(students.map((student) => [student.name, student]));

    expect(byName.get(names.max)).toMatchObject({
      gender: 'boy',
      height: 'medium',
      languageSkill: 'native',
      restless: true,
      concentrationIssues: true,
      prefersWindow: true,
      performanceWeak: true,
    });
    expect(byName.get(names.anna)).toMatchObject({
      gender: 'girl',
      height: 'small',
      languageSkill: 'fluent',
      socialRole: 'mediator',
      shy: true,
      prefersWindow: true,
      performanceStrong: true,
    });
    expect(byName.get(names.tom)).toMatchObject({
      gender: 'boy',
      height: 'tall',
      languageSkill: 'beginner',
      socialRole: 'loner',
      concentrationIssues: true,
      needsFrontSeat: true,
    });
    expect(byName.get(names.lisa)).toMatchObject({
      gender: 'girl',
      languageSkill: 'intermediate',
      socialRole: 'socialHub',
      prefersDoor: true,
    });
    expect(byName.get(names.kim)).toMatchObject({
      gender: 'diverse',
      height: 'tall',
      languageSkill: 'daz',
      socialRole: 'leader',
      shy: true,
      needsFrontSeat: true,
      performanceStrong: true,
    });
  });

  test('demonstrates the three-name limit for wish and avoid partners', async () => {
    const students = await importTemplate(language);
    const byName = new Map(students.map((student) => [student.name, student]));
    const idOf = (name: string) => byName.get(name)?.id;

    // Lisa's row carries the maximum number of wish partners.
    expect(byName.get(names.lisa)?.wishPartnerIds).toEqual([
      idOf(names.anna),
      idOf(names.max),
      idOf(names.tom),
    ]);
    expect(byName.get(names.lisa)?.wishPartnerIds).toHaveLength(
      CSV_MAX_PARTNER_NAMES,
    );
    expect(byName.get(names.tom)?.avoidPartnerIds).toEqual([
      idOf(names.anna),
      idOf(names.kim),
    ]);
  });
});
