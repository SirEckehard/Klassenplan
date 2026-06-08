// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { HeartIcon } from '@phosphor-icons/react';
import type { Student } from '@/types';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { menuSurfaceClass, MAX_PARTNER_WISHES } from '@/utils';
import { getWishPartnerIds } from '@/utils/data/studentMigration';
import { partnerButtonTokens } from './studentStyleTokens';
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
  iconClass: partnerIconClass,
  dropdownResetClass,
  dropdownOptionBaseClass,
  dropdownActiveClass,
  dropdownInactiveClass,
} = partnerButtonTokens;

/**
 * PartnerSelector Component
 *
 * Multi-select dropdown for choosing wish partners (Wunschpartner).
 * Supports selecting up to MAX_PARTNER_WISHES partners with priority ordering.
 * Click order determines priority (first click = priority 1).
 *
 * @param student - Current student object
 * @param allStudents - All students for selection options
 * @param updateStudent - Callback to update wishPartnerIds
 * @param showDropdown - Whether dropdown is currently visible
 * @param setShowDropdown - Setter for dropdown visibility
 * @param dropdownRef - Ref for click-outside detection
 * @param variant - Display variant (compact, detailed, or hybrid)
 */
export default function PartnerSelector({
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

  // Get current wish partner IDs (handles both legacy and new format)
  const wishPartnerIds = getWishPartnerIds(student);
  const hasPartners = wishPartnerIds.length > 0;

  // Get first partner for display
  const firstPartner = hasPartners
    ? allStudents.find((s) => s.id === wishPartnerIds[0])
    : null;

  // Get priority index for a partner (0-based, -1 if not selected)
  const getPriorityIndex = (partnerId: string): number =>
    wishPartnerIds.indexOf(partnerId);

  // Handle partner selection toggle
  const handlePartnerToggle = (partnerId: string) => {
    const currentIndex = getPriorityIndex(partnerId);

    if (currentIndex >= 0) {
      // Already selected - remove from list
      const newIds = wishPartnerIds.filter((id) => id !== partnerId);
      updateStudent(student.id, {
        wishPartnerIds: newIds,
        // Keep legacy field in sync for backward compatibility
        wishPartnerId: newIds[0] ?? null,
      });
    } else if (wishPartnerIds.length < MAX_PARTNER_WISHES) {
      // Not selected and under limit - add to list
      const newIds = [...wishPartnerIds, partnerId];
      updateStudent(student.id, {
        wishPartnerIds: newIds,
        // Keep legacy field in sync for backward compatibility
        wishPartnerId: newIds[0] ?? null,
      });
    }
    // Don't close dropdown to allow multiple selections
  };

  // Handle clear all
  const handleClearAll = () => {
    updateStudent(student.id, {
      wishPartnerIds: [],
      wishPartnerId: null,
    });
    setShowDropdown(false);
  };

  // Build display label
  const getDisplayLabel = (): string => {
    if (!hasPartners) return t('partners.partner', 'Partner');
    if (wishPartnerIds.length === 1)
      return firstPartner?.name || t('partners.partner', 'Partner');
    return `${firstPartner?.name || '?'} +${wishPartnerIds.length - 1}`;
  };

  // Build tooltip
  const getTooltip = (): string => {
    if (!hasPartners) return t('partners.selectPartner');

    const names = wishPartnerIds
      .map((id, idx) => {
        const s = allStudents.find((st) => st.id === id);
        return `${idx + 1}. ${s?.name || '?'}`;
      })
      .join(', ');
    return `${t('partners.wishPartners')}: ${names}`;
  };

  // Check if at max capacity
  const isAtLimit = wishPartnerIds.length >= MAX_PARTNER_WISHES;

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
        {t('partners.noWishPartner', 'Kein Wunschpartner')}
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
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300 text-[10px] font-semibold">
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
            <HeartIcon
              size={14}
              aria-hidden="true"
              className={partnerIconClass}
            />
          }
          label={label}
          onClick={() => setShowDropdown(!showDropdown)}
          active={hasPartners}
          tooltip={getTooltip()}
          ariaLabel={
            hasPartners
              ? getTooltip()
              : t('partners.noPartnerSelected', 'Kein Wunschpartner ausgewählt')
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
            : t('partners.noPartnerSelected', 'Kein Wunschpartner ausgewählt')
        }
      >
        <HeartIcon
          size={14}
          className={partnerIconClass}
          aria-hidden="true"
        />
        {variant === 'compact' ? (
          <>
            {hasPartners && wishPartnerIds.length >= 2 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-3 h-3 flex items-center justify-center rounded-full bg-pink-500/80 text-white text-[9px] font-medium">
                {wishPartnerIds.length}
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
