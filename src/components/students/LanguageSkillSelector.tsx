// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChatCircleIcon,
  ChatDotsIcon,
  BookOpenIcon,
  StudentIcon,
  RocketIcon,
  TranslateIcon,
} from '@phosphor-icons/react';
import type { Student, LanguageSkillLevel } from '@/types';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { menuSurfaceClass } from '@/utils';
import { languageSkillButtonTokens } from './studentStyleTokens';
import FloatingDropdown from './FloatingDropdown';
import IconWithLabel from './IconWithLabel';

// Icon mapping for language skill levels
const LANGUAGE_SKILL_ICONS = {
  native: <ChatCircleIcon size={14} aria-hidden="true" />,
  fluent: <ChatDotsIcon size={14} aria-hidden="true" />,
  intermediate: <BookOpenIcon size={14} aria-hidden="true" />,
  beginner: <StudentIcon size={14} aria-hidden="true" />,
  daz: <RocketIcon size={14} aria-hidden="true" />,
} as const;

// i18n key mapping
const LANGUAGE_SKILL_LABELS = {
  native: 'languageSkill.native',
  fluent: 'languageSkill.fluent',
  intermediate: 'languageSkill.intermediate',
  beginner: 'languageSkill.beginner',
  daz: 'languageSkill.daz',
} as const;

const LANGUAGE_SKILL_OPTIONS: LanguageSkillLevel[] = [
  'native',
  'fluent',
  'intermediate',
  'beginner',
  'daz',
];

const {
  compactBaseClass,
  compactStyleMap,
  compactNeutralClass,
  compactIconColorMap,
  dropdownOptionBaseClass,
  dropdownActiveStyleMap,
  dropdownInactiveStyleMap,
  dropdownIconColorMap,
} = languageSkillButtonTokens;

type Props = {
  student: Student;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  variant: 'compact' | 'detailed' | 'hybrid';
  showDropdown?: boolean;
  setShowDropdown?: (value: boolean) => void;
  dropdownRef?: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
};

/**
 * LanguageSkillSelector Component
 *
 * Displays language skill level selection UI in either compact dropdown or hybrid mode.
 * - Compact: Single button with dropdown menu
 * - Hybrid: IconWithLabel with dropdown menu
 *
 * @param student - Current student object
 * @param updateStudent - Callback to update language skill level
 * @param variant - Display variant (compact or hybrid)
 * @param showDropdown - Whether dropdown is visible
 * @param setShowDropdown - Setter for dropdown visibility
 * @param dropdownRef - Ref for click-outside detection
 */
