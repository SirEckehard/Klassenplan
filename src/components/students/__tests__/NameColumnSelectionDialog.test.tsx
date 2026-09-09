// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NameColumnSelectionDialog from '@/components/students/NameColumnSelectionDialog';
import { getButton } from '@/__tests__/utils';
import { CSV_PRESETS } from '@/utils/csv/csvPresets';
import type { NameColumnInfo } from '@/utils/data/csvUtils';

const webUntis = CSV_PRESETS.find((preset) => preset.id === 'webuntis')!;

const nameInfo: NameColumnInfo = {
  hasFirstName: true,
  hasLastName: true,
  hasFullName: false,
  firstNameKey: 'vorname',
  lastNameKey: 'nachname',
};

const previewData = [
  { vorname: 'Anna', nachname: 'Müller', klasse: '5a' },
  { vorname: 'Ben', nachname: 'Schmidt', klasse: '8b' },
  { vorname: 'Cem', nachname: 'Yilmaz', klasse: '5a' },
];

const importButton = () => getButton(/^(Importieren|Import)$/i);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('NameColumnSelectionDialog', () => {
  test('offers all three name combinations when both columns exist', () => {
    render(
      <NameColumnSelectionDialog
        open
        nameInfo={nameInfo}
        previewData={previewData}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  test('offers the dedicated name column as its own option', () => {
    render(
      <NameColumnSelectionDialog
        open
        nameInfo={{ ...nameInfo, hasFullName: true, fullNameKey: 'name' }}
        previewData={[{ ...previewData[0], name: 'A. Müller' }]}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('radio', { name: /Ganzer Name|Whole name/i }),
    ).toBeInTheDocument();
  });

  test('names the recognised export format', () => {
    render(
      <NameColumnSelectionDialog
        open
        nameInfo={nameInfo}
        previewData={previewData}
        preset={webUntis}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText(/WebUntis/)).toBeInTheDocument();
  });

  test('lets the teacher import without the recognised preset', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <NameColumnSelectionDialog
        open
        nameInfo={nameInfo}
        previewData={previewData}
        preset={webUntis}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole('checkbox', {
        name: /Ohne Vorlage importieren|Import without the preset/i,
      }),
    );
    await user.click(importButton());

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ usePreset: false }),
    );
  });

  test('preselects the mode the preset suggests', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <NameColumnSelectionDialog
        open
        nameInfo={nameInfo}
        previewData={previewData}
        preset={webUntis}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    await user.click(importButton());

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ mode: webUntis.defaultNameMode }),
    );
  });

  test('asks which class to import and previews that one', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <NameColumnSelectionDialog
        open
        nameInfo={nameInfo}
        previewData={previewData}
        classOptions={['5a', '8b']}
        classKey="klasse"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    // The first class is preselected, so the preview shows its students only.
    expect(screen.getByText('Anna')).toBeInTheDocument();
    expect(screen.queryByText('Ben')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole('combobox'), '8b');
    expect(screen.getByText('Ben')).toBeInTheDocument();

    await user.click(importButton());

    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ className: '8b' }),
    );
  });
});
