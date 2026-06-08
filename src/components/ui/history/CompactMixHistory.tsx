import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  EyeIcon,
  TrashIcon,
  Clock,
} from '@phosphor-icons/react';
import type { MixResult, ScalarMixSettingKey } from '@/types';
import ConfirmDialog from '@/components/ui/modals/ConfirmDialog';
import {
  cardSurfaceClass,
  dangerIconButtonClass,
  loadingIconButtonClass,
  SCALAR_MIX_SETTING_KEYS,
} from '@/utils';
import { CRITERIA_ICON_MAP } from '@/utils/ui/criteriaIcons';

interface CompactMixHistoryProps {
  mixHistory: MixResult[];
  onLoad: (result: MixResult) => void;
  onDelete: (id: number) => void;
}

interface MixItemProps {
  result: MixResult;
  onLoad: (result: MixResult) => void;
  onDelete: (id: number) => void;
}

const settingLabels: Record<ScalarMixSettingKey, string> = {
  avoidPreviousPairs: 'Wiederholung vermeiden',
  avoidRestlessTogether: 'Unruhe vermeiden',
  avoidConcentrationTogether: 'Ablenkbarkeit trennen',
  avoidConcentrationNearRestless: 'Keine Unruhe neben Ablenkbarkeit',
  avoidShyAlone: 'Schüchterne nicht alleine',
  preferGenderMix: 'Geschlechter mischen',
  considerWishPartners: 'Wunschpartner berücksichtigen',
  avoidConflictPartners: 'Distanzwünsche respektieren',
  peerTutoring: 'Gegenseitiges Fördern',
  homogeneousPerformanceGroups: 'Homogene Leistungsgruppen',
  preferFrontForNeedsFrontSeat: 'Vordere Plätze berücksichtigen',
  preferFrontForSmallerStudents: 'Körpergröße berücksichtigen',
  preferWindowSeats: 'Fensterplätze bevorzugen',
  preferDoorSeats: 'Türnähe berücksichtigen',
  preferLanguageMixing: 'Sprachpartner optimieren',
  distributeSocialRoles: 'Soziale Rollen verteilen',
};

function CompactMixItem({ result, onLoad, onDelete }: MixItemProps) {
  const { t } = useTranslation('generator');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const ts = new Date(result.timestamp);
  const timeString = ts.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const dateString = ts.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
  });

  // Get active settings (value > 0) excluding the combined constraint
  const activeSettings = SCALAR_MIX_SETTING_KEYS.filter(
    (key) => key !== 'avoidConcentrationNearRestless',
  )
    .map((key) => [key, result.mixSettings[key]] as const)
    .filter(([, value]) => value > 0);

  return (
    <>
      <div
        className={`${cardSurfaceClass} group relative flex h-full items-center gap-3 border border-blue-100/60 px-3 py-3 transition hover:border-blue-200 hover:bg-blue-50/70 dark:border-blue-900/40 dark:hover:border-blue-700 dark:hover:bg-blue-950/40`}
      >
        {/* Timeline dot */}
        <div className="absolute -left-2.25 h-4 w-4 rounded-full border-2 border-white bg-blue-500 dark:border-gray-900 md:hidden"></div>

        {/* Mix InfoIcon */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-gray-100">
              <Clock size={14} />
              {timeString}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {dateString}
            </span>
          </div>

          {/* Setting badges */}
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {activeSettings.map(([key, value]) => {
              const Icon = CRITERIA_ICON_MAP[key];
              const label = settingLabels[key];

              return (
                <span
                  key={key}
                  className="inline-flex items-center rounded-full border border-blue-100/70 bg-blue-50/70 p-1 text-xs dark:border-blue-900/40 dark:bg-blue-900/30"
                  title={`${label}: ${value}/10`}
                  aria-label={`${label}: ${value}/10`}
                >
                  <Icon
                    size={12}
                    className="text-gray-600 dark:text-gray-300"
                  />
                </span>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onLoad(result)}
            className={`${loadingIconButtonClass} h-9 w-9`}
            title={t('mixHistory.loadTitle', 'Mischergebnis laden')}
            aria-label={t('mixHistory.loadAriaLabel', {
              time: timeString,
              defaultValue: `Mischergebnis vom ${timeString} laden`,
            })}
          >
            <EyeIcon size={14} />
          </button>
          <button
            onClick={() => setConfirmOpen(true)}
            className={`${dangerIconButtonClass} h-9 w-9`}
            title={t('mixHistory.deleteTitle', 'Mischergebnis löschen')}
            aria-label={t('mixHistory.deleteAriaLabel', {
              time: timeString,
              defaultValue: `Mischergebnis vom ${timeString} löschen`,
            })}
          >
            <TrashIcon size={14} />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={t('mixHistory.deleteDialogTitle', 'Mischergebnis löschen')}
        message={t('mixHistory.deleteDialogMessage', {
          time: timeString,
          defaultValue: `Möchtest du das Mischergebnis vom ${timeString} wirklich löschen?`,
        })}
        confirmLabel={t('common.delete', 'Löschen')}
        cancelLabel={t('common.cancel', 'Abbrechen')}
        onConfirm={() => {
          onDelete(result.id);
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

/**
 * Compact timeline view for mix history in navigation menu
 */
export default function CompactMixHistory({
  mixHistory,
  onLoad,
  onDelete,
}: CompactMixHistoryProps) {
  const { t } = useTranslation('generator');

  if (mixHistory.length === 0) {
    return (
      <div
        className={`${cardSurfaceClass} border border-blue-100/60 p-4 text-center text-gray-500 dark:border-blue-900/40 dark:text-gray-400`}
      >
        <div className="text-sm">
          {t('mixHistory.emptyTitle', 'Noch keine Mischungen erstellt')}
        </div>
        <div className="text-xs mt-1">
          {t('mixHistory.emptyHint', 'Erstelle deinen ersten Sitzplan')}
        </div>
      </div>
    );
  }

  // Sort by timestamp (descending) - newer results first
  const sortedHistory = [...mixHistory].sort((a, b) =>
    b.timestamp.localeCompare(a.timestamp),
  );

  return (
    <div className="max-h-64 overflow-y-auto">
      <div className="relative p-2">
        {/* Timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-blue-100 dark:bg-blue-900/40 md:hidden" />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {sortedHistory.map((result) => (
            <CompactMixItem
              key={result.id}
              result={result}
              onLoad={onLoad}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
