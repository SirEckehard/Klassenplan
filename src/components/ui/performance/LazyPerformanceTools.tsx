// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { Suspense } from 'react';

// Lazy load performance components only when needed
const PerformanceDashboard = React.lazy(
  () => import('@/components/ui/performance/PerformanceDashboard'),
);
const PerformanceDebugButton = React.lazy(
  () => import('@/components/ui/performance/PerformanceDebugButton'),
);

interface LazyPerformanceToolsProps {
  showDashboard: boolean;
  onCloseDashboard: () => void;
}

export default function LazyPerformanceTools({
  showDashboard,
  onCloseDashboard,
}: LazyPerformanceToolsProps) {
  return (
    <Suspense fallback={null}>
      <PerformanceDebugButton />
      <PerformanceDashboard isOpen={showDashboard} onClose={onCloseDashboard} />
    </Suspense>
  );
}
