// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { SkeletonLine, SkeletonCard } from './SkeletonLoader';

/**
 * Generic page skeleton for route-level Suspense fallback.
 * Provides a minimal loading placeholder during page transitions.
 */
export default function PageSkeleton() {
  const { t } = useTranslation('common');

  return (
    <div
      className="min-h-[80vh] px-4 py-12"
      aria-label={t('loading.page')}
      role="status"
    >
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header skeleton */}
        <div className="text-center">
          <SkeletonLine width="12rem" className="mx-auto h-10 mb-4" />
          <SkeletonLine width="24rem" className="mx-auto h-4" />
        </div>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <SkeletonCard className="h-48" />
          <SkeletonCard className="h-48" />
        </div>

        {/* Action skeleton */}
        <div className="flex justify-center">
          <SkeletonLine width="10rem" className="h-12 rounded-full" />
        </div>
      </div>
    </div>
  );
}
