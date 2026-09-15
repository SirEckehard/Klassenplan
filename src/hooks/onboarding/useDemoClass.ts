// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { logError, logWarn, showToast, TOAST_MESSAGES } from '@/utils';
import {
  buildDemoClassroomScene,
  buildDemoStudents,
  findDemoClass,
  type DemoClassLanguage,
} from '@/utils/demo/demoClass';
import { renderDemoAvatarBlob } from '@/utils/image/demoAvatar';
import {
  removeStudentPhoto,
  saveStudentPhoto,
} from '@/hooks/student/studentPhotoCache';
import { useClassManagementContext } from '@/contexts/seatingPlan/ClassManagementContext';

const LOG_SOURCE = 'useDemoClass';

const DEMO_CLASS_LANGUAGES: readonly DemoClassLanguage[] = ['de', 'en'];

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
 * Creates the sample class (`utils/demo/demoClass.ts`) as a new, active class,
 * or switches to it when it already exists.
 *
 * Nothing is overwritten: the sample is an ordinary class next to the teacher's
 * own ones, named "Beispielklasse" and deleted the way any class is. There is
 * only ever one — a second copy of invented data helps nobody, so asking again
 * opens the existing one.
 */
export function useDemoClass() {
  const { t, i18n } = useTranslation('generator');
  const { classSummaries, activeClass, createClass, selectClass } =
    useClassManagementContext();
  const [isLoadingDemoClass, setIsLoadingDemoClass] = useState(false);

  // Every language's name: a sample class created on /de is still found on /en.
  // Until the English bundle is loaded its lookup falls back to the German name.
  const demoClass = findDemoClass(
    classSummaries,
    DEMO_CLASS_LANGUAGES.map((language) =>
      i18n.getFixedT(language, 'generator')('demoClass.className'),
    ),
  );
  const demoClassId = demoClass?.id ?? null;

  const loadDemoClass = useCallback((): Promise<boolean> => {
    if (pendingLoad) {
      return pendingLoad;
    }

    if (demoClassId) {
      pendingLoad = selectClass(demoClassId).finally(() => {
        pendingLoad = null;
      });
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
            name: t('demoClass.className'),
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
  }, [createClass, demoClassId, i18n, selectClass, t]);

  return {
    loadDemoClass,
    isLoadingDemoClass,
    /** Loading would switch to the existing sample class instead. */
    hasDemoClass: demoClassId !== null,
    /** The open class is the sample class: offering it again means nothing. */
    isDemoClassActive: demoClassId !== null && demoClassId === activeClass.id,
  };
}
