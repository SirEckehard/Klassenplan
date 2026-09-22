// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowsInIcon,
  ArrowsOutIcon,
  ChalkboardTeacherIcon,
  CircleDashedIcon,
  CornersInIcon,
  DoorOpenIcon,
  GridNineIcon,
  HandPointingIcon,
  ImageIcon,
  PaletteIcon,
  StudentIcon,
  SunIcon,
  UserSquareIcon,
  UsersThreeIcon,
  XIcon,
  type Icon,
} from '@phosphor-icons/react';
import type { NameDisplayMode } from '@/utils';
import type { PresentationPerspective } from '@/utils/ui/boardOrientation';
import type { SeatingMode } from '@/components/SeatingPlanGenerator/SeatingModeToggle';
import {
  NAME_DISPLAY_ICONS,
  nameDisplayLabelKey,
} from '@/components/SeatingPlanGenerator/canvas/nameDisplayGroup';

/**
 * The one bar of the projection: what is shown, what to do with it, how large.
 *
 * It floats over the plan as ink in both themes, because the plan below it is
 * paper in both themes — the bar belongs to the teacher standing at the front,
 * the projection belongs to the room. Everything on it is one press away; the
 * plan itself carries no controls at all.
 */

const barButtonClass =
  'inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[10px] border-0 px-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) focus-visible:ring-offset-2 focus-visible:ring-offset-(--present-bar-bg)';

const quietClass =
  'bg-(--present-bar-surface) text-(--present-bar-text) hover:bg-(--present-bar-surface-hover)';

const pressedClass = 'bg-(--button-primary-bg) text-(--button-primary-text)';

function BarSeparator() {
  return (
    <span
      aria-hidden="true"
      className="mx-1.5 h-7 w-px shrink-0 bg-(--present-bar-border)"
    />
  );
}

