// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { UserIcon } from '@phosphor-icons/react';
import type { Student } from '@/types';
import { useIsDarkMode } from '@/hooks/useIsDarkMode';
import { useStudentPhoto } from '@/hooks/student/useStudentPhoto';
import { getStudentAppearance } from '@/utils/ui/studentAppearance';

type Props = {
  student: Student;
  /** Edge length in pixels. */
  size?: number;
  className?: string;
};

/**
 * A student's face, or the stand-in for one — to look at, not to press.
 *
 * The class list used to put `StudentPhotoButton` in every row, which made the
 * avatar a control in a row that is itself one thing to click. Uploading and
 * cropping belong to the one student the inspector is showing; the list only
 * has to say who this is.
 */
function StudentAvatar({ student, size = 32, className = '' }: Props) {
  const isDark = useIsDarkMode();
  const { objectUrl } = useStudentPhoto(student.id, student.hasPhoto);
  const appearance = getStudentAppearance(student, isDark);
  const initial = student.name.trim().charAt(0).toUpperCase();

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: objectUrl ? undefined : appearance.fill,
        borderColor: appearance.stroke,
      }}
    >
      {objectUrl ? (
        <img
          src={objectUrl}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
      ) : initial ? (
        <span
          className="text-xs font-semibold"
          style={{ color: appearance.text }}
        >
          {initial}
        </span>
      ) : (
        <UserIcon
          size={Math.round(size * 0.5)}
          className="text-(--text-muted)"
        />
      )}
    </span>
  );
}

export default React.memo(StudentAvatar);
