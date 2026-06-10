// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { CircleLayout } from '@/types/Circle';
import type { Student } from '@/types';
import { logError } from '@/utils';
import {
  exportCircleLayoutToPdf,
  buildPhotoDataUrlMap,
} from '@/utils/export/pdfExportFunctions';
import { renderCircleSvg } from '@/services/export/sceneRenderer';

/**
 * Export circle layout as PDF
 */
export async function exportCircleToPdf(
  circleLayout: CircleLayout,
  title?: string,
  options?: {
    showSpecialNeeds?: boolean;
    showConnections?: boolean;
    orientation?: 'landscape' | 'portrait';
    showFullNames?: boolean;
  },
): Promise<void> {
  try {
    await exportCircleLayoutToPdf(circleLayout, title, options);
  } catch (error) {
    logError('Circle PDF export failed', { error }, 'circlePdfExport');
    throw new Error('PDF-Export fehlgeschlagen', { cause: error });
  }
}

/**
 * Generate circle layout preview for export page
 */
export async function generateCirclePreview(
  circleLayout: CircleLayout,
  title?: string,
  options?: {
    showSpecialNeeds?: boolean;
    orientation?: 'landscape' | 'portrait';
    showFullNames?: boolean;
  },
): Promise<string> {
  const photoDataUrls = await buildPhotoDataUrlMap(
    circleLayout.students
      .map((entry) => entry.student)
      .filter((student): student is Student => Boolean(student)),
  );
  return renderCircleSvg(circleLayout, title, { ...options, photoDataUrls });
}
