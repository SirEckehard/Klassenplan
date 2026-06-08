import React from 'react';
import { useTranslation } from 'react-i18next';
import { InfoIcon, UsersIcon, ChairIcon } from '@phosphor-icons/react';
import { mutedIconButtonClass } from '@/utils';

type LayoutEditorStatusBadgeProps = {
  studentsCount: number;
  seatCount: number;
};

const LayoutEditorStatusBadge = React.memo(function LayoutEditorStatusBadge({
  studentsCount,
  seatCount,
}: LayoutEditorStatusBadgeProps) {
  const { t } = useTranslation('generator');
  const hasEnoughSeats = seatCount >= studentsCount;
  const [isInfoOpen, setIsInfoOpen] = React.useState(false);
  const badgeRef = React.useRef<HTMLDivElement | null>(null);

  const statusAccentClass = hasEnoughSeats
    ? '!text-green-500 dark:text-green-700'
    : '!text-red-500 dark:text-red-700';

  const buttonClassName = React.useMemo(() => {
    const toneClass = hasEnoughSeats
      ? 'text-green-500 hover:bg-green-600/10 focus-visible:ring-green-300 dark:text-green-400 dark:hover:bg-green-500/20'
      : 'text-red-500 hover:bg-red-600/10 focus-visible:ring-red-300 dark:text-red-400 dark:hover:bg-red-600/20';
    const sizeClass = isInfoOpen
      ? 'gap-3 px-4 py-2 min-h-12'
      : 'h-12 w-12 justify-center';
    return `${mutedIconButtonClass} group relative flex items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 cursor-default ${toneClass} ${sizeClass}`;
  }, [hasEnoughSeats, isInfoOpen]);

  const metricsClass = React.useMemo(
    () =>
      `flex items-center gap-3 text-sm font-medium transition-all duration-150 ease-out overflow-hidden ${statusAccentClass} ${
        isInfoOpen ? 'max-w-[180px] opacity-100 ml-2' : 'max-w-0 opacity-0 ml-0'
      }`,
    [isInfoOpen, statusAccentClass],
  );

  const handlePointerDown = React.useCallback((event: React.PointerEvent) => {
    if (event.pointerType !== 'touch') {
      return;
    }
    setIsInfoOpen((previous) => !previous);
  }, []);

  const handlePointerEnter = React.useCallback((event: React.PointerEvent) => {
    if (event.pointerType === 'touch') {
      return;
    }
    setIsInfoOpen(true);
  }, []);

  const handlePointerLeave = React.useCallback((event: React.PointerEvent) => {
    if (event.pointerType === 'touch') {
      return;
    }
    setIsInfoOpen(false);
  }, []);

  const handleFocus = React.useCallback(() => {
    setIsInfoOpen(true);
  }, []);

  const handleBlur = React.useCallback(() => {
    setIsInfoOpen(false);
  }, []);

  React.useEffect(() => {
    if (!isInfoOpen) {
      return;
    }

    const handleGlobalPointerDown = (event: PointerEvent) => {
      if (
        badgeRef.current &&
        event.target instanceof Node &&
        badgeRef.current.contains(event.target)
      ) {
        return;
      }
      setIsInfoOpen(false);
    };

    window.addEventListener('pointerdown', handleGlobalPointerDown);
    return () =>
      window.removeEventListener('pointerdown', handleGlobalPointerDown);
  }, [isInfoOpen]);

  return (
    <div
      ref={badgeRef}
      tabIndex={0}
      role="status"
      aria-label={t(
        'layout.statusBadge',
        '{{students}} Schüler, {{seats}} Plätze.',
        { students: studentsCount, seats: seatCount },
      )}
      aria-expanded={isInfoOpen}
      className={buttonClassName}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <InfoIcon size={18} aria-hidden="true" />
      <div className={metricsClass}>
        <span className="flex items-center gap-1.5">
          <UsersIcon className="h-4 w-4" aria-hidden="true" />
          {studentsCount}
        </span>
        <span className="h-1 w-1 rounded-full bg-gray-400 opacity-60 dark:bg-gray-600" />
        <span className="flex items-center gap-1.5">
          <ChairIcon className="h-4 w-4" aria-hidden="true" />
          {seatCount}
        </span>
      </div>
    </div>
  );
});

export type { LayoutEditorStatusBadgeProps };
export default LayoutEditorStatusBadge;
