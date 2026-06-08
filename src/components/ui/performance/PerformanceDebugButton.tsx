import React from 'react';
import { MonitorIcon } from '@phosphor-icons/react';
import { usePerformanceDashboard } from '@/hooks/usePerformanceDashboard';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';

/**
 * Debug button for opening performance dashboard (development only)
 */
const PerformanceDebugButton: React.FC = () => {
  const {
    isDevMode,
    toggleDashboard,
    hasManualOverride,
    isDashboardAvailable,
  } = usePerformanceDashboard();
  const { performanceState } = usePerformanceMonitoring();
  if (!isDashboardAvailable) {
    return null;
  }

  // Show in development mode or when explicitly enabled
  if (!isDevMode && !hasManualOverride) {
    return null;
  }

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <button
      onClick={toggleDashboard}
      className="fixed bottom-4 left-4 z-40 bg-blue-600 hover:bg-blue-700 text-white
                rounded-full p-3 shadow-lg transition-all duration-200 group"
      title="Performance Dashboard öffnen (Ctrl/Cmd + Shift + P)"
    >
      <div className="flex items-center gap-2">
        <MonitorIcon size={20} />
        {performanceState.overallScore > 0 && (
          <span
            className={`text-sm font-semibold ${getScoreColor(performanceState.overallScore)}`}
          >
            {performanceState.overallScore}
          </span>
        )}
      </div>

      {/* Tooltip */}
      <div
        className="absolute bottom-full left-0 mb-2 opacity-0 group-hover:opacity-100
                    transition-opacity duration-200 pointer-events-none"
      >
        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap">
          Performance Dashboard
          <div className="text-gray-300">Ctrl/Cmd + Shift + P</div>
        </div>
      </div>

      {/* Performance indicator */}
      {performanceState.isTracking && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
      )}
    </button>
  );
};

export default React.memo(PerformanceDebugButton);
