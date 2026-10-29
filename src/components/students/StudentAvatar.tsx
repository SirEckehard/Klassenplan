// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { UserIcon } from '@phosphor-icons/react';
import type { Student } from '@/types';
import { useIsDarkMode } from '@/hooks/useIsDarkMode';
import { useStudentPhoto } from '@/hooks/student/useStudentPhoto';
import {
  getAvatarFrame,
  getStudentAppearance,
} from '@/utils/ui/studentAppearance';

type Props = {
  student: Student;
  /** Edge length in pixels. */
  size?: number;
  className?: string;
};

/**
 * A student's face, or the stand-in for one — to look at, not to press.
 *
 * The row is itself one thing to click, so the avatar is no control of its
 * own: uploading and cropping belong to the one student the inspector is
 * showing (`StudentPhotoButton`); the list only has to say who this is. Its frame is the one the student's photo wears on
 * the plan, in the gender's contour (`getAvatarFrame`).
 */
function StudentAvatar({ student, size = 32, className = '' }: Props) {
  const isDark = useIsDarkMode();
  const { objectUrl } = useStudentPhoto(student.id, student.hasPhoto);
  const appearance = getStudentAppearance(student, isDark);
  const initial = student.name.trim().charAt(0).toUpperCase();

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 rounded-full border-solid bg-(--surface-card) ${className}`}
      style={{
        width: size,
        height: size,
        ...getAvatarFrame(student, isDark, size),
      }}
    >
      <span
        className="flex h-full w-full items-center justify-center overflow-hidden rounded-full"
        style={{ backgroundColor: objectUrl ? undefined : appearance.fill }}
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
            className={`${size >= 48 ? 'text-lg' : 'text-xs'} font-semibold`}
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
    </span>
  );
}

export default React.memo(StudentAvatar);
