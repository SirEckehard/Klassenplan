/**
 * Intelligent route preloading for better perceived performance
 */
import { logWarn, logDebug, logError } from '@/utils';
import { addPrefetchHint } from '@/utils/performance/prefetchHints';
import { scheduleIdleTask } from '@/utils/performance/idleTasks';
import { prefetchOrchestrator } from '@/utils/performance/prefetchOrchestrator';

// Cache for preloaded routes to avoid duplicate loads
const preloadedRoutes = new Set<string>();

const routeLoaders: Record<string, () => Promise<unknown>> = {
  generator: () =>
    import('@/components/SeatingPlanGenerator/SeatingPlanGenerator'),
  export: () => import('@/pages/Export'),
  startpage: () => import('@/pages/StartPage'),
  impressum: () => import('@/pages/Impressum'),
  datenschutz: () => import('@/pages/Datenschutz'),
  feedback: () => import('@/pages/Feedback'),
};

/**
 * Preload a route component for faster navigation
 */
export async function preloadRoute(routeName: string): Promise<void> {
  if (preloadedRoutes.has(routeName)) {
    return; // Already preloaded
  }

  const loader = routeLoaders[routeName];
  if (!loader) {
    logWarn(`Unknown route for preloading: ${routeName}`, {}, 'routePreloader');
    return;
  }

  try {
    await prefetchOrchestrator.trackJob(
      { type: 'route', target: routeName, trigger: 'auto' },
      loader,
    );

    preloadedRoutes.add(routeName);
    logDebug(`Route preloaded: ${routeName}`, {}, 'routePreloader');
  } catch (error) {
    logError(
      `Failed to preload route ${routeName}`,
      { error },
      'routePreloader',
    );
  }
}

/**
 * Preload likely next routes based on current route
 */
export function preloadLikelyRoutes(currentPath: string): void {
  // Use requestIdleCallback for non-blocking preloading
  const preload = () => {
    switch (currentPath) {
      case '/':
        // From start page, users likely go to generator
        addPrefetchHint('/generator', { as: 'document', importance: 'low' });
        preloadRoute('generator');
        break;
      case '/generator':
        // From generator, users likely export or go back to start
        addPrefetchHint('/export', { as: 'document', importance: 'low' });
        addPrefetchHint('/', { as: 'document', importance: 'low' });
        preloadRoute('export');
        preloadRoute('startpage');
        break;
      case '/export':
        // From export, users might go back to generator or start
        addPrefetchHint('/generator', { as: 'document', importance: 'low' });
        addPrefetchHint('/', { as: 'document', importance: 'low' });
        preloadRoute('generator');
        preloadRoute('startpage');
        break;
      default:
        // For other pages, preload start page
        addPrefetchHint('/', { as: 'document', importance: 'low' });
        preloadRoute('startpage');
    }
  };

  scheduleIdleTask(preload, { timeout: 2000 });
}

/**
 * Preload route on link hover for instant navigation
 */
export function preloadOnHover(routeName: string): (event: MouseEvent) => void {
  return (event: MouseEvent) => {
    // Only preload on hover for mouse devices (not touch)
    if (event.type === 'mouseenter') {
      preloadRoute(routeName);
    }
  };
}
