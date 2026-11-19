// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, PaintBrushIcon } from '@phosphor-icons/react';
import {
  dataChipClass,
  dataChipQuietClass,
  dataFamilyClass,
  secondaryButtonClass,
} from '@/utils';
import { touchHitAreaClass } from '@/components/shell/shellTokens';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';
import { BRUSH_MARKERS, type BrushKey } from './markerBrush';

/**
 * StudentListHeader
 *
 * Sticky caption row for the student list.
 *
 * Where the list is wide enough for its rows to be one line (`@2xl`, the
 * card being the container), it names the columns those rows have — number,
 * photo, name, attributes — beside the select-all checkbox. Below that the
 * rows stack their chips under the name and have no columns, so the head says
 * what its checkbox does instead ("Alle auswählen"), and on a phone how many
 * of the class a search or a filter left (`narrowing`), since the search's
 * line has no room for it there. With neither, it has nothing to say there.
 *
 * The columns line up with `StudentRow` by hand: both are flex rows with the
 * same gaps and the same fixed widths, which a real table cannot do while the
 * row has to fold its chips onto a second line.
 *
 * At its end the brush (decision 0051): pressed, the head becomes the
 * brush's — the markers to choose from, the question the chosen one asks of
 * the class with how many it holds for, and "Fertig" — and every row sets
 * or takes off that marker.
 *
 * Rendered as the first, sticky child inside the scroll container so it shares
 * the rows' content width (no scrollbar offset) and stays visible while
 * scrolling.
 */
type Props = {
  /**
   * Multi-select state for the visible students. Omitting `onToggleAllVisible`
   * hides the checkbox and its column, matching the rows.
   */
  allVisibleSelected?: boolean;
  /** True while only part of the visible students are selected. */
  someVisibleSelected?: boolean;
  onToggleAllVisible?: () => void;
  /** What a search or a filter left, said here on a phone. */
  narrowing?: React.ReactNode;
  /** The brush; without it the head offers none. */
  brush?: {
    /** The marker chosen, or null while the brush is put away. */
    active: BrushKey | null;
    /** How many of the students shown carry the chosen marker. */
    count: number;
    onChoose: (key: BrushKey) => void;
    onEnd: () => void;
  };
};

export default function StudentListHeader({
  allVisibleSelected = false,
  someVisibleSelected = false,
  onToggleAllVisible,
  narrowing,
  brush,
}: Props) {
  const { t } = useTranslation('students');
  const selectAllRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        !allVisibleSelected && someVisibleSelected;
    }
  }, [allVisibleSelected, someVisibleSelected]);

  const chosen = brush?.active
    ? BRUSH_MARKERS.find((marker) => marker.key === brush.active)
    : undefined;
  if (brush && chosen) {
    return (
      <div
        role="group"
        aria-label={t('brush.title')}
        className="sticky top-0 z-10 flex flex-col gap-1 border-b border-(--border-card) bg-(--surface-sunken) pt-1 pb-2"
      >
        <div className="flex items-center gap-2 pr-3">
          <div
            role="toolbar"
            aria-label={t('brush.markers')}
            // Room above and below inside the scroller: it clips both ways,
            // and took the focus ring's edges off.
            className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto px-3 py-1"
          >
            {BRUSH_MARKERS.map((marker) => {
              const pressed = marker.key === chosen.key;
              const Icon = marker.icon;
              return (
                <button
                  key={marker.key}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => brush.onChoose(marker.key)}
                  // The chosen marker in its family's fill, the others a quiet
                  // outline — no selection blue, which marks ticked rows.
                  className={`${dataChipClass} ${dataFamilyClass[marker.family]} ${pressed ? '' : dataChipQuietClass} shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) pointer-coarse:min-h-11`}
                >
                  <Icon size={14} aria-hidden="true" />
                  {t(marker.labelKey)}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={brush.onEnd}
            className={`${secondaryButtonClass} ${touchHitAreaClass} h-8 shrink-0 gap-1.5 px-3 text-xs`}
          >
            <CheckIcon size={14} aria-hidden="true" />
            {t('brush.done')}
          </button>
        </div>
        <p
          className="m-0 px-3 text-control text-(--text-page)"
          aria-live="polite"
        >
          <span className="font-semibold">
            {t(`brush.questions.${chosen.key}`)}
          </span>{' '}
          <span className="text-(--text-muted) tabular-nums">
            {t('brush.count', { count: brush.count })}
          </span>
        </p>
      </div>
    );
  }

  const saysSomething =
    Boolean(onToggleAllVisible) || Boolean(narrowing) || Boolean(brush);

  return (
    <div
      className={`sticky top-0 z-10 min-h-8 items-center gap-3 border-b border-(--border-card) bg-(--surface-sunken) px-3 ${
        saysSomething ? 'flex' : 'hidden @2xl:flex'
      }`}
    >
      {onToggleAllVisible && (
        // The checkbox's cell matches the rows' on a touch screen, so the
        // head's box stands over theirs; below `@2xl` its word is shown.
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 @2xl:flex-none">
          <span className="flex shrink-0 items-center pointer-coarse:-ml-3 pointer-coarse:h-11 pointer-coarse:w-11 pointer-coarse:justify-center">
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allVisibleSelected}
              onChange={onToggleAllVisible}
              className="h-4 w-4 shrink-0 cursor-pointer accent-(--accent-option) pointer-coarse:h-5 pointer-coarse:w-5"
            />
          </span>
          <span className="truncate text-control font-semibold @2xl:sr-only">
            {t('listToolbar.selectAll')}
          </span>
        </label>
      )}
      {/* The captions describe controls that carry their own accessible names,
          so they are decoration for the eye only. */}
      <div
        className="hidden min-w-0 flex-1 items-center gap-3 text-caption font-semibold tracking-wider text-(--text-muted) uppercase @2xl:flex"
        aria-hidden="true"
      >
        <span className="w-6 shrink-0">{t('listHeader.number')}</span>
        <span className="w-8 shrink-0">{t('listHeader.photo')}</span>
        <span className="w-44 shrink-0">{t('listHeader.name')}</span>
        <span className="min-w-0 flex-1">{t('listHeader.attributes')}</span>
      </div>
      {narrowing && <div className="ml-auto">{narrowing}</div>}
      {brush && (
        <button
          type="button"
          onClick={() => brush.onChoose(BRUSH_MARKERS[0].key)}
          data-tour={TOUR_ANCHORS.listBrush}
          aria-label={t('brush.start')}
          title={t('brush.start')}
          className={`${touchHitAreaClass} flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 text-control font-semibold text-(--text-page) hover:bg-(--surface-card) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) ${narrowing ? '' : 'ml-auto'}`}
        >
          <PaintBrushIcon size={16} aria-hidden="true" />
          {t('brush.label')}
        </button>
      )}
    </div>
  );
}
