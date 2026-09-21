// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import type { LanguageSkillLevel, Student } from '@/types';
import {
  InspectorChoice,
  InspectorRow,
} from '@/components/shell/InspectorPanel';

const LANGUAGE_SKILL_LABELS = {
  native: 'languageSkill.native',
  fluent: 'languageSkill.fluent',
  intermediate: 'languageSkill.intermediate',
  beginner: 'languageSkill.beginner',
  daz: 'languageSkill.daz',
} as const;

const LANGUAGE_SKILL_OPTIONS: LanguageSkillLevel[] = [
  'native',
  'fluent',
  'intermediate',
  'beginner',
  'daz',
];

/**
 * The language level as one inspector row. It feeds the Sprachförderung
 * criterion, which seats a strong level beside a beginner — so the value is
 * about what a table can carry, not about where anybody is from.
 */
export default function LanguageSkillSelector({
  student,
  updateStudent,
}: {
  student: Student;
  updateStudent: (id: string, patch: Partial<Student>) => void;
}) {
  const { t } = useTranslation('students');

  return (
    <InspectorRow label={t('languageSkill.title')}>
      <InspectorChoice
        label={t('languageSkill.title')}
        value={student.languageSkill}
        onChange={(next) => updateStudent(student.id, { languageSkill: next })}
        options={LANGUAGE_SKILL_OPTIONS.map((level) => ({
          value: level,
          label: t(LANGUAGE_SKILL_LABELS[level]),
        }))}
      />
    </InspectorRow>
  );
}
