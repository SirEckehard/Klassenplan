import React from 'react';
import SeatingPlanContextMenus from '@/components/SeatingPlanGenerator/SeatingPlanContextMenus';
import SeatingPlanViewContent from '@/components/SeatingPlanGenerator/views/SeatingPlanViewContent';
import { useSeatingPlanViewLogic } from '@/hooks/ui/useSeatingPlanViewLogic';
import type { SeatingPlanViewProps } from './seatingPlanView.types';

export type Props = SeatingPlanViewProps;

const SeatingPlanViewInner = React.memo(function SeatingPlanViewInner(
  props: Props,
) {
  const { layoutEditorSection, seatingEditorProps, saveTemplateModalProps } =
    useSeatingPlanViewLogic(props);

  return (
    <SeatingPlanViewContent
      step={props.step}
      layoutEditorSection={layoutEditorSection}
      seatingEditorProps={seatingEditorProps}
      saveTemplateModalProps={saveTemplateModalProps}
    />
  );
});

export default function SeatingPlanView(props: Props) {
  return (
    <SeatingPlanContextMenus>
      <SeatingPlanViewInner {...props} />
    </SeatingPlanContextMenus>
  );
}
