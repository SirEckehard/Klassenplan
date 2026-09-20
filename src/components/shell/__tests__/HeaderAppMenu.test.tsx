// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import '@/i18n';
import HeaderAppMenu from '@/components/shell/HeaderAppMenu';
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
      <HeaderAppMenu />
    </BrowserRouter>,
  );

/** Opens the menu and waits for its lazily loaded entries. */
const openMenu = async () => {
  const user = userEvent.setup();
  await user.click(getButton(/einstellungen|settings/i));
  await screen.findByRole('menuitem', {
    name: /backup exportieren|export backup/i,
  });
  return user;
};

afterEach(cleanup);

describe('HeaderAppMenu', () => {
  it('carries what the workspace loses with the footer', async () => {
    renderMenu();
    await openMenu();

    // Storage and backup — the entries the class tour points at.
    expect(
      screen.getByRole('menuitem', {
        name: /alle pläne anzeigen|show all plans/i,
      }),
    ).toBeInTheDocument();
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

  it('closes on Escape and hands focus back to the gear', async () => {
    renderMenu();
    const user = await openMenu();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(getButton(/einstellungen|settings/i)).toHaveFocus();
  });
});
