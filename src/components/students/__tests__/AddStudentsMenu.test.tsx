// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import '@/i18n';
import AddStudentsMenu from '@/components/students/AddStudentsMenu';

const baseProps = {
  studentCount: 12,
  newStudentName: '',
  onNewStudentNameChange: vi.fn(),
  onAddStudent: vi.fn(),
  placeholderCount: '10',
  onPlaceholderCountChange: vi.fn(),
  onCreatePlaceholders: vi.fn(),
};

const trigger = () =>
  screen.getByRole('button', { name: /^(Hinzufügen|Add)$/i });

// `FloatingDropdown` keeps the portal `visibility: hidden` until it has
// measured the anchor a frame later, so the dialog only enters the
// accessibility tree asynchronously.
const menu = () =>
  screen.findByRole('dialog', { name: /Schüler hinzufügen|Add student/i });

// The only free-text field in the menu; queried by role so the tests do not
// break every time the wording of its label changes.
const nameField = async () => within(await menu()).getByRole('textbox');

describe('AddStudentsMenu', () => {
  it('keeps every add path closed behind one trigger', () => {
    render(<AddStudentsMenu {...baseProps} onImportCsv={vi.fn()} />);

    expect(trigger()).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByRole('dialog', { name: /Schüler hinzufügen|Add student/i }),
    ).not.toBeInTheDocument();
  });

  it('focuses the name field on open so a class can be typed straight away', async () => {
    render(<AddStudentsMenu {...baseProps} />);
    const user = userEvent.setup();

    await user.click(trigger());

    const field = await nameField();
    await waitFor(() => expect(field).toHaveFocus());
  });

  it('adds on Enter and stays open for the next name', async () => {
    const onAddStudent = vi.fn();
    render(
      <AddStudentsMenu
        {...baseProps}
        newStudentName="Lena"
        onAddStudent={onAddStudent}
      />,
    );
    const user = userEvent.setup();

    await user.click(trigger());
    await user.type(await nameField(), '{Enter}');

    expect(onAddStudent).toHaveBeenCalledTimes(1);
    expect(await menu()).toBeInTheDocument();
  });

  it('offers the placeholder rows a class already has students can still need', async () => {
    const onCreatePlaceholders = vi.fn();
    render(
      <AddStudentsMenu
        {...baseProps}
        onCreatePlaceholders={onCreatePlaceholders}
      />,
    );
    const user = userEvent.setup();

    await user.click(trigger());
    await user.click(
      within(await menu()).getByRole('button', {
        name: /Platzhalter erstellen|Create placeholders/i,
      }),
    );

    expect(onCreatePlaceholders).toHaveBeenCalledTimes(1);
  });

  it('drops the placeholder section when the host does not wire it up', async () => {
    render(
      <AddStudentsMenu
        studentCount={12}
        newStudentName=""
        onNewStudentNameChange={vi.fn()}
        onAddStudent={vi.fn()}
      />,
    );
    const user = userEvent.setup();

    await user.click(trigger());

    expect(
      within(await menu()).queryByRole('button', {
        name: /Platzhalter erstellen|Create placeholders/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('closes on Escape and hands focus back to the trigger', async () => {
    render(<AddStudentsMenu {...baseProps} />);
    const user = userEvent.setup();

    await user.click(trigger());
    expect(await menu()).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', {
          name: /Schüler hinzufügen|Add student/i,
        }),
      ).not.toBeInTheDocument(),
    );
    expect(trigger()).toHaveFocus();
  });
});
