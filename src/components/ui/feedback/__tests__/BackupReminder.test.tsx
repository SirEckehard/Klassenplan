// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The reminder interrupts a teacher who did not ask for it, so the rules it
 * follows have to hold exactly: never without data, never before the threshold,
 * and never again once they say so.
 */
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import i18n from '@/i18n';
import BackupReminder from '../BackupReminder';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';
import {
  BACKUP_REMINDER_AGE_DAYS,
  markBackupDataPresent,
  recordBackupCreated,
} from '@/utils/data/backupReminder';

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(Date.now() - days * DAY_MS);

const mocks = vi.hoisted(() => ({
  classSummaries: [] as unknown[],
  handleExportAll: vi.fn(async () => {}),
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanActions: () => ({ handleExportAll: mocks.handleExportAll }),
}));

vi.mock('@/contexts/seatingPlan/ClassManagementContext', () => ({
  useClassManagementContext: () => ({ classSummaries: mocks.classSummaries }),
}));

const renderReminder = () =>
  render(
    <MemoryRouter>
      <BackupReminder />
    </MemoryRouter>,
  );

/** A browser that has held data long enough for the reminder to be due. */
const withOverdueData = () => {
  markBackupDataPresent(daysAgo(BACKUP_REMINDER_AGE_DAYS + 5));
  mocks.classSummaries = [{ id: 'c1', name: 'Klasse 7b' }];
};

beforeEach(async () => {
  localStorage.clear();
  vi.clearAllMocks();
  mocks.handleExportAll.mockImplementation(async () => {});
  mocks.classSummaries = [];
  await i18n.changeLanguage('de');
});

describe('BackupReminder', () => {
  it('says nothing while there is no class to lose', () => {
    markBackupDataPresent(daysAgo(400));

    renderReminder();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('says nothing on the day a class is created', () => {
    markBackupDataPresent(new Date());
    mocks.classSummaries = [{ id: 'c1', name: 'Klasse 7b' }];

    renderReminder();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('asks for a first backup once the data has aged', () => {
    withOverdueData();

    renderReminder();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(
      screen.getByText('Du hast noch kein Backup erstellt.'),
    ).toBeInTheDocument();
  });

  it('names the age of an existing backup', () => {
    withOverdueData();
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.lastBackupAt,
      daysAgo(45).toISOString(),
    );

    renderReminder();

    expect(
      screen.getByText('Dein letztes Backup ist 45 Tage alt.'),
    ).toBeInTheDocument();
  });

  it('stays up when the export is cancelled', async () => {
    withOverdueData();

    renderReminder();
    await userEvent.click(
      screen.getByRole('button', { name: 'Backup erstellen' }),
    );

    // The export resolves either way — a cancelled password prompt or save
    // dialog writes no file and records no date, so the reminder is still due.
    expect(mocks.handleExportAll).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('takes itself away once a backup was written', async () => {
    withOverdueData();
    mocks.handleExportAll.mockImplementation(async () => {
      recordBackupCreated();
    });

    renderReminder();
    await userEvent.click(
      screen.getByRole('button', { name: 'Backup erstellen' }),
    );

    // Leaving the banner up after a successful export reads as "it did not
    // work" and invites a second, pointless export.
    await waitFor(() =>
      expect(screen.queryByRole('status')).not.toBeInTheDocument(),
    );
  });

  it('postpones without switching the reminder off', async () => {
    withOverdueData();

    renderReminder();
    await userEvent.click(
      screen.getByRole('button', { name: 'Später erinnern' }),
    );

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(
      localStorage.getItem(LOCAL_STORAGE_KEYS.backupReminderSnoozedUntil),
    ).not.toBeNull();
    expect(
      localStorage.getItem(LOCAL_STORAGE_KEYS.backupReminderDisabled),
    ).toBeNull();
  });

  it('stays gone after "never remind me"', async () => {
    withOverdueData();

    const { unmount } = renderReminder();
    await userEvent.click(
      screen.getByRole('button', { name: 'Nicht mehr erinnern' }),
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    // The opt-out has to outlive the page, not just this render.
    unmount();
    renderReminder();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('points at the FAQ answer about moving devices', () => {
    withOverdueData();

    renderReminder();

    expect(
      screen.getByRole('link', { name: /Daten auf ein neues Gerät mitnehmen/ }),
    ).toHaveAttribute('href', expect.stringContaining('/faq#backups'));
  });
});
