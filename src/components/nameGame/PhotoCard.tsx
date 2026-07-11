// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useIsDarkMode } from '@/hooks/useIsDarkMode';
import { getStudentAppearance } from '@/utils/ui/studentAppearance';
import type { Student } from '@/types';

type PhotoCardProps = {
  student: Student;
  photoUrl: string | undefined;
  /** Alt text; keep it neutral in quiz contexts so it never leaks the name. */
  alt: string;
  className?: string;
};

/**
 * Read-only student photo used by the name game. Falls back to the
 * gender-tinted initial when the photo is not (yet) available.
 */
export default function PhotoCard({
  student,
  photoUrl,
  alt,
  className = '',
}: PhotoCardProps) {
  const isDark = useIsDarkMode();

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={alt}
        draggable={false}
        className={`h-full w-full select-none object-cover ${className}`}
      />
    );
  }

  const appearance = getStudentAppearance(student, isDark);
  const initial = student.name.trim().charAt(0).toUpperCase();
  return (
    <div
      role="img"
      aria-label={alt}
      className={`flex h-full w-full items-center justify-center text-4xl font-bold ${className}`}
      style={{
        backgroundColor: appearance.fill,
        color: appearance.text,
      }}
    >
      {initial}
    </div>
  );
}
