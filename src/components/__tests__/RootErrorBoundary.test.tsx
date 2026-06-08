import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import RootErrorBoundary from '../RootErrorBoundary';
import i18n from '@/i18n';

test('renders fallback UI on error', () => {
  const ProblemChild = () => {
    throw new Error('boom');
  };
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  render(
    <RootErrorBoundary>
      <ProblemChild />
    </RootErrorBoundary>,
  );

  // Fallback shows the generic error heading (i18n key: common:errors.generic)
  expect(
    screen.getByText(i18n.t('errors.generic', { ns: 'common' })),
  ).toBeInTheDocument();
  // Reload button is present
  expect(
    screen.getByRole('button', {
      name: i18n.t('common.reloadPage', { ns: 'common' }),
    }),
  ).toBeInTheDocument();
  // Error details section contains the original error message
  expect(screen.getByText('boom')).toBeInTheDocument();
  errorSpy.mockRestore();
});
