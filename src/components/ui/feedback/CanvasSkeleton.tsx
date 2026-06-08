import { SkeletonLine, SkeletonCircle } from './SkeletonLoader';

/**
 * Skeleton placeholder for the canvas/layout editor (Step 2/3).
 * Mimics the classroom canvas layout during loading.
 */
export default function CanvasSkeleton() {
  return (
    <div
      className="flex flex-col gap-6 lg:flex-row"
      aria-label="Loading canvas"
    >
      {/* Sidebar skeleton */}
      <div className="card-surface w-full p-4 lg:w-72">
        <SkeletonLine width="60%" className="mb-4" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <SkeletonCircle size="2rem" />
              <SkeletonLine width="70%" />
            </div>
          ))}
        </div>
      </div>

      {/* Canvas area skeleton */}
      <div className="flex-1">
        <div className="card-surface aspect-[3/2] w-full p-6">
          {/* Canvas grid simulation */}
          <div className="grid h-full grid-cols-4 grid-rows-3 gap-4">
            {Array.from({ length: 12 }).map((_, index) => (
              <div
                key={index}
                className="skeleton-base skeleton-shimmer rounded-lg"
                style={{ opacity: index % 4 === 3 ? 0 : 1 }}
              />
            ))}
          </div>
        </div>

        {/* Toolbar skeleton */}
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonCircle key={index} size="2.5rem" />
          ))}
        </div>
      </div>
    </div>
  );
}
