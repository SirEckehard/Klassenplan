// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import type { SocialRole, Student } from '@/types';
import {
  InspectorChoice,
  InspectorRow,
} from '@/components/shell/InspectorPanel';

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
 * value only has to be true of the group, not of the person.
 */
export default function SocialRoleSelector({
  student,
  updateStudent,
}: {
  student: Student;
  updateStudent: (id: string, patch: Partial<Student>) => void;
}) {
  const { t } = useTranslation('students');

  return (
    <InspectorRow label={t('socialRole.title')}>
      <InspectorChoice
        label={t('socialRole.title')}
        value={student.socialRole}
        onChange={(next) => updateStudent(student.id, { socialRole: next })}
        options={SOCIAL_ROLE_OPTIONS.map((role) => ({
          value: role,
          label: t(SOCIAL_ROLE_LABELS[role]),
        }))}
      />
    </InspectorRow>
  );
}
