// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

describe('CanvasSettingsButton icon grid', () => {
  it('renders one aria-pressed chip per feature type inside a labelled group', () => {
    renderWithFeatureGroup();
    const group = screen.getByRole('group', { name: 'Raumelemente' });
    const chips = group.querySelectorAll('button[aria-pressed]');
    expect(chips).toHaveLength(FEATURE_TYPES.length);
    chips.forEach((chip) => {
      expect(chip).toHaveAttribute('aria-pressed', 'true');
      expect(chip.getAttribute('aria-label')).toBeTruthy();
    });
  });

  it('toggles a chip with the flipped value', () => {
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

  it('does not fire for disabled chips', () => {
    const onToggle = vi.fn();
    renderWithFeatureGroup({
      onToggle,
      isDisabled: (type) => type === 'podium',
    });
    const chip = screen.getByRole('button', { name: 'layout.podium' });
    expect(chip).toBeDisabled();
    fireEvent.click(chip);
    expect(onToggle).not.toHaveBeenCalled();
  });
});
