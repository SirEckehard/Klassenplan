// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import '@/i18n';
import AppSettingsMenu from '@/components/shell/AppSettingsMenu';
import ReturnToAppLink from '@/components/ReturnToAppLink';
import { getButton } from '@/__tests__/utils';

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanActions: () => ({
    clearAllData: vi.fn(),
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
  await screen.findByRole('menuitem', {
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
      screen.getByRole('menuitem', { name: /alle daten löschen|clear all/i }),
    ).toBeInTheDocument();
    // The two pages an operator is legally required to keep reachable.
    expect(
      screen.getByRole('menuitem', { name: /impressum|legal notice/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /datenschutz|privacy/i }),
    ).toBeInTheDocument();
  });

  // The class layer's toolbar carries the backup and the plan layer's the
  // saved plans; the gear does not repeat them.
  it('leaves the backup and the saved plans to the toolbar', async () => {
    renderMenu();
    await openMenu();

    expect(
      screen.queryByRole('menuitem', {
        name: /backup exportieren|export backup/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', {
        name: /backup importieren|import backup/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('menuitem', {
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
      screen.getByRole('menuitem', { name: /impressum|legal notice/i }),
    );

    expect(
      await screen.findByRole('button', { name: /^(Zurück|Back)$/ }),
    ).toBeInTheDocument();
  });

  it('closes on Escape and hands focus back to the gear', async () => {
    renderMenu();
    const user = await openMenu();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(getButton(/einstellungen|settings/i)).toHaveFocus();
  });
});
