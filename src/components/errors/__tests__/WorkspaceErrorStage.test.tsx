// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InspectorProvider, useInspector } from '@/contexts/InspectorContext';
import { ToolRailProvider, useShellToolRail } from '@/contexts/ToolRailContext';
import SeatingPlanErrorFallback from '@/components/errors/SeatingPlanErrorFallback';

function SuspendedProbe() {
  const { suspended } = useInspector();
  const toolRail = useShellToolRail();
  return (
    <>
      <output aria-label="inspector">{String(suspended)}</output>
      <output aria-label="toolbar">{String(toolRail?.suspended)}</output>
    </>
  );
}

describe('WorkspaceErrorStage', () => {
  it('suspends the inspector and the toolbar switch while a layer shows its error, and lets it go after', () => {
    const { rerender } = render(
      <ToolRailProvider>
        <InspectorProvider>
          <SuspendedProbe />
          <SeatingPlanErrorFallback
            error={new Error('boom')}
            onRetry={vi.fn()}
            variant="plan"
          />
        </InspectorProvider>
      </ToolRailProvider>,
    );
    expect(screen.getByLabelText('inspector')).toHaveTextContent('true');
    expect(screen.getByLabelText('toolbar')).toHaveTextContent('true');
    expect(
      screen.getByRole('heading', { name: /Sitzplan-Ansicht|seating plan/i }),
    ).toBeInTheDocument();

    rerender(
      <ToolRailProvider>
        <InspectorProvider>
          <SuspendedProbe />
        </InspectorProvider>
      </ToolRailProvider>,
    );
    expect(screen.getByLabelText('inspector')).toHaveTextContent('false');
    expect(screen.getByLabelText('toolbar')).toHaveTextContent('false');
  });
});
