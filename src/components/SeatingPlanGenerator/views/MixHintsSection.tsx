// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ClassroomScene, MixSettings, Student } from '@/types';
import type { MixHint } from '@/utils/algorithm/model/feasibility';
import {
  getDisplayNameForMode,
  resolveLocale,
  type NameDisplayMode,
} from '@/utils';
import { useNameLabels } from '@/hooks/student/useNameLabels';
import { useMixHints } from '@/hooks/plan/useMixHints';
import { InspectorSection } from '@/components/shell/InspectorPanel';

/** More than three names stop being a line and start being a list. */
const MAX_NAMES = 3;

/**
 * What the mixing cannot meet in this class and room (decision 0031): a quiet
 * section of sentences between the fulfilment and the criteria, there only
 * while there is something to say. Each names what the teacher can change —
 * a desk in the front row, a wish, a distance wish — since the mixing has
 * already done what it can.
 */
export default function MixHintsSection({
  students,
  scene,
  settings,
  nameDisplay,
}: {
  students: Student[];
  scene: ClassroomScene;
  settings: Partial<MixSettings>;
  /** The rule the seats use, so a hint names students as the plan does. */
  nameDisplay?: NameDisplayMode;
}) {
  const { t, i18n } = useTranslation(['generator', 'students']);
  const hints = useMixHints(students, scene, settings);
  const labels = useNameLabels(students, nameDisplay);
  const nameById = React.useMemo(
    () => new Map(students.map((student) => [student.id, student.name])),
    [students],
  );
  const listFormat = React.useMemo(
    () =>
      new Intl.ListFormat(resolveLocale(i18n.language), {
        style: 'long',
        type: 'conjunction',
      }),
    [i18n.language],
  );

  if (hints.length === 0) return null;

  const nameOf = (id: string) => {
    const name = nameById.get(id)?.trim();
    return name
      ? getDisplayNameForMode(name, 'full', nameDisplay, labels)
      : t('students:studentList.newStudent');
  };
  const namesOf = (ids: string[]) =>
    ids.length > MAX_NAMES
      ? t('mix.hints.andMore', {
          names: ids.slice(0, MAX_NAMES).map(nameOf).join(', '),
          more: ids.length - MAX_NAMES,
        })
      : listFormat.format(ids.map(nameOf));

  const sentence = (hint: MixHint): string => {
    switch (hint.kind) {
      case 'frontRow':
        return t('mix.hints.frontRow', {
          count: hint.students,
          seats: hint.seats,
        });
      case 'avoidGroup':
        return t('mix.hints.avoidGroup', {
          names: namesOf(hint.studentIds),
          count: hint.tables,
        });
      case 'wishMeetsAvoid':
        return t('mix.hints.wishMeetsAvoid', {
          wisher: nameOf(hint.wisherId),
          avoider: nameOf(hint.avoiderId),
        });
      case 'wishedOften':
        return t('mix.hints.wishedOften', {
          name: nameOf(hint.studentId),
          count: hint.wishers,
          room: hint.room,
        });
    }
  };

  return (
    <InspectorSection title={t('mix.hints.title')}>
      {hints.map((hint, index) => (
        <p
          key={`${hint.kind}-${index}`}
          className="text-xs leading-relaxed text-(--text-page)"
        >
          {sentence(hint)}
        </p>
      ))}
    </InspectorSection>
  );
}
