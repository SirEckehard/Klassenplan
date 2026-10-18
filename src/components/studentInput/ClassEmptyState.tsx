// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon,
  SparkleIcon,
  SpinnerGapIcon,
  UploadSimpleIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';
import { useClassDialogs } from '@/contexts/ClassDialogsContext';
import { useClassManagementContext } from '@/contexts/seatingPlan/ClassManagementContext';
import {
  cardSurfaceClass,
  checkName,
  inputFieldClass,
  logError,
  MAX_NAME_LENGTH,
  primaryButtonClass,
} from '@/utils';

type Props = {
  onImportBackup?: () => void;
  /** Creates the sample class, or switches to it once it exists. */
  onLoadDemoClass?: () => void;
  isDemoClassLoading?: boolean;
  hasDemoClass?: boolean;
};

/**
 * The very first screen: no class exists yet, so the list has nothing to show
 * and the toolbar beside it offers only what needs no class — the entries
 * that fill one are greyed out until there is one.
 *
 * It states the two steps ahead and offers the three ways in — a class of
 * one's own first, named right on the card, then the sample class and a
 * backup. The class switcher in
 * the header offers the same "new class", but a beginner should not have to
 * find a dropdown to start.
 */
export default function ClassEmptyState({
  onImportBackup,
  onLoadDemoClass,
  isDemoClassLoading = false,
  hasDemoClass = false,
}: Props) {
  const { t } = useTranslation('generator');
  const { create, isBusy } = useClassDialogs();
  const { classSummaries } = useClassManagementContext();
  const [name, setName] = React.useState('');
  const fieldId = React.useId();
  const errorId = React.useId();
  const problem = checkName(
    name,
    classSummaries.map((entry) => entry.name),
    MAX_NAME_LENGTH,
  );
  const taken = problem === 'taken';

  // The class is named here and made at once; its school year and notes
  // wait in its inspector, where the class layer shows the class.
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (problem || isBusy) return;
    create(name.trim()).catch((error: unknown) => {
      logError('Failed to create a class', { error }, 'ClassEmptyState');
    });
  };

  return (
    <div
      // Centred on the stage it stands on: a card as wide as the stage is not
      // a card any more.
      className={`${cardSurfaceClass} w-full max-w-3xl border border-(--border-card) p-6`}
      data-tour={TOUR_ANCHORS.classEmptyState}
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-(--border-card) bg-(--surface-sunken) text-(--text-badge)">
            <SparkleIcon className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-3 text-sm leading-relaxed">
            <h3 className="text-lg font-semibold">
              {t('classActions.emptyState.title')}
            </h3>
            <p className="text-(--text-muted)">
              {t('classActions.emptyState.description')}
            </p>
            <ol className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--surface-option-selected) text-xs font-semibold text-(--text-badge)">
                  1
                </span>
                <span>{t('classActions.emptyState.step1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-(--surface-option-selected) text-xs font-semibold text-(--text-badge)">
                  2
                </span>
                <span>{t('classActions.emptyState.step2')}</span>
              </li>
            </ol>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 rounded-xl bg-(--surface-sunken) p-4 text-sm sm:w-auto">
          <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
            <label
              htmlFor={fieldId}
              className="text-xs font-medium text-(--text-muted)"
            >
              {t('classPanel.newName')}
            </label>
            <input
              id={fieldId}
              type="text"
              value={name}
              maxLength={MAX_NAME_LENGTH}
              onChange={(event) => setName(event.target.value)}
              placeholder={t('classPanel.namePlaceholder')}
              aria-invalid={taken || undefined}
              aria-describedby={taken ? errorId : undefined}
              className={inputFieldClass}
            />
            {taken && (
              <p id={errorId} className="text-xs text-(--status-alert-text)">
                {t('classPanel.nameTaken')}
              </p>
            )}
            <button
              type="submit"
              disabled={problem !== null || isBusy}
              aria-busy={isBusy || undefined}
              className={`${primaryButtonClass} justify-center gap-2`}
            >
              <PlusIcon className="h-4 w-4" aria-hidden="true" />
              {t('classActions.emptyState.createButton')}
            </button>
          </form>
          <p className="text-center text-xs text-(--text-muted)">
            {t('classActions.emptyState.hint')}
          </p>
          {/* Below the real start on purpose: the sample class is for looking
              around, a class of one's own stays the main path. */}
          {onLoadDemoClass && (
            <>
              <div className="my-1 h-px bg-(--border-card)" />
              <button
                type="button"
                onClick={onLoadDemoClass}
                disabled={isDemoClassLoading}
                aria-busy={isDemoClassLoading || undefined}
                className={`${optionClass} disabled:cursor-wait disabled:opacity-70`}
              >
                {isDemoClassLoading ? (
                  <SpinnerGapIcon
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <UsersThreeIcon className="h-4 w-4" aria-hidden="true" />
                )}
                {isDemoClassLoading
                  ? t('demoClass.loading')
                  : hasDemoClass
                    ? t('demoClass.switchButton')
                    : t('demoClass.button')}
              </button>
              <p className="text-center text-xs text-(--text-muted)">
                {t('demoClass.hint')}
              </p>
            </>
          )}
          {onImportBackup && (
            <>
              <div className="my-1 h-px bg-(--border-card)" />
              <button
                type="button"
                onClick={onImportBackup}
                className={optionClass}
              >
                <UploadSimpleIcon className="h-4 w-4" aria-hidden="true" />
                {t('classActions.emptyState.importButton')}
              </button>
              <p className="text-center text-xs text-(--text-muted)">
                {t('classActions.emptyState.importHint')}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** The secondary ways in: sample class and backup import. */
const optionClass =
  'flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-(--border-card) bg-(--surface-card) px-4 py-2.5 text-sm font-medium transition hover:bg-(--surface-sunken) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)';
