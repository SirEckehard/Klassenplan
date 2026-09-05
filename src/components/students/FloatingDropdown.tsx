// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
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
  // Whether the dropdown has been on screen once. Guards the one-off
  // measure-then-show pass so later repositions cannot hide it again.
  const hasMeasuredRef = React.useRef(false);

  const updatePosition = React.useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) {
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const dropdownElement = resolvedPortalRef.current;
    const dropdownRect = dropdownElement?.getBoundingClientRect();
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

    const horizontal = {
      left,
      width: rect.width,
      dropdownWidth: constrainedWidth,
      maxWidth: maxAvailableWidth || undefined,
    };

    /** Below the anchor unless the dropdown would run past the viewport. */
    const placeVertically = (
      height: number,
    ): Pick<DropdownPosition, 'top' | 'openAbove'> => {
      const viewportHeight =
        typeof window !== 'undefined' ? window.innerHeight : 0;
      const spaceBelow = viewportHeight - rect.bottom - offset;
      const spaceAbove = rect.top - offset;
      if (height > spaceBelow && spaceAbove > spaceBelow) {
        return { top: rect.top - height - offset, openAbove: true };
      }
      return { top: rect.bottom + offset, openAbove: false };
    };

    // A dropdown that is already on screen never goes back through the
    // unfinalized state: that state blanks it for a frame, and a blanked
    // container drops the focus it holds. On a phone that is fatal — opening
    // the on-screen keyboard is itself what resizes the viewport (Android) or
    // scrolls the field into view (iOS), so the reposition it triggers would
    // blur the field and close the keyboard again the instant it appeared.
    // The height is measurable at this point, so the final placement is known
    // synchronously anyway.
    if (hasMeasuredRef.current) {
      setPosition({
        ...horizontal,
        ...placeVertically(dropdownElement?.offsetHeight ?? 0),
        isFinalized: true,
      });
      return;
    }

    // First pass: there is nothing to measure yet, so place the dropdown below
    // the anchor, keep it unpainted, and finalize once it has a height.
    setPosition({
      ...horizontal,
      top: rect.bottom + offset,
      openAbove: false,
      isFinalized: false,
    });

    requestAnimationFrame(() => {
      const element = resolvedPortalRef.current;
      if (!element) return;

      hasMeasuredRef.current = true;
      setPosition({
        ...horizontal,
        ...placeVertically(element.offsetHeight),
        isFinalized: true,
      });
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
      className={`fixed z-40 transition-opacity duration-75 ${position.isFinalized ? 'opacity-100' : 'pointer-events-none opacity-0'} ${className ?? ''}`.trim()}
      style={{
        top: position.top,
        left: position.left,
        minWidth: matchAnchorWidth ? position.width : undefined,
        width: matchAnchorWidth ? undefined : position.dropdownWidth,
        maxWidth: position.maxWidth,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