/** Two words, one of them true — the shape both of the bar's switches take. */
function BarSegment<T extends string>({
  label,
  value,
  options,
  onChange,
  labelled = true,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{
    value: T;
    label: string;
    title: string;
    icon: Icon;
  }>;
  onChange: (value: T) => void;
  /** Icon-only where the bar is tight; the accessible name carries the word. */
  labelled?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex shrink-0 items-center gap-0.5 rounded-[10px] bg-(--present-bar-bg) p-0.5"
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isActive}
            aria-label={option.label}
            title={option.title}
            className={`${barButtonClass} h-10 ${
              isActive
                ? 'bg-(--present-bar-text) text-(--present-bar-bg)'
                : 'bg-transparent text-(--present-bar-muted) hover:bg-(--present-bar-surface)'
            }`}
          >
            <option.icon size={18} aria-hidden />
            {labelled && (
              <span className="hidden sm:inline">{option.label}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Something the plan shows or does not show: an icon, pressed or not. */
function BarToggle({
  icon: ToggleIcon,
  label,
  title,
  pressed,
  onClick,
}: {
  icon: Icon;
  label: string;
  title: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={label}
      title={title}
      className={`${barButtonClass} w-11 px-0 ${
        pressed ? pressedClass : quietClass
      }`}
    >
      <ToggleIcon size={20} aria-hidden />
    </button>
  );
}

type PresentationToolbarProps = {
  perspective: PresentationPerspective;
  onPerspectiveChange: (perspective: PresentationPerspective) => void;
  mode: SeatingMode;
  onModeChange: (mode: SeatingMode) => void;
  /** Teacher view only, like the two toggles they switch. */
  isTeacher: boolean;
  showBadges: boolean;
  onToggleBadges: () => void;
  showPhotos: boolean;
  onTogglePhotos: () => void;
  showColors: boolean;
  onToggleColors: () => void;
  /** Room elements have nothing to hide in the seating circle. */
  showFeatures: boolean;
  onToggleFeatures: () => void;
  contrast: boolean;
  onToggleContrast: () => void;
  nameDisplay: NameDisplayMode;
  onCycleNameDisplay: () => void;
  /** Absent while there is nobody to draw (an empty circle, no seats). */
  onPick?: () => void;
  /** Absent until the groups view exists for this class. */
  onOpenGroups?: () => void;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  onZoomChange: (zoom: number) => void;
  onResetView: () => void;
  fullscreenSupported: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onExit: () => void;
};

export default function PresentationToolbar({
  perspective,
  onPerspectiveChange,
  mode,
  onModeChange,
  isTeacher,
  showBadges,
  onToggleBadges,
  showPhotos,
  onTogglePhotos,
  showColors,
  onToggleColors,
  showFeatures,
  onToggleFeatures,
  contrast,
  onToggleContrast,
  nameDisplay,
  onCycleNameDisplay,
  onPick,
  onOpenGroups,
  zoom,
  minZoom,
  maxZoom,
  onZoomChange,
  onResetView,
  fullscreenSupported,
  isFullscreen,
  onToggleFullscreen,
  onExit,
}: PresentationToolbarProps) {
  const { t } = useTranslation('generator');
  const NameIcon = NAME_DISPLAY_ICONS[nameDisplay];
  const isCircle = mode === 'circle';

  return (
    <div className="flex justify-center px-3 pb-4">
      <div className="flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-[14px] bg-(--present-bar-bg) p-2 shadow-[0_8px_28px_-12px_rgba(0,0,0,0.45)]">
        <BarSegment
          label={t('present.perspective')}
          value={perspective}
          onChange={onPerspectiveChange}
          options={[
            {
              value: 'teacher',
              label: t('present.teacherView'),
              title: t('present.teacherViewTitle'),
              icon: ChalkboardTeacherIcon,
            },
            {
              value: 'student',
              label: t('present.studentView'),
              title: t('present.studentViewTitle'),
              icon: StudentIcon,
            },
          ]}
        />

        <BarSegment
          label={t('mode.label')}
          value={mode}
          onChange={onModeChange}
          labelled={false}
          options={[
            {
              value: 'table',
              label: t('mode.table'),
              title: t('mode.tableView'),
              icon: GridNineIcon,
            },
            {
              value: 'circle',
              label: t('mode.circle'),
              title: t('mode.circleView'),
              icon: CircleDashedIcon,
            },
          ]}
        />

        <BarSeparator />

        {onPick && (
          <button
            type="button"
            onClick={onPick}
            title={t('present.pickTitle')}
            className={`${barButtonClass} ${pressedClass} px-4`}
          >
            <HandPointingIcon size={18} aria-hidden />
            {t('present.pick')}
          </button>
        )}
        {onOpenGroups && (
          <button
            type="button"
            onClick={onOpenGroups}
            title={t('present.groupsTitle')}
            className={`${barButtonClass} ${quietClass} px-4`}
          >
            <UsersThreeIcon size={18} aria-hidden />
            {t('present.groups')}
          </button>
        )}

        <BarSeparator />

        {isTeacher && (
          <BarToggle
            icon={UserSquareIcon}
            label={t('present.badges')}
            title={t('present.badgesTitle')}
            pressed={showBadges}
            onClick={onToggleBadges}
          />
        )}
        {isTeacher && (
          <BarToggle
            icon={ImageIcon}
            label={t('present.photos')}
            title={t('present.photosTitle')}
            pressed={showPhotos}
            onClick={onTogglePhotos}
          />
        )}
        <button
          type="button"
          onClick={onCycleNameDisplay}
          aria-label={`${t('present.names')}: ${t(nameDisplayLabelKey(nameDisplay))}`}
          title={`${t('present.names')}: ${t(nameDisplayLabelKey(nameDisplay))}`}
          className={`${barButtonClass} ${quietClass} w-11 px-0`}
        >
          <NameIcon size={20} aria-hidden />
        </button>
        {!isCircle && (
          <BarToggle
            icon={DoorOpenIcon}
            label={t('present.features')}
            title={t('present.featuresTitle')}
            pressed={showFeatures}
            onClick={onToggleFeatures}
          />
        )}
        <BarToggle
          icon={PaletteIcon}
          label={t('present.colors')}
          title={t('present.colorsTitle')}
          pressed={showColors}
          onClick={onToggleColors}
        />
        <BarToggle
          icon={SunIcon}
          label={t('present.contrast')}
          title={t('present.contrastTitle')}
          pressed={contrast}
          onClick={onToggleContrast}
        />

        <BarSeparator />

        <div className="flex h-11 shrink-0 items-center gap-2 rounded-[10px] bg-(--present-bar-surface) px-3">
          <label
            htmlFor="present-zoom"
            className="text-xs font-medium text-(--present-bar-muted)"
          >
            {t('present.size')}
          </label>
          <input
            id="present-zoom"
            type="range"
            min={minZoom}
            max={maxZoom}
            step={0.05}
            value={zoom}
            onChange={(event) => onZoomChange(Number(event.target.value))}
            title={t('present.zoomTitle')}
            className="w-24 cursor-pointer accent-(--button-primary-bg) sm:w-28"
          />
          <span className="w-11 text-right text-xs font-semibold tabular-nums text-(--present-bar-text)">
            {Math.round(zoom * 100)} %
          </span>
        </div>
        <button
          type="button"
          onClick={onResetView}
          aria-label={t('present.resetView')}
          title={t('present.resetView')}
          className={`${barButtonClass} ${quietClass} w-11 px-0`}
        >
          <ArrowsInIcon size={20} aria-hidden />
        </button>
        {fullscreenSupported && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-pressed={isFullscreen}
            aria-label={
              isFullscreen
                ? t('present.fullscreenExitTitle')
                : t('present.fullscreenTitle')
            }
            title={
              isFullscreen
                ? t('present.fullscreenExitTitle')
                : t('present.fullscreenTitle')
            }
            className={`${barButtonClass} ${quietClass} w-11 px-0`}
          >
            {isFullscreen ? (
              <CornersInIcon size={20} aria-hidden />
            ) : (
              <ArrowsOutIcon size={20} aria-hidden />
            )}
          </button>
        )}

        <BarSeparator />

        <button
          type="button"
          onClick={onExit}
          aria-label={t('present.exit')}
          title={t('present.backTitle')}
          className={`${barButtonClass} ${quietClass} w-11 px-0`}
        >
          <XIcon size={20} aria-hidden />
        </button>
      </div>
    </div>
  );
}
