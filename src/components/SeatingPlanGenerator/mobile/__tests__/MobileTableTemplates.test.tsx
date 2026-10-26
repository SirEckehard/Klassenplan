// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import MobileTableTemplates from '../MobileTableTemplates';

describe('MobileTableTemplates', () => {
  // The buttons show only the seat count ("2 Pl."); a screen reader has to
  // hear which table they add.
  it('names each table by its kind and its seats', () => {
    render(<MobileTableTemplates onTemplatePointerDown={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: /^(Einzelplatz|Single seat).*1/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^(Doppelplatz|Double seat).*2/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^(4er-Gruppe|Group of 4).*4/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^(6er-Gruppe|Group of 6).*6/i }),
    ).toBeInTheDocument();
  });
});
