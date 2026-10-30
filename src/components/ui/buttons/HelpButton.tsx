// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpenIcon,
  KeyboardIcon,
  PathIcon,
  QuestionIcon,
  XIcon,
} from '@phosphor-icons/react';
import {
  quietIconButtonClass,
  secondaryButtonClass,
  shortcutContextLabels,
  shortcutMap,
  type ShortcutContext,
} from '@/utils';
import {
  InspectorActionRow,
  InspectorBody,
  InspectorHeader,
  InspectorMediaTile,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
import { INSPECTOR_DRAWER_ID, useInspector } from '@/contexts/InspectorContext';
import { useShellToolRail } from '@/contexts/ToolRailContext';
import { APP_RETURN_STATE } from '@/hooks/useReturnToApp';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useIsCoarsePointer } from '@/hooks/ui/useCoarsePointer';
import { isAnyDialogOpen } from '@/hooks/ui/useDialogLayer';
import { useLayoutMode } from '@/hooks/ui/useLayoutMode';
import { useOutsideTap } from '@/hooks/ui/useOutsideTap';
import { usePanelMotion } from '@/hooks/ui/usePanelMotion';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';

/** Marks the button, so the tap that opened the help does not also close it. */
const HELP_TOGGLE_SELECTOR = '[data-help-toggle]';

/**
 * Outside the shell — the projection, the class tools — there is no
 * inspector, so the help opens as a drawer of its own from the right edge,
 * the shape the inspector takes below `lg`.
 */
const standaloneDrawerClass =
  'fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col overflow-hidden border-l border-(--border-card) bg-(--surface-card) pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-(--menu-shadow)';

type Props = {
  title: string;
  instructions?: React.ReactNode;
  shortcutContexts?: ShortcutContext[];
  /** Offers "Tour starten"; the help closes before the tour opens. */
  onStartTour?: () => void;
  /** The FAQ section this screen's questions are answered in (`/faq#…`). */
  faqSection?: string;
};

/**
 * Help for the screen it is pressed on.
 *
 * It opens beside the stage, not over it: what the help explains — the
 * lines in the circle, the toolbar's settings, the status bar's icons —
 * stays in view while it is read. In the shell it takes the inspector's
 * place (`InspectorContext.helpOpen`), the column from `lg` up and the drawer
 * below it, and is built as every inspector is: the screen's name in the
 * header, the instructions, then the way on — the tour, the FAQ and the
 * keyboard shortcuts, folded until asked for and left out where a finger
 * taps.
 */
export default function HelpButton({
  title,
  instructions,
  shortcutContexts,
  onStartTour,
  faqSection,
}: Props) {
  const { t } = useTranslation(['common']);
  const inspector = useInspector();
  const toolRail = useShellToolRail();
  const isPhone = useLayoutMode() === 'phone';
  const [localOpen, setLocalOpen] = React.useState(false);
  const open = inspector.inShell ? inspector.helpOpen : localOpen;
  const { setHelpOpen } = inspector;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!inspector.inShell) {
        setLocalOpen(next);
        return;
      }
      // The toolbar's drawer and the help take turns on a phone, as the
      // toolbar's and the inspector's do.
      if (next && isPhone) toolRail?.setSheetOpen(false);
      setHelpOpen(next);
    },
    [inspector.inShell, isPhone, setHelpOpen, toolRail],
  );
  // The shell's help is the button's: it closes when the button goes — a
  // page without help, the first screen giving way to the class.
  const setHelpOpenRef = React.useRef(setHelpOpen);
  React.useEffect(() => {
    setHelpOpenRef.current = setHelpOpen;
  });
  React.useEffect(() => () => setHelpOpenRef.current(false), []);

  useKeyboardShortcuts({
    'shift+?': () => setOpen(!open),
    '?': () => setOpen(!open),
  });

  const hasInstructions = Boolean(instructions);
  const hasShortcuts = Boolean(shortcutContexts?.length);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const triggerDisabled = !hasInstructions && !hasShortcuts;

  const close = React.useCallback(
    ({ refocus }: { refocus: boolean }) => {
      setOpen(false);
      if (refocus) triggerRef.current?.focus();
    },
    [setOpen],
  );

  const panel = open ? (
    <HelpPanel
      title={title}
      instructions={instructions}
      shortcutContexts={shortcutContexts}
      onStartTour={onStartTour}
      faqSection={faqSection}
      onClose={close}
    />
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(!open)}
        className={`${secondaryButtonClass} h-9 w-9 justify-center p-0 ${
          triggerDisabled ? 'cursor-not-allowed opacity-60' : ''
        }`}
        disabled={triggerDisabled}
        title={t('help.title')}
        aria-expanded={open}
        data-help-toggle=""
        data-tour={TOUR_ANCHORS.help}
      >
        <QuestionIcon className="h-5 w-5" />
      </button>
      {inspector.inShell ? (
        panel &&
        inspector.helpSlotNode &&
        createPortal(panel, inspector.helpSlotNode)
      ) : (
        <StandaloneDrawer open={open} label={t('help.title')}>
          {panel}
        </StandaloneDrawer>
      )}
    </>
  );
}

