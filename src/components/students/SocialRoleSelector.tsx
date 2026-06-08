import React from 'react';
import { useTranslation } from 'react-i18next';
import { HandshakeIcon, CrownIcon, SignpostIcon, SparkleIcon, UsersThreeIcon } from '@phosphor-icons/react';
import type { Student, SocialRole } from '@/types';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { menuSurfaceClass } from '@/utils';
import { socialRoleButtonTokens } from './studentStyleTokens';
import FloatingDropdown from './FloatingDropdown';
import IconWithLabel from './IconWithLabel';

// Icon mapping for social roles
const SOCIAL_ROLE_ICONS = {
  mediator: <HandshakeIcon size={14} aria-hidden="true" />,
  leader: <CrownIcon size={14} aria-hidden="true" />,
  loner: <SignpostIcon size={14} aria-hidden="true" />,
  socialHub: <SparkleIcon size={14} aria-hidden="true" />,
} as const;

// i18n key mapping
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

const {
  compactBaseClass,
  compactStyleMap,
  compactNeutralClass,
  compactIconColorMap,
  dropdownOptionBaseClass,
  dropdownActiveStyleMap,
  dropdownInactiveStyleMap,
  dropdownIconColorMap,
} = socialRoleButtonTokens;

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
 * SocialRoleSelector Component
 *
 * Displays social role selection UI in either compact dropdown or hybrid mode.
 * - Compact: Single button with dropdown menu
 * - Hybrid: IconWithLabel with dropdown menu
 *
 * @param student - Current student object
 * @param updateStudent - Callback to update social role
 * @param variant - Display variant (compact or hybrid)
 * @param showDropdown - Whether dropdown is visible
 * @param setShowDropdown - Setter for dropdown visibility
 * @param dropdownRef - Ref for click-outside detection
 */
export default function SocialRoleSelector({
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

  const handleSocialRoleChange = (role: SocialRole | undefined) => {
    updateStudent(student.id, { socialRole: role });
    if (variant === 'compact' || variant === 'hybrid') {
      setShowDropdown?.(false);
    }
  };

  const currentRole = student.socialRole;
  const hasRole = currentRole !== undefined;

  // Render dropdown options
  const renderDropdownOptions = () => (
    <div className={`${menuSurfaceClass} min-w-45`}>
      {/* Reset option (neutral) */}
      <button
        type="button"
        className={`${dropdownOptionBaseClass} ${!hasRole ? 'bg-gray-100 dark:bg-gray-700' : ''} text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-600`}
        onClick={(e) => {
          e.stopPropagation();
          handleSocialRoleChange(undefined);
        }}
      >
        <span className="text-gray-900 dark:text-white">
          <UsersThreeIcon size={14} aria-hidden="true" />
        </span>
        {t('socialRole.neutral', 'Neutral')}
      </button>
      {/* Role options */}
      {SOCIAL_ROLE_OPTIONS.map((role) => (
        <button
          key={role}
          type="button"
          className={`${dropdownOptionBaseClass} ${
            currentRole === role
              ? dropdownActiveStyleMap[role]
              : dropdownInactiveStyleMap[role]
          }`}
          onClick={(e) => {
            e.stopPropagation();
            handleSocialRoleChange(role);
          }}
        >
          <span className={dropdownIconColorMap[role]}>
            {SOCIAL_ROLE_ICONS[role]}
          </span>
          {t(SOCIAL_ROLE_LABELS[role])}
        </button>
      ))}
    </div>
  );

  // Hybrid variant: IconWithLabel with dropdown
  if (variant === 'hybrid') {
    const colorClasses = hasRole
      ? compactStyleMap[currentRole]
      : compactNeutralClass;

    return (
      <div className="relative" ref={resolvedDropdownRef}>
        <IconWithLabel
          icon={
            hasRole ? (
              SOCIAL_ROLE_ICONS[currentRole]
            ) : (
              <span className="text-gray-900 dark:text-white">
                <UsersThreeIcon size={14} aria-hidden="true" />
              </span>
            )
          }
          label={
            hasRole
              ? t(SOCIAL_ROLE_LABELS[currentRole])
              : t('socialRole.short', 'Rolle')
          }
          onClick={() => setShowDropdown?.(!showDropdown)}
          active={hasRole}
          tooltip={`${t('socialRole.title', 'Soziale Rolle')}: ${hasRole ? t(SOCIAL_ROLE_LABELS[currentRole]) : t('socialRole.neutral', 'Neutral')}`}
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
          className={`${compactBaseClass} ${hasRole ? compactStyleMap[currentRole] : compactNeutralClass}`}
          title={`${t('socialRole.title', 'Soziale Rolle')}: ${hasRole ? t(SOCIAL_ROLE_LABELS[currentRole]) : t('socialRole.neutral', 'Neutral')}`}
          onClick={(e) => {
            e.stopPropagation();
            setShowDropdown?.(!showDropdown);
          }}
        >
          <span
            className={`${hasRole ? compactIconColorMap[currentRole] : 'text-gray-900 dark:text-white'} text-lg`}
          >
            {hasRole ? (
              SOCIAL_ROLE_ICONS[currentRole]
            ) : (
              <UsersThreeIcon size={14} aria-hidden="true" />
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
