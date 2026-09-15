// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { logError, logWarn, showToast, TOAST_MESSAGES } from '@/utils';
import {
  buildDemoClassroomScene,
  buildDemoStudents,
  pickDemoClassName,
} from '@/utils/demo/demoClass';
import { renderDemoAvatarBlob } from '@/utils/image/demoAvatar';
import {
  removeStudentPhoto,
  saveStudentPhoto,
} from '@/hooks/student/studentPhotoCache';
import { useClassManagementContext } from '@/contexts/seatingPlan/ClassManagementContext';

const LOG_SOURCE = 'useDemoClass';

/**
 * The load in progress. Several entry points on screen or a double click must
 * still produce one class.
 */
let pendingLoad: Promise<boolean> | null = null;

/** Pictures of a class that was not created must not linger until the next start-up sweep. */
function discardPhotos(ids: Iterable<string>): void {
  for (const id of ids) {
    removeStudentPhoto(id).catch((error: unknown) => {
      logWarn('Failed to remove a sample class picture', { error }, LOG_SOURCE);
    });
  }
}

/**
 * Creates the sample class (`utils/demo/demoClass.ts`) as a new, active class.
 *
 * Nothing is overwritten: the sample is an ordinary class next to the teacher's
 * own ones, named "Beispielklasse" (or "Beispielklasse 2", …) and deleted the
 * way any class is.
 */
export function useDemoClass() {
  const { t, i18n } = useTranslation('generator');
  const { classSummaries, createClass } = useClassManagementContext();
  const [isLoadingDemoClass, setIsLoadingDemoClass] = useState(false);

  const loadDemoClass = useCallback((): Promise<boolean> => {
    if (pendingLoad) {
      return pendingLoad;
    }

    setIsLoadingDemoClass(true);
    const savedPhotoIds = new Set<string>();

    pendingLoad = (async () => {
      const language = (i18n.resolvedLanguage ?? i18n.language).startsWith('en')
        ? 'en'
        : 'de';
      const students = buildDemoStudents(language);

      try {
        // Pictures are stored before the class, so `hasPhoto` is only ever set
        // for a picture that really is in the store. The start-up orphan sweep
        // cannot take them in between: it only runs when a class collection is
        // loaded, and the next load already contains these students.
        await Promise.all(
          students.map(async (student, index) => {
            const blob = await renderDemoAvatarBlob(index, student.gender);
            if (!blob) {
              return;
            }
            try {
              await saveStudentPhoto(student.id, blob);
              savedPhotoIds.add(student.id);
            } catch (error) {
              logWarn(
                'Failed to store a sample class picture',
                { error },
                LOG_SOURCE,
              );
            }
          }),
        );

        const created = await createClass(
          {
            name: pickDemoClassName(
              t('demoClass.className'),
              classSummaries.map((entry) => entry.name),
            ),
            label: t('demoClass.label'),
            notes: t('demoClass.notes'),
            students: students.map((student) =>
              savedPhotoIds.has(student.id)
                ? { ...student, hasPhoto: true }
                : student,
            ),
            classroomScene: buildDemoClassroomScene(students.length),
          },
          { activate: true },
        );

        // `createClass` has already told the teacher why it failed.
        if (!created) {
          discardPhotos(savedPhotoIds);
        }
        return created;
      } catch (error) {
        logError('Failed to load the sample class', { error }, LOG_SOURCE);
        showToast('error', TOAST_MESSAGES.CLASS_CREATE_ERROR);
        discardPhotos(savedPhotoIds);
        return false;
      }
    })().finally(() => {
      pendingLoad = null;
      setIsLoadingDemoClass(false);
    });

    return pendingLoad;
  }, [classSummaries, createClass, i18n, t]);

  return { loadDemoClass, isLoadingDemoClass };
}
