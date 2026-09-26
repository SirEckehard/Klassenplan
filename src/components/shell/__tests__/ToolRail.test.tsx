// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '@/i18n';
import {
  ToolRail,
  ToolRailButton,
  ToolRailGroup,
  type ToolRailDensity,
} from '@/components/shell/ToolRail';
import { getButton } from '@/__tests__/utils';

const actions = vi.hoisted(() => ({
  handleExportAll: vi.fn().mockResolvedValue(undefined),
  triggerImport: vi.fn(),
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanActions: () => actions,
}));

// The real modal reads the whole seating plan; here it only has to open.
vi.mock('@/components/ui/navigation/StorageHistoryModal', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" aria-label="Pläne & Verlauf" /> : null,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const renderRail = (density: ToolRailDensity = 'comfortable') =>
  render(
    <MemoryRouter initialEntries={['/generator']}>
      <Routes>
        <Route
          path="/generator"
          element={
            <ToolRail density={density}>
              <ToolRailGroup title="Ansicht">
                <ToolRailButton
                  icon={<span />}
                  label="Liste"
                  active
                  onClick={vi.fn()}
                />
              </ToolRailGroup>
            </ToolRail>
          }
        />
        <Route path="/wer-kommt-dran" element={<p>Seite: Wer kommt dran</p>} />
        <Route path="/namensspiel" element={<p>Seite: Namensspiel</p>} />
      </Routes>
    </MemoryRouter>,
  );

/** The names of the rail's entries and links, top to bottom. */
const entryNames = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('button, a')).map(
    (element) =>
      element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '',
  );

describe('ToolRail', () => {
  it.each(['comfortable', 'compact'] as const)(
    'ends the %s rail with the foot every layer shares',
    (density) => {
      const { container } = renderRail(density);

      expect(entryNames(container)).toEqual([
        'Liste',
        expect.stringMatching(/Klassenwerkzeuge|Class tools/),
        expect.stringMatching(/Pläne & Verlauf|Plans & history/),
        'Backup',
        expect.stringMatching(/Unterstützen|Support/),
      ]);
    },
  );

  // A tour mark that explains a switch has to frame all of it, not the first
  // entry — the tour's spotlight is the anchor's box.
  it.each(['comfortable', 'compact'] as const)(
    'lets a tour mark frame a whole group in the %s rail',
    (density) => {
      const { container } = render(
        <MemoryRouter>
          <ToolRail density={density}>
            <ToolRailGroup title="Ansicht" data-tour="seating-mode-toggle">
              <ToolRailButton
                icon={<span />}
                label="Sitzplan"
                active
                onClick={vi.fn()}
              />
              <ToolRailButton
                icon={<span />}
                label="Sitzkreis"
                active={false}
                onClick={vi.fn()}
              />
            </ToolRailGroup>
          </ToolRail>
        </MemoryRouter>,
      );

      const anchor = container.querySelector(
        '[data-tour="seating-mode-toggle"]',
      );
      expect(anchor).not.toBeNull();
      expect(anchor).toContainElement(getButton(/^Sitzplan$/));
      expect(anchor).toContainElement(getButton(/^Sitzkreis$/));
    },
  );

  it('opens the four class tools from one menu', () => {
    renderRail();

    fireEvent.click(getButton(/Klassenwerkzeuge|Class tools/i));
    const menu = screen.getByRole('dialog', {
      name: /Klassenwerkzeuge|Class tools/i,
    });
    expect(
      Array.from(menu.querySelectorAll('button')).map(
        (button) => button.textContent,
      ),
    ).toEqual([
      expect.stringMatching(/Wer kommt dran\?|Who.s next\?/),
      expect.stringMatching(/Wo sitzt wer\?|Where does who sit\?/),
      expect.stringMatching(/Gruppen bilden|Build groups/),
      expect.stringMatching(/Namensspiel|Name Game/),
    ]);

    fireEvent.click(getButton(/Wer kommt dran|Who.s next/i));
    expect(screen.getByText('Seite: Wer kommt dran')).toBeInTheDocument();
  });

  // The name game explains on its own page what it still needs, so the rail
  // opens it whatever the class has.
  it('opens the name game without holding it back', () => {
    renderRail();

    fireEvent.click(getButton(/Klassenwerkzeuge|Class tools/i));
    fireEvent.click(getButton(/Namensspiel|Name Game/i));

    expect(screen.getByText('Seite: Namensspiel')).toBeInTheDocument();
  });

  it('opens the plans and their history as a dialog', async () => {
    renderRail();

    const entry = getButton(/Pläne & Verlauf|Plans & history/i);
    expect(entry).toHaveAttribute('aria-haspopup', 'dialog');
    expect(entry).not.toHaveAttribute('aria-pressed');

    fireEvent.click(entry);
    expect(
      await screen.findByRole('dialog', { name: 'Pläne & Verlauf' }),
    ).toBeInTheDocument();
  });

  it('keeps both ways a backup travels behind one entry', () => {
    renderRail();

    fireEvent.click(getButton(/^Backup$/i));
    fireEvent.click(getButton(/Backup exportieren|Export backup/i));
    expect(actions.handleExportAll).toHaveBeenCalledTimes(1);

    fireEvent.click(getButton(/^Backup$/i));
    fireEvent.click(getButton(/Backup importieren|Import backup/i));
    expect(actions.triggerImport).toHaveBeenCalledTimes(1);
  });
});
