// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import {
  render,
  screen,
  cleanup,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import '@/i18n';
import AppSettingsMenu from '@/components/shell/AppSettingsMenu';
import ReturnToAppLink from '@/components/ReturnToAppLink';
import { getButton } from '@/__tests__/utils';
import { characterKeyShortcutsEnabled } from '@/utils';

const clearAllData = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanActions: () => ({
    clearAllData,
    handleExportAll: vi.fn(),
    triggerImport: vi.fn(),
  }),
}));

vi.mock('@/hooks/useInstallPrompt', () => ({
  useInstallPrompt: () => ({ isInstallable: false, triggerInstall: vi.fn() }),
}));

const renderMenu = () =>
  render(
    <BrowserRouter>
      <AppSettingsMenu />
    </BrowserRouter>,
  );

/** Opens the menu and waits for its lazily loaded entries. */
const openMenu = async () => {
  const user = userEvent.setup();
  await user.click(getButton(/einstellungen|settings/i));
  await screen.findByRole('button', {
    name: /alle daten löschen|clear all/i,
  });
  return user;
};

afterEach(cleanup);

describe('AppSettingsMenu', () => {
  it('carries what the workspace loses with the footer', async () => {
    renderMenu();
    await openMenu();

    // Wiping the data belongs to no layer, so it stays here.
    expect(
      screen.getByRole('button', { name: /alle daten löschen|clear all/i }),
    ).toBeInTheDocument();
    // The two pages an operator is legally required to keep reachable.
    expect(
      screen.getByRole('link', { name: /impressum|legal notice/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /datenschutz|privacy/i }),
    ).toBeInTheDocument();
  });

  // The footer's links about the app itself come along: whom to tell, what
  // changed in which version, where the code lives.
  it('carries feedback, the changelog and the source code', async () => {
    renderMenu();
    await openMenu();

    expect(screen.getByRole('link', { name: /^feedback$/i })).toHaveAttribute(
      'href',
      '/feedback',
    );
    expect(
      screen.getByRole('link', { name: /^changelog v\d+\.\d+\.\d+/i }),
    ).toHaveAttribute('href', '/changelog');
    const github = screen.getByRole('link', { name: /^github$/i });
    expect(github).toHaveAttribute(
      'href',
      expect.stringContaining('github.com'),
    );
    expect(github).toHaveAttribute('target', '_blank');
  });

  it.each([
    ['/feedback', /^feedback$/i],
    ['/changelog', /^changelog/i],
  ])('opens %s with the way back into the app', async (path, name) => {
    render(
      <MemoryRouter initialEntries={['/generator']}>
        <Routes>
          <Route path="/generator" element={<AppSettingsMenu />} />
          <Route path={path} element={<ReturnToAppLink />} />
        </Routes>
      </MemoryRouter>,
    );
    const user = await openMenu();

    await user.click(screen.getByRole('link', { name }));

    expect(
      await screen.findByRole('button', { name: /^(Zurück|Back)$/ }),
    ).toBeInTheDocument();
  });

  // The class layer's toolbar carries the backup and the plan layer's the
  // saved plans; the gear does not repeat them.
  it('leaves the backup and the saved plans to the toolbar', async () => {
    renderMenu();
    await openMenu();

    expect(
      screen.queryByRole('button', {
        name: /backup exportieren|export backup/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: /backup importieren|import backup/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: /alle pläne anzeigen|show all plans/i,
      }),
    ).not.toBeInTheDocument();
  });

  // The workspace has no footer, so the teacher reached the page from here and
  // is taken back to the plan, not to the start page.
  it('opens the legal pages with the way back into the app', async () => {
    render(
      <MemoryRouter initialEntries={['/generator']}>
        <Routes>
          <Route path="/generator" element={<AppSettingsMenu />} />
          <Route path="/impressum" element={<ReturnToAppLink />} />
        </Routes>
      </MemoryRouter>,
    );
    const user = await openMenu();

    await user.click(
      screen.getByRole('link', { name: /impressum|legal notice/i }),
    );

    expect(
      await screen.findByRole('button', { name: /^(Zurück|Back)$/ }),
    ).toBeInTheDocument();
  });

  // Choosing the entry closes the menu; the question it asks has to outlive
  // it. Rendered inside the menu, it closed with it and nothing happened.
  it('asks before wiping everything and wipes on confirmation', async () => {
    clearAllData.mockClear();
    renderMenu();
    const user = await openMenu();

    await user.click(
      screen.getByRole('button', { name: /alle daten löschen|clear all/i }),
    );

    const dialog = await screen.findByRole('dialog', {
      name: /alle daten löschen|clear all/i,
    });
    expect(
      screen.queryByRole('dialog', { name: /einstellungen|settings/i }),
    ).not.toBeInTheDocument();
    await user.click(
      within(dialog).getByRole('button', { name: /^(löschen|delete)$/i }),
    );
    expect(clearAllData).toHaveBeenCalledTimes(1);
  });

  it('switches the single-key shortcuts off and on again', async () => {
    localStorage.clear();
    renderMenu();
    const user = await openMenu();

    const row = screen.getByRole('button', {
      name: /Kürzel mit einer Taste|Single-key shortcuts/i,
    });
    expect(row).toHaveAttribute('aria-pressed', 'true');

    await user.click(row);

    expect(row).toHaveAttribute('aria-pressed', 'false');
    expect(characterKeyShortcutsEnabled()).toBe(false);

    await user.click(row);

    expect(characterKeyShortcutsEnabled()).toBe(true);
  });

  it('closes on Escape and hands focus back to the gear', async () => {
    renderMenu();
    const user = await openMenu();

    await user.keyboard('{Escape}');

    expect(
      screen.queryByRole('dialog', { name: /einstellungen|settings/i }),
    ).not.toBeInTheDocument();
    expect(getButton(/einstellungen|settings/i)).toHaveFocus();
  });

  // The menu is portalled to the end of the page; without this a keyboard
  // user tabbed on past it.
  it('takes the focus when it opens and keeps Tab inside', async () => {
    renderMenu();
    const user = await openMenu();
    const dialog = screen.getByRole('dialog', {
      name: /einstellungen|settings/i,
    });

    await waitFor(() => expect(dialog).toContainElement(focused()));
    for (let step = 0; step < 12; step += 1) {
      await user.tab();
      expect(dialog).toContainElement(focused());
    }
  });
});

const focused = () => document.activeElement as HTMLElement | null;
