// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, lazy, Suspense } from 'react';
import SectionErrorBoundary from '@/components/errors/SectionErrorBoundary';
import StudentListErrorFallback from '@/components/errors/StudentListErrorFallback';
import SeatingPlanErrorFallback from '@/components/errors/SeatingPlanErrorFallback';
import StudentListSkeleton from '@/components/ui/feedback/StudentListSkeleton';
import CanvasSkeleton from '@/components/ui/feedback/CanvasSkeleton';
import {
  useSeatingPlanState,
  useSeatingPlanActions,
} from '@/contexts/SeatingPlanContext';
import { prefetchGeneratorSteps } from '@/utils/performance/generatorPrefetch';
import { isFormElementFocused } from '@/utils';

// Lazy load large components for better initial bundle size
const StudentInput = lazy(() => import('@/components/StudentInput'));
const EnhancedSeatingPlanView = lazy(
  () => import('@/components/SeatingPlanGenerator/EnhancedSeatingPlanView'),
);

export default function PlanControls() {
  const {
    step,
    students,
    classroomScene,
    currentSeating,
    mixSettings,
    planName,
    planNameError,
    planNameInputRef,
    autoMixing,
    autoMixError,
    seatingHistory,
    mixHistory,
    planUsage,
    lastStatistics,
    showStatisticsBadge,
    seatingMode,
    hasPendingStudentUpdates,
    statisticsHighlight,
  } = useSeatingPlanState();

  const {
    handleStepChange,
    addStudent,
    addBulkPlaceholderStudents,
    removeStudent,
    removeStudents,
    updateStudent,
    updateStudents,
    importCsv,
    downloadStudentsCsv,
    updateClassroomScene,
    generateSeatingPlan,
    setMixSettings,
    moveStudent,
    removeTables,
    setPlanName,
    handleSaveSeatingPlan: saveSeatingPlan,
    setPlanNameError,
    isSeatLocked,
    toggleLock,
    refineSeatingLocal,
    saveTemplate,
    updateTemplate,
    loadTemplate,
    deleteTemplate,
    renameTemplate,
    onMix,
    setShowStatisticsBadge,
    setSeatingMode,
    acknowledgeStudentUpdates,
    setStatisticsHighlight,
    setStatisticsHighlightMode,
    clearStatisticsHighlight,
  } = useSeatingPlanActions();
  useEffect(() => {
    prefetchGeneratorSteps(step);
  }, [step]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (!event.altKey) return;
      if (isFormElementFocused()) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextStep = Math.min(step + 1, 3);
        if (nextStep !== step) {
          void handleStepChange(nextStep);
        }
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const previousStep = Math.max(step - 1, 1);
        if (previousStep !== step) {
          void handleStepChange(previousStep);
        }
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [handleStepChange, step]);
  const seatingViewProps = {
    currentSeating,
    generateSeatingPlan,
    settings: mixSettings,
    setMixSettings,
    classroomScene,
    students,
    studentsCount: students.length,
    moveStudent,
    removeTables,
    planName,
    setPlanName,
    saveSeatingPlan,
    planNameError,
    setPlanNameError,
    planNameInputRef,
    autoMixing,
    autoMixError,
    isSeatLocked,
    toggleLock,
    onMix,
    refineSeatingLocal,
    onEditStudents: () => void handleStepChange(1),
    onEditLayout: () => void handleStepChange(2),
    onProceedToPlan: () => void handleStepChange(3),
    saveTemplate,
    updateTemplate,
    loadTemplate,
    deleteTemplate,
    renameTemplate,
    updateClassroomScene,
    lastStatistics,
    onCloseStatistics: () => setShowStatisticsBadge(false),
    onOpenStatistics: () => setShowStatisticsBadge(true),
    showStatisticsBadge,
    seatingMode,
    onModeChange: setSeatingMode,
    hasPendingStudentUpdates,
    onAcknowledgeStudentUpdates: acknowledgeStudentUpdates,
    statisticsHighlight,
    setStatisticsHighlight,
    setStatisticsHighlightMode,
    clearStatisticsHighlight,
    seatingHistory,
    mixHistory,
    planUsage,
  };
  const studentBoundaryResetKeys: ReadonlyArray<number> = [students.length];
  const layoutBoundaryResetKeys: ReadonlyArray<number> = [
    classroomScene.tables.length,
    students.length,
    step,
  ];
  const planBoundaryResetKeys: ReadonlyArray<number> = [
    currentSeating.length,
    students.length,
    step,
  ];

  return (
    <div>
      {step === 1 && (
        <Suspense fallback={<StudentListSkeleton />}>
          <SectionErrorBoundary
            name="StudentInputBoundary"
            resetKeys={studentBoundaryResetKeys}
            fallback={({ error, reset }) => (
              <StudentListErrorFallback error={error} onRetry={reset} />
            )}
          >
            <StudentInput
              students={students}
              addStudent={addStudent}
              addBulkPlaceholderStudents={addBulkPlaceholderStudents}
              removeStudent={removeStudent}
              removeStudents={removeStudents}
              updateStudent={updateStudent}
              updateStudents={updateStudents}
              importCsv={importCsv}
              downloadStudentsCsv={downloadStudentsCsv}
              onProceedToLayout={() => void handleStepChange(2)}
              onProceedToPlan={() => void handleStepChange(3)}
            />
          </SectionErrorBoundary>
        </Suspense>
      )}
      {step === 2 && (
        <Suspense fallback={<CanvasSkeleton />}>
          <SectionErrorBoundary
            name="LayoutEditorBoundary"
            resetKeys={layoutBoundaryResetKeys}
            fallback={({ error, reset }) => (
              <SeatingPlanErrorFallback
                error={error}
                onRetry={reset}
                variant="layout"
              />
            )}
          >
            <EnhancedSeatingPlanView {...seatingViewProps} step={2} />
          </SectionErrorBoundary>
        </Suspense>
      )}
      {step === 3 && (
        <Suspense fallback={<CanvasSkeleton />}>
          <SectionErrorBoundary
            name="SeatingPlanViewBoundary"
            resetKeys={planBoundaryResetKeys}
            fallback={({ error, reset }) => (
              <SeatingPlanErrorFallback
                error={error}
                onRetry={reset}
                variant="plan"
              />
            )}
          >
            <EnhancedSeatingPlanView {...seatingViewProps} step={3} />
          </SectionErrorBoundary>
        </Suspense>
      )}
    </div>
  );
}
