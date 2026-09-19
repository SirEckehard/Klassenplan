// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ErrorReportLink from '../ErrorReportLink';
import { getButton } from '@/__tests__/utils';
import i18n from '@/i18n';

const label = (key: string) => i18n.t(key, { ns: 'common' });

function mockClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
}

describe('ErrorReportLink', () => {
  beforeEach(() => {
    mockClipboard(() => Promise.resolve());
  });

  test('prepares a mail with the error code, the area and the technical lines', () => {
    render(
      <ErrorReportLink
        error={new Error('boom')}
        area="LayoutEditor"
        tone="amber"
      />,
    );

    const link = screen.getByRole('link', {
      name: label('errors.report.mailLink'),
    });
    const href = link.getAttribute('href') ?? '';
    expect(href.startsWith('mailto:')).toBe(true);

    const [, query] = href.split('?');
    const params = new URLSearchParams(query);
    const code = screen.getByText(/^KP-/).textContent ?? '';

    expect(params.get('subject')).toContain(code);
    const body = params.get('body') ?? '';
    expect(body).toContain(label('errors.report.mailPrompt'));
    expect(body).toContain(`Code: ${code}`);
    expect(body).toContain('Area: LayoutEditor');
    expect(body).toContain('Error: Error: boom');
  });

  test('copies the technical lines to the clipboard', async () => {
    const writeText = vi.fn((_text: string) => Promise.resolve());
    // userEvent.setup() installs its own clipboard stub, so ours goes after it.
    const user = userEvent.setup();
    mockClipboard(writeText);

    render(<ErrorReportLink error={new Error('boom')} area="App" tone="red" />);
    await user.click(getButton(label('errors.report.copy')));

    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain('Area: App');
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        label('errors.report.copied'),
      ),
    );
  });

  test('says so when the clipboard refuses', async () => {
    const user = userEvent.setup();
    mockClipboard(() => Promise.reject(new Error('denied')));

    render(<ErrorReportLink error={new Error('boom')} area="App" tone="red" />);
    await user.click(getButton(label('errors.report.copy')));

    // The label alone is not announced once the button already has focus, so
    // the result has to reach the live region.
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        label('errors.report.copyFailed'),
      ),
    );
  });

  test('offers the details for selection when copying is impossible', async () => {
    const user = userEvent.setup();
    mockClipboard(() => Promise.reject(new Error('denied')));

    render(<ErrorReportLink error={new Error('boom')} area="App" tone="red" />);
    expect(screen.queryByLabelText(label('errors.report.detailsLabel'))).toBe(
      null,
    );

    await user.click(getButton(label('errors.report.copy')));

    const details = await screen.findByLabelText(
      label('errors.report.detailsLabel'),
    );
    expect(details).toHaveTextContent('Area: App');
  });

  test('prepares a mail even when the error message ends in an emoji', () => {
    // A message long enough to be cut right through a surrogate pair: the
    // encode step used to throw here and take the whole error screen with it.
    const message = `${'a'.repeat(299)}🙂 tail`;

    render(
      <ErrorReportLink error={new Error(message)} area="App" tone="red" />,
    );

    const link = screen.getByRole('link', {
      name: label('errors.report.mailLink'),
    });
    expect(link.getAttribute('href')).toContain('mailto:');
  });
});
