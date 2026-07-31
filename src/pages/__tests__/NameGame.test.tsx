// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@/i18n'; // Initialize i18n for tests
import NameGame from '../NameGame';
import { createMockStudent, setupLocalStorageMock } from '@/__tests__/utils';
import type { Student } from '@/types';

const seatingState = vi.hoisted(() => ({
  current: { students: [] as Student[] },
}));
const photoUrls = vi.hoisted(() => ({
  current: new Map<string, string>(),
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanState: () => seatingState.current,
}));
vi.mock('@/hooks/student/useStudentPhoto', () => ({
  useStudentPhotoUrls: () => photoUrls.current,
}));
vi.mock('@/repositories/nameGameStatsStore', () => ({
  loadNameGameData: vi.fn(async () => ({
    version: 1 as const,
    stats: {},
    memoryBest: {},
  })),
  recordQuizAnswers: vi.fn(async () => undefined),
  recordMemoryResult: vi.fn(
    async (pairs: number, moves: number, timeMs: number) => ({
      moves,
      timeMs,
      achievedAt: new Date().toISOString(),
    }),
  ),
}));

function setStudents(withPhoto: number, withoutPhoto = 0) {
  const students = [
    ...Array.from({ length: withPhoto }, (_, i) =>
      createMockStudent({
        id: `p${i + 1}`,
        name: `Photo Student ${i + 1}`,
        hasPhoto: true,
      }),
    ),
    ...Array.from({ length: withoutPhoto }, (_, i) =>
      createMockStudent({ id: `n${i + 1}`, name: `No Photo ${i + 1}` }),
    ),
  ];
  seatingState.current = { students };
  photoUrls.current = new Map(
    students
      .filter((student) => student.hasPhoto)
      .map((student) => [student.id, `blob:${student.id}`]),
  );
}

function renderNameGame() {
  return render(
    <MemoryRouter initialEntries={['/namensspiel']}>
      <NameGame />
    </MemoryRouter>,
  );
}

describe('NameGame', () => {
  beforeEach(() => {
    setupLocalStorageMock();
    seatingState.current = { students: [] };
    photoUrls.current = new Map();
  });

  it('shows the empty state when fewer than 4 students have photos', async () => {
    setStudents(2);
    renderNameGame();

    expect(
      await screen.findByText(/Noch nicht genug Fotos|Not enough photos yet/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /Zur Klassenliste|Go to class list/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Foto-Quiz|Photo Quiz/i }),
    ).not.toBeInTheDocument();
  });

  it('shows the mode select when at least 4 students have photos', async () => {
    setStudents(4, 2);
    renderNameGame();

    expect(
      await screen.findByRole('button', { name: /Foto-Quiz|Photo Quiz/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Memory/i })).toBeInTheDocument();
    // Logo link sits top-left, the back button moved into the bottom bar
    expect(screen.getByRole('link')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^(Zurück|Back)$/i }),
    ).toBeInTheDocument();
    // Students without photos are excluded from the playable count.
    expect(
      screen.getByText(/4 Schüler mit Foto|4 students with a photo/i),
    ).toBeInTheDocument();
  });

  it('offers theme and language controls (the footer is hidden here)', async () => {
    setStudents(4);
    renderNameGame();

    expect(
      await screen.findByRole('button', {
        name: /Design wechseln|Toggle theme/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /^(Zu (English|Deutsch) wechseln|Switch to (English|Deutsch))$/i,
      }),
    ).toBeInTheDocument();
  });

  it('ignores students whose photo URL has not loaded', async () => {
    setStudents(4);
    // One photo is flagged but its blob never arrived in the cache.
    photoUrls.current.delete('p4');
    renderNameGame();

    expect(
      await screen.findByText(/Noch nicht genug Fotos|Not enough photos yet/i),
    ).toBeInTheDocument();
  });
});
