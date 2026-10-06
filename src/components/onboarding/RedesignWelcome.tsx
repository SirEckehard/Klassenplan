// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import {
  ArrowRightIcon,
  DoorOpenIcon,
  FoldersIcon,
  LayoutIcon,
  SparkleIcon,
  type Icon,
} from '@phosphor-icons/react';
import Modal from '@/components/ui/modals/Modal';
import { LocalizedLink } from '@/components/LocalizedLink';
import { APP_RETURN_STATE } from '@/hooks/useReturnToApp';
import { useOnboardingTour } from '@/hooks/onboarding/onboardingTourStore';
import {
  CHANGELOG_ROUTE,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/utils';

/** The shell in miniature: where each part of every layer now sits. */
function ShellSketch() {
  const { t } = useTranslation('changelog');
  const cell =
    'flex items-center justify-center rounded-md border border-(--border-card) px-1 text-center text-[11px] leading-tight text-(--text-muted)';

  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-[1fr_2fr_1fr] grid-rows-[auto_4.5rem_auto] gap-1 rounded-lg bg-(--surface-sunken) p-2"
    >
      <div className={`${cell} col-span-3 bg-(--surface-card) py-1.5`}>
        {t('redesign.layout.header')}
      </div>
      <div className={`${cell} bg-(--surface-card)`}>
        {t('redesign.layout.toolbar')}
      </div>
      <div className={`${cell} border-dashed`}>
        {t('redesign.layout.stage')}
      </div>
      <div className={`${cell} bg-(--surface-card)`}>
        {t('redesign.layout.inspector')}
      </div>
      <div className={`${cell} col-span-3 bg-(--surface-card) py-1.5`}>
        {t('redesign.layout.statusBar')}
      </div>
    </div>
  );
}

function Point({
  icon: PointIcon,
  title,
  children,
}: {
  icon: Icon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-(--surface-sunken) text-(--text-page)">
        <PointIcon size={18} aria-hidden="true" />
      </span>
      <div className="min-w-0 space-y-2">
        <h3 className="text-sm font-semibold text-(--text-page)">{title}</h3>
        {children}
      </div>
    </section>
  );
}

/**
 * What changed in 3.0, once, for a teacher who knew the app before it.
 *
 * It takes the place of the post-update notice on that one update: the
 * notice lists a few changelog lines, while a rebuilt layout needs to say
 * where things went — the layers, the rooms, "Bibliothek". Closing it in any
 * way acknowledges the update. "Tour starten" makes every tour due again, so
 * the current layer's runs as soon as the dialog is gone and the others when
 * their layer or "Bibliothek" opens; Help starts them at any time.
 */
export default function RedesignWelcome({
  version,
  onDone,
}: {
  version: string;
  onDone: () => void;
}) {
  const { t } = useTranslation('changelog');
  const { restartTours } = useOnboardingTour();
  const body = 'text-sm leading-relaxed text-(--text-muted)';

  return (
    <Modal
      open
      onClose={onDone}
      title={t('redesign.title')}
      subtitle={t('redesign.subtitle', { version })}
      icon={<SparkleIcon size={24} aria-hidden="true" />}
      size="lg"
    >
      <div className="space-y-5">
        <Point icon={LayoutIcon} title={t('redesign.layout.title')}>
          <p className={body}>{t('redesign.layout.body')}</p>
          <ShellSketch />
        </Point>
        <Point icon={DoorOpenIcon} title={t('redesign.rooms.title')}>
          <p className={body}>{t('redesign.rooms.body')}</p>
        </Point>
        <Point icon={FoldersIcon} title={t('redesign.library.title')}>
          <p className={body}>{t('redesign.library.body')}</p>
        </Point>
      </div>

      <div className="space-y-3 border-t border-(--border-card) pt-4">
        <p className={body}>{t('redesign.tourHint')}</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <LocalizedLink
            to={CHANGELOG_ROUTE}
            state={APP_RETURN_STATE}
            onClick={onDone}
            className="inline-flex items-center gap-1 rounded text-sm font-medium text-(--text-muted) underline-offset-4 hover:text-(--text-page) hover:underline focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) focus-visible:outline-none"
          >
            {t('redesign.changelog')}
            <ArrowRightIcon className="h-4 w-4" aria-hidden="true" />
          </LocalizedLink>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onDone}
              className={secondaryButtonClass}
            >
              {t('redesign.later')}
            </button>
            <button
              type="button"
              onClick={() => {
                restartTours(null);
                onDone();
              }}
              className={primaryButtonClass}
            >
              {t('redesign.tour')}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
