/**
 * Responsive ViewBox utility for SVG elements
 * Provides dynamic viewBox calculations based on container size and content
 */

export interface ViewBoxDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResponsiveViewBoxOptions {
  containerWidth: number;
  containerHeight: number;
  contentWidth?: number;
  contentHeight?: number;
  minAspectRatio?: number;
  maxAspectRatio?: number;
  padding?: number;
}

/**
 * Calculate optimal viewBox for responsive SVG
 */
export function calculateResponsiveViewBox(
  options: ResponsiveViewBoxOptions,
): ViewBoxDimensions {
  const {
    containerWidth,
    containerHeight,
    contentWidth = 900, // Default classroom width
    contentHeight = 600, // Default classroom height
    minAspectRatio = 0.5, // 1:2 (tall)
    maxAspectRatio = 2.0, // 2:1 (wide)
    padding = 0,
  } = options;

  // Calculate container aspect ratio
  const containerAspectRatio = containerWidth / containerHeight;
  const contentAspectRatio = contentWidth / contentHeight;

  // Clamp aspect ratio to acceptable range
  const targetAspectRatio = Math.max(
    minAspectRatio,
    Math.min(maxAspectRatio, containerAspectRatio),
  );

  let viewBoxWidth: number;
  let viewBoxHeight: number;

  // Determine viewBox dimensions based on target aspect ratio
  if (targetAspectRatio > contentAspectRatio) {
    // Container is wider than content - expand width
    viewBoxHeight = contentHeight;
    viewBoxWidth = contentHeight * targetAspectRatio;
  } else {
    // Container is taller than content - expand height
    viewBoxWidth = contentWidth;
    viewBoxHeight = contentWidth / targetAspectRatio;
  }

  // Add padding
  viewBoxWidth += padding * 2;
  viewBoxHeight += padding * 2;

  // Center the content
  const x = (contentWidth - viewBoxWidth) / 2;
  const y = (contentHeight - viewBoxHeight) / 2;

  return {
    x,
    y,
    width: viewBoxWidth,
    height: viewBoxHeight,
  };
}

/**
 * Format viewBox dimensions as SVG viewBox string
 */
export function formatViewBox(dimensions: ViewBoxDimensions): string {
  const { x, y, width, height } = dimensions;
  return `${x} ${y} ${width} ${height}`;
}

/**
 * Calculate responsive font size based on viewBox scale
 */
export function calculateResponsiveFontSize(
  baseSize: number,
  viewBoxWidth: number,
  baseViewBoxWidth: number = 900,
  minSize: number = 8,
  maxSize: number = 24,
): number {
  const scale = viewBoxWidth / baseViewBoxWidth;
  const scaledSize = baseSize * scale;
  return Math.max(minSize, Math.min(maxSize, scaledSize));
}

/**
 * Hook for using responsive viewBox with React
 */
export function useResponsiveViewBox(
  containerRef: React.RefObject<HTMLElement | null>,
  options: Omit<ResponsiveViewBoxOptions, 'containerWidth' | 'containerHeight'>,
): {
  viewBox: string;
  dimensions: ViewBoxDimensions;
  scale: number;
} {
  const [dimensions, setDimensions] = React.useState<ViewBoxDimensions>({
    x: 0,
    y: 0,
    width: options.contentWidth || 900,
    height: options.contentHeight || 600,
  });

  React.useEffect(() => {
    const updateViewBox = () => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const newDimensions = calculateResponsiveViewBox({
        containerWidth: rect.width,
        containerHeight: rect.height,
        ...options,
      });

      setDimensions(newDimensions);
    };

    // Initial calculation
    updateViewBox();

    // Update on resize using ResizeObserver if available
    let resizeObserver: ResizeObserver | null = null;

    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(updateViewBox);
      resizeObserver.observe(containerRef.current);
    }

    // Fallback to window resize for older browsers or test environments
    window.addEventListener('resize', updateViewBox);

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', updateViewBox);
    };
  }, [containerRef, options]);

  const scale = dimensions.width / (options.contentWidth || 900);

  return {
    viewBox: formatViewBox(dimensions),
    dimensions,
    scale,
  };
}

// React import for TypeScript
import React from 'react';
