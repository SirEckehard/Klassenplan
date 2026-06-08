import React from 'react';
import { useTranslation } from 'react-i18next';
import { QuestionIcon } from '@phosphor-icons/react';
import {
  cardSurfaceClass,
  pillTabActiveClass,
  pillTabBaseClass,
  pillTabInactiveClass,
  secondaryButtonClass,
  shortcutContextLabels,
  shortcutMap,
  type ShortcutContext,
} from '@/utils';
import Modal from '../modals/Modal';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

type TabId = 'instructions' | 'shortcuts';

type Props = {
  title: string;
  instructions?: React.ReactNode;
  shortcutContexts?: ShortcutContext[];
};

export default function HelpButton({
  title,
  instructions,
  shortcutContexts,
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
    `${secondaryButtonClass} gap-2`,
    'focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900',
    'disabled:border-blue-100 disabled:text-gray-400 disabled:opacity-60 dark:disabled:border-blue-900/40 dark:disabled:text-gray-500',
    triggerDisabled
      ? 'cursor-not-allowed border-gray-200 text-gray-400 dark:border-gray-800 dark:text-gray-600'
      : 'border-blue-200 bg-white text-blue-600 hover:bg-blue-50 dark:border-blue-900/50 dark:bg-gray-950/60 dark:text-blue-300',
  ].join(' ');

  const tabContainerClass =
    'flex gap-2 rounded-full border border-blue-200 bg-white/80 p-1 shadow-inner dark:border-blue-900/50 dark:bg-gray-950/60';
  const tabButtonBaseClass = pillTabBaseClass;
  const tabButtonActiveClass = pillTabActiveClass;
  const tabButtonInactiveClass = pillTabInactiveClass;
  const cardBaseClass = `${cardSurfaceClass} border px-4 py-4 text-sm text-gray-700 dark:text-gray-200`;
  const shortcutSectionClass = `${cardSurfaceClass} border px-4 py-4 text-sm text-gray-700 dark:text-gray-200`;
  const shortcutListClass =
    'mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-300';
  const kbdClass =
    'rounded-lg bg-blue-100/70 px-3 py-1 font-mono text-xs font-semibold text-blue-700 dark:bg-blue-900/40 dark:text-blue-200';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName}
        disabled={triggerDisabled}
        title={t('help.title', 'Hilfe')}
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
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
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
                <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
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
      </Modal>
    </>
  );
}
