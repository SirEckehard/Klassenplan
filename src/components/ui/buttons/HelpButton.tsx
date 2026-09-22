// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpenIcon, PathIcon, QuestionIcon } from '@phosphor-icons/react';
import {
  cardSurfaceClass,
  pillTabActiveClass,
  pillTabBaseClass,
  pillTabInactiveClass,
  secondaryButtonClass,
  segmentedTrackClass,
  shortcutContextLabels,
  shortcutMap,
  type ShortcutContext,
} from '@/utils';
import Modal from '../modals/Modal';
import { LocalizedLink } from '@/components/LocalizedLink';
import { APP_RETURN_STATE } from '@/hooks/useReturnToApp';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';

type TabId = 'instructions' | 'shortcuts';

type Props = {
  title: string;
  instructions?: React.ReactNode;
  shortcutContexts?: ShortcutContext[];
  /** Offers "Tour starten" in the dialog; the dialog closes before the tour opens. */
  onStartTour?: () => void;
  /** The FAQ section this screen's questions are answered in (`/faq#…`). */
  faqSection?: string;
};

export default function HelpButton({
  title,
  instructions,
  shortcutContexts,
  onStartTour,
  faqSection,
}: Props) {
  const { t } = useTranslation(['common', 'generator']);
  const [open, setOpen] = React.useState(false);

  useKeyboardShortcuts({
    'shift+?': () => setOpen(true),
    '?': () => setOpen(true),
  });

  const hasInstructions = Boolean(instructions);
  const shortcutSections = React.useMemo(() => {
    if (!shortcutContexts?.length) return [];
    const unique = Array.from(
      new Set<ShortcutContext>(['global', ...shortcutContexts]),
    );
    return unique;
  }, [shortcutContexts]);
  const hasShortcuts = shortcutSections.length > 0;
  const defaultTab: TabId = hasInstructions
    ? 'instructions'
    : hasShortcuts
      ? 'shortcuts'
      : 'instructions';
  const [activeTab, setActiveTab] = React.useState<TabId>(defaultTab);

  /* eslint-disable react-hooks/set-state-in-effect -- intentional reset when dialog opens from external trigger */
  React.useEffect(() => {
    if (open) {
      setActiveTab(defaultTab);
    }
  }, [open, defaultTab]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const tabs = React.useMemo(() => {
    const items: { id: TabId; label: string }[] = [];
    if (hasInstructions) {
      items.push({
        id: 'instructions',
        label: t('help.instructions', 'Anleitung'),
      });
    }
    if (hasShortcuts) {
      items.push({
        id: 'shortcuts',
        label: t('help.shortcuts', 'Tastenkürzel'),
      });
    }
    return items;
  }, [hasInstructions, hasShortcuts, t]);

  const showTabs = tabs.length > 1;
  const triggerDisabled = !hasInstructions && !hasShortcuts;
  const triggerClassName = [
    `${secondaryButtonClass} h-9 w-9 justify-center p-0`,
    triggerDisabled ? 'cursor-not-allowed opacity-60' : '',
  ].join(' ');

  const tabContainerClass = `${segmentedTrackClass} flex gap-1 p-1`;
  const tabButtonBaseClass = pillTabBaseClass;
  const tabButtonActiveClass = pillTabActiveClass;
  const tabButtonInactiveClass = pillTabInactiveClass;
  const cardBaseClass = `${cardSurfaceClass} border px-4 py-4 text-sm text-(--text-page)`;
  const shortcutSectionClass = `${cardSurfaceClass} border px-4 py-4 text-sm text-(--text-page)`;
  const shortcutListClass = 'mt-3 space-y-2 text-sm text-(--text-muted)';
  const kbdClass =
    'rounded-md bg-(--surface-sunken) px-2 py-1 font-mono text-xs font-semibold text-(--text-page)';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName}
        disabled={triggerDisabled}
        title={t('help.title', 'Hilfe')}
        data-tour={TOUR_ANCHORS.help}
      >
        <QuestionIcon className="h-5 w-5" />
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        icon={<QuestionIcon size={24} aria-hidden="true" />}
        title={title}
        size="lg"
      >
        {showTabs ? (
          <div className="mt-2 flex flex-col gap-4">
            <div
              role="tablist"
              aria-label={t('help.title', 'Hilfe')}
              className={tabContainerClass}
            >
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  id={`help-tab-${tab.id}`}
                  aria-selected={activeTab === tab.id}
                  aria-controls={`help-panel-${tab.id}`}
                  className={[
                    tabButtonBaseClass,
                    activeTab === tab.id
                      ? tabButtonActiveClass
                      : tabButtonInactiveClass,
                  ].join(' ')}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {hasInstructions && (
              <div
                id="help-panel-instructions"
                role="tabpanel"
                aria-labelledby="help-tab-instructions"
                hidden={activeTab !== 'instructions'}
                className={cardBaseClass}
              >
                <div className="space-y-3">{instructions}</div>
              </div>
            )}
            {hasShortcuts && (
              <div
                id="help-panel-shortcuts"
                role="tabpanel"
                aria-labelledby="help-tab-shortcuts"
                hidden={activeTab !== 'shortcuts'}
                className="space-y-4"
              >
                <div className="space-y-4">
                  {shortcutSections.map((ctx) => (
                    <div key={ctx} className={shortcutSectionClass}>
                      <h4 className="text-sm font-semibold text-(--text-page)">
                        {t(`generator:${shortcutContextLabels[ctx]}`)}
                      </h4>
                      <ul className={shortcutListClass}>
                        {shortcutMap[ctx].map((shortcut) => (
                          <li
                            key={`${ctx}-${shortcut.keysKey}`}
                            className="flex items-center justify-between gap-4"
                          >
                            <span>
                              {t(`generator:${shortcut.descriptionKey}`)}
                            </span>
                            <kbd className={kbdClass}>
                              {t(`generator:${shortcut.keysKey}`)}
                            </kbd>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : hasInstructions ? (
          <div className={cardBaseClass}>
            <div className="space-y-3">{instructions}</div>
          </div>
        ) : hasShortcuts ? (
          <div className="mt-2 space-y-4">
            {shortcutSections.map((ctx) => (
              <div key={ctx} className={shortcutSectionClass}>
                <h4 className="text-sm font-semibold text-(--text-page)">
                  {t(`generator:${shortcutContextLabels[ctx]}`)}
                </h4>
                <ul className={shortcutListClass}>
                  {shortcutMap[ctx].map((shortcut) => (
                    <li
                      key={`${ctx}-${shortcut.keysKey}`}
                      className="flex items-center justify-between gap-4"
                    >
                      <span>{t(`generator:${shortcut.descriptionKey}`)}</span>
                      <kbd className={kbdClass}>
                        {t(`generator:${shortcut.keysKey}`)}
                      </kbd>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}
        {/* The way on from here: the tour of this screen where there is
            one, and the FAQ everywhere — opened at the section that answers
            this screen, with the way back to it. */}
        <div className="flex flex-col gap-3 border-t border-(--border-card) pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-(--text-muted)">
            {onStartTour ? t('help.moreWithTour') : t('help.more')}
          </p>
          <div className="flex shrink-0 flex-wrap gap-2">
            <LocalizedLink
              to={faqSection ? `/faq#${faqSection}` : '/faq'}
              state={APP_RETURN_STATE}
              className={`${secondaryButtonClass} gap-2`}
            >
              <BookOpenIcon size={18} aria-hidden="true" />
              {t('help.faq')}
            </LocalizedLink>
            {onStartTour && (
              <button
                type="button"
                onClick={() => {
                  // The tour waits for the dialog to close anyway; closing
                  // first keeps focus handling in the right order.
                  setOpen(false);
                  onStartTour();
                }}
                className={`${secondaryButtonClass} gap-2`}
              >
                <PathIcon size={18} aria-hidden="true" />
                {t('generator:tour.startButton')}
              </button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
