// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '@/i18n/i18n';
import { MemoryRouter } from 'react-router-dom';
import RoomToolPanel from '../RoomToolPanel';

// The rail's foot reaches for the backup; the panel itself needs nothing else
// from the seating plan.
vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanActions: () => ({
    handleExportAll: vi.fn().mockResolvedValue(undefined),
    triggerImport: vi.fn(),
  }),
}));

const settingsGroups = [
  {
    id: 'layout-base',
    title: 'Arbeitsfläche',
    options: [
      {
        id: 'show-grid',
        label: 'Raster anzeigen',
        icon: <span />,
        checked: true,
        onChange: vi.fn(),
      },
    ],
  },
];

const renderPanel = (
  density: 'comfortable' | 'compact',
  { isPhone = false }: { isPhone?: boolean } = {},
) => {
  const handlers = {
    handleSaveTemplate: vi.fn(),
    onTemplatePointerDown: vi.fn(),
    onOpenQuickSetup: vi.fn(),
    onFeaturePointerDown: vi.fn(),
  };
  render(
    <RoomToolPanel
      density={density}
      quickSetupShortcutHint="Q"
      featurePalette={[
        { type: 'window', label: 'Fenster', icon: <span /> },
        { type: 'door', label: 'Tür', icon: <span /> },
      ]}
      settingsGroups={settingsGroups}
      isPhone={isPhone}
      {...handlers}
    />,

    // The rail closes with a link to the support page.
    { wrapper: MemoryRouter },
  );
  return handlers;
};

describe('RoomToolPanel', () => {
  it.each(['comfortable', 'compact'] as const)(
    'offers setup, saving, tables and room elements in the %s density',
    (density) => {
      const handlers = renderPanel(density);

      fireEvent.click(
        screen.getByRole('button', {
          name: /Klassenraum einrichten|Set Up Classroom/,
        }),
      );
      expect(handlers.onOpenQuickSetup).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTitle(/Vorlage speichern|as template/));
      expect(handlers.handleSaveTemplate).toHaveBeenCalledTimes(1);

      fireEvent.pointerDown(screen.getByTitle(/^(4er-Gruppe|Group of 4) /));
      expect(handlers.onTemplatePointerDown).toHaveBeenCalledWith(
        'group4',
        expect.anything(),
      );

      fireEvent.pointerDown(screen.getByTitle(/^Tür /));
      expect(handlers.onFeaturePointerDown).toHaveBeenCalledWith(
        'door',
        expect.anything(),
      );
    },
  );

  it('explains the round buttons in their tooltips as the labels do', () => {
    renderPanel('compact');

    const group4 = screen.getByRole('button', {
      name: /^(4er-Gruppe|Group of 4)$/,
    });
    expect(group4).toHaveAttribute(
      'title',
      expect.stringMatching(/Drag & Drop|drag and drop/),
    );
    expect(
      screen.getByRole('button', {
        name: /^(Klassenraum einrichten|Set Up Classroom)$/,
      }),
    ).toHaveAttribute('title', expect.stringContaining('(Q)'));
  });

  // The floating settings button on the canvas is gone; its options are a
  // group of the toolbar like everything else the layer can do.
  it('opens the view settings from the toolbar', () => {
    renderPanel('comfortable');

    fireEvent.click(screen.getByRole('button', { name: /Arbeitsfläche/ }));

    expect(
      screen.getByRole('dialog', { name: /Arbeitsfläche/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Raster anzeigen/)).toBeInTheDocument();
  });

  // Tables and room elements are one group — "Raumelemente" names a view
  // setting, not a second group of things to add.
  it('adds, shows and manages, in the order every layer keeps', () => {
    renderPanel('comfortable');

    const headings = screen
      .getAllByRole('heading', { level: 3 })
      .map((heading) => heading.textContent);
    expect(headings).toEqual([
      expect.stringMatching(/^(Hinzufügen|Add)$/),
      expect.stringMatching(/^(Ansichtseinstellungen|View settings)$/),
      expect.stringMatching(/^(Verwalten|Manage)$/),
    ]);
  });

  // On a phone the tables and the setup sit under the canvas, where a drag
  // reaches the room; the sheet carries the rest.
  it('leaves the tables and the setup to the stage on a phone', () => {
    renderPanel('comfortable', { isPhone: true });

    expect(
      screen.queryByRole('button', {
        name: /^(4er-Gruppe|Group of 4)$/,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: /Klassenraum einrichten|Set Up Classroom/,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Arbeitsfläche/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Klassenwerkzeuge|Class tools/ }),
    ).toBeInTheDocument();
  });

  it.each(['comfortable', 'compact'] as const)(
    'closes the %s rail with the way to support the project',
    (density) => {
      renderPanel(density);

      const links = screen.getAllByRole('link');
      const support = links[links.length - 1];
      expect(support).toHaveAccessibleName(/Unterstützen|Support/);
      expect(support).toHaveAttribute('href', '/support');
    },
  );
});
