import React from 'react';
import { CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react';
import { cardSurfaceClass } from '@/utils';

interface MenuSectionProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  isExpanded?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  badge?: number | string;
  description?: string;
}

/**
 * Collapsible section component for navigation menu
 */
export default function MenuSection({
  title,
  icon,
  children,
  isExpanded = false,
  onToggle,
  disabled = false,
  badge,
  description,
}: MenuSectionProps) {
  const buttonId = React.useId();
  const panelId = React.useId();
  const showBadge =
    badge !== null && badge !== undefined && `${badge}`.trim().length > 0;
  const badgeLabel =
    typeof badge === 'number' && badge > 99 ? '99+' : (badge ?? '');

  return (
    <div
      className={`${cardSurfaceClass} border border-blue-100/60 backdrop-blur-sm transition dark:border-blue-900/40`}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        id={buttonId}
        className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-4 text-left transition ${
          disabled
            ? 'cursor-not-allowed opacity-50'
            : 'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-900/10'
        }`}
        aria-expanded={isExpanded}
        aria-disabled={disabled}
        aria-controls={panelId}
      >
        <div className="flex items-start gap-3">
          {icon && (
            <div className="mt-0.5 text-blue-600 dark:text-blue-400">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h3>
              {showBadge && (
                <span className="inline-flex items-center rounded-full bg-blue-600/10 px-2 py-0.5 text-xs font-semibold text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                  {badgeLabel}
                </span>
              )}
            </div>
            {description && (
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>
        </div>
        {!disabled && (
          <div className="shrink-0 text-gray-400 transition dark:text-gray-500">
            {isExpanded ? <CaretUpIcon size={18} /> : <CaretDownIcon size={18} />}
          </div>
        )}
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        aria-hidden={!isExpanded || disabled}
        hidden={!isExpanded || disabled}
        className={`border-t border-blue-100/60 px-4 pb-4 pt-3 dark:border-blue-900/20 ${
          isExpanded && !disabled ? 'animate-in fade-in duration-200' : ''
        }`}
      >
        {isExpanded && !disabled ? children : null}
      </div>
    </div>
  );
}
