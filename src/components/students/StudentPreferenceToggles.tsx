// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import type { Student } from '@/types';
import ToggleSwitch from '@/components/ui/controls/ToggleSwitch';
import { InspectorRow } from '@/components/shell/InspectorPanel';

type PreferenceKey = 'prefersWindow' | 'prefersDoor';

const PREFERENCES: ReadonlyArray<{
  key: PreferenceKey;
  label: string;
  tooltip: string;
}> = [
  {
    key: 'prefersWindow',
    label: 'roomPreference.windowSeat',
    tooltip: 'roomPreference.windowTooltip',
  },
  {
    key: 'prefersDoor',
    label: 'roomPreference.doorProximity',
    tooltip: 'roomPreference.doorTooltip',
  },
];

/**
 * Where in the room a student would rather sit, as two inspector rows. Both
 * feed a criterion that measures distance to the real window and the real
 * door of the scene, so they only mean anything once the room has them.
 */
export default function StudentPreferenceToggles({
  student,
  updateStudent,
}: {
  student: Student;
  updateStudent: (id: string, patch: Partial<Student>) => void;
}) {
  const { t } = useTranslation('students');

  return (
    <>
      {PREFERENCES.map((option) => (
        <InspectorRow
          key={option.key}
          label={t(option.label)}
          hint={t(option.tooltip)}
        >
          <ToggleSwitch
            checked={Boolean(student[option.key])}
            onChange={(checked) =>
              updateStudent(student.id, { [option.key]: checked })
            }
            label={t(option.label)}
            size="sm"
          />
        </InspectorRow>
      ))}
    </>
  );
}
