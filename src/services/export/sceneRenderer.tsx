// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ReactElement } from 'react';
import type { ClassroomScene, SeatingArrangement, Student } from '@/types';
import type { CircleLayout } from '@/types/Circle';
import type { FeatureVisibilityFlags } from '@/utils/ui';
import SceneSvg from '@/components/scene/SceneSvg';
import CirclePrintView from '@/components/circle/CirclePrintView';

export type ExportClassMetadata = {
  name?: string | null;
  label?: string | null;
  notes?: string | null;
};

type ServerRenderer = typeof import('react-dom/server.browser');

let rendererPromise: Promise<ServerRenderer> | null = null;

export async function preloadRenderer(): Promise<ServerRenderer> {
  if (!rendererPromise) {
    rendererPromise = import('react-dom/server.browser');
  }
  return rendererPromise;
}

async function ensureRenderer(): Promise<ServerRenderer> {
  return preloadRenderer();
}

async function renderMarkup(element: ReactElement): Promise<string> {
  const renderer = await ensureRenderer();
  return renderer.renderToStaticMarkup(element);
}

export async function renderSceneSvg(
  scene: ClassroomScene,
  seating: SeatingArrangement,
  title?: string,
  options?: {
    allStudents?: Student[];
    photoDataUrls?: ReadonlyMap<string, string>;
    showSpecialNeeds?: boolean;
    featureVisibility?: FeatureVisibilityFlags;
    lockSeatLabelOrientation?: boolean;
    seatLabelRotation?: number;
    orientation?: 'landscape' | 'portrait';
    /** Rotate the classroom 180° while names stay upright (see `SceneSvg`). */
    flipped?: boolean;
    showFullNames?: boolean;
    photoDisplayMode?: 'all' | 'off';
    showLegend?: boolean;
    classMetadata?: ExportClassMetadata;
  },
): Promise<string> {
  return renderMarkup(
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <SceneSvg
        scene={scene}
        seating={seating}
        allStudents={options?.allStudents}
        photoUrls={options?.photoDataUrls}
        title={title}
        classMetadata={options?.classMetadata}
        showSpecialNeeds={options?.showSpecialNeeds}
        featureVisibility={options?.featureVisibility}
        lockSeatLabelOrientation={options?.lockSeatLabelOrientation}
        seatLabelRotation={options?.seatLabelRotation}
        orientation={options?.orientation}
        flipped={options?.flipped}
        showFullNames={options?.showFullNames}
        photoDisplayMode={options?.photoDisplayMode}
        showLegend={options?.showLegend}
      />
    </div>,
  );
}

/**
 * Render circle layout to SVG for PDF export
 */
export async function renderCircleSvg(
  circleLayout: CircleLayout,
  title?: string,
  options?: {
    showSpecialNeeds?: boolean;
    showConnections?: boolean;
    orientation?: 'landscape' | 'portrait';
    showFullNames?: boolean;
    classMetadata?: ExportClassMetadata;
    photoDataUrls?: ReadonlyMap<string, string>;
    photoDisplayMode?: 'all' | 'off';
    showLegend?: boolean;
  },
): Promise<string> {
  return renderMarkup(
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <CirclePrintView
        layout={circleLayout}
        title={title}
        classMetadata={options?.classMetadata}
        showSpecialNeeds={options?.showSpecialNeeds ?? true}
        showConnections={options?.showConnections ?? true}
        orientation={options?.orientation}
        showFullNames={options?.showFullNames}
        photoDataUrls={options?.photoDataUrls}
        photoDisplayMode={options?.photoDisplayMode}
        showLegend={options?.showLegend}
      />
    </div>,
  );
}
