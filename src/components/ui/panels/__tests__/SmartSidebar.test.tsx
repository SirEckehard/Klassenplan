// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The sidebar is where the tablet tier is actually visible. Below `md` it is a
 * drawer from the left, opened from the status bar inside the shell; from `md`
 * up it is a real column, on a tablet starting as the 60px rail so the canvas
 * keeps its width.
 */
import '@testing-library/jest-dom/vitest';
import { render, screen, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import i18n from '@/i18n';
import SmartSidebar from '../SmartSidebar';
import { ToolRailProvider } from '@/contexts/ToolRailContext';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';

const setWidth = (width: number): void => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
};

const renderSidebar = () =>
  render(
    <SmartSidebar>
      <p>Optionen-Inhalt</p>
    </SmartSidebar>,
  );

/** As the workspace mounts it: the status bar owns the switch there. */
const renderSidebarInShell = () =>
  render(
    <ToolRailProvider>
      <SmartSidebar>
        <p>Optionen-Inhalt</p>
      </SmartSidebar>
    </ToolRailProvider>,
  );

const sidebarColumn = () => screen.queryByRole('complementary');
const openSheetButton = () =>
  screen.queryByRole('button', { name: 'Werkzeugleiste' });

beforeEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage('de');
});

afterEach(() => {
  setWidth(1024);
});

describe('SmartSidebar layout tiers', () => {
  it('gives a phone a drawer instead of a column', async () => {
    setWidth(390);

    renderSidebar();

    expect(sidebarColumn()).not.toBeInTheDocument();
    await userEvent.click(openSheetButton()!);

    // Not a modal sheet: a landmark beside the stage, like the inspector's
    // drawer, so the panels its entries open can stack above it.
    const drawer = screen.getByRole('complementary', {
      name: 'Werkzeugleiste',
    });
    expect(drawer).toHaveTextContent('Optionen-Inhalt');
    expect(drawer).toHaveFocus();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes the phone drawer on Escape and after an action', async () => {
    setWidth(390);
    render(
      <SmartSidebar>
        <button type="button">Sitzkreis</button>
        <button type="button" aria-haspopup="dialog">
          Schüler hinzufügen
        </button>
      </SmartSidebar>,
    );
    const drawer = () =>
      screen.queryByRole('complementary', { name: 'Werkzeugleiste' });

    await userEvent.click(openSheetButton()!);
    await userEvent.keyboard('{Escape}');
    expect(drawer()).not.toBeInTheDocument();
    expect(openSheetButton()).toHaveFocus();

    await userEvent.click(openSheetButton()!);
    // An entry with a panel of its own leaves the drawer open behind it …
    await userEvent.click(
      screen.getByRole('button', { name: 'Schüler hinzufügen' }),
    );
    expect(drawer()).toBeInTheDocument();
    // … an action closes it, so the stage shows what it did.
    await userEvent.click(screen.getByRole('button', { name: 'Sitzkreis' }));
    expect(drawer()).not.toBeInTheDocument();
  });

  // No head with a title and a close button: the switch, Escape and a tap
  // beside the drawer close it.
  it('closes the phone drawer on a tap beside it, without a close button', async () => {
    setWidth(390);
    render(
      <>
        <SmartSidebar>
          <p>Optionen-Inhalt</p>
        </SmartSidebar>
        <p>Bühne</p>
      </>,
    );
    const drawer = () =>
      screen.queryByRole('complementary', { name: 'Werkzeugleiste' });

    await userEvent.click(openSheetButton()!);
    expect(
      within(drawer()!).queryByRole('button', { name: /Schließen|Close/i }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByText('Optionen-Inhalt'));
    expect(drawer()).toBeInTheDocument();

    await userEvent.click(screen.getByText('Bühne'));
    expect(drawer()).not.toBeInTheDocument();
  });

  it('floats nothing over the stage on a phone inside the shell', () => {
    setWidth(390);

    renderSidebarInShell();

    // The status bar carries the switch there (`StatusBarFrame`); a second,
    // floating one would be a second coloured button over the stage.
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('gives a tablet a real column', () => {
    setWidth(820);

    renderSidebar();

    // The regression this guards: an iPad in portrait used to get the phone UI
    // and could never see the options and the canvas at once.
    expect(sidebarColumn()).toBeInTheDocument();
    expect(openSheetButton()).not.toBeInTheDocument();
  });

  it('starts the tablet column collapsed', () => {
    setWidth(820);

    renderSidebar();

    expect(sidebarColumn()).toHaveAttribute('data-expanded', 'false');
    expect(
      screen.getByRole('button', { name: 'Werkzeugleiste erweitern' }),
    ).toBeInTheDocument();
  });

  it('ignores a stored desktop preference on a tablet', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.sidebarExpanded, 'true');
    setWidth(820);

    renderSidebar();

    // 288px of sidebar would leave a 900px scene under 500px of width. The
    // stored value was made on a laptop and stays there.
    expect(sidebarColumn()).toHaveAttribute('data-expanded', 'false');
  });

  it('starts the desktop column collapsed on a first visit', () => {
    setWidth(1440);

    renderSidebar();

    // No stored preference yet: the tour and the Help dialog point out the
    // toggle, so the sidebar does not open expanded on its own.
    expect(sidebarColumn()).toHaveAttribute('data-expanded', 'false');
  });

  it('still honours the stored preference on a desktop', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.sidebarExpanded, 'true');
    setWidth(1440);

    renderSidebar();

    expect(sidebarColumn()).toHaveAttribute('data-expanded', 'true');
  });

  it('lets the tablet column be expanded without writing that back', async () => {
    setWidth(820);

    renderSidebar();
    await userEvent.click(
      screen.getByRole('button', { name: 'Werkzeugleiste erweitern' }),
    );

    expect(sidebarColumn()).toHaveAttribute('data-expanded', 'true');
    // Session state: the next visit on the tablet opens with the canvas at full
    // width again, and the laptop's own preference is untouched.
    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.sidebarExpanded)).toBe(
      'false',
    );
  });

  it('writes the toggle back on a desktop', async () => {
    setWidth(1440);

    renderSidebar();
    await userEvent.click(
      screen.getByRole('button', { name: 'Werkzeugleiste erweitern' }),
    );

    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.sidebarExpanded)).toBe(
      'true',
    );
  });

  it('leaves the switch to the status bar inside the shell', () => {
    renderSidebarInShell();

    expect(sidebarColumn()).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Werkzeugleiste erweitern' }),
    ).not.toBeInTheDocument();
  });
});
