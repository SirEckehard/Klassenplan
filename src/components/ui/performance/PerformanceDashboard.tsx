import React, { useState, useEffect } from 'react';
import {
  MonitorIcon,
  TrendUpIcon,
  Clock,
  LightningIcon,
  WarningIcon,
  CheckCircleIcon,
  InfoIcon,
} from '@phosphor-icons/react';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import type { PerformanceThreshold } from '@/utils/performance/webVitals';

// Performance score color mapping
const getScoreColor = (score: number): string => {
  if (score >= 90) return 'text-green-600 dark:text-green-400';
  if (score >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

// Performance threshold color mapping
const getThresholdColor = (threshold: PerformanceThreshold): string => {
  switch (threshold) {
    case 'good':
      return 'text-green-600 dark:text-green-400';
    case 'needs-improvement':
      return 'text-amber-600 dark:text-amber-400';
    case 'poor':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
};

// Format metric values based on type
const formatMetricValue = (name: string, value: number): string => {
  if (name === 'CLS') {
    return value.toFixed(3); // Layout shift uses decimals
  }
  return Math.round(value).toString() + 'ms';
};

interface MetricCardProps {
  name: string;
  value: number;
  threshold: PerformanceThreshold;
  description: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  name,
  value,
  threshold,
  description,
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {name}
      </h4>
      <span
        className={`text-xs px-2 py-1 rounded-full ${
          threshold === 'good'
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : threshold === 'needs-improvement'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}
      >
        {threshold === 'good'
          ? 'Gut'
          : threshold === 'needs-improvement'
            ? 'Verbesserbar'
            : 'Schlecht'}
      </span>
    </div>
    <div className={`text-2xl font-bold ${getThresholdColor(threshold)}`}>
      {formatMetricValue(name, value)}
    </div>
    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
      {description}
    </p>
  </div>
);

interface PerformanceDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    performanceState,
    renderMetrics,
    memoryMetrics,
    getPerformanceInsights,
    clearPerformanceData,
    isMonitoring,
  } = usePerformanceMonitoring();

  const [insights, setInsights] = useState<string[]>([]);

  // Update insights periodically
  useEffect(() => {
    if (isOpen) {
      const updateInsights = () => setInsights(getPerformanceInsights());
      updateInsights();

      const interval = setInterval(updateInsights, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen, getPerformanceInsights]);

  if (!isOpen) return null;

  const latestMemory = memoryMetrics[memoryMetrics.length - 1];
  const slowComponents = renderMetrics.filter((m) => m.averageRenderTime > 16);
  const slowRoutes = performanceState.routeTransitions.filter(
    (t) => t.duration > 300,
  );

  // Core Web Vitals descriptions
  const metricDescriptions = {
    LCP: 'Largest Contentful Paint - Zeit bis zum größten Element',
    INP: 'Interaction to Next Paint - Reaktionszeit auf Interaktionen',
    CLS: 'Cumulative Layout Shift - Visuelle Stabilität',
    FCP: 'First Contentful Paint - Zeit bis zum ersten Inhalt',
    TTFB: 'Time to First Byte - Server-Antwortzeit',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <MonitorIcon className="text-blue-600" size={24} />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Performance Dashboard
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Echzeit-Überwachung der Anwendungsleistung
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                isMonitoring
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-green-500' : 'bg-gray-500'}`}
              />
              {isMonitoring ? 'Aktiv' : 'Inaktiv'}
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="p-6 space-y-6">
            {/* Overall Score */}
            <div className="text-center mb-6">
              <div
                className={`text-4xl font-bold ${getScoreColor(performanceState.overallScore)} mb-2`}
              >
                {performanceState.overallScore}/100
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Gesamt-Performance-Score
              </p>
            </div>

            {/* Core Web Vitals */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <TrendUpIcon size={20} />
                Core Web Vitals
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {performanceState.coreWebVitals.map((metric) => (
                  <MetricCard
                    key={metric.name}
                    name={metric.name}
                    value={metric.value}
                    threshold={metric.threshold}
                    description={
                      metricDescriptions[
                        metric.name as keyof typeof metricDescriptions
                      ] || ''
                    }
                  />
                ))}
              </div>
            </section>

            {/* Performance Insights */}
            {insights.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <WarningIcon size={20} />
                  Performance-Einsichten
                </h3>
                <div className="space-y-2">
                  {insights.map((insight, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg"
                    >
                      <InfoIcon
                        size={16}
                        className="text-amber-600 dark:text-amber-400 mt-0.5"
                      />
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        {insight}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Route Transitions */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Clock size={20} />
                  Route-Übergänge
                </h3>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  {performanceState.routeTransitions.length > 0 ? (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {performanceState.routeTransitions
                        .slice(-5)
                        .map((transition, index) => (
                          <div key={index} className="p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {transition.from} → {transition.to}
                              </span>
                              <span
                                className={`text-sm ${
                                  transition.duration < 100
                                    ? 'text-green-600 dark:text-green-400'
                                    : transition.duration < 300
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                {Math.round(transition.duration)}ms
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      Keine Route-Übergänge erfasst
                    </div>
                  )}
                </div>
                {slowRoutes.length > 0 && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                    {slowRoutes.length} langsame Route(n) erkannt (&gt;300ms)
                  </p>
                )}
              </section>

              {/* Component Rendering */}
              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <LightningIcon size={20} />
                  Komponenten-Rendering
                </h3>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  {renderMetrics.length > 0 ? (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {renderMetrics.slice(0, 5).map((metric, index) => (
                        <div key={index} className="p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {metric.componentName}
                            </span>
                            <div className="text-right">
                              <div
                                className={`text-sm ${
                                  metric.averageRenderTime < 8
                                    ? 'text-green-600 dark:text-green-400'
                                    : metric.averageRenderTime < 16
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                Ø {Math.round(metric.averageRenderTime)}ms
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {metric.renderCount} Renders
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      Keine Render-Metriken erfasst
                    </div>
                  )}
                </div>
                {slowComponents.length > 0 && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                    {slowComponents.length} langsame Komponente(n) erkannt
                    (&gt;16ms)
                  </p>
                )}
              </section>
            </div>

            {/* Memory Usage */}
            {latestMemory && (
              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <MonitorIcon size={20} />
                  Speicher-Nutzung
                </h3>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Verwendet
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {Math.round(latestMemory.usedJSHeapSize / 1024 / 1024)}
                        MB
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Total
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {Math.round(latestMemory.totalJSHeapSize / 1024 / 1024)}
                        MB
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Limit
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {Math.round(latestMemory.jsHeapSizeLimit / 1024 / 1024)}
                        MB
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          latestMemory.usedJSHeapSize /
                            latestMemory.jsHeapSizeLimit >
                          0.8
                            ? 'bg-red-500'
                            : latestMemory.usedJSHeapSize /
                                  latestMemory.jsHeapSizeLimit >
                                0.6
                              ? 'bg-amber-500'
                              : 'bg-green-500'
                        }`}
                        style={{
                          width: `${(latestMemory.usedJSHeapSize / latestMemory.jsHeapSizeLimit) * 100}%`,
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {Math.round(
                        (latestMemory.usedJSHeapSize /
                          latestMemory.jsHeapSizeLimit) *
                          100,
                      )}
                      % des verfügbaren Speichers
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Bundle Metrics */}
            {performanceState.bundleMetrics.length > 0 && (
              <section>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <CheckCircleIcon size={20} />
                  Bundle-Loading
                </h3>
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {performanceState.bundleMetrics
                      .slice(-5)
                      .map((bundle, index) => (
                        <div key={index} className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {bundle.chunkName}
                              </span>
                              {bundle.cached && (
                                <span className="ml-2 text-xs px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                                  Cached
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <div
                                className={`text-sm ${
                                  bundle.loadTime < 100
                                    ? 'text-green-600 dark:text-green-400'
                                    : bundle.loadTime < 500
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                {Math.round(bundle.loadTime)}ms
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {Math.round(bundle.size / 1024)}KB
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Letzte Aktualisierung:{' '}
            {new Date(performanceState.lastUpdate).toLocaleTimeString()}
          </p>
          <button
            onClick={clearPerformanceData}
            className="px-4 py-2 text-sm bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40
                     text-red-700 dark:text-red-300 rounded-md transition-colors"
          >
            Daten löschen
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(PerformanceDashboard);
