// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ClassroomScene, SeatingArrangement, Student } from '@/types';
import type { TableCardsInput } from '@/components/scene/TableCardsSheet';
import usePersistentState from '@/hooks/usePersistentState';
import { LOCAL_STORAGE_KEYS } from '@/utils';
import {
  cardFontCss,
  cardFontFamily,
  cardFontPreviewCss,
  loadCardFontMetrics,
  SHIPPED_CARD_FONTS,
  type CardFontMetrics,
} from '@/utils/export/cardFonts';
import {
  buildTableCards,
  cardSheetLayout,
  DEFAULT_TABLE_CARD_SETTINGS,
  normalizeTableCardSettings,
  type TableCardSettings,
} from '@/utils/ui/tableCards';
import { useCardFiles } from './useCardFiles';

/**
 * The export page's table cards (decision 0047): their settings, kept in one
 * object; the teacher's own font and picture; the font measured before the
 * names are laid out; and what the sheet is drawn from.
 *
 * What a setting asks for that the class or the device cannot give falls back
 * where it is read, and the stored choice stays: by table without a plan
 * reads by name, the own font without a file Andika, so the choice comes
 * back once there is something to follow.
 */
export function useTableCardSheet({
  active,
  students,
  seating,
  scene,
  classLine,
  locale,
}: {
  /** Whether the cards are on the sheet: only then is anything loaded. */
  active: boolean;
  students: Student[];
  seating: SeatingArrangement;
  scene: ClassroomScene;
  classLine?: string;
  locale: string;
}) {
  const [stored, setStored] = usePersistentState<Partial<TableCardSettings>>(
    LOCAL_STORAGE_KEYS.exportCards,
    DEFAULT_TABLE_CARD_SETTINGS,
  );
  const settings = useMemo(() => normalizeTableCardSettings(stored), [stored]);
  const update = useCallback(
    (patch: Partial<TableCardSettings>) =>
      setStored((current) => ({
        ...normalizeTableCardSettings(current),
        ...patch,
      })),
    [setStored],
  );
  const files = useCardFiles(active);

  const someoneSeated = seating.some((table) => table.some(Boolean));
  const order = someoneSeated ? settings.order : 'alphabetical';
  const font =
    settings.font === 'own' && !files.font ? 'andika' : settings.font;
  const ownFont = font === 'own' ? files.font : null;

  // Measured per font; a measure of the font before stays out of the layout.
  const fontKey = font === 'own' ? `own:${ownFont?.dataUrl.length}` : font;
  const [measured, setMeasured] = useState<{
    key: string;
    metrics: CardFontMetrics;
  } | null>(null);
  useEffect(() => {
    if (!active) return undefined;
    let current = true;
    void loadCardFontMetrics(font, ownFont).then((metrics) => {
      if (current) setMeasured({ key: fontKey, metrics });
    });
    return () => {
      current = false;
    };
  }, [active, font, ownFont, fontKey]);

  // The inspector writes each shipped font's name in it.
  useEffect(() => {
    if (!active) return;
    for (const id of SHIPPED_CARD_FONTS) void loadCardFontMetrics(id);
  }, [active]);

  const cards = useMemo(
    () =>
      buildTableCards(students, {
        order,
        tone: settings.tone,
        seating,
        scene,
        locale,
      }),
    [students, order, settings.tone, seating, scene, locale],
  );

  const effective = useMemo<TableCardSettings>(
    () => ({ ...settings, order, font }),
    [settings, order, font],
  );
  const metrics = measured?.key === fontKey ? measured.metrics : null;
  const input = useMemo<TableCardsInput | null>(
    () =>
      metrics
        ? {
            cards,
            settings: effective,
            fontFamily: cardFontFamily(font),
            metrics,
            classLine,
            ownImageDataUrl: files.image?.dataUrl ?? null,
          }
        : null,
    [metrics, cards, effective, font, classLine, files.image],
  );

  return {
    settings,
    update,
    files,
    /** The font the cards are set in, after a missing own font fell back. */
    font,
    /** Whether "by table" has a plan to follow. */
    canOrderByTables: someoneSeated,
    input,
    orientation: cardSheetLayout(settings.format).orientation,
    /** The font's rules for the preview, the files linked. */
    previewFontCss: active ? cardFontPreviewCss(font, ownFont) : '',
    /** The font's rules for printing and the PDF, the files inlined. */
    embeddedFontCss: useCallback(
      () => cardFontCss(font, ownFont),
      [font, ownFont],
    ),
  };
}

export type TableCardSheet = ReturnType<typeof useTableCardSheet>;
