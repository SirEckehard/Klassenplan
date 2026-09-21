// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import type { Student } from '@/types';
import { STUDENT_FLAGS } from '@/utils';
import ToggleSwitch from '@/components/ui/controls/ToggleSwitch';
import { InspectorRow } from '@/components/shell/InspectorPanel';

type StudentFlagKey = (typeof STUDENT_FLAGS)[number]['key'];

/**
 * The yes/no attributes as inspector rows: the name on the left, a switch on
 * the right, a word of explanation behind the name.
 *
 * `keys` picks which of them this section shows, because the inspector splits
 * the flags across Lernen, Verhalten and Platz — which is what they always
 * meant and never showed while they sat in one undifferentiated run.
 */
export default function SpecialNeedsToggles({
  student,
  updateStudent,
  keys,
}: {
  student: Student;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  keys?: readonly StudentFlagKey[];
}) {
  const { t } = useTranslation('students');

  const flags = keys
    ? keys
        .map((key) => STUDENT_FLAGS.find((flag) => flag.key === key))
        .filter((flag) => flag !== undefined)
    : STUDENT_FLAGS;

  const handleToggle = (key: keyof Student, exclusiveWith?: keyof Student) => {
    const newValue = !student[key];
    const patch: Partial<Student> = { [key]: newValue } as Partial<Student>;

    // Leistungsstark and leistungsschwach rule each other out.
    if (exclusiveWith && newValue) {
      (patch as Record<string, boolean>)[exclusiveWith] = false;
    }

    updateStudent(student.id, patch);
  };

  return (
    <>
      {flags.map(
        ({
          key,
          tooltip: defaultTooltip,
          label: defaultLabel,
          exclusiveWith,
        }) => (
          <InspectorRow
            key={key}
            label={t(`studentFlags.${key}.label`, defaultLabel)}
            hint={t(`studentFlags.${key}.tooltip`, defaultTooltip)}
          >
            <ToggleSwitch
              checked={Boolean(student[key])}
              onChange={() => handleToggle(key, exclusiveWith)}
              label={t(`studentFlags.${key}.label`, defaultLabel)}
              size="sm"
            />
          </InspectorRow>
        ),
      )}
    </>
  );
}
