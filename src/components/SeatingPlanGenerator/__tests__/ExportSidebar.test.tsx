// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n/i18n';
import ExportSidebar from '../ExportSidebar';
import { resetDialogLayersForTests } from '@/hooks/ui/useDialogLayer';

const actions = {
  onTableOrientationChange: vi.fn(),
  onCircleOrientationChange: vi.fn(),
  onFlipViewChange: vi.fn(),
  onPrint: vi.fn(),
  onTablePdf: vi.fn(),
  onCirclePdf: vi.fn(),
  onPngExport: vi.fn(),
  onSvgExport: vi.fn(),
};

function Harness({ hasCircleLayout = true }: { hasCircleLayout?: boolean }) {
  const [title, setTitle] = React.useState('7b');
  return (
    <>
      <ExportSidebar
        title={title}
        onTitleChange={setTitle}
        tableOrientation="portrait"
        circleOrientation="landscape"
        showViewDirection
        flipView={false}
        hasCircleLayout={hasCircleLayout}
        {...actions}
      />
      <output data-testid="title">{title}</output>
    </>
  );
}

const titleButton = () =>
  screen.getByRole('button', { name: /^(Titel bearbeiten|Edit Title)$/ });

beforeEach(() => {
  localStorage.clear();
  resetDialogLayersForTests();
  vi.clearAllMocks();
});

describe('ExportSidebar — collapsed', () => {
  it('edits the title in a flyout; Enter closes it', () => {
    render(<Harness />);

    expect(screen.getByRole('complementary')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    fireEvent.click(titleButton());

    const input = screen.getByRole('textbox', { name: /^(Titel|Title)$/ });
    expect(screen.getByRole('dialog')).toContainElement(input);
    expect(input).toHaveFocus();
    expect(titleButton()).toHaveAttribute('aria-expanded', 'true');

    fireEvent.change(input, { target: { value: '7b Mathe' } });
    expect(screen.getByTestId('title')).toHaveTextContent('7b Mathe');

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(titleButton()).toHaveFocus();
    // The sidebar stayed narrow.
    expect(screen.getByRole('complementary')).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('switches the orientation and offers every export', () => {
    render(<Harness />);

    fireEvent.click(
      screen.getByRole('button', {
        name: /(Seitenformat Sitzplan|Seating Plan Format): (Hochformat|Portrait)/,
      }),
    );
    expect(actions.onTableOrientationChange).toHaveBeenCalledWith('landscape');

    fireEvent.click(
      screen.getByRole('button', { name: /^(Sitzkreis PDF|Circle Plan PDF)$/ }),
    );
    expect(actions.onCirclePdf).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /^(Drucken|Print)$/ }));
    expect(actions.onPrint).toHaveBeenCalledTimes(1);
  });

  it('leaves out the circle PDF without a circle', () => {
    render(<Harness hasCircleLayout={false} />);

    expect(
      screen.queryByRole('button', { name: /Sitzkreis PDF|Circle Plan PDF/ }),
    ).not.toBeInTheDocument();
  });
});

describe('ExportSidebar — expanded', () => {
  it('shows the title field and both orientation choices', () => {
    render(<Harness />);
    fireEvent.click(
      screen.getByRole('button', { name: /Sidebar erweitern|Expand sidebar/ }),
    );

    expect(
      screen.getByRole('textbox', { name: /^(Titel|Title)$/ }),
    ).toHaveValue('7b');
    expect(
      screen.getAllByRole('button', { name: /^(Querformat|Landscape)$/ }),
    ).toHaveLength(2);
  });
});
