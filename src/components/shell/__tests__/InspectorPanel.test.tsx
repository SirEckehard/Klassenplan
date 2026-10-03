// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { InspectorRow } from '@/components/shell/InspectorPanel';
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
