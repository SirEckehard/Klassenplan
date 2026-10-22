// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import InspectorTitleField from '../InspectorTitleField';

afterEach(() => {
  cleanup();
});

type Props = React.ComponentProps<typeof InspectorTitleField>;

const renderField = (overrides: Partial<Props> = {}) => {
  const onCommit = vi.fn<Props['onCommit']>(() => null);
  const result = render(
    <h2>
      <InspectorTitleField
        label="Name des Raums"
        value="Klassenraum"
        problemFor={(draft) => (draft.trim() === 'Labor' ? 'taken' : null)}
        onCommit={onCommit}
        takenMessage="Diesen Namen trägt schon ein anderer Raum."
        {...overrides}
      />
    </h2>,
  );
  return { onCommit, ...result };
};

const nameButton = () => screen.getByRole('button', { name: 'Klassenraum' });
const field = () => screen.getByRole('textbox', { name: 'Name des Raums' });

describe('InspectorTitleField', () => {
  it('names the thing in the heading, opening as a field when pressed', () => {
    renderField();

    expect(
      screen.getByRole('heading', { name: 'Klassenraum' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();

    fireEvent.click(nameButton());
    expect(field()).toHaveValue('Klassenraum');
  });

  it('keeps a new name on Enter and closes, the focus back on the name', async () => {
    const { onCommit, rerender } = renderField();

    fireEvent.click(nameButton());
    fireEvent.change(field(), { target: { value: 'Raum 104' } });
    fireEvent.keyDown(field(), { key: 'Enter' });

    await waitFor(() => expect(onCommit).toHaveBeenCalledWith('Raum 104'));
    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());

    rerender(
      <h2>
        <InspectorTitleField
          label="Name des Raums"
          value="Raum 104"
          onCommit={onCommit}
        />
      </h2>,
    );
    expect(screen.getByRole('button', { name: 'Raum 104' })).toHaveFocus();
  });

  it('keeps a new name when the field is left', async () => {
    const { onCommit } = renderField();

    fireEvent.click(nameButton());
    fireEvent.change(field(), { target: { value: 'Raum 104' } });
    fireEvent.blur(field());

    await waitFor(() => expect(onCommit).toHaveBeenCalledWith('Raum 104'));
  });

  it('refuses a taken name under the field and stays open', () => {
    const { onCommit } = renderField();

    fireEvent.click(nameButton());
    fireEvent.change(field(), { target: { value: 'Labor' } });
    fireEvent.keyDown(field(), { key: 'Enter' });

    expect(onCommit).not.toHaveBeenCalled();
    expect(field()).toHaveAttribute('aria-invalid', 'true');
    expect(field()).toHaveAccessibleDescription(/anderer Raum/);
  });

  it('stays open when the name is refused after all', async () => {
    const onCommit = vi.fn<Props['onCommit']>(async () => 'taken' as const);
    renderField({ onCommit, problemFor: undefined });

    fireEvent.click(nameButton());
    fireEvent.change(field(), { target: { value: 'Labor' } });
    fireEvent.keyDown(field(), { key: 'Enter' });

    await waitFor(() =>
      expect(field()).toHaveAttribute('aria-invalid', 'true'),
    );
  });

  it('takes a typed name back on Escape', () => {
    const { onCommit } = renderField();

    fireEvent.click(nameButton());
    fireEvent.change(field(), { target: { value: 'Entwurf' } });
    fireEvent.keyDown(field(), { key: 'Escape' });

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(nameButton()).toHaveFocus();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('goes back to the old name when emptied, unless it may stay empty', async () => {
    const { onCommit } = renderField();

    fireEvent.click(nameButton());
    fireEvent.change(field(), { target: { value: '  ' } });
    fireEvent.keyDown(field(), { key: 'Enter' });

    await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
    expect(onCommit).not.toHaveBeenCalled();
    cleanup();

    const optional = renderField({ optional: true });
    fireEvent.click(nameButton());
    fireEvent.change(field(), { target: { value: '' } });
    fireEvent.keyDown(field(), { key: 'Enter' });

    await waitFor(() => expect(optional.onCommit).toHaveBeenCalledWith(''));
  });

  it('shows the placeholder for an empty value', () => {
    renderField({ value: '', placeholder: 'Neuer Plan' });

    expect(
      screen.getByRole('button', { name: 'Neuer Plan' }),
    ).toBeInTheDocument();
  });

  it('opens on a request, one standing as it mounts included', async () => {
    renderField({ focusRequest: 1 });

    await waitFor(() => expect(field()).toHaveFocus());
  });

  it('opens on a new request, not on the one it has seen', async () => {
    const onCommit = vi.fn(() => null);
    const field0 = (request: number) => (
      <h2>
        <InspectorTitleField
          label="Name des Raums"
          value="Klassenraum"
          onCommit={onCommit}
          focusRequest={request}
        />
      </h2>
    );
    const { rerender } = render(field0(0));
    expect(screen.queryByRole('textbox')).toBeNull();

    rerender(field0(1));
    await waitFor(() => expect(field()).toHaveFocus());
  });

  it('saves under the typed name on Ctrl/⌘+S', () => {
    const onSaveShortcut = vi.fn();
    const { onCommit } = renderField({ onSaveShortcut });

    fireEvent.click(nameButton());
    fireEvent.change(field(), { target: { value: 'Raum 104' } });
    fireEvent.keyDown(field(), { key: 's', ctrlKey: true });

    expect(onSaveShortcut).toHaveBeenCalledWith('Raum 104');
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('shows the name as plain text while it cannot be changed', () => {
    renderField({ disabled: true });

    expect(
      screen.getByRole('heading', { name: 'Klassenraum' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
