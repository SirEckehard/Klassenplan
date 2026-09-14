// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import SeatingHistoryToolbar from '@/components/SeatingPlanGenerator/canvas/SeatingHistoryToolbar';
import FloatingMixButton from '@/components/ui/buttons/FloatingMixButton';

interface SeatingCanvasToolbarProps {
  onMix: () => Promise<void>;
  isMixing: boolean;
}

/**
 * Canvas overlay row for step 3: undo/redo and mix.
 *
 * Sits where the layout editor puts its undo/redo, so the same gesture works
 * in both steps.
 */
export default function SeatingCanvasToolbar({
  onMix,
  isMixing,
}: SeatingCanvasToolbarProps) {
  return (
    <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2">
      <SeatingHistoryToolbar />
      <FloatingMixButton
        onMix={onMix}
        isLoading={isMixing}
        disabled={isMixing}
      />
    </div>
  );
}
