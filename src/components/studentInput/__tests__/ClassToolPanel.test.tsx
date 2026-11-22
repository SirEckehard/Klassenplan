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
import { MemoryRouter } from 'react-router-dom';
import ClassToolPanel from '@/components/studentInput/ClassToolPanel';
import { getButton } from '@/__tests__/utils';

// The rail's foot reaches for the backup; the panel itself needs nothing else
// from the seating plan.
vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanActions: () => ({
    handleExportAll: vi.fn().mockResolvedValue(undefined),
    triggerImport: vi.fn(),
  }),
}));

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
    onPrintList: vi.fn(),
    onPrintCards: vi.fn(),
    onCardSettingsChange: vi.fn(),
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
      cardSettings={{ badge: true, profile: true }}
      {...handlers}
      {...overrides}
    />,

    // The rail closes with a link to the support page.
    { wrapper: MemoryRouter },
  );
  return handlers;
};

describe('ClassToolPanel', () => {
  it('prints the class list from "Verwalten", once there is someone on it', () => {
    const handlers = renderPanel();

    fireEvent.click(getButton(/^(Liste drucken|Print list)$/));
    expect(handlers.onPrintList).toHaveBeenCalled();

    cleanup();
    renderPanel({ studentCount: 0 });
    expect(getButton(/^(Liste drucken|Print list)$/)).toBeDisabled();
  });

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

  it('switches between the two ways of looking at the class', () => {
    const handlers = renderPanel({ view: 'relations' });

    fireEvent.click(getButton(/^(Klassenliste|Class list)$/i));
    expect(handlers.onViewChange).toHaveBeenCalledWith('list');

    fireEvent.click(getButton(/Beziehungen|Relationships/i));
    expect(handlers.onViewChange).toHaveBeenCalledWith('relations');
    // The brush in the list's head took the focus mode's place.
    expect(
      within(
        screen.getByRole('heading', { name: /^(Ansicht|View)$/ })
          .parentElement as HTMLElement,
      ).getAllByRole('button'),
    ).toHaveLength(2);
  });

  // As the plan's "Merkmale" switches the seats' tooltip off.
  it('switches the cards over a badge and a name under the view settings', () => {
    const handlers = renderPanel({
      cardSettings: { badge: true, profile: false },
    });

    fireEvent.click(getButton(/^(Merkmale|Markers)$/));
    const panel = screen.getByRole('dialog', { name: /Merkmale|Markers/ });
    const badgeCard = within(panel).getByRole('button', {
      name: /Erklärung beim Überfahren|Explain on hover/,
    });
    const profileCard = within(panel).getByRole('button', {
      name: /Überblick beim Überfahren des Namens|Overview on hovering a name/,
    });
    expect(badgeCard).toHaveAttribute('aria-pressed', 'true');
    expect(profileCard).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(badgeCard);
    expect(handlers.onCardSettingsChange).toHaveBeenCalledWith({
      badge: false,
      profile: false,
    });
    fireEvent.click(profileCard);
    expect(handlers.onCardSettingsChange).toHaveBeenLastCalledWith({
      badge: true,
      profile: true,
    });

    cleanup();
    renderPanel({ studentCount: 0 });
    expect(getButton(/^(Merkmale|Markers)$/)).toBeDisabled();
  });

  it('marks the view that is on screen', () => {
    renderPanel({ view: 'relations' });

    expect(getButton(/Beziehungen|Relationships/i)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(getButton(/^(Klassenliste|Class list)$/i)).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    // An action is not a switch: it announces no pressed state.
    expect(
      getButton(/Klassenliste exportieren|Export class list/i),
    ).not.toHaveAttribute('aria-pressed');
  });

  // An empty class has nobody to look at and nothing to export.
  it('holds back what an empty class cannot use yet', () => {
    renderPanel({ studentCount: 0 });

    expect(getButton(/Beziehungen|Relationships/i)).toBeDisabled();
    expect(
      getButton(/Klassenliste exportieren|Export class list/i),
    ).toBeDisabled();
    expect(getButton(/Schüler hinzufügen|Add student/i)).toBeEnabled();
  });

  // The view comes first on every layer; who joins the class is added, as
  // the room adds tables, the view settings follow as on every layer, and the
  // class list's import and export side by side are managing it.
  it('puts the view on top, then adding students, the view settings, then managing the list', () => {
    renderPanel();

    const headings = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual([
      expect.stringMatching(/^(Ansicht|View)$/),
      expect.stringMatching(/^(Hinzufügen|Add)$/),
      expect.stringMatching(/^(Ansichtseinstellungen|View settings)$/),
      expect.stringMatching(/^(Verwalten|Manage)$/),
    ]);

    const entriesUnder = (heading: RegExp) =>
      within(
        screen.getByRole('heading', { name: heading })
          .parentElement as HTMLElement,
      )
        .getAllByRole('button')
        .map((button) => button.textContent);
    expect(entriesUnder(/^(Hinzufügen|Add)$/)).toEqual([
      expect.stringMatching(/Schüler hinzufügen|Add student/),
      expect.stringMatching(/Platzhalter erstellen|Create placeholders/),
    ]);
    expect(entriesUnder(/^(Verwalten|Manage)$/)).toEqual([
      expect.stringMatching(/Klassenliste importieren|Import class list/),
      expect.stringMatching(/Klassenliste exportieren|Export class list/),
      expect.stringMatching(/Liste drucken|Print list/),
      expect.stringMatching(/Namensschilder drucken|Print name cards/),
    ]);
  });

  it('exports the class list from the toolbar', () => {
    const handlers = renderPanel();

    fireEvent.click(getButton(/Klassenliste exportieren|Export class list/i));
    expect(handlers.onExportCsv).toHaveBeenCalledTimes(1);
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
