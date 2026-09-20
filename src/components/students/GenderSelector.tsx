// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  QuestionIcon,
  GenderMaleIcon,
  PersonSimpleIcon,
  GenderFemaleIcon,
  GenderNonbinaryIcon,
} from '@phosphor-icons/react';
import type { Student } from '@/types';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { cardSurfaceClass, menuSurfaceClass } from '@/utils';
import { genderButtonTokens } from './studentStyleTokens';
import FloatingDropdown from './FloatingDropdown';
import IconWithLabel from './IconWithLabel';
import {
  InspectorChoice,
  InspectorRow,
} from '@/components/shell/InspectorPanel';

// Icon mapping for compact view
const GENDER_ICONS = {
  boy: <GenderMaleIcon size={14} aria-hidden="true" />,
  girl: <GenderFemaleIcon size={14} aria-hidden="true" />,
  diverse: <GenderNonbinaryIcon size={14} aria-hidden="true" />,
} as const;

const GENDER_LABELS = {
  boy: 'gender.boy',
  girl: 'gender.girl',
  diverse: 'gender.diverse',
} as const;

type Props = {
  student: Student;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  variant: 'compact' | 'detailed' | 'hybrid' | 'row';
  showDropdown?: boolean;
  setShowDropdown?: (value: boolean) => void;
  dropdownRef?: React.RefObject<HTMLDivElement | null>;
  hintId?: string;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
};

/**
 * GenderSelector Component
 *
 * Displays gender selection UI in either compact dropdown or detailed button mode.
 * - Compact: Single button with dropdown menu
 * - Detailed: Three separate buttons for each gender option
 *
 * @param student - Current student object
 * @param updateStudent - Callback to update gender
 * @param variant - Display variant (compact or detailed)
 * @param showDropdown - Whether dropdown is visible (compact mode only)
 * @param setShowDropdown - Setter for dropdown visibility (compact mode only)
 * @param dropdownRef - Ref for click-outside detection (compact mode only)
 */
