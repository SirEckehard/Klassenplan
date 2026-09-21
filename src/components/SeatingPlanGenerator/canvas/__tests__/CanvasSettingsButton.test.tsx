// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CanvasSettingsButton } from '../CanvasSettingsButton';
import { buildFeatureVisibilityGroup } from '../featureVisibilityGroup';
import { FEATURE_TYPES } from '@/utils/ui';
import type { ClassroomFeatureType } from '@/types';

const renderWithFeatureGroup = ({
  onToggle = vi.fn(),
  isChecked = () => true,
  isDisabled = () => false,
}: {
  onToggle?: (type: ClassroomFeatureType, next: boolean) => void;
  isChecked?: (type: ClassroomFeatureType) => boolean;
  isDisabled?: (type: ClassroomFeatureType) => boolean;
} = {}) => {
  const t = ((key: string) => key) as Parameters<
    typeof buildFeatureVisibilityGroup
  >[0]['t'];
  render(
    <CanvasSettingsButton
      groups={[
        buildFeatureVisibilityGroup({
          id: 'test-features',
          title: 'Raumelemente',
          t,
          isChecked,
          isDisabled,
          onToggle,
        }),
      ]}
      buttonAriaLabel="Ansichtseinstellungen"
    />,
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Ansichtseinstellungen' }),
  );
};

describe('CanvasSettingsButton check list', () => {
  it('renders one pressed row per feature type inside a labelled group', () => {
    renderWithFeatureGroup();
    const group = screen.getByRole('group', { name: 'Raumelemente' });
    const rows = within(group).getAllByRole('button');
    expect(rows).toHaveLength(FEATURE_TYPES.length);
    rows.forEach((row) => {
      expect(row).toHaveAttribute('aria-pressed', 'true');
    });
  });

  // A menu row says what it is in words, not in a tooltip behind an icon.
  it('names every row in visible words', () => {
    renderWithFeatureGroup();
    const group = screen.getByRole('group', { name: 'Raumelemente' });

    for (const row of within(group).getAllByRole('button')) {
      expect(row).not.toHaveAttribute('aria-label');
      expect(row.textContent?.trim()).toMatch(/^layout\./);
    }
  });

  it('toggles a row with the flipped value', () => {
    const onToggle = vi.fn();
    renderWithFeatureGroup({
      onToggle,
      isChecked: (type) => type !== 'door',
    });
    fireEvent.click(screen.getByRole('button', { name: 'layout.door' }));
    expect(onToggle).toHaveBeenCalledWith('door', true);

    fireEvent.click(screen.getByRole('button', { name: 'layout.board' }));
    expect(onToggle).toHaveBeenCalledWith('board', false);
  });

  it('does not fire for disabled rows', () => {
    const onToggle = vi.fn();
    renderWithFeatureGroup({
      onToggle,
      isDisabled: (type) => type === 'podium',
    });
    const row = screen.getByRole('button', { name: 'layout.podium' });
    expect(row).toBeDisabled();
    fireEvent.click(row);
    expect(onToggle).not.toHaveBeenCalled();
  });
});

describe('CanvasSettingsButton choices', () => {
  it('checks the chosen value and switches to another one', () => {
    const onChange = vi.fn();
    render(
      <CanvasSettingsButton
        groups={[
          {
            id: 'photos',
            title: 'Schülerfotos',
            options: [
              {
                kind: 'segment',
                id: 'photo-mode',
                ariaLabel: 'Schülerfotos',
                value: 'all',
                onChange,
                choices: [
                  { value: 'all', label: 'An' },
                  { value: 'off', label: 'Aus' },
                ],
              },
            ],
          },
        ]}
        buttonAriaLabel="Ansichtseinstellungen"
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Ansichtseinstellungen' }),
    );

    expect(screen.getByRole('button', { name: 'An' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // The value it already has stays: one of them is always on.
    fireEvent.click(screen.getByRole('button', { name: 'An' }));
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Aus' }));
    expect(onChange).toHaveBeenCalledWith('off');
  });
});
