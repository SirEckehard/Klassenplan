// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render as rtlRender, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AddressBookTabsIcon } from '@phosphor-icons/react';
import '@/i18n/i18n';
import HelpButton from '../buttons/HelpButton';
import { InspectorProvider, useInspector } from '@/contexts/InspectorContext';

// The help links to the FAQ, so it needs a router around it.
const render = (ui: React.ReactElement) =>
  rtlRender(ui, { wrapper: MemoryRouter });

// One real topic of the class list's help.
const topics = [{ key: 'help.students.classes', icon: AddressBookTabsIcon }];
const topicHeading = () =>
  screen.queryByRole('heading', { name: /^(Klassen|Classes)$/ });

describe('HelpButton', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    // jsdom has no `scrollTo` on elements; a test that gives one takes it back.
    delete (HTMLElement.prototype as Partial<HTMLElement>).scrollTo;
  });

  it('closes on ESC', async () => {
    render(<HelpButton title="Test" topics={topics} />);

    await userEvent.click(screen.getByRole('button', { name: /hilfe|help/i }));
    expect(topicHeading()).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(topicHeading()).not.toBeInTheDocument();
  });

  it('unfolds the keyboard shortcuts on request', async () => {
    render(
      <HelpButton
        title="Test"
        topics={topics}
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

  it('scrolls the shortcuts it unfolds into view', async () => {
    // jsdom lays nothing out: the panel's body stands from 0 to 300, and
    // everything in it from 250 to 900, below its fold.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        const isBody = this.classList.contains('overflow-y-auto');
        return { top: isBody ? 0 : 250, bottom: isBody ? 300 : 900 } as DOMRect;
      },
    );
    const scrollTo = vi.fn();
    HTMLElement.prototype.scrollTo = scrollTo;

    render(
      <HelpButton
        title="Test"
        topics={topics}
        shortcutContexts={['students']}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /hilfe|help/i }));
    expect(scrollTo).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole('button', { name: /Tastenkürzel|Shortcuts/i }),
    );
    // Taller than the body: its row stops 12px under the body's top.
    expect(scrollTo).toHaveBeenCalledWith(
      expect.objectContaining({ top: 238 }),
    );
  });

  it('lists the projection’s keys without the workspace’s', async () => {
    render(<HelpButton title="Test" shortcutContexts={['present']} />);

    await userEvent.click(screen.getByRole('button', { name: /hilfe|help/i }));
    expect(
      screen.getByRole('heading', { name: /^(Präsentation|Presentation)$/ }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Allgemein|General/i)).not.toBeInTheDocument();
  });

  it('shows the shortcuts at once where there are no instructions', async () => {
    render(<HelpButton title="Test" shortcutContexts={['students']} />);

    await userEvent.click(screen.getByRole('button', { name: /hilfe|help/i }));
    expect(screen.getByText(/Allgemein|General/i)).toBeInTheDocument();
  });

  it('closes from its own button and hands the focus back', async () => {
    render(<HelpButton title="Test" topics={topics} />);

    const trigger = screen.getByRole('button', { name: /^(hilfe|help)$/i });
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(
      screen.getByRole('button', { name: /Hilfe schließen|Close help/i }),
    );
    expect(topicHeading()).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('takes the place of the inspector in the shell', async () => {
    const Shell = () => {
      const { setHelpSlotNode, helpOpen, selectStudent } = useInspector();
      return (
        <>
          <HelpButton title="Test" topics={topics} />
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
    expect(screen.getByTestId('help-slot')).toContainElement(topicHeading());

    // Opening a student puts the help away.
    await userEvent.click(screen.getByRole('button', { name: 'open student' }));
    expect(topicHeading()).not.toBeInTheDocument();
  });

  it('opens on ? shortcut', async () => {
    render(<HelpButton title="Test" topics={topics} />);
    expect(topicHeading()).not.toBeInTheDocument();

    await userEvent.keyboard('?');
    expect(topicHeading()).toBeInTheDocument();
  });

  it('closes itself before starting the tour', async () => {
    let tourStarts = 0;
    render(
      <HelpButton
        title="Test"
        topics={topics}
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
    expect(topicHeading()).not.toBeInTheDocument();
  });

  it('offers no tour without a handler', async () => {
    render(<HelpButton title="Test" topics={topics} />);

    await userEvent.click(screen.getByRole('button', { name: /hilfe|help/i }));

    expect(
      screen.queryByRole('button', { name: /Tour starten|Start tour/i }),
    ).not.toBeInTheDocument();
  });

  it('leads to the FAQ at the section that answers this screen', async () => {
    render(<HelpButton title="Test" topics={topics} faqSection="layout" />);

    await userEvent.click(screen.getByRole('button', { name: /hilfe|help/i }));

    expect(
      screen.getByRole('link', { name: /Häufige Fragen|FAQ/i }),
    ).toHaveAttribute('href', '/faq#layout');
  });

  it('leads to the whole FAQ where no section is named', async () => {
    render(<HelpButton title="Test" topics={topics} />);

    await userEvent.click(screen.getByRole('button', { name: /hilfe|help/i }));

    expect(
      screen.getByRole('link', { name: /Häufige Fragen|FAQ/i }),
    ).toHaveAttribute('href', '/faq');
  });
});
