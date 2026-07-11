// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { QuestionIcon } from '@phosphor-icons/react';
import PhotoCard from '@/components/nameGame/PhotoCard';
import type { MemoryCard as MemoryCardSpec } from './memoryEngine';
import type { Student } from '@/types';

type MemoryCardProps = {
  card: MemoryCardSpec;
  student: Student;
  photoUrl: string | undefined;
  /** 1-based board position, used for the face-down accessible label. */
  position: number;
  faceUp: boolean;
  matched: boolean;
  disabled: boolean;
  onFlip: (cardKey: string) => void;
};

/** One flip card: face-down question mark, face-up photo or name. */
export default function MemoryCard({
  card,
  student,
  photoUrl,
  position,
  faceUp,
  matched,
  disabled,
  onFlip,
}: MemoryCardProps) {
  const { t } = useTranslation('pages');

  // Once revealed the identity is no longer a secret; face-down cards must
  // not leak anything.
  const label = faceUp
    ? card.face === 'photo'
      ? t('nameGame.memory.photoOf', {
          name: student.name,
          defaultValue: 'Foto von {{name}}',
        })
      : student.name
    : t('nameGame.memory.hiddenCard', {
        number: position,
        defaultValue: 'Verdeckte Karte {{number}}',
      });

  const surface = faceUp
    ? matched
      ? 'border-green-600 opacity-70 dark:border-green-500'
      : 'border-blue-500 dark:border-blue-400'
    : 'border-gray-200 bg-blue-50 hover:border-blue-400 dark:border-gray-700 dark:bg-blue-950 dark:hover:border-blue-500';

  return (
    <button
      type="button"
      onClick={() => onFlip(card.key)}
      disabled={disabled || matched || faceUp}
      aria-label={label}
      aria-pressed={faceUp}
      className={`aspect-square overflow-hidden rounded-xl border-2 bg-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 motion-reduce:transition-none dark:bg-gray-900 ${surface}`}
    >
      {faceUp ? (
        card.face === 'photo' ? (
          <PhotoCard student={student} photoUrl={photoUrl} alt="" />
        ) : (
          <span className="flex h-full w-full items-center justify-center px-1 text-center text-sm font-semibold leading-tight text-gray-900 sm:text-base dark:text-white">
            {student.name}
          </span>
        )
      ) : (
        <span className="flex h-full w-full items-center justify-center">
          <QuestionIcon
            size={32}
            aria-hidden
            className="text-blue-400 dark:text-blue-500"
          />
        </span>
      )}
    </button>
  );
}
