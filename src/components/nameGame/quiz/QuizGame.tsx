// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buildQuizRound } from './quizEngine';
import QuizQuestion from './QuizQuestion';
import QuizResult from './QuizResult';
import type { QuizAnswerResult } from '@/repositories/nameGameStatsStore';
import type { NameGameStatsMap, Student } from '@/types';

/** Pause after answering before the next question (kept under reduced motion). */
const FEEDBACK_MS = 1200;

type QuizGameProps = {
  students: Student[];
  photoUrls: ReadonlyMap<string, string>;
  stats: NameGameStatsMap;
  /**
   * Called exactly once per round with the answers collected so far — on
   * completion and on early exit alike (persists stats + updates weighting).
   */
  onRoundComplete: (results: QuizAnswerResult[]) => void;
  onExitToMenu: () => void;
};

/** Orchestrates one quiz round: questions, feedback pause, result screen. */
export default function QuizGame({
  students,
  photoUrls,
  stats,
  onRoundComplete,
  onExitToMenu,
}: QuizGameProps) {
  const { t } = useTranslation('pages');

  const studentsById = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );

  const [questions, setQuestions] = useState(() =>
    buildQuizRound(students, stats),
  );
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswerResult[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const done = questions.length > 0 && index >= questions.length;

  // Flush the round results exactly once — when the round finishes or when the
  // component unmounts early (back button, navigation).
  const answersRef = useRef<QuizAnswerResult[]>([]);
  const flushedRef = useRef(false);
  const onRoundCompleteRef = useRef(onRoundComplete);
  useEffect(() => {
    answersRef.current = answers;
    onRoundCompleteRef.current = onRoundComplete;
  }, [answers, onRoundComplete]);

  const flush = useCallback(() => {
    // Only mark as flushed when there is something to flush — StrictMode's
    // dev-only mount/cleanup cycle would otherwise consume the single flush
    // before any question was answered.
    if (flushedRef.current || answersRef.current.length === 0) return;
    flushedRef.current = true;
    onRoundCompleteRef.current(answersRef.current);
  }, []);

  useEffect(() => {
    if (done) flush();
  }, [done, flush]);

  useEffect(() => () => flush(), [flush]);

  // Auto-advance after the feedback pause.
  useEffect(() => {
    if (picked === null) return;
    const timer = window.setTimeout(() => {
      setPicked(null);
      setIndex((value) => value + 1);
    }, FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [picked]);

  const question = questions[index];

  const handlePick = (optionId: string) => {
    if (picked !== null || !question) return;
    setPicked(optionId);
    setAnswers((previous) => [
      ...previous,
      {
        studentId: question.targetId,
        correct: optionId === question.targetId,
      },
    ]);
  };

  const handleRestart = () => {
    flushedRef.current = false;
    setAnswers([]);
    setIndex(0);
    setPicked(null);
    setQuestions(buildQuizRound(students, stats));
  };

  // Defensive: with duplicate display names everywhere no question can be built.
  if (questions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-4 text-center text-gray-600 dark:text-gray-300">
        <p className="text-lg font-medium">
          {t(
            'nameGame.quiz.noQuestions',
            'Aus dieser Klasse lassen sich keine Quizfragen erstellen.',
          )}
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <QuizResult
        answers={answers}
        studentsById={studentsById}
        photoUrls={photoUrls}
        onRestart={handleRestart}
        onExitToMenu={onExitToMenu}
      />
    );
  }

  if (!question) return null;

  const target = studentsById.get(question.targetId);
  const lastAnswer = answers[answers.length - 1];
  const feedbackText =
    picked !== null && target
      ? lastAnswer?.correct
        ? t('nameGame.quiz.correct', {
            name: target.name,
            defaultValue: 'Richtig: {{name}}',
          })
        : t('nameGame.quiz.wrong', {
            name: target.name,
            defaultValue: 'Leider falsch – das ist {{name}}',
          })
      : '';

  const correctCount = answers.filter((answer) => answer.correct).length;

  return (
    <div className="flex h-full flex-col items-center gap-4 overflow-y-auto px-4 py-6">
      <div className="flex items-center gap-4 text-sm font-semibold text-gray-600 dark:text-gray-300">
        <span>
          {t('nameGame.quiz.progress', {
            current: index + 1,
            total: questions.length,
            defaultValue: 'Frage {{current}} von {{total}}',
          })}
        </span>
        <span className="text-green-600 dark:text-green-400">
          {t('nameGame.quiz.score', {
            score: correctCount,
            defaultValue: '{{score}} richtig',
          })}
        </span>
      </div>

      <div className="flex w-full flex-1 flex-col items-center justify-center">
        <QuizQuestion
          question={question}
          studentsById={studentsById}
          photoUrls={photoUrls}
          picked={picked}
          onPick={handlePick}
        />
      </div>

      {/* Reserved feedback line, announced to screen readers as it changes. */}
      <p
        aria-live="polite"
        className={`h-6 text-base font-semibold ${
          lastAnswer?.correct
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400'
        }`}
      >
        {feedbackText}
      </p>
    </div>
  );
}
