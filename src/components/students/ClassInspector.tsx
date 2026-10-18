// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import ClassPanel from '@/components/library/inspectors/ClassPanel';
import { useClassDialogs } from '@/contexts/ClassDialogsContext';
import { useClassManagementContext } from '@/contexts/seatingPlan/ClassManagementContext';
import { useSeatingPlanState } from '@/contexts/SeatingPlanContext';

/**
 * The class layer's inspector while no student is open there: the class
 * itself, as the room layer's shows the room while nothing is selected. It is
 * the panel "Bibliothek" shows for a class, read from the live state — the
 * name, school year and notes changed in place, what the class holds, and
 * the removal pinned to the bottom.
 */
export default function ClassInspector() {
  const { activeClass, classSummaries, updateClassMetadata } =
    useClassManagementContext();
  const { students, rooms, seatingHistory } = useSeatingPlanState();
  const { requestDelete } = useClassDialogs();
  const classId = activeClass.id;
  if (!classId) return null;

  return (
    <ClassPanel
      name={activeClass.name}
      label={activeClass.label}
      notes={activeClass.notes}
      studentCount={students.length}
      roomCount={rooms.length}
      planCount={seatingHistory.length}
      lastUsedAt={activeClass.lastUsedAt}
      otherNames={classSummaries
        .filter((entry) => entry.id !== classId)
        .map((entry) => entry.name)}
      onCommit={(patch) => updateClassMetadata(classId, patch)}
      onDelete={() => requestDelete(classId)}
    />
  );
}
