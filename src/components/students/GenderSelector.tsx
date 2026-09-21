// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import type { Student } from '@/types';
import {
  InspectorChoice,
  InspectorRow,
} from '@/components/shell/InspectorPanel';

const GENDER_LABELS = {
  boy: 'gender.boy',
  girl: 'gender.girl',
  diverse: 'gender.diverse',
} as const;

/**
 * One row of the inspector: what the setting is on the left, the three chips
 * on the right, and "not decided" reachable by pressing the chip again.
 *
 * Gender is read where it is acted on — the Geschlechter criterion and the
 * statistics — and nowhere else; the seats stopped carrying it in decision
 * 0017.
 */
export default function GenderSelector({
  student,
  updateStudent,
}: {
  student: Student;
  updateStudent: (id: string, patch: Partial<Student>) => void;
}) {
  const { t } = useTranslation('students');

  return (
    <InspectorRow label={t('gender.title')}>
      <InspectorChoice
        label={t('gender.title')}
        value={student.gender}
        onChange={(next) => updateStudent(student.id, { gender: next })}
        options={(['boy', 'girl', 'diverse'] as const).map((gender) => ({
          value: gender,
          label: t(GENDER_LABELS[gender]),
        }))}
      />
    </InspectorRow>
  );
}
