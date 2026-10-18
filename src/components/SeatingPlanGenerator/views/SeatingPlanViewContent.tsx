// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import CanvasInteractionLayer, {
  type CanvasInteractionLayerProps,
  type CanvasInteractionHandlers,
} from '@/components/SeatingPlanGenerator/canvas/CanvasInteractionLayer';
import SeatingPlanEditorView from '@/components/SeatingPlanGenerator/SeatingPlanEditorView';

type LayoutEditorSectionProps = {
  canvasProps: Omit<CanvasInteractionLayerProps, 'children'>;
  renderLayoutEditor: (handlers: CanvasInteractionHandlers) => React.ReactNode;
};

type SeatingPlanViewContentProps = {
  step: number;
  layoutEditorSection?: LayoutEditorSectionProps | null;
  seatingEditorProps?: React.ComponentProps<
    typeof SeatingPlanEditorView
  > | null;
};

const SeatingPlanViewContent = React.memo(function SeatingPlanViewContent({
  step,
  layoutEditorSection = null,
  seatingEditorProps = null,
}: SeatingPlanViewContentProps) {
  const shouldShowLayoutEditor = step === 2 && layoutEditorSection;

  if (shouldShowLayoutEditor && layoutEditorSection) {
    return (
      <CanvasInteractionLayer {...layoutEditorSection.canvasProps}>
        {(handlers) => layoutEditorSection.renderLayoutEditor(handlers)}
      </CanvasInteractionLayer>
    );
  }
  return seatingEditorProps ? (
    <SeatingPlanEditorView {...seatingEditorProps} />
  ) : null;
});

export type { LayoutEditorSectionProps };
export default SeatingPlanViewContent;
