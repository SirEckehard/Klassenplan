// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import type { Student } from '@/types';
import { useIsDarkMode } from '@/hooks/useIsDarkMode';
import { STUDENT_COLORS } from '@/utils/ui/studentAppearance';
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
 * A pressed chip wears the tint its seats wear on the plan and in the circle
 * (decision 0020), so the control says which colour the choice comes to.
 */
export default function GenderSelector({
  student,
  updateStudent,
  mixedValues,
}: {
  student: Student;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  /** Values only some of a multi-selection have; see `InspectorChoice`. */
  mixedValues?: ReadonlySet<string>;
}) {
  const { t } = useTranslation('students');
  const mode = useIsDarkMode() ? 'dark' : 'light';

  return (
    <InspectorRow label={t('gender.title')}>
      <InspectorChoice
        label={t('gender.title')}
        value={student.gender}
        mixedValues={mixedValues}
        onChange={(next) => updateStudent(student.id, { gender: next })}
        options={(['boy', 'girl', 'diverse'] as const).map((gender) => ({
          value: gender,
          label: t(GENDER_LABELS[gender]),
          tint: {
            fill: STUDENT_COLORS[gender].fill[mode],
            stroke: STUDENT_COLORS[gender].stroke[mode],
          },
        }))}
      />
    </InspectorRow>
  );
}
