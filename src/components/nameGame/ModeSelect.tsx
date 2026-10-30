// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { CardsIcon, ImagesIcon } from '@phosphor-icons/react';

type ModeSelectProps = {
  playableCount: number;
  /** Students whose name the teacher already answers reliably. */
  knownCount: number;
  onSelectQuiz: () => void;
  onSelectMemory: () => void;
};

/** Landing screen of the name game: pick between quiz and memory. */
export default function ModeSelect({
  playableCount,
  knownCount,
  onSelectQuiz,
  onSelectMemory,
}: ModeSelectProps) {
  const { t } = useTranslation('pages');

  const modeButtonClass =
    'flex h-full w-full cursor-pointer items-start gap-3 rounded-lg border border-(--border-card) bg-(--surface-card) p-4 text-left transition hover:border-(--border-option-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) motion-reduce:transition-none';

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center gap-4">
      <div className="flex flex-col items-center gap-1 rounded-xl border border-(--border-card) bg-(--surface-card) px-4 py-6 text-center">
        <p className="text-sm text-(--text-muted)">
          {t('nameGame.menu.subtitle')}
        </p>
        <p className="text-xl font-bold text-(--text-page)">
          {t('nameGame.menu.progress', {
            known: knownCount,
            total: playableCount,
          })}
        </p>
        <p className="text-xs text-(--text-muted)">
          {t('nameGame.menu.studentsWithPhoto', {
            count: playableCount,
          })}
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        <li>
          <button
            type="button"
            onClick={onSelectQuiz}
            className={modeButtonClass}
          >
            <ImagesIcon
              size={28}
              aria-hidden
              className="shrink-0 text-(--text-badge)"
            />
            <span className="flex flex-col gap-1">
              <span className="text-base font-semibold text-(--text-page)">
                {t('nameGame.menu.quizTitle')}
              </span>
              <span className="text-sm text-(--text-muted)">
                {t('nameGame.menu.quizDescription')}
              </span>
            </span>
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={onSelectMemory}
            className={modeButtonClass}
          >
            <CardsIcon
              size={28}
              aria-hidden
              className="shrink-0 text-(--text-badge)"
            />
            <span className="flex flex-col gap-1">
              <span className="text-base font-semibold text-(--text-page)">
                {t('nameGame.menu.memoryTitle')}
              </span>
              <span className="text-sm text-(--text-muted)">
                {t('nameGame.menu.memoryDescription')}
              </span>
            </span>
          </button>
        </li>
      </ul>
    </div>
  );
}
