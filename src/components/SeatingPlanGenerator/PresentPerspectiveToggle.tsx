// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { ChalkboardTeacherIcon, StudentIcon } from '@phosphor-icons/react';
import { primaryButtonClass, secondaryButtonClass } from '@/utils';
import type { PresentationPerspective } from '@/utils/ui/boardOrientation';

interface PresentPerspectiveToggleProps {
  perspective: PresentationPerspective;
  onChange: (perspective: PresentationPerspective) => void;
}

export default function PresentPerspectiveToggle({
  perspective,
  onChange,
}: PresentPerspectiveToggleProps) {
  const { t } = useTranslation('generator');
  const teacherActive = perspective === 'teacher';

  return (
    <div className="flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 p-1 shadow-inner dark:border-blue-900/40 dark:bg-gray-950/70">
      <button
        type="button"
        onClick={() => onChange('student')}
        className={`${
          !teacherActive ? primaryButtonClass : secondaryButtonClass
        } h-10 gap-2 px-4`}
        aria-pressed={!teacherActive}
        title={t(
          'present.studentViewTitle',
          'Sitzplan aus Sicht der Klasse zeigen – ohne Merkmale und Fotos',
        )}
      >
        <StudentIcon size={20} aria-hidden />
        <span className="text-sm font-semibold">
          {t('present.studentView', 'Schüleransicht')}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onChange('teacher')}
        className={`${
          teacherActive ? primaryButtonClass : secondaryButtonClass
        } h-10 gap-2 px-4`}
        aria-pressed={teacherActive}
        title={t(
          'present.teacherViewTitle',
          'Sitzplan aus Sicht der Lehrkraft zeigen',
        )}
      >
        <ChalkboardTeacherIcon size={20} aria-hidden />
        <span className="text-sm font-semibold">
          {t('present.teacherView', 'Lehreransicht')}
        </span>
      </button>
    </div>
  );
}
