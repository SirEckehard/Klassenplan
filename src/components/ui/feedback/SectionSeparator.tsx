import React from 'react';

interface SectionSeparatorProps {
  label?: string;
  className?: string;
}

/**
 * Visual separator between sections in sidebar panels
 * Optionally displays a centered label
 */
export default function SectionSeparator({
  label,
  className = '',
}: SectionSeparatorProps) {
  if (label) {
    return (
      <div
        className={`flex items-center gap-2 px-3 py-2 ${className}`}
        role="separator"
        aria-label={label}
      >
        <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </span>
        <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600" />
      </div>
    );
  }

  return (
    <div
      className={`border-t border-gray-200 dark:border-gray-600 ${className}`}
      role="separator"
    />
  );
}
