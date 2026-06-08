import React from 'react';
import { createPortal } from 'react-dom';

type HorizontalAlign = 'left' | 'right' | 'center';

type FloatingDropdownProps = {
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  align?: HorizontalAlign;
  offset?: number;
  onClose?: () => void;
  className?: string;
  portalRef?: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  matchAnchorWidth?: boolean;
};

type DropdownPosition = {
  top: number;
  left: number;
  width: number;
  dropdownWidth: number;
  maxWidth?: number;
  openAbove?: boolean;
  isFinalized?: boolean;
};

const DEFAULT_OFFSET = 4;
const VIEWPORT_PADDING = 8;
const DEFAULT_DROPDOWN_WIDTH = 240;

export default function FloatingDropdown({
  anchorRef,
  children,
  align = 'left',
  offset = DEFAULT_OFFSET,
  onClose,
  className,
  portalRef,
  scrollContainerRef,
  matchAnchorWidth = false,
}: FloatingDropdownProps) {
  const [position, setPosition] = React.useState<DropdownPosition | null>(null);
  const fallbackPortalRef = React.useRef<HTMLDivElement | null>(null);
  const resolvedPortalRef = portalRef ?? fallbackPortalRef;
  const measuredWidthRef = React.useRef<number>(DEFAULT_DROPDOWN_WIDTH);

  const updatePosition = React.useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) {
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const dropdownRect = resolvedPortalRef.current?.getBoundingClientRect();
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
    const safePadding = VIEWPORT_PADDING;
    const maxAvailableWidth =
      viewportWidth > 0 ? Math.max(viewportWidth - safePadding * 2, 0) : 0;
    const resolvedDropdownWidth =
      dropdownRect && dropdownRect.width > 0
        ? dropdownRect.width
        : measuredWidthRef.current;

    if (dropdownRect && dropdownRect.width > 0) {
      measuredWidthRef.current = dropdownRect.width;
    }

    const preferredWidth = matchAnchorWidth
      ? rect.width
      : resolvedDropdownWidth;
    const constrainedWidth =
      maxAvailableWidth > 0
        ? Math.min(preferredWidth, maxAvailableWidth)
        : preferredWidth;

    const resolveLeft = (): number => {
      if (align === 'right' && constrainedWidth) {
        return rect.right - constrainedWidth;
      }
      if (align === 'center' && constrainedWidth) {
        return rect.left + rect.width / 2 - constrainedWidth / 2;
      }
      if (align === 'center' && !constrainedWidth) {
        return rect.left;
      }
      if (align === 'right' && !constrainedWidth) {
        return rect.right - rect.width;
      }
      return rect.left;
    };

    let left = resolveLeft();

    if (viewportWidth > 0) {
      const maxLeft = Math.max(
        safePadding,
        viewportWidth - safePadding - constrainedWidth,
      );
      left = Math.min(Math.max(left, safePadding), maxLeft);
    }

    setPosition({
      top: rect.bottom + offset,
      left,
      width: rect.width,
      dropdownWidth: constrainedWidth,
      maxWidth: maxAvailableWidth || undefined,
      openAbove: false,
      isFinalized: false,
    });

    // Check if dropdown would overflow viewport bottom and flip to top if needed
    requestAnimationFrame(() => {
      const dropdownEl = resolvedPortalRef.current;
      if (!dropdownEl) return;

      const dropdownHeight = dropdownEl.offsetHeight;
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom - offset;
      const spaceAbove = rect.top - offset;

      // If not enough space below but enough above, flip to top
      if (dropdownHeight > spaceBelow && spaceAbove > spaceBelow) {
        setPosition({
          top: rect.top - dropdownHeight - offset,
          left,
          width: rect.width,
          dropdownWidth: constrainedWidth,
          maxWidth: maxAvailableWidth || undefined,
          openAbove: true,
          isFinalized: true,
        });
      } else {
        // Position is correct, just mark as finalized
        setPosition((prev) => (prev ? { ...prev, isFinalized: true } : null));
      }
    });
  }, [anchorRef, align, offset, matchAnchorWidth, resolvedPortalRef]);

  React.useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition]);

  React.useEffect(() => {
    updatePosition();

    // Regular resize always updates position
    const handleResize = () => updatePosition();

    // Scroll handlers
    const handleScroll = (event: Event) => {
      const portalElement = resolvedPortalRef.current;
      const targetNode =
        event?.target instanceof Node ? (event.target as Node) : null;
      const isScrollInsideDropdown =
        !!portalElement && !!targetNode && portalElement.contains(targetNode);

      if (isScrollInsideDropdown) {
        return;
      }

      if (onClose) {
        onClose();
      } else {
        updatePosition();
      }
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    const scrollElement = scrollContainerRef?.current ?? null;
    scrollElement?.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      scrollElement?.removeEventListener('scroll', handleScroll);
    };
  }, [updatePosition, scrollContainerRef, onClose, resolvedPortalRef]);

  React.useEffect(() => {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const element = resolvedPortalRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(() => updatePosition());
    observer.observe(element);
    return () => observer.disconnect();
  }, [resolvedPortalRef, updatePosition]);

  if (typeof document === 'undefined' || !position) {
    return null;
  }

  return createPortal(
    <div
      ref={resolvedPortalRef}
      className={`fixed z-40 transition-opacity duration-75 ${position.isFinalized ? 'opacity-100' : 'opacity-0'} ${className ?? ''}`.trim()}
      style={{
        top: position.top,
        left: position.left,
        minWidth: matchAnchorWidth ? position.width : undefined,
        width: matchAnchorWidth ? undefined : position.dropdownWidth,
        maxWidth: position.maxWidth,
        visibility: position.isFinalized ? 'visible' : 'hidden',
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
