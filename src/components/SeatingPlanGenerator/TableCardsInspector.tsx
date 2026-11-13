// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CameraIcon,
  FileIcon,
  HashIcon,
  IdentificationCardIcon,
  ImageSquareIcon,
  InfoIcon,
  PaintBrushIcon,
  ProhibitIcon,
  TextAaIcon,
  TrashIcon,
  UploadIcon,
  UserIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react';
import {
  InspectorActionRow,
  InspectorBody,
  InspectorChoice,
  InspectorHeader,
  InspectorIcon,
  InspectorMediaTile,
  InspectorRow,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
import ToggleSwitch from '@/components/ui/controls/ToggleSwitch';
import type { TableCardSheet } from '@/hooks/export/useTableCardSheet';
import {
  CARD_FONT_NAMES,
  cardFontFamily,
  SHIPPED_CARD_FONTS,
  type CardFontId,
} from '@/utils/export/cardFonts';
import { cardMotifPreview } from '@/utils/ui/tableCardMotifs';
import {
  CARD_BORDERS,
  CARD_MOTIF_SETS,
  CARD_TONE_CHOICES,
  CARD_TONE_COLOURS,
  TABLE_CARD_FORMATS,
  type CardMotifSet,
  type CardTone,
} from '@/utils/ui/tableCards';

/** What a font file may be; the browser checks the rest. */
const FONT_ACCEPT = '.ttf,.otf,.woff,.woff2';
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp';

/** A swatch of the paper: white, a tint, or the six tints in a wheel. */
function ToneSwatch({ tone }: { tone: CardTone }) {
  const tints = Object.values(CARD_TONE_COLOURS);
  const background =
    tone === 'paper'
      ? '#ffffff'
      : tone === 'mixed'
        ? `conic-gradient(${tints.map((tint) => tint.paper).join(', ')}, ${tints[0]!.paper})`
        : CARD_TONE_COLOURS[tone].paper;
  return (
    <span
      aria-hidden="true"
      className="size-3.5 shrink-0 rounded-full border border-(--border-card)"
      style={{ background }}
    />
  );
}

/**
 * The table cards' inspector (decision 0047), in the shape of every
 * inspector: the cards as the thing selected, then their format, the font,
 * the look — motif, paper, frame, lines, colouring in — what they say and
 * their order. The teacher's own font and picture load from a file in the
 * row that offers them, and a file that will not do says so there.
 */
export default function TableCardsInspector({
  sheet,
  pageCount,
  hasPhotos,
}: {
  sheet: TableCardSheet;
  pageCount: number;
  /** Whether any child of the class has a photo. */
  hasPhotos: boolean;
}) {
  const { t } = useTranslation('generator');
  const { settings, update, files, font } = sheet;
  const fontInput = React.useRef<HTMLInputElement>(null);
  const imageInput = React.useRef<HTMLInputElement>(null);
  const [fontError, setFontError] = React.useState<string | null>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);
  const cardCount = sheet.input?.cards.length ?? 0;

  const switchRow = (
    label: string,
    checked: boolean,
    onChange: (next: boolean) => void,
    icon: React.ReactNode,
  ) => (
    <InspectorRow label={label} icon={icon} labelsControl>
      <ToggleSwitch
        checked={checked}
        onChange={onChange}
        label={label}
        size="sm"
      />
    </InspectorRow>
  );

  const takeFile = async (
    event: React.ChangeEvent<HTMLInputElement>,
    load: (file: File) => Promise<string | null>,
    setError: (error: string | null) => void,
    onLoaded: () => void,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const error = await load(file);
    setError(error);
    if (!error) onLoaded();
  };

  const fontOptions: CardFontId[] = [
    ...SHIPPED_CARD_FONTS,
    ...(files.font ? (['own'] as const) : []),
  ];

  return (
    <>
      <InspectorHeader
        media={<InspectorMediaTile icon={IdentificationCardIcon} />}
        title={t('export.cards.view')}
        meta={[
          {
            icon: UsersThreeIcon,
            label: t('export.cards.count', { count: cardCount }),
          },
          {
            icon: FileIcon,
            label: t('export.cards.pages', { count: pageCount }),
          },
        ]}
      />
      <InspectorBody>
        <InspectorSection title={t('export.cards.format')}>
          <InspectorChoice
            label={t('export.cards.format')}
            layout="list"
            value={settings.format}
            onChange={(next) => next && update({ format: next })}
            options={TABLE_CARD_FORMATS.map((format) => ({
              value: format,
              label: t(`export.cards.formats.${format}`),
            }))}
          />
          <p className="text-xs text-(--text-muted)">
            {settings.format === 'badge'
              ? t('export.cards.cutHint')
              : t('export.cards.foldHint')}
          </p>
        </InspectorSection>

        <InspectorSection title={t('export.cards.font')}>
          {/* Each font's name in the font itself, so the choice is seen. */}
          <InspectorChoice
            label={t('export.cards.font')}
            layout="list"
            value={font}
            onChange={(next) => next && update({ font: next })}
            options={fontOptions.map((id) => ({
              value: id,
              label:
                id === 'own' ? (files.font?.name ?? '') : CARD_FONT_NAMES[id],
              icon: (
                <span
                  aria-hidden="true"
                  className="w-6 shrink-0 text-center text-base leading-none"
                  style={{ fontFamily: cardFontFamily(id) }}
                >
                  Aa
                </span>
              ),
            }))}
          />
          <InspectorActionRow
            icon={UploadIcon}
            label={
              files.font
                ? t('export.cards.replaceFont')
                : t('export.cards.loadFont')
            }
            onClick={() => fontInput.current?.click()}
          />
          {files.font && (
            <InspectorActionRow
              icon={TrashIcon}
              label={t('export.cards.removeFont')}
              onClick={() => {
                setFontError(null);
                void files.removeFont();
              }}
            />
          )}
          {fontError && (
            <p
              role="alert"
              className="text-xs font-medium text-(--button-danger-bg)"
            >
              {t(fontError)}
            </p>
          )}
          <p className="text-xs text-(--text-muted)">
            {t('export.cards.fontHint')}
          </p>
          <input
            ref={fontInput}
            type="file"
            accept={FONT_ACCEPT}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(event) =>
              void takeFile(event, files.loadFont, setFontError, () =>
                update({ font: 'own' }),
              )
            }
          />
        </InspectorSection>

        <InspectorSection title={t('export.cards.look')}>
          <InspectorRow label={t('export.cards.motifs')} stacked>
            <InspectorChoice
              label={t('export.cards.motifs')}
              layout="list"
              value={settings.motifs}
              onChange={(next) => next && update({ motifs: next })}
              options={CARD_MOTIF_SETS.map((set: CardMotifSet) => {
                const Preview = cardMotifPreview(set);
                return {
                  value: set,
                  label: t(`export.cards.motifSets.${set}`),
                  icon: Preview ? (
                    <Preview size={16} weight="duotone" aria-hidden="true" />
                  ) : set === 'own' ? (
                    <ImageSquareIcon size={16} aria-hidden="true" />
                  ) : (
                    <ProhibitIcon size={16} aria-hidden="true" />
                  ),
                };
              })}
            />
          </InspectorRow>
          {settings.motifs === 'own' && (
            <>
              <InspectorActionRow
                icon={UploadIcon}
                label={
                  files.image
                    ? t('export.cards.replaceImage')
                    : t('export.cards.loadImage')
                }
                onClick={() => imageInput.current?.click()}
              />
              {files.image && (
                <InspectorActionRow
                  icon={TrashIcon}
                  label={t('export.cards.removeImage')}
                  onClick={() => {
                    setImageError(null);
                    void files.removeImage();
                  }}
                />
              )}
              {imageError && (
                <p
                  role="alert"
                  className="text-xs font-medium text-(--button-danger-bg)"
                >
                  {t(imageError)}
                </p>
              )}
              <p className="text-xs text-(--text-muted)">
                {files.image
                  ? t('export.cards.imageLoaded', { name: files.image.name })
                  : t('export.cards.imageHint')}
              </p>
            </>
          )}
          <input
            ref={imageInput}
            type="file"
            accept={IMAGE_ACCEPT}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(event) =>
              void takeFile(event, files.loadImage, setImageError, () => {})
            }
          />
          {!settings.colouring && (
            <InspectorRow label={t('export.cards.paper')} stacked>
              <InspectorChoice
                label={t('export.cards.paper')}
                value={settings.tone}
                onChange={(next) => next && update({ tone: next })}
                options={CARD_TONE_CHOICES.map((tone) => ({
                  value: tone,
                  label: t(`export.cards.tones.${tone}`),
                  icon: <ToneSwatch tone={tone} />,
                }))}
              />
            </InspectorRow>
          )}
          <InspectorRow label={t('export.cards.border')}>
            <InspectorChoice
              label={t('export.cards.border')}
              value={settings.border}
              onChange={(next) => next && update({ border: next })}
              options={CARD_BORDERS.map((border) => ({
                value: border,
                label: t(`export.cards.borders.${border}`),
              }))}
            />
          </InspectorRow>
          {switchRow(
            t('export.cards.writingLines'),
            settings.writingLines,
            (writingLines) => update({ writingLines }),
            <InspectorIcon icon={TextAaIcon} />,
          )}
          {switchRow(
            t('export.cards.colouring'),
            settings.colouring,
            (colouring) => update({ colouring }),
            <InspectorIcon icon={PaintBrushIcon} />,
          )}
        </InspectorSection>

        <InspectorSection title={t('export.content')}>
          {switchRow(
            t('export.cards.lastName'),
            settings.showLastName,
            (showLastName) => update({ showLastName }),
            <InspectorIcon icon={UserIcon} />,
          )}
          {hasPhotos &&
            !settings.colouring &&
            switchRow(
              t('export.rows.photos'),
              settings.showPhoto,
              (showPhoto) => update({ showPhoto }),
              <InspectorIcon icon={CameraIcon} />,
            )}
          {sheet.canOrderByTables &&
            switchRow(
              t('export.cards.placeRow'),
              settings.showPlace,
              (showPlace) => update({ showPlace }),
              <InspectorIcon icon={HashIcon} />,
            )}
          {switchRow(
            t('export.cards.classLine'),
            settings.showClass,
            (showClass) => update({ showClass }),
            <InspectorIcon icon={InfoIcon} />,
          )}
        </InspectorSection>

        {sheet.canOrderByTables && (
          <InspectorSection title={t('export.noteList.order')}>
            <InspectorChoice
              label={t('export.noteList.order')}
              value={settings.order}
              onChange={(next) => next && update({ order: next })}
              options={[
                {
                  value: 'tables',
                  label: t('export.noteList.orderTables'),
                },
                {
                  value: 'alphabetical',
                  label: t('export.noteList.orderAlphabetical'),
                },
              ]}
            />
          </InspectorSection>
        )}
      </InspectorBody>
    </>
  );
}
