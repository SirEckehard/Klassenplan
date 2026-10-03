// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CaretDownIcon,
  HeartBreakIcon,
  HeartIcon,
  MagnifyingGlassIcon,
} from '@phosphor-icons/react';
import type { Student } from '@/types';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { usePopoverFocus } from '@/hooks/ui/usePopoverFocus';
import {
  foldForSearch,
  getAvoidPartnerIds,
  getWishPartnerIds,
  inputFieldClass,
  menuSurfaceClass,
  MAX_PARTNER_WISHES,
} from '@/utils';
import {
  avoidPartnerButtonTokens,
  partnerButtonTokens,
} from './studentStyleTokens';
import FloatingDropdown from './FloatingDropdown';
import { InspectorRow } from '@/components/shell/InspectorPanel';

export type PartnerListSelectorProps = {
  student: Student;
  allStudents: Student[];
  updateStudent: (id: string, patch: Partial<Student>) => void;
  showDropdown: boolean;
  setShowDropdown: (value: boolean) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
};

/**
 * What tells the two relations apart: the icon and ink, the words, and the
 * pair of fields a choice writes — the list, plus the single legacy field kept
 * in sync for backups read by older builds.
 */
const PARTNER_KINDS = {
  wish: {
    Icon: HeartIcon,
    tokens: partnerButtonTokens,
    rankClass: 'bg-(--data-social-surface) text-(--data-social-text)',
    getIds: getWishPartnerIds,
    toPatch: (ids: string[]): Partial<Student> => ({
      wishPartnerIds: ids,
      wishPartnerId: ids[0] ?? null,
    }),
    labelKey: 'partners.wishPartner',
    clearKey: 'partners.noWishPartner',
    noneSelectedKey: 'partners.noPartnerSelected',
    selectKey: 'partners.selectPartner',
    summaryKey: 'partners.wishPartners',
  },
  avoid: {
    Icon: HeartBreakIcon,
    tokens: avoidPartnerButtonTokens,
    rankClass: 'bg-(--button-icon-danger-bg) text-(--button-icon-danger-text)',
    getIds: getAvoidPartnerIds,
    toPatch: (ids: string[]): Partial<Student> => ({
      avoidPartnerIds: ids,
      avoidPartnerId: ids[0] ?? null,
    }),
    labelKey: 'partners.distancePartner',
    clearKey: 'distance.noDistancePartner',
    noneSelectedKey: 'distance.noDistanceSelected',
    selectKey: 'distance.selectDistance',
    summaryKey: 'distance.distanceWish',
  },
} as const;

type PartnerKind = keyof typeof PARTNER_KINDS;

/**
 * One relation of a student to classmates — whom they wish to sit with, or
 * whom to keep apart from — as a row of the inspector whose button opens the
 * list of classmates.
 *
 * Up to MAX_PARTNER_WISHES can be chosen; the order of the clicks is the
 * priority. A field on top of the list narrows it as the teacher types, so a
 * class of thirty is not scrolled through for one name.
 */
export default function PartnerListSelector({
  kind,
  student,
  allStudents,
  updateStudent,
  showDropdown,
  setShowDropdown,
  dropdownRef,
  scrollContainerRef,
}: PartnerListSelectorProps & { kind: PartnerKind }) {
  const { t } = useTranslation('students');
  const config = PARTNER_KINDS[kind];
  const { Icon, tokens } = config;

  const dropdownContentRef = React.useRef<HTMLDivElement | null>(null);
  const outsideRefs = React.useMemo(
    () => [dropdownRef, dropdownContentRef],
    [dropdownRef],
  );
  useClickOutside(outsideRefs, () => setShowDropdown(false), showDropdown);
  // The list is portalled to the end of the page: the focus moves in when it
  // opens — into the search field, or onto the list itself where a finger
  // opened it — Tab and the arrow keys stay inside, Escape closes it with the
  // focus back on the button.
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const closeDropdown = React.useCallback(
    () => setShowDropdown(false),
    [setShowDropdown],
  );
  usePopoverFocus({
    open: showDropdown,
    contentRef: dropdownContentRef,
    anchorRef: triggerRef,
    onClose: closeDropdown,
    initialFocusSelector: 'input[type="search"]',
  });

  // Handles both the list and the legacy single field.
  const partnerIds = config.getIds(student);
  const hasPartners = partnerIds.length > 0;
  const firstPartner = hasPartners
    ? allStudents.find((s) => s.id === partnerIds[0])
    : null;

  // Clicking a chosen classmate takes them out; another joins at the end
  // while there is room. The list stays open for the next choice.
  const togglePartner = (partnerId: string) => {
    if (partnerIds.includes(partnerId)) {
      updateStudent(
        student.id,
        config.toPatch(partnerIds.filter((id) => id !== partnerId)),
      );
    } else if (partnerIds.length < MAX_PARTNER_WISHES) {
      updateStudent(student.id, config.toPatch([...partnerIds, partnerId]));
    }
  };

  const clearAll = () => {
    updateStudent(student.id, config.toPatch([]));
    setShowDropdown(false);
  };

  // The value of the row: the row's label already names the relation, so an
  // empty one says "none" rather than repeating it.
  const displayLabel = !hasPartners
    ? t('partners.none')
    : partnerIds.length === 1
      ? firstPartner?.name || '?'
      : `${firstPartner?.name || '?'} +${partnerIds.length - 1}`;

  const tooltip = hasPartners
    ? `${t(config.summaryKey)}: ${partnerIds
        .map((id, idx) => {
          const s = allStudents.find((st) => st.id === id);
          return `${idx + 1}. ${s?.name || '?'}`;
        })
        .join(', ')}`
    : t(config.selectKey);

  // One row of the inspector: the relation's name on the left, the button
  // that opens the list of classmates on the right.
  const control = (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        ref={triggerRef}
        className={`${tokens.baseClass} ${hasPartners ? tokens.activeStateClass : tokens.inactiveStateClass}`}
        title={tooltip}
        onClick={(e) => {
          e.stopPropagation();
          setShowDropdown(!showDropdown);
        }}
        // It opens the list of classmates; whether a partner is set is in
        // its name, not in a pressed state.
        aria-haspopup="dialog"
        aria-expanded={showDropdown}
        aria-label={hasPartners ? tooltip : t(config.noneSelectedKey)}
      >
        <Icon size={12} className={tokens.iconClass} aria-hidden="true" />
        <span className="truncate">{displayLabel}</span>
        <CaretDownIcon
          size={10}
          className={tokens.caretClass}
          aria-hidden="true"
        />
      </button>

      {/* No `onClose`: the list follows its button when the page scrolls
          instead of closing — on a tablet the on-screen keyboard the search
          field calls up scrolls the page, and the list would vanish under
          the finger that just tapped into it. */}
      {showDropdown && (
        <FloatingDropdown
          anchorRef={dropdownRef}
          align="center"
          portalRef={dropdownContentRef}
          scrollContainerRef={scrollContainerRef}
          className="z-50"
        >
          <PartnerList
            kind={kind}
            student={student}
            allStudents={allStudents}
            partnerIds={partnerIds}
            onToggle={togglePartner}
            onClear={clearAll}
          />
        </FloatingDropdown>
      )}
    </div>
  );

  return <InspectorRow label={t(config.labelKey)}>{control}</InspectorRow>;
}

