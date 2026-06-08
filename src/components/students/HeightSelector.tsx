import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDownIcon, ArrowsVerticalIcon, ArrowUpIcon } from '@phosphor-icons/react';
import type { Student, HeightCategory } from '@/types';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { cardSurfaceClass, menuSurfaceClass } from '@/utils';
import { heightButtonTokens } from './studentStyleTokens';
import FloatingDropdown from './FloatingDropdown';
import IconWithLabel from './IconWithLabel';

// Icon mapping for compact view
const HEIGHT_ICONS = {
  small: <ArrowDownIcon size={14} aria-hidden="true" />,
  medium: <ArrowsVerticalIcon size={14} aria-hidden="true" />,
  tall: <ArrowUpIcon size={14} aria-hidden="true" />,
} as const;

// Label mapping for display - will be translated via i18n
const HEIGHT_LABELS = {
  small: 'height.small',
  medium: 'height.medium',
  tall: 'height.tall',
} as const;

const {
  compactBaseClass,
  compactStyleMap,
  compactIconColorMap,
  dropdownOptionBaseClass,
  dropdownActiveStyleMap,
  dropdownInactiveStyleMap,
  dropdownIconColorMap,
  detailedBaseClass,
  detailedActiveStyleMap,
  detailedInactiveClass,
  detailedIconColorMap,
} = heightButtonTokens;

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
 * HeightSelector Component
 *
 * Displays height category selection UI in either compact dropdown or detailed button mode.
 * - Compact: Single button with dropdown menu
 * - Detailed: Three separate buttons for each height category
 *
 * @param student - Current student object
 * @param updateStudent - Callback to update height category
 * @param variant - Display variant (compact or detailed)
 * @param showDropdown - Whether dropdown is visible (compact mode only)
 * @param setShowDropdown - Setter for dropdown visibility (compact mode only)
 * @param dropdownRef - Ref for click-outside detection (compact mode only)
 */
