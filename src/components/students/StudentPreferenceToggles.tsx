// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import type { Student } from '@/types';
import ToggleSwitch from '@/components/ui/controls/ToggleSwitch';
import { STUDENT_ATTRIBUTE_ICONS } from '@/utils/ui/studentAppearance';
import { InspectorIcon, InspectorRow } from '@/components/shell/InspectorPanel';

type PreferenceKey =
  'prefersWindow' | 'prefersDoor' | 'needsFreeNeighbourSeat' | 'leftHanded';

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
  {
    key: 'needsFreeNeighbourSeat',
    label: 'roomPreference.freeNeighbourSeat',
    tooltip: 'roomPreference.freeNeighbourTooltip',
  },
  {
    key: 'leftHanded',
    label: 'roomPreference.leftHanded',
    tooltip: 'roomPreference.leftHandedTooltip',
  },
];

/**
 * Where in the room a student would rather sit, and what their seat needs
 * around it, as inspector rows. Window and door feed a criterion that
 * measures distance to the real window and door of the scene, so they only
 * mean anything once the room has them; the free seat beside and the
 * left-hander's left read the seats beside (decision 0043).
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
          <InspectorRow
            key={option.key}
            label={label}
            hint={t(option.tooltip)}
            icon={
              <InspectorIcon
                icon={STUDENT_ATTRIBUTE_ICONS[option.key]}
                family="space"
              />
            }
            labelsControl
          >
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
