// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import PhotoCard from '@/components/nameGame/PhotoCard';
import { KpLockup } from '@/components/KpLockup';
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

/** One flip card: face-down Klassenplan branding, face-up photo or name. */
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
      ? 'border-(--button-success-bg) opacity-70'
      : 'border-(--border-option-selected)'
    : 'border-(--border-card) bg-(--surface-option-selected) hover:border-(--border-option-selected)';

  return (
    <button
      type="button"
      onClick={() => onFlip(card.key)}
      disabled={disabled || matched || faceUp}
      aria-label={label}
      aria-pressed={faceUp}
      className={`aspect-square cursor-pointer overflow-hidden rounded-xl border-2 bg-(--surface-card) transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) motion-reduce:transition-none disabled:cursor-not-allowed ${surface}`}
    >
      {faceUp ? (
        card.face === 'photo' ? (
          <PhotoCard student={student} photoUrl={photoUrl} alt="" />
        ) : (
          <span className="flex h-full w-full items-center justify-center px-1 text-center text-sm font-semibold leading-tight text-(--text-page) sm:text-base">
            {student.name}
          </span>
        )
      ) : (
        <span
          className="flex h-full w-full flex-col items-center justify-center gap-1 opacity-50"
          aria-hidden
        >
          <KpLockup size="xs" />
        </span>
      )}
    </button>
  );
}
