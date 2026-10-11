// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import type { SocialRole, Student } from '@/types';
import { STUDENT_ATTRIBUTE_ICONS } from '@/utils/ui/studentAppearance';
import { CRITERIA_ICON_MAP } from '@/utils/ui/criteriaIcons';
import { InspectorIcon } from '@/components/shell/InspectorPanel';
import InspectorSelect from './InspectorSelect';

const SOCIAL_ROLE_LABELS = {
  mediator: 'socialRole.mediator',
  leader: 'socialRole.leader',
  loner: 'socialRole.loner',
  socialHub: 'socialRole.socialHub',
} as const;

const SOCIAL_ROLE_OPTIONS: SocialRole[] = [
  'mediator',
  'leader',
  'loner',
  'socialHub',
];

/**
 * The social role as one inspector row. The criterion spreads the roles over
 * the tables — two leaders at one table is the arrangement it avoids — so the
 * value only has to be true of the group, not of the person. Most students
 * have none, so the four roles open as a menu from the row, each with the
 * icon its seat badge shows.
 */
export default function SocialRoleSelector({
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
    <InspectorSelect
      label={t('socialRole.title')}
      icon={
        <InspectorIcon
          icon={CRITERIA_ICON_MAP.distributeSocialRoles}
          family="social"
        />
      }
      family="social"
      notSetLabel={t('socialRole.notSet')}
      value={student.socialRole}
      mixedValues={mixedValues}
      onChange={(next) => updateStudent(student.id, { socialRole: next })}
      options={SOCIAL_ROLE_OPTIONS.map((role) => ({
        value: role,
        label: t(SOCIAL_ROLE_LABELS[role]),
        title: t(`socialRole.tooltip.${role}`),
        icon: (
          <InspectorIcon
            icon={STUDENT_ATTRIBUTE_ICONS.socialRole[role]}
            family="social"
          />
        ),
      }))}
    />
  );
}
