// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '@/i18n/i18n';
import SmartEditPanel from '../SmartEditPanel';

const renderPanel = (density: 'comfortable' | 'compact') => {
  const handlers = {
    handleSaveTemplate: vi.fn(),
    onTemplatePointerDown: vi.fn(),
    onOpenQuickSetup: vi.fn(),
    onFeaturePointerDown: vi.fn(),
  };
  render(
    <SmartEditPanel
      density={density}
      quickSetupShortcutHint="Q"
      featurePalette={[
        { type: 'window', label: 'Fenster', icon: <span /> },
        { type: 'door', label: 'Tür', icon: <span /> },
      ]}
      {...handlers}
    />,
  );
  return handlers;
};

describe('SmartEditPanel', () => {
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

  it('explains the round buttons in their tooltips as the cards do', () => {
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

  it('shows the explanations as text in the comfortable density only', () => {
    renderPanel('comfortable');
    expect(
      screen.getByText(/Ziehe Tische in den Klassenraum|Drag tables/),
    ).toBeInTheDocument();
  });
});
