import React from 'react';
import { useTranslation } from 'react-i18next';
import { HeartBreakIcon } from '@phosphor-icons/react';
import type { Student } from '@/types';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { menuSurfaceClass, MAX_PARTNER_WISHES } from '@/utils';
import { getAvoidPartnerIds } from '@/utils/data/studentMigration';
import { avoidPartnerButtonTokens } from './studentStyleTokens';
import FloatingDropdown from './FloatingDropdown';
import IconWithLabel from './IconWithLabel';

type Props = {
  student: Student;
  allStudents: Student[];
  updateStudent: (id: string, patch: Partial<Student>) => void;
  showDropdown: boolean;
  setShowDropdown: (value: boolean) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  variant?: 'compact' | 'detailed' | 'hybrid';
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
};

const {
  baseClass,
  activeStateClass,
  inactiveStateClass,
  iconClass: avoidPartnerIconClass,
  dropdownResetClass,
  dropdownOptionBaseClass,
  dropdownActiveClass,
  dropdownInactiveClass,
} = avoidPartnerButtonTokens;

/**
 * AvoidPartnerSelector Component
 *
 * Multi-select dropdown for choosing partners to avoid (Distanzwunsch).
 * Supports selecting up to MAX_PARTNER_WISHES partners with priority ordering.
 * Click order determines priority (first click = priority 1).
 *
 * @param student - Current student object
 * @param allStudents - All students for selection options
 * @param updateStudent - Callback to update avoidPartnerIds
 * @param showDropdown - Whether dropdown is currently visible
 * @param setShowDropdown - Setter for dropdown visibility
 * @param dropdownRef - Ref for click-outside detection
 * @param variant - Display variant (compact, detailed, or hybrid)
 */
