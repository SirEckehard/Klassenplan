// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import type { Student } from '@/types';
import {
  InspectorChoice,
  InspectorRow,
} from '@/components/shell/InspectorPanel';

/**
 * Body height as one inspector row. Only "klein" and "groß" carry weight in
 * the plan; "mittel" is the middle of the class and the value a student keeps
 * until somebody decides otherwise.
 */
export default function HeightSelector({
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

  return (
    <InspectorRow label={t('height.title')}>
      <InspectorChoice
        label={t('height.title')}
        value={student.height}
        mixedValues={mixedValues}
        onChange={(next) => updateStudent(student.id, { height: next })}
        options={[
          { value: 'small', label: t('height.small') },
          { value: 'medium', label: t('height.medium') },
          { value: 'tall', label: t('height.tall') },
        ]}
      />
    </InspectorRow>
  );
}
