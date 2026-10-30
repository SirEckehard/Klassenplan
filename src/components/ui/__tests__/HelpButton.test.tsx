// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render as rtlRender, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import '@/i18n/i18n';
import HelpButton from '../buttons/HelpButton';
import { InspectorProvider, useInspector } from '@/contexts/InspectorContext';

// The help links to the FAQ, so it needs a router around it.
const render = (ui: React.ReactElement) =>
  rtlRender(ui, { wrapper: MemoryRouter });

describe('HelpButton', () => {
  it('closes on ESC', async () => {
    render(<HelpButton title="Test" instructions={<div>Help Content</div>} />);

    await userEvent.click(screen.getByRole('button', { name: /hilfe|help/i }));
    expect(screen.getByText('Help Content')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('Help Content')).not.toBeInTheDocument();
  });

  it('unfolds the keyboard shortcuts on request', async () => {
    render(
      <HelpButton
        title="Test"
        instructions={<div>Help Content</div>}
        shortcutContexts={['students']}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /hilfe|help/i }));
    const toggle = screen.getByRole('button', {
      name: /Tastenkürzel|Shortcuts/i,
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/Allgemein|General/i)).not.toBeInTheDocument();

    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Allgemein|General/i)).toBeInTheDocument();
  });

  it('shows the shortcuts at once where there are no instructions', async () => {
    render(<HelpButton title="Test" shortcutContexts={['students']} />);

    await userEvent.click(screen.getByRole('button', { name: /hilfe|help/i }));
    expect(screen.getByText(/Allgemein|General/i)).toBeInTheDocument();
  });

  it('closes from its own button and hands the focus back', async () => {
    render(<HelpButton title="Test" instructions={<div>Help Content</div>} />);

    const trigger = screen.getByRole('button', { name: /^(hilfe|help)$/i });
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(
      screen.getByRole('button', { name: /Hilfe schließen|Close help/i }),
    );
    expect(screen.queryByText('Help Content')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('takes the place of the inspector in the shell', async () => {
    const Shell = () => {
      const { setHelpSlotNode, helpOpen, selectStudent } = useInspector();
      return (
        <>
          <HelpButton title="Test" instructions={<div>Help Content</div>} />
          {helpOpen && <div ref={setHelpSlotNode} data-testid="help-slot" />}
          <button type="button" onClick={() => selectStudent('s1')}>
            open student
          </button>
        </>
      );
    };
    render(
      <InspectorProvider>
        <Shell />
      </InspectorProvider>,
    );

    await userEvent.click(
      screen.getByRole('button', { name: /^(hilfe|help)$/i }),
    );
    expect(screen.getByTestId('help-slot')).toContainElement(
      screen.getByText('Help Content'),
    );

    // Opening a student puts the help away.
    await userEvent.click(screen.getByRole('button', { name: 'open student' }));
    expect(screen.queryByText('Help Content')).not.toBeInTheDocument();
  });

  it('opens on ? shortcut', async () => {
    render(<HelpButton title="Test" instructions={<div>Help Content</div>} />);
    expect(screen.queryByText('Help Content')).not.toBeInTheDocument();

    await userEvent.keyboard('?');
    expect(screen.getByText('Help Content')).toBeInTheDocument();
  });

  it('closes itself before starting the tour', async () => {
    let tourStarts = 0;
    render(
      <HelpButton
        title="Test"
        instructions={<div>Help Content</div>}
        onStartTour={() => {
          tourStarts += 1;
        }}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /hilfe|help/i }));
    await userEvent.click(
      screen.getByRole('button', { name: /Tour starten|Start tour/i }),
    );

    expect(tourStarts).toBe(1);
    expect(screen.queryByText('Help Content')).not.toBeInTheDocument();
  });

  it('offers no tour without a handler', async () => {
    render(<HelpButton title="Test" instructions={<div>Help Content</div>} />);

    await userEvent.click(screen.getByRole('button', { name: /hilfe|help/i }));

    expect(
      screen.queryByRole('button', { name: /Tour starten|Start tour/i }),
    ).not.toBeInTheDocument();
  });

  it('leads to the FAQ at the section that answers this screen', async () => {
    render(
      <HelpButton
        title="Test"
        instructions={<div>Help Content</div>}
        faqSection="layout"
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /hilfe|help/i }));

    expect(
      screen.getByRole('link', { name: /Häufige Fragen|FAQ/i }),
    ).toHaveAttribute('href', '/faq#layout');
  });

  it('leads to the whole FAQ where no section is named', async () => {
    render(<HelpButton title="Test" instructions={<div>Help Content</div>} />);

    await userEvent.click(screen.getByRole('button', { name: /hilfe|help/i }));

    expect(
      screen.getByRole('link', { name: /Häufige Fragen|FAQ/i }),
    ).toHaveAttribute('href', '/faq');
  });
});
