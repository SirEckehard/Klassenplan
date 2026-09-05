// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ImageIcon, DoorIcon } from '@phosphor-icons/react';
import type { Student } from '@/types';
import { cardSurfaceClass } from '@/utils';
import { specialNeedsButtonTokens } from './studentStyleTokens';
import IconWithLabel from './IconWithLabel';

type PreferenceKey = 'prefersWindow' | 'prefersDoor';

type PreferenceOption = {
  key: PreferenceKey;
  label: string;
  icon: React.ReactNode;
  tooltip: string;
};

type Props = {
  student: Student;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  variant: 'compact' | 'detailed' | 'hybrid';
};

// Preference options with i18n keys
const preferenceOptions: PreferenceOption[] = [
  {
    key: 'prefersWindow',
    label: 'roomPreference.windowSeat',
    icon: <ImageIcon size={14} className="shrink-0" aria-hidden="true" />,
    tooltip: 'roomPreference.windowTooltip',
  },
  {
    key: 'prefersDoor',
    label: 'roomPreference.doorProximity',
    icon: <DoorIcon size={14} className="shrink-0" aria-hidden="true" />,
    tooltip: 'roomPreference.doorTooltip',
  },
];

function PreferenceButton({
  student,
  updateStudent,
  option,
  variant,
}: {
  student: Student;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  option: PreferenceOption;
  variant: 'compact' | 'detailed' | 'hybrid';
}) {
  const { t } = useTranslation('students');
  const isActive = Boolean(student[option.key]);
  const {
    compactBaseClass,
    detailedBaseClass,
    activeStateClass,
    inactiveStateClass,
  } = specialNeedsButtonTokens;

  // Hybrid variant: Use IconWithLabel
  if (variant === 'hybrid') {
    const abbreviatedLabels: Record<PreferenceKey, string> = {
      prefersWindow: t('roomPreference.window', 'Fenster'),
      prefersDoor: t('roomPreference.door', 'Tür'),
    };

    // Use compact view color classes for consistency
    const colorClasses = isActive ? activeStateClass : inactiveStateClass;

    return (
      <IconWithLabel
        icon={option.icon}
        label={abbreviatedLabels[option.key]}
        onClick={() => updateStudent(student.id, { [option.key]: !isActive })}
        active={isActive}
        tooltip={t(option.tooltip)}
        ariaPressed={isActive}
        colorClasses={colorClasses}
      />
    );
  }

  const baseClass =
    variant === 'compact'
      ? compactBaseClass
      : `${detailedBaseClass} whitespace-nowrap`;
  const buttonClass = `${baseClass} ${
    isActive ? activeStateClass : inactiveStateClass
  }`;

  return (
    <button
      type="button"
      key={option.key}
      className={buttonClass}
      aria-pressed={isActive}
      title={`${t(option.tooltip)}${isActive ? ` (${t('common.active', 'aktiv')})` : ` (${t('common.inactive', 'inaktiv')})`}`}
      onClick={(event) => {
        if (variant === 'compact') {
          event.stopPropagation();
        }
        updateStudent(student.id, { [option.key]: !isActive });
      }}
    >
      {option.icon}
      {variant === 'detailed' ? (
        <span className="truncate text-xs">{t(option.label)}</span>
      ) : null}
    </button>
  );
}

export default function StudentPreferenceToggles({
  student,
  updateStudent,
  variant,
}: Props) {
  const { t } = useTranslation('students');
  // Hybrid variant: Render as IconWithLabel components
  if (variant === 'hybrid') {
    return (
      <>
        {preferenceOptions.map((option) => (
          <PreferenceButton
            key={option.key}
            student={student}
            updateStudent={updateStudent}
            option={option}
            variant="hybrid"
          />
        ))}
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        {preferenceOptions.map((option) => (
          <PreferenceButton
            key={option.key}
            student={student}
            updateStudent={updateStudent}
            option={option}
            variant="compact"
          />
        ))}
      </>
    );
  }

  return (
    <section className="space-y-2">
      <h4 className="text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400">
        {t('roomPreference.title', 'Raumpräferenz')}
      </h4>
      <div
        className={`${cardSurfaceClass} grid grid-cols-1 gap-2 p-3 sm:grid-cols-2`}
        role="group"
        aria-label={t('roomPreference.title', 'Raumpräferenz')}
      >
        {preferenceOptions.map((option) => (
          <PreferenceButton
            key={option.key}
            student={student}
            updateStudent={updateStudent}
            option={option}
            variant="detailed"
          />
        ))}
      </div>
    </section>
  );
}