export default function LanguageSkillSelector({
  student,
  updateStudent,
  variant,
  showDropdown,
  setShowDropdown,
  dropdownRef,
  scrollContainerRef,
}: Props) {
  const { t } = useTranslation('students');
  const dropdownContentRef = React.useRef<HTMLDivElement | null>(null);
  const localDropdownRef = React.useRef<HTMLDivElement | null>(null);
  const fallbackOutsideRef = React.useRef<HTMLDivElement | null>(null);
  const resolvedDropdownRef = dropdownRef ?? localDropdownRef;
  const isCompactMode = variant === 'compact' && !!setShowDropdown;
  const isHybridMode = variant === 'hybrid' && !!setShowDropdown;
  const outsideRefs = React.useMemo(() => {
    if (isCompactMode || isHybridMode) {
      return [dropdownRef ?? localDropdownRef, dropdownContentRef];
    }
    return [fallbackOutsideRef];
  }, [isCompactMode, isHybridMode, dropdownRef]);
  useClickOutside(
    outsideRefs,
    () => {
      if (setShowDropdown) setShowDropdown(false);
    },
    isCompactMode || isHybridMode ? showDropdown || false : false,
  );

  const handleLanguageSkillChange = (level: LanguageSkillLevel | undefined) => {
    updateStudent(student.id, { languageSkill: level });
    if (variant === 'compact' || variant === 'hybrid') {
      setShowDropdown?.(false);
    }
  };

  const currentLevel = student.languageSkill;
  const hasLevel = currentLevel !== undefined;

  // Render dropdown options
  const renderDropdownOptions = () => (
    <div className={`${menuSurfaceClass} min-w-45`}>
      {/* Reset option */}
      <button
        type="button"
        className={`${dropdownOptionBaseClass} ${!hasLevel ? 'bg-gray-100 dark:bg-gray-700' : ''} text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-600`}
        onClick={(e) => {
          e.stopPropagation();
          handleLanguageSkillChange(undefined);
        }}
      >
        <span className="text-gray-900 dark:text-white">
          <TranslateIcon size={14} aria-hidden="true" />
        </span>
        {t('languageSkill.notSet', 'Nicht angegeben')}
      </button>
      {/* Level options */}
      {LANGUAGE_SKILL_OPTIONS.map((level) => (
        <button
          key={level}
          type="button"
          className={`${dropdownOptionBaseClass} ${
            currentLevel === level
              ? dropdownActiveStyleMap[level]
              : dropdownInactiveStyleMap[level]
          }`}
          onClick={(e) => {
            e.stopPropagation();
            handleLanguageSkillChange(level);
          }}
        >
          <span className={dropdownIconColorMap[level]}>
            {LANGUAGE_SKILL_ICONS[level]}
          </span>
          {t(LANGUAGE_SKILL_LABELS[level])}
        </button>
      ))}
    </div>
  );

  // Hybrid variant: IconWithLabel with dropdown
  if (variant === 'hybrid') {
    const colorClasses = hasLevel
      ? compactStyleMap[currentLevel]
      : compactNeutralClass;

    return (
      <div className="relative" ref={resolvedDropdownRef}>
        <IconWithLabel
          icon={
            hasLevel ? (
              LANGUAGE_SKILL_ICONS[currentLevel]
            ) : (
              <span className="text-gray-900 dark:text-white">
                <TranslateIcon size={14} aria-hidden="true" />
              </span>
            )
          }
          label={
            hasLevel
              ? t(LANGUAGE_SKILL_LABELS[currentLevel])
              : t('languageSkill.short', 'Sprache')
          }
          onClick={() => setShowDropdown?.(!showDropdown)}
          active={hasLevel}
          tooltip={`${t('languageSkill.title', 'Sprachniveau')}: ${hasLevel ? t(LANGUAGE_SKILL_LABELS[currentLevel]) : t('languageSkill.notSet', 'Nicht angegeben')}`}
          colorClasses={colorClasses}
        />

        {showDropdown && (
          <FloatingDropdown
            anchorRef={resolvedDropdownRef}
            align="right"
            portalRef={dropdownContentRef}
            scrollContainerRef={scrollContainerRef}
            className="z-50"
            matchAnchorWidth
            onClose={() => setShowDropdown?.(false)}
          >
            {renderDropdownOptions()}
          </FloatingDropdown>
        )}
      </div>
    );
  }

  // Compact variant: Dropdown button
  if (variant === 'compact') {
    return (
      <div className="relative" ref={resolvedDropdownRef}>
        <button
          type="button"
          className={`${compactBaseClass} ${hasLevel ? compactStyleMap[currentLevel] : compactNeutralClass}`}
          title={`${t('languageSkill.title', 'Sprachniveau')}: ${hasLevel ? t(LANGUAGE_SKILL_LABELS[currentLevel]) : t('languageSkill.notSet', 'Nicht angegeben')}`}
          onClick={(e) => {
            e.stopPropagation();
            setShowDropdown?.(!showDropdown);
          }}
        >
          <span
            className={`${hasLevel ? compactIconColorMap[currentLevel] : 'text-gray-900 dark:text-white'} text-lg`}
          >
            {hasLevel ? (
              LANGUAGE_SKILL_ICONS[currentLevel]
            ) : (
              <TranslateIcon size={14} aria-hidden="true" />
            )}
          </span>
        </button>

        {showDropdown && (
          <FloatingDropdown
            anchorRef={resolvedDropdownRef}
            align="right"
            portalRef={dropdownContentRef}
            scrollContainerRef={scrollContainerRef}
            className="z-50"
            matchAnchorWidth
            onClose={() => setShowDropdown?.(false)}
          >
            {renderDropdownOptions()}
          </FloatingDropdown>
        )}
      </div>
    );
  }

  // Detailed variant not implemented for this selector
  return null;
}
