// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import PhotoCard from '@/components/nameGame/PhotoCard';
import type { QuizQuestionSpec } from './quizEngine';
import type { Student } from '@/types';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'] as const;

type QuizQuestionProps = {
  question: QuizQuestionSpec;
  studentsById: ReadonlyMap<string, Student>;
  photoUrls: ReadonlyMap<string, string>;
  /** Option id the user picked, or null while the question is open. */
  picked: string | null;
  onPick: (optionId: string) => void;
};

/**
 * Feedback styling: after the first pick the correct option turns green, a
 * wrong pick turns red, the rest fade out. Buttons are disabled after picking.
 */
function optionStateClass(
  optionId: string,
  picked: string | null,
  targetId: string,
): string {
  if (picked === null) {
    return 'border-gray-200 bg-white hover:border-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-blue-400';
  }
  if (optionId === targetId) {
    return 'border-green-600 bg-green-50 ring-2 ring-green-600 dark:border-green-500 dark:bg-green-950 dark:ring-green-500';
  }
  if (optionId === picked) {
    return 'border-red-600 bg-red-50 ring-2 ring-red-600 dark:border-red-500 dark:bg-red-950 dark:ring-red-500';
  }
  return 'border-gray-200 bg-white opacity-50 dark:border-gray-700 dark:bg-gray-900';
}

/** One quiz question: photo→name (name buttons) or name→photo (photo grid). */
export default function QuizQuestion({
  question,
  studentsById,
  photoUrls,
  picked,
  onPick,
}: QuizQuestionProps) {
  const { t } = useTranslation('pages');
  const target = studentsById.get(question.targetId);
  if (!target) return null;

  if (question.type === 'photoToName') {
    return (
      <div className="flex w-full max-w-lg flex-col items-center gap-6">
        <div className="h-48 w-48 overflow-hidden rounded-2xl shadow-lg sm:h-56 sm:w-56">
          <PhotoCard
            student={target}
            photoUrl={photoUrls.get(target.id)}
            alt={t('nameGame.quiz.photoAlt', 'Schülerfoto')}
          />
        </div>
        <p className="text-xl font-semibold text-gray-900 dark:text-white">
          {t('nameGame.quiz.photoToName', 'Wie heißt dieser Schüler?')}
        </p>
        <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          {question.optionIds.map((optionId) => {
            const option = studentsById.get(optionId);
            if (!option) return null;
            return (
              <button
                key={optionId}
                type="button"
                disabled={picked !== null}
                onClick={() => onPick(optionId)}
                className={`cursor-pointer rounded-xl border-2 px-4 py-3 text-lg font-semibold text-gray-900 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 motion-reduce:transition-none disabled:cursor-not-allowed dark:text-white ${optionStateClass(optionId, picked, question.targetId)}`}
              >
                {option.name}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-6">
      <p className="text-center text-xl font-semibold text-gray-900 dark:text-white">
        {t('nameGame.quiz.nameToPhoto', {
          name: target.name,
          defaultValue: 'Welches Foto gehört zu {{name}}?',
        })}
      </p>
      <div className="grid w-full grid-cols-2 gap-3">
        {question.optionIds.map((optionId, index) => {
          const option = studentsById.get(optionId);
          if (!option) return null;
          return (
            <button
              key={optionId}
              type="button"
              disabled={picked !== null}
              onClick={() => onPick(optionId)}
              // The label must not reveal the student's name before answering.
              aria-label={t('nameGame.quiz.photoOption', {
                letter: OPTION_LETTERS[index] ?? String(index + 1),
                defaultValue: 'Foto {{letter}}',
              })}
              className={`aspect-square cursor-pointer overflow-hidden rounded-xl border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 motion-reduce:transition-none disabled:cursor-not-allowed ${optionStateClass(optionId, picked, question.targetId)}`}
            >
              <PhotoCard
                student={option}
                photoUrl={photoUrls.get(optionId)}
                alt=""
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
