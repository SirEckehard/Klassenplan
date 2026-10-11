// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InspectorSelect from '../InspectorSelect';

const OPTIONS = [
  { value: 'leader', label: 'Anführer' },
  { value: 'loner', label: 'Einzelgänger' },
] as const;

const renderSelect = (
  props: Partial<React.ComponentProps<typeof InspectorSelect<string>>> = {},
) => {
  const onChange = vi.fn();
  render(
    <InspectorSelect<string>
      label="Soziale Rolle"
      family="social"
      notSetLabel="Keine"
      value={undefined}
      options={OPTIONS}
      onChange={onChange}
      {...props}
    />,
  );
  return { onChange, user: userEvent.setup() };
};

const trigger = () => screen.getByRole('button', { name: /^Soziale Rolle:/ });

describe('InspectorSelect', () => {
  it('names the value on the button and opens the values as a menu', async () => {
    const { user } = renderSelect({ value: 'leader' });
    expect(trigger()).toHaveAccessibleName('Soziale Rolle: Anführer');
    expect(trigger()).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger());

    const menu = await screen.findByRole('dialog', { name: 'Soziale Rolle' });
    expect(menu).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Anführer', pressed: true }),
    ).toBeInTheDocument();
  });

  it('sets the chosen value, closes the menu and returns the focus', async () => {
    const { onChange, user } = renderSelect();
    await user.click(trigger());
    await user.click(
      await screen.findByRole('button', { name: 'Einzelgänger' }),
    );

    expect(onChange).toHaveBeenCalledExactlyOnceWith('loner');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it('takes a value back through the first row', async () => {
    const { onChange, user } = renderSelect({ value: 'leader' });
    await user.click(trigger());
    await user.click(await screen.findByRole('button', { name: 'Keine' }));

    expect(onChange).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it('says a selection that does not agree is mixed', async () => {
    const { user } = renderSelect({ mixedValues: new Set(['loner']) });
    expect(trigger()).toHaveAccessibleName(/^Soziale Rolle: (Gemischt|Mixed)$/);

    await user.click(trigger());

    expect(
      await screen.findByRole('button', { name: 'Einzelgänger' }),
    ).toHaveAttribute('aria-pressed', 'mixed');
    expect(screen.getByRole('button', { name: 'Keine' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