/** The help's drawer where no inspector holds it. */
function StandaloneDrawer({
  open,
  label,
  children,
}: {
  open: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const layoutMode = useLayoutMode();
  const ref = React.useRef<HTMLElement | null>(null);
  usePanelMotion(ref, open, 'right', layoutMode);
  if (!open) return null;
  return createPortal(
    <aside ref={ref} aria-label={label} className={standaloneDrawerClass}>
      {children}
    </aside>,
    document.body,
  );
}

function HelpPanel({
  title,
  instructions,
  shortcutContexts,
  onStartTour,
  faqSection,
  onClose,
}: Props & { onClose: (options: { refocus: boolean }) => void }) {
  const { t } = useTranslation(['common', 'generator']);
  const { inShell } = useInspector();
  const isDesktop = useLayoutMode() === 'desktop';
  const isCoarsePointer = useIsCoarsePointer();
  // From `lg` up the help is the inspector's column, which stays beside the
  // stage like the column it replaced; below it — and outside the shell — it
  // is a drawer over the stage, which a tap beside it closes.
  const isColumn = inShell && isDesktop;
  const rootRef = React.useRef<HTMLDivElement | null>(null);

  const shortcutSections = React.useMemo(
    () =>
      shortcutContexts?.length
        ? Array.from(new Set<ShortcutContext>(['global', ...shortcutContexts]))
        : [],
    [shortcutContexts],
  );
  // The keys are no help to a finger; a screen without instructions shows
  // them at once, since they are all it has to say.
  const showsShortcuts =
    shortcutSections.length > 0 && (!isCoarsePointer || !instructions);
  const [shortcutsOpen, setShortcutsOpen] = React.useState(!instructions);

  // The keyboard lands in the help when it opens, so Escape and Tab start
  // there.
  React.useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
  }, []);

  // Escape closes it — from anywhere while it is a drawer, from inside it
  // while it is the column, where Escape on the stage still means the stage.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isAnyDialogOpen()) return;
      if (isColumn && !rootRef.current?.contains(document.activeElement)) {
        return;
      }
      event.stopPropagation();
      onClose({ refocus: true });
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isColumn, onClose]);

  const dismiss = React.useCallback(
    () => onClose({ refocus: false }),
    [onClose],
  );
  // The inspector's switch in the status bar answers its own tap.
  useOutsideTap(rootRef, dismiss, !isColumn, {
    ignoreSelector: `${HELP_TOGGLE_SELECTOR}, [aria-controls="${INSPECTOR_DRAWER_ID}"]`,
  });

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className="flex min-h-0 flex-1 flex-col focus:outline-none"
    >
      <InspectorHeader
        media={<InspectorMediaTile icon={QuestionIcon} />}
        title={title}
        subtitle={t('help.title')}
        actions={
          <button
            type="button"
            onClick={() => onClose({ refocus: true })}
            className={`${quietIconButtonClass} h-8 w-8 pointer-coarse:h-10 pointer-coarse:w-10`}
            aria-label={t('help.close')}
            title={t('help.close')}
          >
            <XIcon size={16} aria-hidden="true" />
          </button>
        }
      />
      <InspectorBody>
        {instructions && (
          <InspectorSection title={t('help.instructions')}>
            <div className="text-sm leading-relaxed text-(--text-page)">
              {instructions}
            </div>
          </InspectorSection>
        )}
        <InspectorSection title={t('help.moreSection')}>
          {onStartTour && (
            <InspectorActionRow
              icon={PathIcon}
              label={t('generator:tour.startButton')}
              onClick={() => {
                // The tour points at the inspector too, so the help makes
                // way before it starts.
                onClose({ refocus: false });
                onStartTour();
              }}
            />
          )}
          <InspectorActionRow
            icon={BookOpenIcon}
            label={t('help.faq')}
            to={faqSection ? `/faq#${faqSection}` : '/faq'}
            state={APP_RETURN_STATE}
          />
          {showsShortcuts && (
            <InspectorActionRow
              icon={KeyboardIcon}
              label={t('help.shortcuts')}
              expanded={shortcutsOpen}
              onClick={() => setShortcutsOpen((value) => !value)}
            />
          )}
          {showsShortcuts && shortcutsOpen && (
            <div className="flex flex-col gap-3 pt-1">
              {shortcutSections.map((ctx) => (
                <div key={ctx} className="flex flex-col gap-1.5">
                  <h4 className="text-caption font-semibold text-(--text-muted)">
                    {t(`generator:${shortcutContextLabels[ctx]}`)}
                  </h4>
                  <ul className="flex flex-col gap-1.5">
                    {shortcutMap[ctx].map((shortcut) => (
                      <li
                        key={`${ctx}-${shortcut.keysKey}`}
                        className="flex items-baseline justify-between gap-3 text-control text-(--text-page)"
                      >
                        <span>{t(`generator:${shortcut.descriptionKey}`)}</span>
                        <kbd className="shrink-0 rounded-md bg-(--surface-sunken) px-1.5 py-0.5 font-mono text-caption font-semibold">
                          {t(`generator:${shortcut.keysKey}`)}
                        </kbd>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </InspectorSection>
      </InspectorBody>
    </div>
  );
}
