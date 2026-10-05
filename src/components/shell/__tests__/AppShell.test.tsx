// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * A page that reads the shell's contexts itself — "Bibliothek" — stands
 * inside `ShellProviders`, and the `AppShell` it renders shares them instead
 * of nesting a second set. Above them its hooks got the inert fallbacks, and
 * "Klasse hinzufügen" opened nothing.
 */
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { useClassDialogs } from '@/contexts/ClassDialogsContext';
import AppShell, { ShellProviders } from '../AppShell';

vi.mock('@/contexts/seatingPlan/ClassManagementContext', () => ({
  useClassManagementContext: () => ({
    classSummaries: [],
    activeClass: { id: null, name: '' },
    createClass: vi.fn(),
    updateClassMetadata: vi.fn(),
    deleteClass: vi.fn(),
  }),
}));
vi.mock('@/components/shell/Inspector', () => ({ default: () => null }));

function Page() {
  const { openCreate } = useClassDialogs();
  return (
    <AppShell header={null} statusBar={null}>
      <button type="button" onClick={openCreate}>
        Klasse hinzufügen
      </button>
    </AppShell>
  );
}

describe('ShellProviders', () => {
  it('gives a page the class dialogs its shell renders', async () => {
    render(
      <ShellProviders>
        <Page />
      </ShellProviders>,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Klasse hinzufügen' }),
    );

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    // One set of dialogs, not one per provider.
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });
});
