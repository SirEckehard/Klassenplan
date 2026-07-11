// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { CardsIcon, ImagesIcon } from '@phosphor-icons/react';
import { cardSurfaceClass } from '@/utils';

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

  const modeCardClass = `${cardSurfaceClass} group flex w-full max-w-sm flex-col items-center gap-3 p-8 text-center transition hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 motion-reduce:transition-none motion-reduce:hover:translate-y-0`;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 overflow-y-auto px-4 py-8">
      <div className="text-center">
        <p className="text-lg text-gray-600 dark:text-gray-300">
          {t(
            'nameGame.menu.subtitle',
            'Lerne die Namen deiner Schüler – mit ihren Fotos.',
          )}
        </p>
        <p className="mt-2 text-sm font-semibold text-orange-600 dark:text-orange-400">
          {t('nameGame.menu.progress', {
            known: knownCount,
            total: playableCount,
            defaultValue: '{{known}} von {{total}} Namen sicher',
          })}
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:items-stretch">
        <button type="button" onClick={onSelectQuiz} className={modeCardClass}>
          <ImagesIcon
            size={48}
            aria-hidden
            className="text-blue-600 transition group-hover:scale-110 motion-reduce:transition-none dark:text-blue-400"
          />
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            {t('nameGame.menu.quizTitle', 'Foto-Quiz')}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {t(
              'nameGame.menu.quizDescription',
              'Sieh ein Foto und wähle den richtigen Namen – oder finde das passende Foto zum Namen.',
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={onSelectMemory}
          className={modeCardClass}
        >
          <CardsIcon
            size={48}
            aria-hidden
            className="text-blue-600 transition group-hover:scale-110 motion-reduce:transition-none dark:text-blue-400"
          />
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            {t('nameGame.menu.memoryTitle', 'Memory')}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {t(
              'nameGame.menu.memoryDescription',
              'Finde die Paare aus Foto und Name.',
            )}
          </span>
        </button>
      </div>

      <p className="text-sm text-gray-500 dark:text-gray-400">
        {t('nameGame.menu.studentsWithPhoto', {
          count: playableCount,
          defaultValue: '{{count}} Schüler mit Foto',
        })}
      </p>
    </div>
  );
}
