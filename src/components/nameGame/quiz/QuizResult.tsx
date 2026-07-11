// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import {
  ArrowCounterClockwiseIcon,
  CheckIcon,
  ListIcon,
  XIcon,
} from '@phosphor-icons/react';
import PhotoCard from '@/components/nameGame/PhotoCard';
import {
  cardSurfaceClass,
  neutralButtonClass,
  primaryButtonClass,
} from '@/utils';
import type { QuizAnswerResult } from '@/repositories/nameGameStatsStore';
import type { Student } from '@/types';

type QuizResultProps = {
  answers: ReadonlyArray<QuizAnswerResult>;
  studentsById: ReadonlyMap<string, Student>;
  photoUrls: ReadonlyMap<string, string>;
  onRestart: () => void;
  onExitToMenu: () => void;
};

/** End-of-round screen: score plus a per-student recap. */
export default function QuizResult({
  answers,
  studentsById,
  photoUrls,
  onRestart,
  onExitToMenu,
}: QuizResultProps) {
  const { t } = useTranslation('pages');
  const correctCount = answers.filter((answer) => answer.correct).length;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        {t('nameGame.quiz.result.title', 'Runde geschafft!')}
      </h2>
      <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
        {t('nameGame.quiz.result.score', {
          correct: correctCount,
          total: answers.length,
          defaultValue: '{{correct}} von {{total}} richtig',
        })}
      </p>

      <ul
        className={`${cardSurfaceClass} w-full max-w-md divide-y divide-gray-100 p-2 dark:divide-gray-800`}
      >
        {answers.map((answer) => {
          const student = studentsById.get(answer.studentId);
          if (!student) return null;
          return (
            <li
              key={answer.studentId}
              className="flex items-center gap-3 px-2 py-2"
            >
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                <PhotoCard
                  student={student}
                  photoUrl={photoUrls.get(student.id)}
                  alt=""
                />
              </div>
              <span className="flex-1 truncate font-medium text-gray-900 dark:text-white">
                {student.name}
              </span>
              {answer.correct ? (
                <CheckIcon
                  size={20}
                  aria-label={t('nameGame.quiz.result.knew', 'Richtig')}
                  className="text-green-600 dark:text-green-400"
                />
              ) : (
                <XIcon
                  size={20}
                  aria-label={t('nameGame.quiz.result.missed', 'Falsch')}
                  className="text-red-600 dark:text-red-400"
                />
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRestart}
          className={`${primaryButtonClass} h-10 gap-2 px-4`}
        >
          <ArrowCounterClockwiseIcon size={20} aria-hidden />
          <span className="text-sm font-semibold">
            {t('nameGame.quiz.result.again', 'Noch eine Runde')}
          </span>
        </button>
        <button
          type="button"
          onClick={onExitToMenu}
          className={`${neutralButtonClass} h-10 gap-2 px-4`}
        >
          <ListIcon size={20} aria-hidden />
          <span className="text-sm font-semibold">
            {t('nameGame.quiz.result.menu', 'Zurück zum Menü')}
          </span>
        </button>
      </div>
    </div>
  );
}
