// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
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

const layout = vi.hoisted(() => ({ isPhone: false }));

vi.mock('@/hooks/ui/useLayoutMode', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/hooks/ui/useLayoutMode')>()),
  useIsPhone: () => layout.isPhone,
}));

// The exits save and navigate; here only where they sit matters.
vi.mock('@/hooks/plan/usePlanExits', () => ({
  usePlanExits: () => ({
    exportPlan: vi.fn(),
    presentPlan: vi.fn(),
    canExit: true,
  }),
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanActions: () => actions,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  layout.isPhone = false;
  setWidth(1024);
});

const setWidth = (width: number) => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
  });
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
};

const renderRail = (
  density: ToolRailDensity = 'comfortable',
  planPresent = false,
) =>
  render(
    <MemoryRouter initialEntries={['/generator']}>
      <Routes>
        <Route
          path="/generator"
          element={
            <ToolRail density={density} planPresent={planPresent}>
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
        <Route path="/bibliothek" element={<p>Seite: Bibliothek</p>} />
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
        expect.stringMatching(/Bibliothek|Library/),
        expect.stringMatching(/Klassenwerkzeuge|Class tools/),
        'Backup',
        expect.stringMatching(/Unterstützen|Support/),
      ]);
    },
  );

  // A narrow phone's status bar keeps exporting and has no room left for
  // presenting, so the plan layer's sheet starts its foot with it — and only
  // that layer.
  it('starts a narrow phone’s foot with presenting on the plan layer alone', () => {
    layout.isPhone = true;
    setWidth(390);
    const plan = renderRail('comfortable', true);
    expect(entryNames(plan.container).slice(1, 3)).toEqual([
      expect.stringMatching(/Präsentieren|Present/),
      expect.stringMatching(/Bibliothek|Library/),
    ]);
    expect(
      screen.queryByRole('button', { name: /^(Exportieren|Export)$/i }),
    ).toBeNull();
    plan.unmount();

    const other = renderRail('comfortable', false);
    expect(entryNames(other.container)).not.toContainEqual(
      expect.stringMatching(/Präsentieren|Present/),
    );
  });

  it.each([
    ['an iPad mini in portrait', 744],
    ['a tablet', 820],
  ])('leaves presenting to the status bar on %s', (_device, width) => {
    layout.isPhone = width < 768;
    setWidth(width);
    const { container } = renderRail('comfortable', true);
    expect(entryNames(container)).not.toContainEqual(
      expect.stringMatching(/Präsentieren|Present/),
    );
  });

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

  // "Bibliothek" is a page of the workspace (decision 0024), reached
  // by a link like any other page.
  it('leads to the library, a page of its own', () => {
    renderRail();

    const entry = screen.getByRole('link', {
      name: /Bibliothek|Library/i,
    });
    expect(entry).not.toHaveAttribute('aria-haspopup');
    expect(entry).not.toHaveAttribute('aria-current');

    fireEvent.click(entry);
    expect(screen.getByText('Seite: Bibliothek')).toBeInTheDocument();
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

  // The panel is portalled to the end of the page. A keyboard user used to
  // tab from the entry to the next one and never reached the menu.
  it('takes the focus into an opened panel and gives it back on Escape', async () => {
    renderRail();
    const entry = getButton(/Klassenwerkzeuge|Class tools/i);
    entry.focus();
    fireEvent.click(entry);

    const first = getButton(/Wer kommt dran\?|Who.s next\?/);
    await waitFor(() => expect(first).toHaveFocus());

    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(getButton(/Wo sitzt wer\?|Where does who sit\?/)).toHaveFocus();

    // Tab wraps inside the panel instead of leaving it behind.
    fireEvent.keyDown(document.activeElement as HTMLElement, {
      key: 'Tab',
      shiftKey: true,
    });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(getButton(/Namensspiel|Name Game/i)).toHaveFocus();

    fireEvent.keyDown(document.activeElement as HTMLElement, {
      key: 'Escape',
    });
    expect(
      screen.queryByRole('dialog', { name: /Klassenwerkzeuge|Class tools/i }),
    ).not.toBeInTheDocument();
    expect(entry).toHaveFocus();
  });
});
