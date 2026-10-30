// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ToolPage, { ToolEmptyState } from '@/components/tools/ToolPage';
import { useSeatingPlanState } from '@/contexts/SeatingPlanContext';
import { useStudentPhotoUrls } from '@/hooks/student/useStudentPhoto';
import ModeSelect from '@/components/nameGame/ModeSelect';
import QuizGame from '@/components/nameGame/quiz/QuizGame';
import MemoryGame from '@/components/nameGame/memory/MemoryGame';
import {
  loadNameGameData,
  recordMemoryResult,
  recordQuizAnswers,
  type QuizAnswerResult,
} from '@/repositories/nameGameStatsStore';
import { logError, NAME_GAME_MIN_PHOTOS } from '@/utils';
import type { NameGameData, NameGameStudentStat } from '@/types';

/** A name counts as "known" after a couple of mostly-correct answers. */
function isKnown(stat: NameGameStudentStat | undefined): boolean {
  return !!stat && stat.asked >= 2 && stat.correct / stat.asked >= 0.75;
}

type GameScreen = 'menu' | 'quiz' | 'memory';

export default function NameGame() {
  const { t } = useTranslation('pages');

  const { students, activeClass } = useSeatingPlanState();
  const photoUrls = useStudentPhotoUrls(students);

  const playable = useMemo(
    () =>
      students.filter(
        (student) =>
          student.hasPhoto &&
          student.name.trim().length > 0 &&
          photoUrls.has(student.id),
      ),
    [students, photoUrls],
  );

  const [screen, setScreen] = useState<GameScreen>('menu');
  const [gameData, setGameData] = useState<NameGameData | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadNameGameData()
      .then((data) => {
        if (!cancelled) setGameData(data);
      })
      .catch((error) => {
        logError('Failed to load name game data', { error }, 'NameGame');
        if (!cancelled) {
          setGameData({ version: 1, stats: {}, memoryBest: {} });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Merge a finished quiz round into local state and persist it. */
  const handleQuizRoundComplete = useCallback((results: QuizAnswerResult[]) => {
    if (results.length === 0) return;
    const now = new Date().toISOString();
    setGameData((previous) => {
      if (!previous) return previous;
      const stats = { ...previous.stats };
      for (const { studentId, correct } of results) {
        const stat = stats[studentId] ?? { asked: 0, correct: 0 };
        stats[studentId] = {
          asked: stat.asked + 1,
          correct: stat.correct + (correct ? 1 : 0),
          lastAskedAt: now,
        };
      }
      return { ...previous, stats };
    });
    void recordQuizAnswers(results);
  }, []);

  /** Persist a finished memory round and report the (possibly new) best. */
  const handleMemoryRoundFinished = useCallback(
    async (pairs: number, moves: number, timeMs: number) => {
      const best = await recordMemoryResult(pairs, moves, timeMs);
      setGameData((previous) =>
        previous
          ? {
              ...previous,
              memoryBest: { ...previous.memoryBest, [pairs]: best },
            }
          : previous,
      );
      const isNewBest = best.moves === moves && best.timeMs === timeMs;
      return { best, isNewBest };
    },
    [],
  );

  const knownCount = playable.filter((student) =>
    isKnown(gameData?.stats[student.id]),
  ).length;

  // Photos load asynchronously; hold the skeleton until the first URLs arrive.
  const photosPending =
    students.some((student) => student.hasPhoto) && photoUrls.size === 0;
  const loading = gameData === null || photosPending;
  const hasEnoughPhotos = playable.length >= NAME_GAME_MIN_PHOTOS;

  return (
    <ToolPage
      route="/namensspiel"
      title={t('nameGame.title')}
      subtitle={activeClass.name}
      faqSection="klassenliste"
      help={
        <ul className="list-disc space-y-1 pl-4">
          <li>{t('nameGame.help.item1')}</li>
          <li>{t('nameGame.help.item2')}</li>
          <li>{t('nameGame.help.item3')}</li>
          <li>{t('nameGame.help.item4')}</li>
          <li>{t('nameGame.help.item5')}</li>
        </ul>
      }
      // Inside a game the arrow returns to the choice of game first; only
      // the choice leaves the page (Alt/⌥+← always does).
      onBack={screen === 'menu' ? undefined : () => setScreen('menu')}
      backTitle={screen === 'menu' ? undefined : t('nameGame.backToMenuTitle')}
    >
      {loading ? (
        <div className="flex h-full items-center justify-center text-sm text-(--text-muted)">
          <p>{t('nameGame.loading')}</p>
        </div>
      ) : !hasEnoughPhotos ? (
        // Photos are added in the class list; the game opens from every
        // layer, so the workspace is told where to land.
        <ToolEmptyState
          title={t('nameGame.empty.title')}
          body={`${t('nameGame.empty.description', {
            min: NAME_GAME_MIN_PHOTOS,
            count: playable.length,
          })} ${t('nameGame.empty.hint')}`}
          actionLabel={t('generator:tools.toClass')}
          step={1}
        />
      ) : screen === 'menu' ? (
        <ModeSelect
          playableCount={playable.length}
          knownCount={knownCount}
          onSelectQuiz={() => setScreen('quiz')}
          onSelectMemory={() => setScreen('memory')}
        />
      ) : screen === 'quiz' ? (
        <QuizGame
          students={playable}
          photoUrls={photoUrls}
          stats={gameData?.stats ?? {}}
          onRoundComplete={handleQuizRoundComplete}
          onExitToMenu={() => setScreen('menu')}
        />
      ) : (
        <MemoryGame
          students={playable}
          photoUrls={photoUrls}
          onRoundFinished={handleMemoryRoundFinished}
          onExitToMenu={() => setScreen('menu')}
        />
      )}
    </ToolPage>
  );
}