/**
 * The open list: the search field, the way to clear the relation, and the
 * classmates that match. Mounted only while open, so the search starts empty
 * each time.
 */
function PartnerList({
  kind,
  student,
  allStudents,
  partnerIds,
  onToggle,
  onClear,
}: {
  kind: PartnerKind;
  student: Student;
  allStudents: Student[];
  partnerIds: readonly string[];
  onToggle: (partnerId: string) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation('students');
  const config = PARTNER_KINDS[kind];
  const [query, setQuery] = React.useState('');
  const firstMatchRef = React.useRef<HTMLButtonElement | null>(null);

  const isAtLimit = partnerIds.length >= MAX_PARTNER_WISHES;
  const needle = foldForSearch(query.trim());
  const matches = allStudents.filter(
    (s) =>
      s.id !== student.id &&
      (needle === '' || foldForSearch(s.name).includes(needle)),
  );
  // A classmate can be clicked while chosen (to take them out) or while
  // there is room for one more.
  const isActionable = (partnerId: string) =>
    partnerIds.includes(partnerId) || !isAtLimit;
  const firstActionableIndex = matches.findIndex((s) => isActionable(s.id));

  const handleSearchKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    // The arrows belong to a text field (`usePopoverFocus`), so stepping from
    // the field into the list is this field's own business.
    if (event.key === 'ArrowDown') {
      if (!firstMatchRef.current) return;
      event.preventDefault();
      firstMatchRef.current.focus();
      return;
    }
    // Typing a name and Enter is the quickest way to a classmate; with
    // nothing typed Enter picks no one at random.
    if (event.key === 'Enter') {
      event.preventDefault();
      const first = matches[0];
      if (needle !== '' && first && isActionable(first.id)) {
        onToggle(first.id);
      }
    }
  };

  return (
    <div
      role="dialog"
      aria-label={t(config.labelKey)}
      className={`${menuSurfaceClass} min-w-50`}
    >
      <span className="relative mb-2 block">
        <MagnifyingGlassIcon
          size={16}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-(--text-muted)"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          aria-label={t('listToolbar.searchLabel')}
          placeholder={t('listToolbar.searchPlaceholder')}
          className={`${inputFieldClass} w-full pl-9`}
        />
      </span>
      <div
        className="max-h-64 overflow-y-auto"
        style={{ scrollbarGutter: 'stable both-edges' }}
      >
        <button
          type="button"
          className={config.tokens.dropdownResetClass}
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
        >
          {t(config.clearKey)}
        </button>
        {matches.map((partner, index) => {
          const priorityIdx = partnerIds.indexOf(partner.id);
          const isSelected = priorityIdx >= 0;
          const isDisabled = !isActionable(partner.id);

          return (
            <button
              key={partner.id}
              ref={index === firstActionableIndex ? firstMatchRef : undefined}
              type="button"
              className={`${config.tokens.dropdownOptionBaseClass} ${
                isSelected
                  ? config.tokens.dropdownActiveClass
                  : config.tokens.dropdownInactiveClass
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!isDisabled) {
                  onToggle(partner.id);
                }
              }}
              disabled={isDisabled}
              aria-pressed={isSelected}
            >
              <span className="flex items-center gap-2">
                {isSelected && (
                  <span
                    className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-semibold ${config.rankClass}`}
                  >
                    {priorityIdx + 1}
                  </span>
                )}
                <span>{partner.name}</span>
              </span>
            </button>
          );
        })}
        {matches.length === 0 && (
          <p className="px-2 py-1.5 text-xs text-(--text-muted)">
            {t('partners.noMatches')}
          </p>
        )}
      </div>
    </div>
  );
}
