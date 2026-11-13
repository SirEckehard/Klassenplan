// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { ScissorsIcon, type Icon, type IconProps } from '@phosphor-icons/react';
import type { CardFontMetrics } from '@/utils/export/cardFonts';
import { SHEET_INK } from '@/utils/ui/sheetInk';
import { cardMotifs } from '@/utils/ui/tableCardMotifs';
import {
  CARD_TONE_COLOURS,
  cardFaceLayout,
  cardNameSizes,
  cardSheetLayout,
  paginateCards,
  spreadSlots,
  wavyFramePath,
  writingLines,
  type CardFaceLayout,
  type CardPanel,
  type CardSheetLayout,
  type TableCard,
  type TableCardSettings,
} from '@/utils/ui/tableCards';

export type TableCardsInput = {
  cards: TableCard[];
  settings: TableCardSettings;
  /** The family stack the names are set in (`cardFontFamily`). */
  fontFamily: string;
  /** The font's measures, for the names' size and the writing lines. */
  metrics: CardFontMetrics;
  /** The class as the foot names it: "7b · 2026/27". */
  classLine?: string;
  photoDataUrls?: ReadonlyMap<string, string>;
  /** The teacher's own picture, on every card where it is chosen. */
  ownImageDataUrl?: string | null;
};

export type TableCardsPlan = {
  sheet: CardSheetLayout;
  face: CardFaceLayout;
  /** Each card's name size, by its index in `cards`. */
  sizes: number[];
  /** Each card's motif, by its index in `cards`: no two alike while any is free. */
  motifs: (Icon | null)[];
  pages: { card: TableCard; index: number }[][];
};

const hasPictureFor = (input: TableCardsInput): boolean => {
  const { settings } = input;
  if (settings.motifs === 'own') return Boolean(input.ownImageDataUrl);
  if (settings.motifs !== 'none') return true;
  return (
    settings.showPhoto &&
    !settings.colouring &&
    input.cards.some(({ student }) => input.photoDataUrls?.has(student.id))
  );
};

/**
 * Lay the cards out: the page's cards and where to cut and fold, one face's
 * frame, and every name's size — one size for the class wherever the names
 * allow it.
 */
export function planTableCards(input: TableCardsInput): TableCardsPlan {
  const { settings, cards } = input;
  const sheet = cardSheetLayout(settings.format);
  const sample = sheet.cards[0]![0]!;
  const face = cardFaceLayout(sample.width, sample.height, {
    colouring: settings.colouring,
    hasPicture: hasPictureFor(input),
    hasLastName:
      settings.showLastName && cards.some((card) => card.lastName !== ''),
    hasFoot:
      (settings.showClass && Boolean(input.classLine)) ||
      (settings.showPlace && cards.some((card) => card.table !== null)),
  });
  const { sizes } = cardNameSizes(
    cards.map((card) => card.firstName),
    face,
    input.metrics,
  );
  const set = cardMotifs(settings.motifs);
  const slots = spreadSlots(
    cards.map((card) => card.student.id),
    set.length,
  );
  return {
    sheet,
    face,
    sizes,
    motifs: slots.map((slot) => set[slot] ?? null),
    pages: paginateCards(
      cards.map((card, index) => ({ card, index })),
      settings.format,
    ),
  };
}

const PHOTO_RING = '#ffffff';

/** A motif, drawn where it is given: the icon comes as a prop, not a call. */
function MotifGlyph({
  icon: MotifIcon,
  ...props
}: { icon: Icon } & IconProps & { x: number; y: number }) {
  return <MotifIcon {...props} />;
}

type FaceProps = {
  input: TableCardsInput;
  plan: TableCardsPlan;
  card: TableCard;
  size: number;
  motif: Icon | null;
  panel: CardPanel;
  id: string;
};

