// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
} from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@/i18n';
import ClassToolPanel from '@/components/studentInput/ClassToolPanel';
import { getButton } from '@/__tests__/utils';

afterEach(cleanup);

const renderPanel = (
  overrides: Partial<React.ComponentProps<typeof ClassToolPanel>> = {},
) => {
  const handlers = {
    onViewChange: vi.fn(),
    onNewStudentNameChange: vi.fn(),
    onAddStudent: vi.fn(),
    onPlaceholderCountChange: vi.fn(),
    onCreatePlaceholders: vi.fn(),
    onImportCsv: vi.fn().mockResolvedValue(undefined),
    onExportCsv: vi.fn(),
    onCreateBackup: vi.fn(),
    onImportBackup: vi.fn(),
    onPlayNameGame: vi.fn(),
  };
  render(
    <ClassToolPanel
      density="comfortable"
      hasActiveClass
      studentCount={12}
      view="list"
      newStudentName=""
      isAddStudentDisabled={false}
      placeholderCount="10"
      {...handlers}
      {...overrides}
    />,
  );
  return handlers;
};

describe('ClassToolPanel', () => {
  it('asks for a name in a panel instead of keeping a field on screen', () => {
    const handlers = renderPanel();

    expect(screen.queryByPlaceholderText(/^Name$/)).not.toBeInTheDocument();
    fireEvent.click(getButton(/Schüler hinzufügen|Add student/i));

    const field = screen.getByPlaceholderText(/^Name$/);
    fireEvent.change(field, { target: { value: 'Ada' } });
    expect(handlers.onNewStudentNameChange).toHaveBeenCalledWith('Ada');

    fireEvent.keyDown(field, { key: 'Enter' });
    expect(handlers.onAddStudent).toHaveBeenCalledTimes(1);
  });

  it('switches between the three ways of looking at the class', () => {
    const handlers = renderPanel();

    fireEvent.click(getButton(/Merkmal-Modus|Attribute mode/i));
    expect(handlers.onViewChange).toHaveBeenCalledWith('focus');

    fireEvent.click(getButton(/Beziehungen|Relationships/i));
    expect(handlers.onViewChange).toHaveBeenCalledWith('relations');
  });

  it('marks the view that is on screen', () => {
    renderPanel({ view: 'relations' });

    expect(getButton(/Beziehungen|Relationships/i)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(getButton(/^(Liste|List)$/i)).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  // An empty class has nobody to look at and nothing to export.
  it('holds back what an empty class cannot use yet', () => {
    renderPanel({ studentCount: 0 });

    expect(getButton(/Merkmal-Modus|Attribute mode/i)).toBeDisabled();
    expect(getButton(/Namensspiel|Name game/i)).toBeDisabled();
    expect(getButton(/Schüler hinzufügen|Add student/i)).toBeEnabled();
  });

  it('keeps the class-wide actions at the bottom', () => {
    const handlers = renderPanel();

    fireEvent.click(getButton(/Klassenliste exportieren|Export class list/i));
    expect(handlers.onExportCsv).toHaveBeenCalledTimes(1);

    // Both ways a backup travels sit behind one entry.
    fireEvent.click(getButton(/^Backup$/i));
    fireEvent.click(getButton(/Backup exportieren|Export backup/i));
    expect(handlers.onCreateBackup).toHaveBeenCalledTimes(1);

    fireEvent.click(getButton(/^Backup$/i));
    fireEvent.click(getButton(/Backup importieren|Import backup/i));
    expect(handlers.onImportBackup).toHaveBeenCalledTimes(1);
  });

  it('offers the CSV import as a menu of icon and word', () => {
    renderPanel();

    fireEvent.click(
      getButton(/^(Klassenliste importieren|Import class list)$/i),
    );
    const panel = screen.getByRole('dialog', {
      name: /Klassenliste importieren|Import class list/i,
    });
    // A row, not a label around a hidden input: the keyboard reaches it.
    expect(
      within(panel).getByRole('button', {
        name: /Klassenliste importieren|Import class list/i,
      }),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole('button', { name: /CSV-Vorlage|CSV template/i }),
    ).toBeInTheDocument();
  });
});
