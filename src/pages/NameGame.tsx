// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon, CameraIcon } from '@phosphor-icons/react';
import Seo from '@/components/Seo';
import { KpLockup } from '@/components/KpLockup';
import { LocalizedLink } from '@/components/LocalizedLink';
import { usePageSeo } from '@/hooks/usePageSeo';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';
import { useSeatingPlanState } from '@/contexts/SeatingPlanContext';
import { useStudentPhotoUrls } from '@/hooks/student/useStudentPhoto';
import HelpButton from '@/components/ui/buttons/HelpButton';
import ModeSelect from '@/components/nameGame/ModeSelect';
import QuizGame from '@/components/nameGame/quiz/QuizGame';
import MemoryGame from '@/components/nameGame/memory/MemoryGame';
import {
  loadNameGameData,
  recordMemoryResult,
  recordQuizAnswers,
  type QuizAnswerResult,
} from '@/repositories/nameGameStatsStore';
import {
  cardSurfaceClass,
  logError,
  neutralButtonClass,
  primaryButtonClass,
  NAME_GAME_MIN_PHOTOS,
} from '@/utils';
import type { NameGameData, NameGameStudentStat } from '@/types';

/** A name counts as "known" after a couple of mostly-correct answers. */
function isKnown(stat: NameGameStudentStat | undefined): boolean {
  return !!stat && stat.asked >= 2 && stat.correct / stat.asked >= 0.75;
}

type GameScreen = 'menu' | 'quiz' | 'memory';

export default function NameGame() {
  const { t } = useTranslation('pages');
  const metadata = usePageSeo('/namensspiel');
  const navigate = useLocalizedNavigate();

  const { students } = useSeatingPlanState();
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

  // Same back shortcut as the export/present pages (Alt+←).
  useKeyboardShortcuts({
    'alt+arrowleft': () => navigate('/generator'),
  });

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
    <main
      id="main"
      tabIndex={-1}
      className="fixed inset-0 flex flex-col bg-gray-50 dark:bg-gray-950"
    >
      <Seo {...metadata} />

      {/* Minimal toolbar */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex flex-1 justify-start">
          <div className="flex items-center shrink-0">
            <LocalizedLink
              to="/"
              className="kp-lockup focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <KpLockup size="sm" hideWordmarkOnMobile />
            </LocalizedLink>
          </div>
        </div>

        <h1 className="text-lg font-bold text-gray-900 dark:text-white">
          {t('nameGame.title', 'Namensspiel')}
        </h1>

        <div className="flex flex-1 justify-end">
          <HelpButton
            title={t('nameGame.help.title', 'Namensspiel')}
            instructions={
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  {t(
                    'nameGame.help.item1',
                    'Es werden nur Schüler mit Foto verwendet.',
                  )}
                </li>
                <li>
                  {t(
                    'nameGame.help.item2',
                    'Foto-Quiz: Wähle den passenden Namen zum Foto oder umgekehrt. Unsichere Namen kommen häufiger dran.',
                  )}
                </li>
                <li>
                  {t(
                    'nameGame.help.item3',
                    'Memory: Decke Paare aus Foto und Name auf – große Klassen spielen in mehreren Runden.',
                  )}
                </li>
                <li>
                  {t(
                    'nameGame.help.item4',
                    'Dein Lernfortschritt wird nur lokal auf diesem Gerät gespeichert.',
                  )}
                </li>
                <li>
                  {t(
                    'nameGame.help.item5',
                    'Mit Alt + ← kehrst du zum Generator zurück.',
                  )}
                </li>
              </ul>
            }
          />
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center text-gray-600 dark:text-gray-300">
            <p className="text-lg font-medium">
              {t('nameGame.loading', 'Fotos werden geladen…')}
            </p>
          </div>
        ) : !hasEnoughPhotos ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-4">
            <div
              className={`${cardSurfaceClass} flex max-w-md flex-col items-center gap-4 p-8 text-center`}
            >
              <CameraIcon
                size={48}
                aria-hidden
                className="text-blue-600 dark:text-blue-400"
              />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('nameGame.empty.title', 'Noch nicht genug Fotos')}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                {t('nameGame.empty.description', {
                  min: NAME_GAME_MIN_PHOTOS,
                  count: playable.length,
                  defaultValue:
                    'Für das Namensspiel brauchst du mindestens {{min}} Schüler mit Foto. Aktuell: {{count}}.',
                })}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t(
                  'nameGame.empty.hint',
                  'Fotos fügst du in der Klassenliste über das Porträt-Symbol neben jedem Schüler hinzu.',
                )}
              </p>
              <button
                type="button"
                onClick={() => navigate('/generator')}
                className={`${primaryButtonClass} h-10 gap-2 px-4`}
              >
                <ArrowLeftIcon size={20} aria-hidden />
                <span className="text-sm font-semibold">
                  {t('nameGame.empty.cta', 'Zur Klassenliste')}
                </span>
              </button>
            </div>
          </div>
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
      </div>

      {/* Bottom bar mirrors the presentation mode: back button pinned left. */}
      <div className="flex items-center px-4 py-4">
        <button
          type="button"
          // Inside a game the back button returns to the mode select first;
          // only the menu leaves the page (Alt+← always exits).
          onClick={() =>
            screen === 'menu' ? navigate('/generator') : setScreen('menu')
          }
          className={`${neutralButtonClass} h-10 shrink-0 gap-2 px-4`}
          title={
            screen === 'menu'
              ? t('nameGame.backTitle', 'Zurück zum Generator (Alt + ←)')
              : t('nameGame.backToMenuTitle', 'Zurück zum Spielmenü')
          }
        >
          <ArrowLeftIcon size={20} aria-hidden />
          <span className="text-sm font-semibold">
            {t('nameGame.back', 'Zurück')}
          </span>
        </button>
      </div>
    </main>
  );
}
