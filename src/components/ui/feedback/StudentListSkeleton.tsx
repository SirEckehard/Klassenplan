// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { SkeletonLine, SkeletonCircle } from './SkeletonLoader';

/**
 * Skeleton placeholder for the student list (Step 1).
 * Mimics the layout of StudentList component during loading.
 */
export default function StudentListSkeleton() {
  return (
    <div className="card-surface p-6" aria-label="Loading student list">
      {/* Header skeleton */}
      <div className="mb-6 flex items-center justify-between">
        <SkeletonLine width="10rem" />
        <div className="flex gap-2">
          <SkeletonCircle size="2.5rem" />
          <SkeletonCircle size="2.5rem" />
        </div>
      </div>

      {/* Student row skeletons */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 rounded-lg bg-slate-50/50 p-3 dark:bg-slate-800/30"
          >
            <SkeletonCircle size="2rem" />
            <SkeletonLine width="40%" />
            <div className="ml-auto flex gap-2">
              <SkeletonCircle size="1.5rem" />
              <SkeletonCircle size="1.5rem" />
              <SkeletonCircle size="1.5rem" />
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons skeleton */}
      <div className="mt-6 flex justify-end gap-3">
        <SkeletonLine width="8rem" className="h-10 rounded-full" />
        <SkeletonLine width="8rem" className="h-10 rounded-full" />
      </div>
    </div>
  );
}