export default function GenderSelector({
  student,
  updateStudent,
  variant,
  showDropdown,
  setShowDropdown,
  dropdownRef,
  hintId,
  scrollContainerRef,
}: Props) {
  const { t } = useTranslation('students');
  // Close dropdown when clicking outside (compact mode only)
  // Hook must be called unconditionally - React Hooks rules
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

  const handleGenderChange = (gender: 'boy' | 'girl' | 'diverse') => {
    const isSameSelection = student.gender === gender;
    updateStudent(student.id, { gender: isSameSelection ? undefined : gender });
    if (variant === 'compact' || variant === 'hybrid') {
      setShowDropdown?.(false);
    }
  };

  const describedById = hintId ?? `gender-hint-${student.id}`;
  const buttonLabel = student.gender
    ? `${t('gender.title')}: ${t(GENDER_LABELS[student.gender])}`
    : t('gender.noSelection', 'Geschlecht: keine Angabe (optional)');
  const buttonTitle = student.gender
    ? buttonLabel
    : t('gender.noValue', 'Keine Angabe');
  const showDetailedHint = variant === 'detailed' && !student.gender;
  const describedBy =
    hintId !== undefined
      ? describedById
      : showDetailedHint
        ? describedById
        : undefined;

  const {
    compactBaseClass,
    compactStyleMap,
    compactIconColorMap,
    compactNeutralClass,
    detailedBaseClass,
    detailedActiveStyleMap,
    detailedInactiveClass,
  } = genderButtonTokens;

  // Hybrid variant: IconWithLabel with dropdown
  if (variant === 'row') {
    return (
      <InspectorRow label={t('gender.title')}>
        <InspectorChoice
          label={t('gender.title')}
          value={student.gender}
          onChange={(next) => updateStudent(student.id, { gender: next })}
          options={(['boy', 'girl', 'diverse'] as const).map((gender) => ({
            value: gender,
            label: t(GENDER_LABELS[gender]),
          }))}
        />
      </InspectorRow>
    );
  }

  if (variant === 'hybrid') {
    const label = student.gender
      ? t(GENDER_LABELS[student.gender])
      : t('gender.title');
    const icon = student.gender ? (
      GENDER_ICONS[student.gender]
    ) : (
      <span className="text-(--text-page)">
        <PersonSimpleIcon size={14} aria-hidden="true" />
      </span>
    );

    // Use compact view color classes for consistency
    const colorClasses = student.gender
      ? compactStyleMap[student.gender]
      : compactNeutralClass;

    return (
      <div className="relative" ref={resolvedDropdownRef}>
        <IconWithLabel
          icon={icon}
          label={label}
          onClick={() => setShowDropdown?.(!showDropdown)}
          active={!!student.gender}
          tooltip={buttonTitle}
          ariaLabel={buttonLabel}
          colorClasses={colorClasses}
        />

        {/* Gender Dropdown */}
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
            <div className={`${menuSurfaceClass} min-w-45`}>
              {/* Reset option */}
              <button
                type="button"
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs cursor-pointer transition hover:bg-(--surface-sunken) ${
                  !student.gender
                    ? 'bg-(--surface-sunken) text-(--text-page)'
                    : 'text-(--text-muted)'
                }`}
                aria-pressed={!student.gender}
                onClick={(e) => {
                  e.stopPropagation();
                  updateStudent(student.id, { gender: undefined });
                  setShowDropdown?.(false);
                }}
              >
                <span className="text-(--text-page)">
                  <PersonSimpleIcon size={14} aria-hidden="true" />
                </span>
                {t('gender.noValue', 'Keine Angabe')}
              </button>
              <button
                type="button"
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs cursor-pointer transition hover:bg-(--surface-sunken) ${
                  student.gender === 'boy'
                    ? 'bg-(--surface-option-selected) text-(--text-badge) hover:bg-(--surface-option-selected)!'
                    : 'text-(--text-page) hover:bg-(--surface-sunken)!'
                }`}
                aria-pressed={student.gender === 'boy'}
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenderChange('boy');
                }}
              >
                <span className="text-(--text-muted)">
                  <GenderMaleIcon size={14} aria-hidden="true" />
                </span>
                {t('gender.boy')}
              </button>
              <button
                type="button"
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs cursor-pointer transition hover:bg-(--surface-sunken) ${
                  student.gender === 'girl'
                    ? 'bg-(--surface-option-selected) text-(--text-badge) hover:bg-(--surface-option-selected)!'
                    : 'text-(--text-page) hover:bg-(--surface-sunken)!'
                }`}
                aria-pressed={student.gender === 'girl'}
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenderChange('girl');
                }}
              >
                <span className="text-(--text-muted)">
                  <GenderFemaleIcon size={14} aria-hidden="true" />
                </span>
                {t('gender.girl')}
              </button>
              <button
                type="button"
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs cursor-pointer transition hover:bg-(--surface-sunken) ${
                  student.gender === 'diverse'
                    ? 'bg-(--surface-option-selected) text-(--text-badge) hover:bg-(--surface-option-selected)!'
                    : 'text-(--text-page) hover:bg-(--surface-sunken)!'
                }`}
                aria-pressed={student.gender === 'diverse'}
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenderChange('diverse');
                }}
              >
                <span className="text-(--text-muted)">
                  <GenderNonbinaryIcon size={14} aria-hidden="true" />
                </span>
                {t('gender.diverse')}
              </button>
            </div>
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
          className={`${compactBaseClass} ${
            student.gender
              ? compactStyleMap[student.gender]
              : compactNeutralClass
          }`}
          title={buttonTitle}
          aria-label={buttonLabel}
          aria-describedby={hintId ? describedById : undefined}
          onClick={(e) => {
            e.stopPropagation();
            setShowDropdown?.(!showDropdown);
          }}
        >
          {student.gender ? (
            <span className={`${compactIconColorMap[student.gender]} text-lg`}>
              {GENDER_ICONS[student.gender]}
            </span>
          ) : (
            <span className="text-(--text-page)">
              <PersonSimpleIcon size={16} aria-hidden="true" />
            </span>
          )}
        </button>

        {/* Gender Dropdown */}
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
            <div className={`${menuSurfaceClass} min-w-45`}>
              {/* Reset option */}
              <button
                type="button"
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs cursor-pointer transition hover:bg-(--surface-sunken) ${
                  !student.gender
                    ? 'bg-(--surface-sunken) text-(--text-page)'
                    : 'text-(--text-muted)'
                }`}
                aria-pressed={!student.gender}
                onClick={(e) => {
                  e.stopPropagation();
                  updateStudent(student.id, { gender: undefined });
                  setShowDropdown?.(false);
                }}
              >
                <span className="text-(--text-page)">
                  <PersonSimpleIcon size={14} aria-hidden="true" />
                </span>
                {t('gender.noValue', 'Keine Angabe')}
              </button>
              <button
                type="button"
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs cursor-pointer transition hover:bg-(--surface-sunken) ${
                  student.gender === 'boy'
                    ? 'bg-(--surface-option-selected) text-(--text-badge) hover:bg-(--surface-option-selected)!'
                    : 'text-(--text-page) hover:bg-(--surface-sunken)!'
                }`}
                aria-pressed={student.gender === 'boy'}
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenderChange('boy');
                }}
              >
                <span className="text-(--text-muted)">
                  <GenderMaleIcon size={14} aria-hidden="true" />
                </span>
                {t('gender.boy')}
              </button>
              <button
                type="button"
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs cursor-pointer transition hover:bg-(--surface-sunken) ${
                  student.gender === 'girl'
                    ? 'bg-(--surface-option-selected) text-(--text-badge) hover:bg-(--surface-option-selected)!'
                    : 'text-(--text-page) hover:bg-(--surface-sunken)!'
                }`}
                aria-pressed={student.gender === 'girl'}
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenderChange('girl');
                }}
              >
                <span className="text-(--text-muted)">
                  <GenderFemaleIcon size={14} aria-hidden="true" />
                </span>
                {t('gender.girl')}
              </button>
              <button
                type="button"
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs cursor-pointer transition hover:bg-(--surface-sunken) ${
                  student.gender === 'diverse'
                    ? 'bg-(--surface-option-selected) text-(--text-badge) hover:bg-(--surface-option-selected)!'
                    : 'text-(--text-page) hover:bg-(--surface-sunken)!'
                }`}
                aria-pressed={student.gender === 'diverse'}
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenderChange('diverse');
                }}
              >
                <span className="text-(--text-muted)">
                  <GenderNonbinaryIcon size={14} aria-hidden="true" />
                </span>
                {t('gender.diverse')}
              </button>
            </div>
          </FloatingDropdown>
        )}
      </div>
    );
  }

  // Detailed variant: Section with full-width buttons inside responsive grid
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-medium uppercase tracking-wide text-(--text-muted)">
          Geschlecht
        </h4>
        {showDetailedHint && (
          <p
            id={describedById}
            className="flex items-center gap-1 text-[11px] text-(--text-muted)"
          >
            <QuestionIcon
              size={12}
              aria-hidden="true"
              className="text-(--text-muted)"
            />
            {t(
              'gender.hint',
              'Geschlechtsangaben sind optional, für spezifisches Mischen notwendig.',
            )}
          </p>
        )}
      </div>
      <div
        className={`${cardSurfaceClass} grid grid-cols-1 gap-2 p-3 sm:grid-cols-3`}
        role="group"
        aria-label={t('gender.selection', 'Geschlechtsauswahl')}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleGenderChange('boy');
          }}
          className={`${detailedBaseClass} ${
            student.gender === 'boy'
              ? detailedActiveStyleMap.boy
              : detailedInactiveClass
          }`}
          aria-label={`${t('gender.title')}: ${t('gender.boy')}`}
          aria-pressed={student.gender === 'boy'}
          aria-describedby={describedBy}
        >
          <span className="text-(--text-muted)">
            <GenderMaleIcon size={14} aria-hidden="true" />
          </span>
          {t('gender.boy')}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleGenderChange('girl');
          }}
          className={`${detailedBaseClass} ${
            student.gender === 'girl'
              ? detailedActiveStyleMap.girl
              : detailedInactiveClass
          }`}
          aria-label={`${t('gender.title')}: ${t('gender.girl')}`}
          aria-pressed={student.gender === 'girl'}
          aria-describedby={describedBy}
        >
          <span className="text-(--text-muted)">
            <GenderFemaleIcon size={14} aria-hidden="true" />
          </span>
          {t('gender.girl')}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleGenderChange('diverse');
          }}
          className={`${detailedBaseClass} ${
            student.gender === 'diverse'
              ? detailedActiveStyleMap.diverse
              : detailedInactiveClass
          }`}
          aria-label={`${t('gender.title')}: ${t('gender.diverse')}`}
          aria-pressed={student.gender === 'diverse'}
          aria-describedby={describedBy}
        >
          <span className="text-(--text-muted)">
            <GenderNonbinaryIcon size={14} aria-hidden="true" />
          </span>
          {t('gender.diverse')}
        </button>
      </div>
    </section>
  );
}
