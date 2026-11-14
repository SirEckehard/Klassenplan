// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useEffect, useState } from 'react';
import {
  deleteCardFile,
  getCardFile,
  setCardFile,
  subscribeToCardFiles,
  type CardFileKind,
} from '@/repositories/cardFileStore';
import type { OwnCardFont } from '@/utils/export/cardFonts';
import {
  CARD_FILE_ERRORS,
  CardFileError,
  fontFormatOfType,
  prepareCardFont,
  prepareCardImage,
} from '@/utils/image/processCardFile';
import { blobToDataUrl } from '@/utils/image/processStudentPhoto';
import i18n from '@/i18n';
import { logError } from '@/utils';
import { showToast } from '@/utils/ui/toast';

const LOG_SOURCE = 'useCardFiles';

/** As long as a deleted student's card stands. */
const UNDO_DURATION_MS = 8000;

export type LoadedCardFont = OwnCardFont & { name: string };
export type LoadedCardImage = { name: string; dataUrl: string };

/**
 * The teacher's own font and picture for the table cards (decision 0047), as
 * the export page shows them: read once the card view is open, read again
 * when they change, and loaded from a file — where a file that is no font or
 * picture says so at the row that loaded it, as the i18n key it resolves to.
 */
export function useCardFiles(active: boolean) {
  const [font, setFont] = useState<LoadedCardFont | null>(null);
  const [image, setImage] = useState<LoadedCardImage | null>(null);

  const read = useCallback(async (kind: CardFileKind) => {
    const stored = await getCardFile(kind);
    const file = stored.success ? stored.data : undefined;
    const dataUrl = file
      ? await blobToDataUrl(new Blob([file.data], { type: file.type }))
      : null;
    if (kind === 'font') {
      setFont(
        file && dataUrl
          ? { name: file.name, dataUrl, format: fontFormatOfType(file.type) }
          : null,
      );
    } else {
      setImage(file && dataUrl ? { name: file.name, dataUrl } : null);
    }
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    const readLogged = (kind: CardFileKind) =>
      read(kind).catch((error: unknown) => {
        logError('Reading a card file failed', { error, kind }, LOG_SOURCE);
      });
    void readLogged('font');
    void readLogged('image');
    return subscribeToCardFiles((kind) => void readLogged(kind));
  }, [active, read]);

  const keep = useCallback(
    async (
      kind: CardFileKind,
      file: File,
      prepare: (file: File) => Promise<{ type: string; data: ArrayBuffer }>,
    ): Promise<string | null> => {
      try {
        const prepared = await prepare(file);
        const written = await setCardFile(kind, {
          name: file.name,
          ...prepared,
        });
        return written.success ? null : CARD_FILE_ERRORS.saveFailed;
      } catch (error) {
        if (error instanceof CardFileError) return error.message;
        logError('Loading a card file failed', { error, kind }, LOG_SOURCE);
        return CARD_FILE_ERRORS.saveFailed;
      }
    },
    [],
  );

  /** Keeps a font file; resolves to the error's i18n key, or null. */
  const loadFont = useCallback(
    (file: File) => keep('font', file, prepareCardFont),
    [keep],
  );
  /** Keeps a picture, made smaller; resolves to the error's key, or null. */
  const loadImage = useCallback(
    (file: File) => keep('image', file, prepareCardImage),
    [keep],
  );

  // Removing asks nothing and offers "Rückgängig" (decision 0041): the file
  // may have come from a backup and lie nowhere else, so its bytes are held
  // while the card stands.
  const remove = useCallback(async (kind: CardFileKind) => {
    const stored = await getCardFile(kind);
    const held = stored.success ? stored.data : undefined;
    const removed = await deleteCardFile(kind);
    if (!removed.success) {
      logError('Removing a card file failed', { kind }, LOG_SOURCE);
      return;
    }
    if (!held) return;
    showToast(
      'info',
      i18n.t(
        kind === 'font'
          ? 'toast:cardFiles.fontRemoved'
          : 'toast:cardFiles.imageRemoved',
        { name: held.name },
      ),
      {
        duration: UNDO_DURATION_MS,
        action: {
          label: i18n.t('common:buttons.undo'),
          onClick: () => {
            setCardFile(kind, held)
              .then((restored) => {
                if (!restored.success) {
                  logError('Restoring a card file failed', { kind }, LOG_SOURCE);
                  showToast('error', CARD_FILE_ERRORS.saveFailed);
                }
              })
              .catch((error: unknown) => {
                logError('Restoring a card file failed', { error }, LOG_SOURCE);
              });
          },
        },
      },
    );
  }, []);

  return {
    font,
    image,
    loadFont,
    loadImage,
    removeFont: useCallback(() => remove('font'), [remove]),
    removeImage: useCallback(() => remove('image'), [remove]),
  };
}

export type CardFiles = ReturnType<typeof useCardFiles>;
