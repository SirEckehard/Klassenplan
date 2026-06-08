import React from 'react';
import CanvasInteractionLayer, {
  type CanvasInteractionLayerProps,
  type CanvasInteractionHandlers,
} from '@/components/SeatingPlanGenerator/canvas/CanvasInteractionLayer';
import SeatingPlanEditorView from '@/components/SeatingPlanGenerator/SeatingPlanEditorView';
import SaveTemplateModal from '@/components/ui/modals/SaveTemplateModal';

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
  saveTemplateModalProps: React.ComponentProps<typeof SaveTemplateModal>;
};

const SeatingPlanViewContent = React.memo(function SeatingPlanViewContent({
  step,
  layoutEditorSection = null,
  seatingEditorProps = null,
  saveTemplateModalProps,
}: SeatingPlanViewContentProps) {
  const shouldShowLayoutEditor = step === 2 && layoutEditorSection;

  return (
    <>
      {shouldShowLayoutEditor && layoutEditorSection ? (
        <CanvasInteractionLayer {...layoutEditorSection.canvasProps}>
          {(handlers) => layoutEditorSection.renderLayoutEditor(handlers)}
        </CanvasInteractionLayer>
      ) : seatingEditorProps ? (
        <SeatingPlanEditorView {...seatingEditorProps} />
      ) : null}
      <SaveTemplateModal {...saveTemplateModalProps} />
    </>
  );
});

export type { LayoutEditorSectionProps };
export default SeatingPlanViewContent;
