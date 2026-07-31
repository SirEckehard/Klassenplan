// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@/i18n'; // Initialize i18n for tests
import Footer from '../Footer';
import { SeatingPlanGeneratorProvider } from '@/contexts/SeatingPlanContext';

const installPromptMock = vi.hoisted(() => ({
  isInstallable: false,
  triggerInstall: vi.fn(async () => {}),
}));

vi.mock('@/hooks/useInstallPrompt', () => ({
  useInstallPrompt: () => installPromptMock,
  isInstallPromptDismissed: () => false,
  dismissInstallPrompt: vi.fn(),
}));

const renderFooter = () =>
  render(
    <BrowserRouter>
      <SeatingPlanGeneratorProvider>
        <Footer />
      </SeatingPlanGeneratorProvider>
    </BrowserRouter>,
  );

const openSettingsMenu = async () => {
  const user = userEvent.setup();
  await user.click(
    screen.getByRole('button', { name: /einstellungen|settings/i }),
  );
  return user;
};

afterEach(() => {
  installPromptMock.isInstallable = false;
  installPromptMock.triggerInstall.mockClear();
});

describe('Footer', () => {
  it('renders navigation links', () => {
    renderFooter();
    // Navigation links should be rendered with translated text
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /impressum|legal notice/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /datenschutz|privacy/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /feedback/i })).toBeInTheDocument();
  });

  it('offers the install entry again once the browser reports installability', async () => {
    installPromptMock.isInstallable = true;
    renderFooter();
    const user = await openSettingsMenu();

    const installItem = screen.getByRole('menuitem', {
      name: /als app installieren|install as app/i,
    });
    await user.click(installItem);

    expect(installPromptMock.triggerInstall).toHaveBeenCalledTimes(1);
  });

  it('hides the install entry when the app cannot be installed', async () => {
    renderFooter();
    await openSettingsMenu();

    expect(
      screen.queryByRole('menuitem', {
        name: /als app installieren|install as app/i,
      }),
    ).not.toBeInTheDocument();
  });
});
