import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import '@/i18n/i18n';
import HelpButton from '../buttons/HelpButton';

describe('HelpButton', () => {
  it('closes on ESC', async () => {
    render(<HelpButton title="Test" instructions={<div>Help Content</div>} />);

    await userEvent.click(screen.getByRole('button', { name: /hilfe|help/i }));
    expect(screen.getByText('Help Content')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('Help Content')).not.toBeInTheDocument();
  });

  it('shows shortcuts when selecting the shortcuts tab', async () => {
    render(
      <HelpButton
        title="Test"
        instructions={<div>Help Content</div>}
        shortcutContexts={['students']}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /hilfe|help/i }));
    expect(
      screen.getByRole('tab', { name: /Anleitung|Instructions/i }),
    ).toHaveAttribute('aria-selected', 'true');

    await userEvent.click(
      screen.getByRole('tab', { name: /Tastenkürzel|Shortcuts/i }),
    );
    expect(
      screen.getByRole('tab', { name: /Tastenkürzel|Shortcuts/i }),
    ).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/Allgemein|General/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Schüler|Students/i).length).toBeGreaterThan(0);
  });

  it('opens on ? shortcut', async () => {
    render(<HelpButton title="Test" instructions={<div>Help Content</div>} />);
    expect(screen.queryByText('Help Content')).not.toBeInTheDocument();

    await userEvent.keyboard('?');
    expect(screen.getByText('Help Content')).toBeInTheDocument();
  });
});
