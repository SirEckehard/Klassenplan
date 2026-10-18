// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * A class in its inspector — the class layer's and "Bibliothek"'s: name,
 * school year and notes are changed where they are read.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import ClassPanel from '../ClassPanel';

const renderPanel = () => {
  const onCommit = vi.fn(() => Promise.resolve(true));
  const onDelete = vi.fn();
  render(
    <ClassPanel
      name="7b"
      label="2026/27"
      notes="Montags im Physikraum"
      studentCount={24}
      roomCount={2}
      planCount={5}
      otherNames={['7a', '8c']}
      onCommit={onCommit}
      onDelete={onDelete}
    />,
  );
  return { onCommit, onDelete };
};

const field = (name: RegExp) => screen.getByRole('textbox', { name });

afterEach(cleanup);

describe('ClassPanel', () => {
  it('renames the class on Enter, refusing a name another class carries', () => {
    const { onCommit } = renderPanel();
    const name = field(/^Name$/);

    fireEvent.change(name, { target: { value: '7A' } });
    fireEvent.keyDown(name, { key: 'Enter' });
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.change(name, { target: { value: '7c' } });
    fireEvent.keyDown(name, { key: 'Enter' });
    expect(onCommit).toHaveBeenCalledWith({ name: '7c' });
  });

  it('keeps the school year when the field is left, an emptied one too', () => {
    const { onCommit } = renderPanel();
    const schoolYear = field(/^(Schuljahr|School year)$/);

    fireEvent.change(schoolYear, { target: { value: '' } });
    fireEvent.blur(schoolYear);

    expect(onCommit).toHaveBeenCalledWith({ label: '' });
  });

  it('takes a new line in the notes and keeps them when the field is left', () => {
    const { onCommit } = renderPanel();
    const notes = field(/^(Notizen|Notes)$/);

    fireEvent.keyDown(notes, { key: 'Enter' });
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.change(notes, {
      target: { value: 'Montags im Physikraum\nFreitags Sport' },
    });
    fireEvent.blur(notes);
    expect(onCommit).toHaveBeenCalledWith({
      notes: 'Montags im Physikraum\nFreitags Sport',
    });
  });

  it('takes a change back on Escape', () => {
    const { onCommit } = renderPanel();
    const schoolYear = field(/^(Schuljahr|School year)$/);

    fireEvent.change(schoolYear, { target: { value: '2027/28' } });
    fireEvent.keyDown(schoolYear, { key: 'Escape' });
    expect(schoolYear).toHaveValue('2026/27');
    fireEvent.blur(schoolYear);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('removes the class from its pinned footer', () => {
    const { onDelete } = renderPanel();
    fireEvent.click(
      screen.getByRole('button', { name: /Klasse löschen|Delete class/i }),
    );
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
