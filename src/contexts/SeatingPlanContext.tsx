// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
export { SeatingPlanGeneratorProvider } from '@/contexts/seatingPlan/SeatingPlanProviders';

export {
  useSeatingPlanState,
  useOptionalSeatingPlanActions,
  useSeatingPlanActions,
  useSeatingPlan,
  useSeatingPlanSelector,
} from '@/contexts/seatingPlan/store';

export type {
  SeatingPlanState,
  SeatingPlanActions,
  SeatingPlanSnapshot,
  SeatingPlanCombined,
} from '@/contexts/seatingPlan/store';

export { useStudentManagementContext } from '@/contexts/seatingPlan/StudentManagementContext';

export type { StudentManagementContextValue } from '@/contexts/seatingPlan/StudentManagementContext';

export { useClassroomLayoutContext } from '@/contexts/seatingPlan/ClassroomLayoutContext';

export type { ClassroomLayoutContextValue } from '@/contexts/seatingPlan/ClassroomLayoutContext';

export { useSeatingAlgorithmContext } from '@/contexts/seatingPlan/SeatingAlgorithmContext';

export type { SeatingAlgorithmContextValue } from '@/contexts/seatingPlan/SeatingAlgorithmContext';
