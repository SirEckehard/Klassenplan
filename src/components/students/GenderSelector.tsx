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
 * The chips stay neutral: the colour of a gender belongs to the seat it tints
 * on the plan (decision 0020), not to the control that sets it.
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