/** One face of a card: paper, frame, picture, the name on its lines, the foot. */
function CardFace({ input, plan, card, size, motif, panel, id }: FaceProps) {
  const { t } = useTranslation('generator');
  const { settings, metrics, fontFamily } = input;
  const { face } = plan;
  const { width, height } = panel;
  const colouring = settings.colouring;
  const tone = CARD_TONE_COLOURS[card.tone];
  const paper = colouring || settings.tone === 'paper' ? '#ffffff' : tone.paper;
  const ink = colouring ? SHEET_INK.ink : tone.ink;

  // The picture: the child's photo where asked for, else the teacher's own
  // picture or the child's motif.
  const photo =
    settings.showPhoto && !colouring
      ? input.photoDataUrls?.get(card.student.id)
      : undefined;
  const ownImage =
    settings.motifs === 'own'
      ? (input.ownImageDataUrl ?? undefined)
      : undefined;
  const Motif = photo || ownImage ? null : motif;
  const pic = face.picture;

  // The name and its lines, the block centred in the name's room.
  const ascent = Math.max(metrics.capHeight, 0.68);
  const descent = Math.max(metrics.descent, 0.2);
  const lastName = settings.showLastName ? card.lastName : '';
  const lastLine = lastName ? face.smallSize * 1.45 : 0;
  const block = (ascent + descent) * size + lastLine;
  const baseline = face.name.y + (face.name.height - block) / 2 + ascent * size;
  const lines = writingLines(baseline, size, metrics);
  const lineLeft = face.name.x;
  const lineRight = face.name.x + face.name.width;
  const lastNameSize = lastName
    ? Math.min(
        face.smallSize,
        face.name.width / Math.max(0.01, metrics.width(lastName)),
      )
    : 0;

  const footY = height - face.margin;
  const footSize = face.smallSize * 0.85;
  const classLine = settings.showClass ? input.classLine : undefined;
  const place =
    settings.showPlace && card.table !== null
      ? t('export.cards.place', { table: card.table })
      : undefined;

  const frameInset = face.margin * 0.45;
  const frame = {
    x: frameInset,
    y: frameInset,
    width: width - 2 * frameInset,
    height: height - 2 * frameInset,
  };

  return (
    <g
      transform={
        panel.upsideDown
          ? `translate(${panel.x + width} ${panel.y + height}) rotate(180)`
          : `translate(${panel.x} ${panel.y})`
      }
    >
      <rect width={width} height={height} fill={paper} />
      {settings.border === 'dots' && (
        <rect
          {...frame}
          rx={face.margin * 0.6}
          fill="none"
          stroke={ink}
          strokeOpacity={0.55}
          strokeWidth={1.1}
          strokeDasharray="0 2.6"
          strokeLinecap="round"
        />
      )}
      {settings.border === 'wave' && (
        <path
          d={wavyFramePath(frame, 0.9, 7)}
          fill="none"
          stroke={ink}
          strokeOpacity={0.55}
          strokeWidth={0.5}
          strokeLinejoin="round"
        />
      )}

      {photo && (
        <>
          <clipPath id={`${id}-photo`}>
            <rect {...pic} rx={pic.width * 0.18} />
          </clipPath>
          <rect
            x={pic.x - 0.8}
            y={pic.y - 0.8}
            width={pic.width + 1.6}
            height={pic.height + 1.6}
            rx={pic.width * 0.18 + 0.8}
            fill={PHOTO_RING}
          />
          <image
            href={photo}
            {...pic}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${id}-photo)`}
          />
        </>
      )}
      {ownImage && (
        <image href={ownImage} {...pic} preserveAspectRatio="xMidYMid meet" />
      )}
      {Motif &&
        (colouring ? (
          <MotifGlyph
            icon={Motif}
            x={pic.x}
            y={pic.y}
            size={pic.width}
            color={ink}
            weight="light"
          />
        ) : (
          <>
            {/* A sticker on the coloured paper: a pale disc behind the
                motif, drawn in the paper's own darker tone. */}
            <circle
              cx={pic.x + pic.width / 2}
              cy={pic.y + pic.height / 2}
              r={pic.width / 2}
              fill="#ffffff"
              fillOpacity={0.6}
            />
            <MotifGlyph
              icon={Motif}
              x={pic.x + pic.width * 0.13}
              y={pic.y + pic.height * 0.13}
              size={pic.width * 0.74}
              color={ink}
              weight="duotone"
            />
          </>
        ))}

      {settings.writingLines && (
        <g stroke={ink} strokeLinecap="round">
          {/* The band of the small letters, as in a first exercise book. */}
          <rect
            x={lineLeft}
            y={lines.xHeight}
            width={lineRight - lineLeft}
            height={lines.baseline - lines.xHeight}
            fill={ink}
            fillOpacity={colouring ? 0.04 : 0.08}
            stroke="none"
          />
          {[lines.ascender, lines.xHeight, lines.descender].map((y) => (
            <line
              key={y}
              x1={lineLeft}
              x2={lineRight}
              y1={y}
              y2={y}
              strokeWidth={0.3}
              strokeOpacity={0.45}
            />
          ))}
          <line
            x1={lineLeft}
            x2={lineRight}
            y1={lines.baseline}
            y2={lines.baseline}
            strokeWidth={0.5}
            strokeOpacity={0.75}
          />
        </g>
      )}

      <text
        x={face.name.x}
        y={baseline}
        fontSize={size}
        fontFamily={fontFamily}
        fill={colouring ? '#ffffff' : SHEET_INK.text}
        stroke={colouring ? SHEET_INK.ink : undefined}
        strokeWidth={colouring ? Math.max(0.3, size * 0.03) : undefined}
        strokeLinejoin="round"
      >
        {card.firstName}
      </text>
      {lastName && (
        <text
          x={face.name.x}
          y={lines.descender + lastNameSize * 1.1}
          fontSize={lastNameSize}
          fontFamily={fontFamily}
          fill={SHEET_INK.muted}
        >
          {lastName}
        </text>
      )}

      {classLine && (
        <text
          x={face.name.x}
          y={footY}
          fontSize={footSize}
          fontFamily={fontFamily}
          fill={colouring ? SHEET_INK.muted : ink}
        >
          {classLine}
        </text>
      )}
      {place && (
        <text
          x={face.name.x + face.name.width}
          y={footY}
          fontSize={footSize}
          fontFamily={fontFamily}
          textAnchor="end"
          fill={colouring ? SHEET_INK.muted : ink}
        >
          {place}
        </text>
      )}
    </g>
  );
}

type Props = TableCardsInput & {
  plan: TableCardsPlan;
  pageIndex: number;
};

/**
 * One page of table cards (decision 0047): every card's faces, then where to
 * cut — dashed, with scissors — and where to fold, dotted. Each card is the
 * child's own: its tint of paper, its motif, its name on lines to write on.
 */
export default function TableCardsSheet({ plan, pageIndex, ...input }: Props) {
  const { sheet } = plan;
  const entries = plan.pages[pageIndex] ?? [];
  const scissors = 5;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox={`0 0 ${sheet.width} ${sheet.height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block' }}
      fontFamily={input.fontFamily}
    >
      <rect width={sheet.width} height={sheet.height} fill="#ffffff" />
      {entries.map(({ card, index }, slot) =>
        (sheet.cards[slot] ?? []).map((panel, faceIndex) => (
          <CardFace
            key={`${card.student.id}-${faceIndex}`}
            input={input}
            plan={plan}
            card={card}
            size={plan.sizes[index] ?? plan.face.maxNameSize}
            motif={plan.motifs[index] ?? null}
            panel={panel}
            id={`card-${pageIndex}-${slot}-${faceIndex}`}
          />
        )),
      )}
      {sheet.folds.map((fold) => (
        <line
          key={`fold-${fold.x1}-${fold.y1}`}
          {...fold}
          stroke={SHEET_INK.rule}
          strokeWidth={0.25}
          strokeDasharray="0.6 1.4"
          strokeLinecap="round"
        />
      ))}
      {sheet.cuts.map((cut) => (
        <g key={`cut-${cut.x1}-${cut.y1}-${cut.x2}`}>
          <line
            {...cut}
            stroke={SHEET_INK.rule}
            strokeWidth={0.3}
            strokeDasharray="2.4 1.6"
          />
          {/* Scissors where a cut starts at the page's left or top edge. */}
          {cut.x1 === 0 && cut.y1 === cut.y2 && (
            <ScissorsIcon
              x={2}
              y={cut.y1 - scissors / 2}
              size={scissors}
              color={SHEET_INK.muted}
            />
          )}
          {cut.y1 === 0 && cut.x1 === cut.x2 && (
            <g transform={`rotate(90 ${cut.x1} ${2 + scissors / 2})`}>
              <ScissorsIcon
                x={cut.x1 - scissors / 2}
                y={2}
                size={scissors}
                color={SHEET_INK.muted}
              />
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}
