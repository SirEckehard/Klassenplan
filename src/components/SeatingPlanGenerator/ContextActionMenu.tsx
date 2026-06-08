import React from 'react';
import type { Icon } from '@phosphor-icons/react';
import type { PointerKind, MenuTrigger } from '@/hooks/useContextMenus';
import {
  menuSurfaceClass,
  touchMenuSurfaceClass,
  mutedIconButtonClass,
} from '@/utils';

export type ContextAction = {
  label: string;
  icon: Icon;
  onSelect: () => void;
  disabled?: boolean;
};

type ContextActionMenuProps = {
  x: number;
  y: number;
  actions: ContextAction[];
  onCloseMenu: () => void;
  pointerType?: PointerKind;
  trigger?: MenuTrigger;
};

export default function ContextActionMenu({
  x,
  y,
  actions,
  onCloseMenu,
  pointerType,
  trigger,
}: ContextActionMenuProps) {
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = React.useState<{ left: number; top: number }>(
    { left: x, top: y },
  );

  const resolvedPointer: PointerKind = React.useMemo(() => {
    if (pointerType && pointerType !== 'unknown') {
      return pointerType;
    }
    if (trigger === 'longpress') {
      return 'touch';
    }
    if (trigger === 'keyboard') {
      return 'keyboard';
    }
    return pointerType ?? 'mouse';
  }, [pointerType, trigger]);

  const isTouchLike =
    resolvedPointer === 'touch' ||
    resolvedPointer === 'pen' ||
    trigger === 'longpress';
  const EDGE_MARGIN = 8;
  const TOUCH_GAP = 16;
  const DESKTOP_GAP = 12;

  React.useLayoutEffect(() => {
    const node = menuRef.current;
    if (!node) {
      return;
    }

    const parent = node.offsetParent as HTMLElement | null;
    const parentWidth = parent?.clientWidth ?? window.innerWidth;
    const parentHeight = parent?.clientHeight ?? window.innerHeight;
    const menuWidth = node.offsetWidth || 0;
    const menuHeight = node.offsetHeight || 0;

    const nextLeft = isTouchLike ? x - menuWidth / 2 : x + DESKTOP_GAP;
    const nextTop = isTouchLike ? y - menuHeight - TOUCH_GAP : y;

    const maxLeft =
      parentWidth > menuWidth
        ? parentWidth - menuWidth - EDGE_MARGIN
        : EDGE_MARGIN;
    const maxTop =
      parentHeight > menuHeight
        ? parentHeight - menuHeight - EDGE_MARGIN
        : EDGE_MARGIN;

    const clampedLeft = Math.min(
      Math.max(nextLeft, EDGE_MARGIN),
      Math.max(maxLeft, EDGE_MARGIN),
    );
    const clampedTop = Math.min(
      Math.max(nextTop, EDGE_MARGIN),
      Math.max(maxTop, EDGE_MARGIN),
    );

    setPosition((prev) => {
      if (
        Math.abs(prev.left - clampedLeft) < 0.5 &&
        Math.abs(prev.top - clampedTop) < 0.5
      ) {
        return prev;
      }
      return { left: clampedLeft, top: clampedTop };
    });
  }, [isTouchLike, x, y, actions.length]);

  const handleAction = React.useCallback(
    (action: ContextAction) => {
      if (action.disabled) return;
      action.onSelect();
      onCloseMenu();
    },
    [onCloseMenu],
  );

  if (actions.length === 0) {
    return null;
  }

  const menuContainerClass = isTouchLike
    ? `${touchMenuSurfaceClass} flex items-center gap-3`
    : `${menuSurfaceClass} flex min-w-[220px] flex-col gap-1`;

  const buttonClass = isTouchLike
    ? `${mutedIconButtonClass} flex h-auto min-w-[80px] flex-col items-center gap-1 rounded-2xl px-4 py-3 text-xs font-semibold text-gray-700 transition disabled:opacity-40 disabled:hover:bg-transparent dark:text-gray-100`
    : `${mutedIconButtonClass} flex w-full items-center justify-start gap-3 px-4 py-2 text-sm font-medium text-gray-700 transition disabled:opacity-40 disabled:hover:bg-transparent dark:text-gray-100`;

  return (
    <div
      ref={menuRef}
      className="absolute z-20"
      style={{ left: position.left, top: position.top }}
      data-context-action-menu
    >
      <div className={menuContainerClass}>
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              type="button"
              onClick={() => handleAction(action)}
              disabled={action.disabled}
              className={buttonClass}
              aria-label={isTouchLike ? action.label : undefined}
              title={action.label}
            >
              <Icon
                className={isTouchLike ? 'h-5 w-5' : 'h-4 w-4'}
                aria-hidden="true"
              />
              {isTouchLike ? (
                <span className="text-center">{action.label}</span>
              ) : (
                <span className="flex-1 text-left">{action.label}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
