// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { CircleLayout } from '@/types/Circle';

export function updateCircleStudentPosition(
  layout: CircleLayout,
  studentId: string,
  newAngle: number,
): CircleLayout {
  const index = layout.students.findIndex(
    (position) => position.student.id === studentId,
  );
  if (index === -1) {
    return layout;
  }

  const radians = (newAngle * Math.PI) / 180;
  const newX = layout.center.x + layout.radius.horizontal * Math.cos(radians);
  const newY = layout.center.y + layout.radius.vertical * Math.sin(radians);

  const updatedStudents = layout.students.map((position, positionIndex) => {
    if (positionIndex !== index) {
      return position;
    }

    return {
      ...position,
      angle: newAngle,
      x: newX,
      y: newY,
    };
  });

  return {
    ...layout,
    students: updatedStudents,
    timestamp: Date.now(),
  };
}

/** Whether a student keeps their place in the circle. */
export function isCircleStudentLocked(
  layout: CircleLayout,
  studentId: string,
): boolean {
  return layout.lockedStudentIds?.includes(studentId) ?? false;
}

/** Locks a student to their place in the circle, or lets them go again. */
export function toggleCircleStudentLock(
  layout: CircleLayout,
  studentId: string,
): CircleLayout {
  if (!layout.students.some((position) => position.student?.id === studentId)) {
    return layout;
  }
  const locked = layout.lockedStudentIds ?? [];
  const next = locked.includes(studentId)
    ? locked.filter((id) => id !== studentId)
    : [...locked, studentId];
  return { ...layout, lockedStudentIds: next, timestamp: Date.now() };
}

/**
 * Puts the locked students of `previous` back on their places in `next`, a
 * circle generated afresh.
 *
 * The others keep the order the new circle gave them and flow around the
 * locked places; every place keeps its own angle and coordinates. A locked
 * student who is no longer in the class, or whose place the smaller circle
 * no longer has, is let go.
 */
export function restoreCircleLocks(
  next: CircleLayout,
  previous: CircleLayout | null | undefined,
): CircleLayout {
  const lockedIds = previous?.lockedStudentIds ?? [];
  if (!previous || lockedIds.length === 0) return next;

  const slotOf = new Map<number, (typeof next.students)[number]>();
  for (const id of lockedIds) {
    const oldIndex = previous.students.findIndex(
      (position) => position.student?.id === id,
    );
    const entry = next.students.find((position) => position.student?.id === id);
    if (oldIndex === -1 || !entry || oldIndex >= next.students.length) continue;
    if (!slotOf.has(oldIndex)) slotOf.set(oldIndex, entry);
  }
  if (slotOf.size === 0) return { ...next, lockedStudentIds: [] };

  const placed = new Set(
    [...slotOf.values()].map((position) => position.student.id),
  );
  const others = next.students.filter(
    (position) => !placed.has(position.student?.id),
  );
  const students = next.students.map((slot, index) => {
    const occupant = slotOf.get(index) ?? others.shift()!;
    return { ...occupant, angle: slot.angle, x: slot.x, y: slot.y };
  });

  return {
    ...next,
    students,
    lockedStudentIds: [...placed],
  };
}

export function swapCircleStudents(
  layout: CircleLayout,
  studentId: string,
  targetPosition: number,
): CircleLayout {
  if (
    targetPosition < 0 ||
    targetPosition >= layout.students.length ||
    !layout.students[targetPosition]
  ) {
    return layout;
  }
  // A locked student neither leaves their place nor gives it up.
  if (
    isCircleStudentLocked(layout, studentId) ||
    isCircleStudentLocked(layout, layout.students[targetPosition].student?.id)
  ) {
    return layout;
  }

  const sourceIndex = layout.students.findIndex(
    (position) => position.student.id === studentId,
  );

  if (
    sourceIndex === -1 ||
    sourceIndex === targetPosition ||
    !layout.students[sourceIndex]
  ) {
    return layout;
  }

  const updatedStudents = [...layout.students];
  const sourceStudent = updatedStudents[sourceIndex];
  const targetStudent = updatedStudents[targetPosition];

  updatedStudents[targetPosition] = {
    ...sourceStudent,
    angle: targetStudent.angle,
    x: targetStudent.x,
    y: targetStudent.y,
  };

  updatedStudents[sourceIndex] = {
    ...targetStudent,
    angle: sourceStudent.angle,
    x: sourceStudent.x,
    y: sourceStudent.y,
  };

  return {
    ...layout,
    students: updatedStudents,
    timestamp: Date.now(),
  };
}

export function batchSwapCircleStudents(
  layout: CircleLayout,
  swaps: Array<{ studentId: string; targetPosition: number }>,
): CircleLayout {
  if (!swaps.length) {
    return layout;
  }

  const studentIndexes = new Map(
    layout.students.map((position, index) => [position.student.id, index]),
  );
  const updatedStudents = [...layout.students];

  for (const { studentId, targetPosition } of swaps) {
    const sourceIndex = studentIndexes.get(studentId);
    if (
      sourceIndex === undefined ||
      targetPosition < 0 ||
      targetPosition >= updatedStudents.length ||
      sourceIndex === targetPosition ||
      !updatedStudents[sourceIndex] ||
      !updatedStudents[targetPosition] ||
      isCircleStudentLocked(layout, studentId) ||
      isCircleStudentLocked(layout, updatedStudents[targetPosition].student?.id)
    ) {
      continue;
    }

    const sourceStudent = updatedStudents[sourceIndex];
    const targetStudent = updatedStudents[targetPosition];

    updatedStudents[targetPosition] = {
      ...sourceStudent,
      angle: targetStudent.angle,
      x: targetStudent.x,
      y: targetStudent.y,
    };
    updatedStudents[sourceIndex] = {
      ...targetStudent,
      angle: sourceStudent.angle,
      x: sourceStudent.x,
      y: sourceStudent.y,
    };

    studentIndexes.set(studentId, targetPosition);
    studentIndexes.set(targetStudent.student.id, sourceIndex);
  }

  return {
    ...layout,
    students: updatedStudents,
    timestamp: Date.now(),
  };
}