export default function HeightSelector({
  student,
  updateStudent,
  variant,
  showDropdown,
  setShowDropdown,
  dropdownRef,
  scrollContainerRef,
}: Props) {
  const { t } = useTranslation('students');
  // Close dropdown when clicking outside (compact mode only)
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

  const handleHeightChange = (height: HeightCategory) => {
    updateStudent(student.id, { height });
    if (variant === 'compact' || variant === 'hybrid') {
      setShowDropdown?.(false);
    }
  };

  // Get current height or default to 'medium'
  const currentHeight = student.height || 'medium';

  // Hybrid variant: IconWithLabel with dropdown
  if (variant === 'hybrid') {
    // Use compact view color classes for consistency
    const colorClasses = compactStyleMap[currentHeight];
    const iconColorClass =
      currentHeight === 'medium'
        ? 'text-gray-900 dark:text-white'
        : compactIconColorMap[currentHeight];

    return (
      <div className="relative" ref={resolvedDropdownRef}>
        <IconWithLabel
          icon={
            <span className={iconColorClass}>
              {HEIGHT_ICONS[currentHeight]}
            </span>
          }
          label={t(HEIGHT_LABELS[currentHeight])}
          onClick={() => setShowDropdown?.(!showDropdown)}
          active={currentHeight !== 'medium'}
          tooltip={`${t('height.title')}: ${t(HEIGHT_LABELS[currentHeight])}`}
          colorClasses={colorClasses}
        />

        {/* Height Dropdown */}
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
              <button
                type="button"
                className={`${dropdownOptionBaseClass} ${
                  currentHeight === 'small'
                    ? dropdownActiveStyleMap.small
                    : dropdownInactiveStyleMap.small
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleHeightChange('small');
                }}
              >
                <span className={dropdownIconColorMap.small}>
                  <ArrowDownIcon size={14} aria-hidden="true" />
                </span>
                {t('height.small')}
              </button>
              <button
                type="button"
                className={`${dropdownOptionBaseClass} ${
                  currentHeight === 'medium'
                    ? dropdownActiveStyleMap.medium
                    : dropdownInactiveStyleMap.medium
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleHeightChange('medium');
                }}
              >
                <span className={dropdownIconColorMap.medium}>
                  <ArrowsVerticalIcon size={14} aria-hidden="true" />
                </span>
                {t('height.medium')}
              </button>
              <button
                type="button"
                className={`${dropdownOptionBaseClass} ${
                  currentHeight === 'tall'
                    ? dropdownActiveStyleMap.tall
                    : dropdownInactiveStyleMap.tall
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleHeightChange('tall');
                }}
              >
                <span className={dropdownIconColorMap.tall}>
                  <ArrowUpIcon size={14} aria-hidden="true" />
                </span>
                {t('height.tall')}
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
          className={`${compactBaseClass} ${compactStyleMap[currentHeight]}`}
          title={`${t('height.title')}: ${t(HEIGHT_LABELS[currentHeight])}`}
          onClick={(e) => {
            e.stopPropagation();
            setShowDropdown?.(!showDropdown);
          }}
        >
          <span className={`${compactIconColorMap[currentHeight]} text-lg`}>
            {HEIGHT_ICONS[currentHeight]}
          </span>
        </button>

        {/* Height Dropdown */}
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
              <button
                type="button"
                className={`${dropdownOptionBaseClass} ${
                  currentHeight === 'small'
                    ? dropdownActiveStyleMap.small
                    : dropdownInactiveStyleMap.small
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleHeightChange('small');
                }}
              >
                <span className={dropdownIconColorMap.small}>
                  <ArrowDownIcon size={14} aria-hidden="true" />
                </span>
                {t('height.small')}
              </button>
              <button
                type="button"
                className={`${dropdownOptionBaseClass} ${
                  currentHeight === 'medium'
                    ? dropdownActiveStyleMap.medium
                    : dropdownInactiveStyleMap.medium
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleHeightChange('medium');
                }}
              >
                <span className={dropdownIconColorMap.medium}>
                  <ArrowsVerticalIcon size={14} aria-hidden="true" />
                </span>
                {t('height.medium')}
              </button>
              <button
                type="button"
                className={`${dropdownOptionBaseClass} ${
                  currentHeight === 'tall'
                    ? dropdownActiveStyleMap.tall
                    : dropdownInactiveStyleMap.tall
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleHeightChange('tall');
                }}
              >
                <span className={dropdownIconColorMap.tall}>
                  <ArrowUpIcon size={14} aria-hidden="true" />
                </span>
                {t('height.tall')}
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
      <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
        {t('height.title')}
      </h4>
      <div
        className={`${cardSurfaceClass} grid grid-cols-1 gap-2 p-3 sm:grid-cols-3`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleHeightChange('small');
          }}
          className={`${detailedBaseClass} ${
            currentHeight === 'small'
              ? detailedActiveStyleMap.small
              : detailedInactiveClass
          }`}
          title={t(
            'height.smallTooltip',
            'Kleinere Schüler werden bevorzugt vorne platziert',
          )}
        >
          <span className={detailedIconColorMap.small}>
            <ArrowDownIcon size={14} aria-hidden="true" />
          </span>
          {t('height.small')}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleHeightChange('medium');
          }}
          className={`${detailedBaseClass} ${
            currentHeight === 'medium'
              ? detailedActiveStyleMap.medium
              : detailedInactiveClass
          }`}
          title={t(
            'height.mediumTooltip',
            'Mittlere Größe - keine Bevorzugung',
          )}
        >
          <span className={detailedIconColorMap.medium}>
            <ArrowsVerticalIcon size={14} aria-hidden="true" />
          </span>
          {t('height.medium')}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleHeightChange('tall');
          }}
          className={`${detailedBaseClass} ${
            currentHeight === 'tall'
              ? detailedActiveStyleMap.tall
              : detailedInactiveClass
          }`}
          title={t(
            'height.tallTooltip',
            'Größere Schüler werden bevorzugt hinten platziert',
          )}
        >
          <span className={detailedIconColorMap.tall}>
            <ArrowUpIcon size={14} aria-hidden="true" />
          </span>
          {t('height.tall')}
        </button>
      </div>
    </section>
  );
}
