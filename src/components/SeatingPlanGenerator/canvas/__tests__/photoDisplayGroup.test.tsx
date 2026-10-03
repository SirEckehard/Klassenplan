// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import type { PhotoDisplayMode } from '@/types';
import { buildPhotoDisplayGroup } from '../photoDisplayGroup';

const t = ((key: string) => key) as unknown as TFunction;

const choicesFor = (value: PhotoDisplayMode, hasHover: boolean) => {
  const [option] = buildPhotoDisplayGroup({
    id: 'photos',
    optionId: 'photo-mode',
    value,
    onChange: vi.fn(),
    hasHover,
    t,
  }).options;
  return option.kind === 'segment'
    ? option.choices.map((choice) => choice.value)
    : [];
};

describe('buildPhotoDisplayGroup', () => {
  it('offers "on hover" where the pointer hovers', () => {
    expect(choicesFor('all', true)).toEqual(['all', 'hover', 'off']);
  });

  // On a touch screen it showed a photo only while a finger rested on it.
  it('leaves "on hover" out on a touch screen', () => {
    expect(choicesFor('all', false)).toEqual(['all', 'off']);
  });

  it('keeps it while it is the one set, so it can be changed', () => {
    expect(choicesFor('hover', false)).toEqual(['all', 'hover', 'off']);
  });
});
