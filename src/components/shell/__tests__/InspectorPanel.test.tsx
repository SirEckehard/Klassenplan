// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  InspectorChoice,
  InspectorRow,
} from '@/components/shell/InspectorPanel';
import ToggleSwitch from '@/components/ui/controls/ToggleSwitch';

function SwitchRow({ labelsControl }: { labelsControl?: boolean }) {
  const [checked, setChecked] = React.useState(false);
  return (
    <InspectorRow label="Unruhig" labelsControl={labelsControl}>
      <ToggleSwitch checked={checked} onChange={setChecked} label="Unruhig" />
    </InspectorRow>
  );
}

describe('InspectorRow', () => {
  it('operates its switch from the name when the row labels it', () => {
    render(<SwitchRow labelsControl />);

    // A fingertip on the name, beside the 28×16px switch.
    fireEvent.click(screen.getByText('Unruhig'));

    expect(screen.getByRole('switch', { name: 'Unruhig' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('leaves the switch alone on a tap on the name of a plain row', () => {
    render(<SwitchRow />);

    fireEvent.click(screen.getByText('Unruhig'));

    expect(screen.getByRole('switch', { name: 'Unruhig' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });
});

function RoleList({ mixed }: { mixed?: ReadonlySet<string> }) {
  const [value, setValue] = React.useState<string | undefined>();
  return (
    <InspectorRow label="Soziale Rolle" stacked>
      <InspectorChoice
        label="Soziale Rolle"
        layout="list"
        value={value}
        onChange={setValue}
        mixedValues={mixed}
        options={[
          { value: 'mediator', label: 'Mediator' },
          { value: 'leader', label: 'Anführer' },
        ]}
      />
    </InspectorRow>
  );
}

describe('InspectorChoice as a list', () => {
  it('presses an option and lets it go on a second press', () => {
    render(<RoleList />);
    const leader = screen.getByRole('button', { name: /Anführer/ });

    fireEvent.click(leader);
    expect(leader).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Mediator/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );

    // "Not decided" stays reachable, as with the chips.
    fireEvent.click(leader);
    expect(leader).toHaveAttribute('aria-pressed', 'false');
  });

  it('announces what only some of a selection have as half pressed', () => {
    render(<RoleList mixed={new Set(['mediator'])} />);

    expect(screen.getByRole('button', { name: /Mediator/ })).toHaveAttribute(
      'aria-pressed',
      'mixed',
    );
  });
});
