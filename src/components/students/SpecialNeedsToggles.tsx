// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Student } from '@/types';
import { STUDENT_FLAGS, cardSurfaceClass } from '@/utils';
import { specialNeedsButtonTokens } from './studentStyleTokens';
import IconWithLabel from './IconWithLabel';

type Props = {
  student: Student;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  variant: 'compact' | 'detailed' | 'hybrid';
};

/**
 * SpecialNeedsToggles Component
 *
 * Displays toggleable special needs flags (visual/hearing impairment, restless behavior).
 * - Compact: Icon-only buttons in row
 * - Detailed: Buttons with labels in wrapped section
 *
 * @param student - Current student object
 * @param updateStudent - Callback to update special needs flags
 * @param variant - Display variant (compact or detailed)
 */
export default function SpecialNeedsToggles({
  student,
  updateStudent,
  variant,
}: Props) {
  const { t } = useTranslation('students');
  const groupLabel = t('specialNeeds.title', 'Besondere Bedürfnisse');
  const {
    compactBaseClass,
    detailedBaseClass,
    activeStateClass,
    inactiveStateClass,
  } = specialNeedsButtonTokens;

  const handleToggle = (key: keyof Student, exclusiveWith?: keyof Student) => {
    const newValue = !student[key];
    const patch: Partial<Student> = {
      [key]: newValue,
    } as Partial<Student>;

    // Handle mutual exclusivity (e.g., visual/hearing impairment)
    if (exclusiveWith && newValue) {
      (patch as Record<string, boolean>)[exclusiveWith] = false;
    }

    updateStudent(student.id, patch);
  };

  const renderToggleButton = (
    {
      key,
      icon: IconComponent,
      tooltip: defaultTooltip,
      label: defaultLabel,
      exclusiveWith,
    }: (typeof STUDENT_FLAGS)[number],
    buttonVariant: 'compact' | 'detailed' | 'hybrid',
  ) => {
    const isActive = student[key];
    // Use i18n translations for labels and tooltips
    const label = t(`studentFlags.${key}.label`, defaultLabel);
    const tooltip = t(`studentFlags.${key}.tooltip`, defaultTooltip);

    // Hybrid variant: Use IconWithLabel
    if (buttonVariant === 'hybrid') {
      // Use compact view color classes for consistency
      const colorClasses = isActive ? activeStateClass : inactiveStateClass;

      return (
        <IconWithLabel
          key={key}
          icon={<IconComponent size={14} aria-hidden="true" />}
          label={label}
          onClick={() => handleToggle(key, exclusiveWith)}
          active={isActive}
          tooltip={tooltip}
          ariaPressed={isActive}
          colorClasses={colorClasses}
        />
      );
    }

    const baseClass =
      buttonVariant === 'compact' ? compactBaseClass : detailedBaseClass;
    const buttonClass = `${baseClass} ${
      isActive ? activeStateClass : inactiveStateClass
    } ${buttonVariant === 'detailed' ? 'whitespace-nowrap' : ''}`;

    return (
      <button
        key={key}
        type="button"
        className={buttonClass}
        title={
          buttonVariant === 'compact'
            ? `${tooltip}${isActive ? ` (${t('specialNeeds.active', 'aktiv')})` : ` (${t('specialNeeds.inactive', 'inaktiv')})`} - ${t('specialNeeds.clickToToggle', 'Klicken zum Umschalten')}`
            : `${tooltip}${isActive ? ` (${t('specialNeeds.active', 'aktiv')})` : ` (${t('specialNeeds.inactive', 'inaktiv')})`}`
        }
        aria-pressed={isActive}
        aria-label={
          buttonVariant === 'compact'
            ? `${label} ${isActive ? t('specialNeeds.active', 'aktiv') : t('specialNeeds.inactive', 'inaktiv')}`
            : undefined
        }
        onClick={(event) => {
          if (buttonVariant === 'compact') {
            event.stopPropagation();
          }
          handleToggle(key, exclusiveWith);
        }}
      >
        <IconComponent
          aria-hidden="true"
          size={buttonVariant === 'compact' ? 14 : 12}
          className="shrink-0 text-inherit transition-colors"
        />
        {buttonVariant === 'detailed' ? (
          <span className="truncate">{label}</span>
        ) : null}
      </button>
    );
  };

  // Hybrid variant: Render as IconWithLabel components
  if (variant === 'hybrid') {
    return (
      <>{STUDENT_FLAGS.map((flag) => renderToggleButton(flag, 'hybrid'))}</>
    );
  }

  // Compact variant: Icon-only buttons
  if (variant === 'compact') {
    return (
      <>{STUDENT_FLAGS.map((flag) => renderToggleButton(flag, 'compact'))}</>
    );
  }

  // Detailed variant: Section with labeled buttons
  return (
    <section className="space-y-2">
      <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
        {t('specialNeeds.title', 'Besondere Bedürfnisse')}
      </h4>
      <div
        className={`${cardSurfaceClass} grid grid-cols-1 gap-2 p-3 sm:grid-cols-2`}
        role="group"
        aria-label={groupLabel}
      >
        {STUDENT_FLAGS.map((flag) => renderToggleButton(flag, 'detailed'))}
      </div>
    </section>
  );
}
