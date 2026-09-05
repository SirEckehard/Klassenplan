// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The sidebar is where the tablet tier is actually visible. Below `md` it is a
 * floating button and a full-screen sheet; from `md` up it is a real column, on
 * a tablet starting as the 88px rail so the canvas keeps its width.
 */
import '@testing-library/jest-dom/vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import i18n from '@/i18n';
import SmartSidebar from '../SmartSidebar';
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

const sidebarColumn = () => screen.queryByRole('complementary');
const openSheetButton = () =>
  screen.queryByRole('button', { name: 'Optionen öffnen' });

beforeEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage('de');
});

afterEach(() => {
  setWidth(1024);
});

describe('SmartSidebar layout tiers', () => {
  it('gives a phone a floating trigger instead of a column', () => {
    setWidth(390);

    renderSidebar();

    expect(openSheetButton()).toBeInTheDocument();
    expect(sidebarColumn()).not.toBeInTheDocument();
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

    expect(sidebarColumn()).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.getByRole('button', { name: 'Sidebar erweitern' }),
    ).toBeInTheDocument();
  });

  it('ignores a stored desktop preference on a tablet', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.sidebarExpanded, 'true');
    setWidth(820);

    renderSidebar();

    // 288px of sidebar would leave a 900px scene under 500px of width. The
    // stored value was made on a laptop and stays there.
    expect(sidebarColumn()).toHaveAttribute('aria-expanded', 'false');
  });

  it('still honours the stored preference on a desktop', () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.sidebarExpanded, 'true');
    setWidth(1440);

    renderSidebar();

    expect(sidebarColumn()).toHaveAttribute('aria-expanded', 'true');
  });

  it('lets the tablet column be expanded without writing that back', async () => {
    setWidth(820);

    renderSidebar();
    await userEvent.click(
      screen.getByRole('button', { name: 'Sidebar erweitern' }),
    );

    expect(sidebarColumn()).toHaveAttribute('aria-expanded', 'true');
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
      screen.getByRole('button', { name: 'Sidebar erweitern' }),
    );

    expect(localStorage.getItem(LOCAL_STORAGE_KEYS.sidebarExpanded)).toBe(
      'true',
    );
  });
});
