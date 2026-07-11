// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowCounterClockwiseIcon,
  ArrowRightIcon,
  ListIcon,
  TrophyIcon,
} from '@phosphor-icons/react';
import {
  buildMemoryRounds,
  createMemoryState,
  flippedCardsMatch,
  memoryReducer,
} from './memoryEngine';
import MemoryCard from './MemoryCard';
import {
  cardSurfaceClass,
  neutralButtonClass,
  primaryButtonClass,
} from '@/utils';
import type { MemoryBestScore, Student } from '@/types';

const MATCH_RESOLVE_MS = 600;
const MISMATCH_RESOLVE_MS = 1100;
const REDUCED_MOTION_RESOLVE_MS = 400;

/** Format milliseconds as m:ss for the timer and score displays. */
function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

type MemoryRoundOutcome = {
  best: MemoryBestScore;
  isNewBest: boolean;
};

type MemoryGameProps = {
  students: Student[];
  photoUrls: ReadonlyMap<string, string>;
  /** Persists the finished round and returns the (possibly new) best score. */
  onRoundFinished: (
    pairs: number,
    moves: number,
    timeMs: number,
  ) => Promise<MemoryRoundOutcome>;
  onExitToMenu: () => void;
};

/** Memory mode: photo/name pairs, chunked into rounds for large classes. */
export default function MemoryGame({
  students,
  photoUrls,
  onRoundFinished,
  onExitToMenu,
}: MemoryGameProps) {
  const { t } = useTranslation('pages');

  const [rounds, setRounds] = useState(() => buildMemoryRounds(students));
  const [roundIndex, setRoundIndex] = useState(0);
  const roundStudents = rounds[roundIndex] ?? [];

  const [state, dispatch] = useReducer(
    memoryReducer,
    rounds[0] ?? [],
    createMemoryState,
  );
  const [elapsedMs, setElapsedMs] = useState(0);
  const [roundResult, setRoundResult] = useState<{
    outcome: MemoryRoundOutcome;
    timeMs: number;
  } | null>(null);

  const studentsById = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );

  // Resolve the two flipped cards after a short look; matches resolve faster.
  useEffect(() => {
    if (state.phase !== 'checking') return;
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const delay = reducedMotion
      ? REDUCED_MOTION_RESOLVE_MS
      : flippedCardsMatch(state)
        ? MATCH_RESOLVE_MS
        : MISMATCH_RESOLVE_MS;
    const timer = window.setTimeout(() => dispatch({ type: 'RESOLVE' }), delay);
    return () => window.clearTimeout(timer);
  }, [state]);

  // Coarse 1s timer while the round is running.
  useEffect(() => {
    if (state.phase === 'roundDone') return;
    const interval = window.setInterval(
      () => setElapsedMs(Date.now() - state.startedAt),
      1000,
    );
    return () => window.clearInterval(interval);
  }, [state.phase, state.startedAt]);

  // Persist the finished round once and fetch the best score to display.
  useEffect(() => {
    if (state.phase !== 'roundDone' || roundResult !== null) return;
    const timeMs = Date.now() - state.startedAt;
    onRoundFinished(roundStudents.length, state.moves, timeMs)
      .then((outcome) => setRoundResult({ outcome, timeMs }))
      .catch(() => {
        // Persistence errors are already logged in the store; keep the UI
        // usable with the round's own result.
        setRoundResult({
          outcome: {
            best: { moves: state.moves, timeMs, achievedAt: '' },
            isNewBest: false,
          },
          timeMs,
        });
      });
    // roundStudents.length is stable for a given round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.moves, state.startedAt, roundResult, onRoundFinished]);

  const startRound = useCallback((roundPool: readonly Student[]) => {
    setRoundResult(null);
    setElapsedMs(0);
    dispatch({ type: 'RESET', students: roundPool });
  }, []);

  const handleNextRound = () => {
    const next = roundIndex + 1;
    setRoundIndex(next);
    startRound(rounds[next] ?? []);
  };

  const handleRestart = () => {
    const reshuffled = buildMemoryRounds(students);
    setRounds(reshuffled);
    setRoundIndex(0);
    startRound(reshuffled[0] ?? []);
  };

  const hasNextRound = roundIndex < rounds.length - 1;
  const flippedSet = new Set(state.flipped);
  const gridCols =
    state.cards.length > 12
      ? 'grid-cols-4'
      : state.cards.length > 8
        ? 'grid-cols-3 sm:grid-cols-4'
        : 'grid-cols-3';

  return (
    <div className="flex h-full flex-col items-center gap-4 overflow-y-auto px-4 py-6">
      <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
        {rounds.length > 1 && (
          <span>
            {t('nameGame.memory.round', {
              current: roundIndex + 1,
              total: rounds.length,
              defaultValue: 'Runde {{current}} von {{total}}',
            })}
          </span>
        )}
        <span>
          {t('nameGame.memory.moves', {
            count: state.moves,
            defaultValue: 'Züge: {{count}}',
          })}
        </span>
        <span className="tabular-nums">
          {t('nameGame.memory.time', {
            time: formatDuration(roundResult?.timeMs ?? elapsedMs),
            defaultValue: 'Zeit: {{time}}',
          })}
        </span>
      </div>

      {state.phase === 'roundDone' ? (
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-5">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('nameGame.memory.roundDone', 'Runde geschafft!')}
          </h2>
          <div
            className={`${cardSurfaceClass} flex flex-col items-center gap-2 p-6 text-center`}
          >
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('nameGame.memory.result', {
                moves: state.moves,
                time: formatDuration(roundResult?.timeMs ?? elapsedMs),
                defaultValue: '{{moves}} Züge in {{time}}',
              })}
            </p>
            {roundResult?.outcome.isNewBest && (
              <p className="flex items-center gap-2 font-semibold text-orange-600 dark:text-orange-400">
                <TrophyIcon size={20} aria-hidden />
                {t('nameGame.memory.newBest', 'Neuer Bestwert!')}
              </p>
            )}
            {roundResult && !roundResult.outcome.isNewBest && (
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('nameGame.memory.best', {
                  moves: roundResult.outcome.best.moves,
                  time: formatDuration(roundResult.outcome.best.timeMs),
                  defaultValue: 'Bestwert: {{moves}} Züge · {{time}}',
                })}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {hasNextRound ? (
              <button
                type="button"
                onClick={handleNextRound}
                className={`${primaryButtonClass} h-10 gap-2 px-4`}
              >
                <ArrowRightIcon size={20} aria-hidden />
                <span className="text-sm font-semibold">
                  {t('nameGame.memory.nextRound', 'Nächste Runde')}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleRestart}
                className={`${primaryButtonClass} h-10 gap-2 px-4`}
              >
                <ArrowCounterClockwiseIcon size={20} aria-hidden />
                <span className="text-sm font-semibold">
                  {t('nameGame.memory.again', 'Nochmal spielen')}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={onExitToMenu}
              className={`${neutralButtonClass} h-10 gap-2 px-4`}
            >
              <ListIcon size={20} aria-hidden />
              <span className="text-sm font-semibold">
                {t('nameGame.memory.menu', 'Zurück zum Menü')}
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`grid w-full max-w-2xl flex-1 content-center gap-2 sm:gap-3 ${gridCols}`}
        >
          {state.cards.map((card, index) => {
            const student = studentsById.get(card.studentId);
            if (!student) return null;
            return (
              <MemoryCard
                key={card.key}
                card={card}
                student={student}
                photoUrl={photoUrls.get(card.studentId)}
                position={index + 1}
                faceUp={
                  flippedSet.has(card.key) ||
                  state.matchedIds.has(card.studentId)
                }
                matched={state.matchedIds.has(card.studentId)}
                disabled={state.phase !== 'playing'}
                onFlip={(cardKey) => dispatch({ type: 'FLIP', cardKey })}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
