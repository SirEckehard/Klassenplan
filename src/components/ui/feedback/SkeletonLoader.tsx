// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Base skeleton loading components with shimmer animation.
 * Used as loading placeholders during lazy-loaded component loading.
 */

interface SkeletonLineProps {
  width?: string;
  className?: string;
}

/**
 * A single line skeleton placeholder
 */
export function SkeletonLine({
  width = '100%',
  className = '',
}: SkeletonLineProps) {
  return (
    <div
      className={`skeleton-base skeleton-shimmer skeleton-line ${className}`}
      style={{ width }}
      aria-hidden="true"
    />
  );
}

interface SkeletonCircleProps {
  size?: string;
  className?: string;
}

/**
 * A circular skeleton placeholder (for avatars, icons, etc.)
 */
export function SkeletonCircle({
  size = '2.5rem',
  className = '',
}: SkeletonCircleProps) {
  return (
    <div
      className={`skeleton-base skeleton-shimmer skeleton-circle ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

interface SkeletonCardProps {
  className?: string;
}

/**
 * A card-shaped skeleton placeholder
 */
export function SkeletonCard({ className = '' }: SkeletonCardProps) {
  return (
    <div
      className={`skeleton-base skeleton-shimmer rounded-xl p-6 ${className}`}
      style={{ minHeight: '8rem' }}
      aria-hidden="true"
    />
  );
}

interface SkeletonListProps {
  rows?: number;
  className?: string;
}

/**
 * A list of skeleton lines
 */
export function SkeletonList({ rows = 5, className = '' }: SkeletonListProps) {
  return (
    <div className={`flex flex-col gap-3 ${className}`} aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonLine key={index} width={index === rows - 1 ? '60%' : '100%'} />
      ))}
    </div>
  );
}
