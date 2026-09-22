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
  mixed,
}: {
  student: Student;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  /** Preferences only some of a multi-selection share; see `SpecialNeedsToggles`. */
  mixed?: ReadonlySet<keyof Student>;
}) {
  const { t } = useTranslation('students');

  return (
    <>
      {PREFERENCES.map((option) => {
        const label = t(option.label);
        const isMixed = mixed?.has(option.key) ?? false;
        return (
          <InspectorRow key={option.key} label={label} hint={t(option.tooltip)}>
            <ToggleSwitch
              checked={Boolean(student[option.key])}
              mixed={isMixed}
              onChange={(checked) =>
                updateStudent(student.id, { [option.key]: checked })
              }
              label={
                isMixed ? `${label} (${t('bulkEdit.flagState.mixed')})` : label
              }
              size="sm"
            />
          </InspectorRow>
        );
      })}
    </>
  );
}
