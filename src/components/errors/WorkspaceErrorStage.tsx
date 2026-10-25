// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useInspector } from '@/contexts/InspectorContext';
import { useShellToolRail } from '@/contexts/ToolRailContext';
import {
  workspaceLayerClass,
  workspaceStageClass,
} from '@/components/shell/shellTokens';

/**
 * Where a layer's error fallback stands: on the stage, as a card of readable
 * width in its middle, the way the first screen's card does. Spread across the
 * layer it ran the full width under the header and left an empty inspector
 * column beside it, so the inspector is suspended while it is shown — the
 * view that would have filled it is gone — and so is the toolbar's switch in
 * the status bar, since that view drew the toolbar too.
 */
export default function WorkspaceErrorStage({
  children,
}: {
  children: React.ReactNode;
}) {
  const { setSuspended } = useInspector();
  const setToolRailSuspended = useShellToolRail()?.setSuspended;

  React.useEffect(() => {
    setSuspended(true);
    setToolRailSuspended?.(true);
    return () => {
      setSuspended(false);
      setToolRailSuspended?.(false);
    };
  }, [setSuspended, setToolRailSuspended]);

  return (
    <div className={workspaceLayerClass}>
      {/* `my-auto` rather than `items-center`: a card taller than the stage —
          the details opened — scrolls from its top instead of being cut off. */}
      <div className={`${workspaceStageClass} flex justify-center`}>
        <div className="my-auto w-full max-w-xl">{children}</div>
      </div>
    </div>
  );
}
