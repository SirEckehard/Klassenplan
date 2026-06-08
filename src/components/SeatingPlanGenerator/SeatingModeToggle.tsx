import { useTranslation } from 'react-i18next';
import { GridNineIcon, CircleDashedIcon } from '@phosphor-icons/react';
import { primaryButtonClass, secondaryButtonClass } from '@/utils';

export type SeatingMode = 'table' | 'circle';

interface SeatingModeToggleProps {
  mode: SeatingMode;
  onModeChange: (mode: SeatingMode) => void;
  disabled?: boolean;
}

export default function SeatingModeToggle({
  mode,
  onModeChange,
  disabled = false,
}: SeatingModeToggleProps) {
  const { t } = useTranslation('generator');
  const tableActive = mode === 'table';
  const circleActive = mode === 'circle';
  const sharedButtonState = disabled ? 'cursor-not-allowed opacity-60' : '';
  const hoverLabelClass =
    'pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-gray-900/95 px-3 py-1 text-xs font-semibold text-white shadow-lg transition sm:group-hover:flex sm:group-focus-visible:flex dark:bg-gray-100 dark:text-gray-900';

  return (
    <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 p-1 shadow-inner dark:border-blue-900/40 dark:bg-gray-950/70">
      <button
        type="button"
        onClick={() => onModeChange('table')}
        disabled={disabled}
        className={`${
          tableActive ? primaryButtonClass : secondaryButtonClass
        } group relative h-9 gap-2 px-3 ${sharedButtonState}`}
        title={t('mode.tableView', 'Sitzplan-Ansicht')}
        aria-label={t('mode.tableView', 'Sitzplan-Ansicht')}
      >
        <GridNineIcon size={18} aria-hidden />
        <span className={hoverLabelClass}>{t('mode.table', 'Sitzplan')}</span>
      </button>
      <button
        type="button"
        onClick={() => onModeChange('circle')}
        disabled={disabled}
        className={`${
          circleActive ? primaryButtonClass : secondaryButtonClass
        } group relative h-9 gap-2 px-3 ${sharedButtonState}`}
        title={t('mode.circleView', 'Sitzkreis-Ansicht')}
        aria-label={t('mode.circleView', 'Sitzkreis-Ansicht')}
      >
        <CircleDashedIcon size={18} aria-hidden />
        <span className={hoverLabelClass}>{t('mode.circle', 'Sitzkreis')}</span>
      </button>
    </div>
  );
}
