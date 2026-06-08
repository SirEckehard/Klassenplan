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
      !updatedStudents[targetPosition]
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