export default function AvoidPartnerSelector({
  student,
  allStudents,
  updateStudent,
  showDropdown,
  setShowDropdown,
  dropdownRef,
  variant = 'detailed',
  scrollContainerRef,
}: Props) {
  const { t } = useTranslation('students');
  // Close dropdown when clicking outside
  const dropdownContentRef = React.useRef<HTMLDivElement | null>(null);
  const outsideRefs = React.useMemo(
    () => [dropdownRef, dropdownContentRef],
    [dropdownRef],
  );
  useClickOutside(outsideRefs, () => setShowDropdown(false), showDropdown);

  // Get current avoid partner IDs (handles both legacy and new format)
  const avoidPartnerIds = getAvoidPartnerIds(student);
  const hasPartners = avoidPartnerIds.length > 0;

  // Get first partner for display
  const firstPartner = hasPartners
    ? allStudents.find((s) => s.id === avoidPartnerIds[0])
    : null;

  // Get priority index for a partner (0-based, -1 if not selected)
  const getPriorityIndex = (partnerId: string): number =>
    avoidPartnerIds.indexOf(partnerId);

  // Handle partner selection toggle
  const handlePartnerToggle = (partnerId: string) => {
    const currentIndex = getPriorityIndex(partnerId);

    if (currentIndex >= 0) {
      // Already selected - remove from list
      const newIds = avoidPartnerIds.filter((id) => id !== partnerId);
      updateStudent(student.id, {
        avoidPartnerIds: newIds,
        // Keep legacy field in sync for backward compatibility
        avoidPartnerId: newIds[0] ?? null,
      });
    } else if (avoidPartnerIds.length < MAX_PARTNER_WISHES) {
      // Not selected and under limit - add to list
      const newIds = [...avoidPartnerIds, partnerId];
      updateStudent(student.id, {
        avoidPartnerIds: newIds,
        // Keep legacy field in sync for backward compatibility
        avoidPartnerId: newIds[0] ?? null,
      });
    }
    // Don't close dropdown to allow multiple selections
  };

  // Handle clear all
  const handleClearAll = () => {
    updateStudent(student.id, {
      avoidPartnerIds: [],
      avoidPartnerId: null,
    });
    setShowDropdown(false);
  };

  // Build display label
  const getDisplayLabel = (): string => {
    if (!hasPartners) return t('distance.label', 'Distanz');
    if (avoidPartnerIds.length === 1)
      return firstPartner?.name || t('distance.label', 'Distanz');
    return `${firstPartner?.name || '?'} +${avoidPartnerIds.length - 1}`;
  };

  // Build tooltip
  const getTooltip = (): string => {
    if (!hasPartners) return t('distance.selectDistance');

    const names = avoidPartnerIds
      .map((id, idx) => {
        const s = allStudents.find((st) => st.id === id);
        return `${idx + 1}. ${s?.name || '?'}`;
      })
      .join(', ');
    return `${t('distance.distanceWish')}: ${names}`;
  };

  // Check if at max capacity
  const isAtLimit = avoidPartnerIds.length >= MAX_PARTNER_WISHES;

  // Render dropdown content (shared between variants)
  const renderDropdownContent = () => (
    <div
      className={`${menuSurfaceClass} min-w-50 max-h-40 overflow-y-auto`}
      style={{ scrollbarGutter: 'stable both-edges' }}
    >
      <button
        type="button"
        className={dropdownResetClass}
        onClick={(e) => {
          e.stopPropagation();
          handleClearAll();
        }}
      >
        {t('distance.noDistancePartner', 'Kein Distanzpartner')}
      </button>
      {allStudents
        .filter((s) => s.id !== student.id)
        .map((partner) => {
          const priorityIdx = getPriorityIndex(partner.id);
          const isSelected = priorityIdx >= 0;
          const isDisabled = !isSelected && isAtLimit;

          return (
            <button
              key={partner.id}
              type="button"
              className={`${dropdownOptionBaseClass} ${
                isSelected ? dropdownActiveClass : dropdownInactiveClass
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!isDisabled) {
                  handlePartnerToggle(partner.id);
                }
              }}
              disabled={isDisabled}
              aria-pressed={isSelected}
            >
              <span className="flex items-center gap-2">
                {isSelected && (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-[10px] font-semibold">
                    {priorityIdx + 1}
                  </span>
                )}
                <span>{partner.name}</span>
              </span>
            </button>
          );
        })}
    </div>
  );

  // Hybrid variant: IconWithLabel with partner name
  if (variant === 'hybrid') {
    const label = getDisplayLabel();
    const colorClasses = hasPartners ? activeStateClass : inactiveStateClass;

    return (
      <div className="relative" ref={dropdownRef}>
        <IconWithLabel
          icon={
            <HeartBreakIcon
              size={14}
              aria-hidden="true"
              className={avoidPartnerIconClass}
            />
          }
          label={label}
          onClick={() => setShowDropdown(!showDropdown)}
          active={hasPartners}
          tooltip={getTooltip()}
          ariaLabel={
            hasPartners
              ? getTooltip()
              : t(
                  'distance.noDistanceSelected',
                  'Kein Distanzwunsch ausgewählt',
                )
          }
          ariaPressed={hasPartners}
          colorClasses={colorClasses}
        />

        {showDropdown && (
          <FloatingDropdown
            anchorRef={dropdownRef}
            align="center"
            portalRef={dropdownContentRef}
            scrollContainerRef={scrollContainerRef}
            className="z-50"
            onClose={() => setShowDropdown(false)}
          >
            {renderDropdownContent()}
          </FloatingDropdown>
        )}
      </div>
    );
  }

  // Compact and detailed variants
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        className={`${baseClass} ${hasPartners ? activeStateClass : inactiveStateClass}`}
        title={getTooltip()}
        onClick={(e) => {
          e.stopPropagation();
          setShowDropdown(!showDropdown);
        }}
        aria-pressed={hasPartners}
        aria-label={
          hasPartners
            ? getTooltip()
            : t('distance.noDistanceSelected', 'Kein Distanzwunsch ausgewählt')
        }
      >
        <HeartBreakIcon
          size={14}
          className={avoidPartnerIconClass}
          aria-hidden="true"
        />
        {variant === 'compact' ? (
          <>
            {hasPartners && avoidPartnerIds.length >= 2 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-3 h-3 flex items-center justify-center rounded-full bg-red-500/80 text-white text-[9px] font-medium">
                {avoidPartnerIds.length}
              </span>
            )}
            <span className="sr-only">{getTooltip()}</span>
          </>
        ) : (
          <span className="hidden sm:inline">{getDisplayLabel()}</span>
        )}
      </button>

      {showDropdown && (
        <FloatingDropdown
          anchorRef={dropdownRef}
          align="center"
          portalRef={dropdownContentRef}
          scrollContainerRef={scrollContainerRef}
          className="z-50"
          onClose={() => setShowDropdown(false)}
        >
          {renderDropdownContent()}
        </FloatingDropdown>
      )}
    </div>
  );
}
