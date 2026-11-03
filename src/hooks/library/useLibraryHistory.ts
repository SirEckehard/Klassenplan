// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import type {
  ClassroomTemplate,
  ClassSummary,
  EditableMixRecipeId,
  MixPresetWeights,
  OwnMixPreset,
  UpdateClassMetadataPayload,
} from '@/types';
import {
  loadMixPresets,
  restoreOwnMixPreset,
  setMixPresetOverride,
} from '@/repositories/mixPresetStore';
import { logError } from '@/utils';
import type { ClassParts } from '@/utils/data/classRooms';
import { announce, dismissToast, showToast } from '@/utils/ui/toast';
import type { LibraryEdit, LibraryEditOutcome } from './useClassLibrary';

/**
 * How something stood before a change. A class's plans, mixes and rooms go back
 * together, since a change there can touch all of them; a template or a preset
 * goes back alone, so another window's others stay.
 */
export type LibraryStep =
  | {
      kind: 'class';
      classId: string;
      parts: ClassParts;
      /** What a stored class must hold for this step to go back. */
      expected?: ClassParts;
    }
  | {
      kind: 'classMeta';
      classId: string;
      name: string;
      label: string;
      notes: string;
    }
  | {
      kind: 'template';
      templateId: number;
      template: ClassroomTemplate | null;
      index: number;
    }
  | {
      kind: 'ownPreset';
      presetId: string;
      preset: OwnMixPreset | null;
      index: number;
    }
  | {
      kind: 'presetOverride';
      builtin: EditableMixRecipeId;
      weights: MixPresetWeights | null;
    };

interface HistoryEntry {
  step: LibraryStep;
  /** What was chosen in the columns then; going back chooses it again. */
  path: string[];
}

interface Stacks {
  past: HistoryEntry[];
  future: HistoryEntry[];
}

export interface LibraryHistoryDeps {
  classes: ClassSummary[];
  openClassId: string | null;
  /** Counts the times the open class was replaced from outside. */
  reloadGeneration: number;
  path: string[];
  choosePath: (path: string[]) => void;
  editClass: (
    classId: string,
    edit: LibraryEdit,
  ) => Promise<LibraryEditOutcome>;
  updateClassMetadata: (
    classId: string,
    patch: UpdateClassMetadataPayload,
  ) => Promise<boolean>;
  loadTemplates: () => Promise<ClassroomTemplate[]>;
  restoreTemplate: (
    id: number,
    template: ClassroomTemplate | null,
    index: number,
  ) => Promise<boolean>;
  onTemplatesChanged: () => void;
}

/** As deep as the seating plan's undo. */
const HISTORY_LIMIT = 30;
const OFFER_ID = 'library-undo-offer';
const OFFER_DURATION_MS = 8000;
const EMPTY: Stacks = { past: [], future: [] };

type Applied =
  | { ok: true; inverse: LibraryStep }
  /** `lasting`: trying again cannot help, so the step goes. */
  | { ok: false; message: string | null; lasting: boolean };

const STORAGE_FAILED: Applied = {
  ok: false,
  message: 'toast:errors.storage',
  lasting: false,
};

/** Puts `step` in place; the answer holds how things stood until then. */
async function applyStep(
  step: LibraryStep,
  deps: LibraryHistoryDeps,
): Promise<Applied> {
  switch (step.kind) {
    case 'class': {
      const outcome = await deps.editClass(step.classId, {
        kind: 'restoreParts',
        parts: step.parts,
        expected: step.expected,
      });
      if (outcome.ok) {
        return {
          ok: true,
          inverse: {
            kind: 'class',
            classId: step.classId,
            parts: outcome.before,
            expected: outcome.after,
          },
        };
      }
      if (outcome.reason === 'not-found') {
        return { ok: false, message: 'toast:library.gone', lasting: true };
      }
      if (outcome.reason === 'changed-elsewhere') {
        return {
          ok: false,
          message: 'toast:library.changedElsewhere',
          lasting: true,
        };
      }
      return STORAGE_FAILED;
    }
    case 'classMeta': {
      const standing = deps.classes.find((entry) => entry.id === step.classId);
      if (!standing) {
        return { ok: false, message: 'toast:library.gone', lasting: true };
      }
      const kept = await deps.updateClassMetadata(step.classId, {
        name: step.name,
        label: step.label,
        notes: step.notes,
      });
      // The update says why itself; a name taken since stays taken.
      if (!kept) return { ok: false, message: null, lasting: true };
      return {
        ok: true,
        inverse: {
          kind: 'classMeta',
          classId: step.classId,
          name: standing.name,
          label: standing.label ?? '',
          notes: standing.notes ?? '',
        },
      };
    }
    case 'template': {
      const list = await deps.loadTemplates();
      const index = list.findIndex((entry) => entry.id === step.templateId);
      const kept = await deps.restoreTemplate(
        step.templateId,
        step.template,
        step.index,
      );
      if (!kept) return STORAGE_FAILED;
      deps.onTemplatesChanged();
      return {
        ok: true,
        inverse: {
          ...step,
          template: list[index] ?? null,
          index: index === -1 ? step.index : index,
        },
      };
    }
    case 'ownPreset': {
      const { presets } = await loadMixPresets();
      const index = presets.findIndex((entry) => entry.id === step.presetId);
      const kept = await restoreOwnMixPreset(
        step.presetId,
        step.preset,
        step.index,
      );
      if (!kept) return STORAGE_FAILED;
      return {
        ok: true,
        inverse: {
          ...step,
          preset: presets[index] ?? null,
          index: index === -1 ? step.index : index,
        },
      };
    }
    case 'presetOverride': {
      const { overrides } = await loadMixPresets();
      if (!(await setMixPresetOverride(step.builtin, step.weights))) {
        return STORAGE_FAILED;
      }
      return {
        ok: true,
        inverse: { ...step, weights: overrides[step.builtin]?.weights ?? null },
      };
    }
  }
}

/** A step of a class deleted since has nothing left to go back to. */
const isLive = ({ step }: HistoryEntry, classes: ClassSummary[]) =>
  (step.kind !== 'class' && step.kind !== 'classMeta') ||
  classes.some((entry) => entry.id === step.classId);

/**
 * The undo of "Bibliothek" (decision 0041): what is changed there lies in no
 * other history — the class list, the room and the seating each have theirs,
 * and none shows here.
 *
 * It lasts as long as the page: back in the workspace the plans go on changing,
 * and a step kept from before would write over that. For the same reason the
 * class's steps go when another class opens, and all of them when the open
 * class is replaced from outside or everything is wiped. A class deleted takes
 * its steps along.
 *
 * Steps run one after the other, since a template's or a stored class's goes
 * through storage.
 */
export function useLibraryHistory(deps: LibraryHistoryDeps) {
  const { t } = useTranslation('generator');
  const [stacks, setStacks] = useState<Stacks>(EMPTY);
  const stacksRef = useRef(stacks);
  const commit = useCallback((change: (current: Stacks) => Stacks) => {
    stacksRef.current = change(stacksRef.current);
    setStacks(stacksRef.current);
  }, []);

  const depsRef = useRef(deps);
  useLayoutEffect(() => {
    depsRef.current = deps;
  });
  const chainRef = useRef<Promise<unknown>>(Promise.resolve());

  const offeredRef = useRef(false);
  const withdrawOffer = useCallback(() => {
    if (!offeredRef.current) return;
    offeredRef.current = false;
    dismissToast(OFFER_ID);
  }, []);

  const { openClassId, reloadGeneration } = deps;
  const noClassLeft = deps.classes.length === 0;
  useEffect(() => {
    commit(({ past, future }) => ({
      past: past.filter((entry) => entry.step.kind !== 'class'),
      future: future.filter((entry) => entry.step.kind !== 'class'),
    }));
  }, [commit, openClassId]);
  useEffect(() => {
    commit(() => EMPTY);
  }, [commit, reloadGeneration]);
  useEffect(() => {
    if (noClassLeft) commit(() => EMPTY);
  }, [commit, noClassLeft]);
  useEffect(() => withdrawOffer, [withdrawOffer]);

  const travel = useCallback(
    (from: 'past' | 'future') => {
      withdrawOffer();
      chainRef.current = chainRef.current
        .then(async () => {
          const current = depsRef.current;
          const entry = stacksRef.current[from]
            .filter((candidate) => isLive(candidate, current.classes))
            .at(-1);
          if (!entry) return;
          const without = (entries: HistoryEntry[]) =>
            entries.filter((candidate) => candidate !== entry);
          const pathThen = current.path;
          const applied = await applyStep(entry.step, current);
          if (!applied.ok) {
            if (applied.message) showToast('error', applied.message);
            if (applied.lasting) {
              commit((stack) => ({ ...stack, [from]: without(stack[from]) }));
            }
            return;
          }
          const back = { step: applied.inverse, path: pathThen };
          commit((stack) =>
            from === 'past'
              ? { past: without(stack.past), future: [...stack.future, back] }
              : { past: [...stack.past, back], future: without(stack.future) },
          );
          depsRef.current.choosePath(entry.path);
          announce(t(from === 'past' ? 'library.undone' : 'library.redone'));
        })
        .catch((error: unknown) => {
          logError('Failed to go back a step', { error }, 'useLibraryHistory');
          showToast('error', 'toast:errors.storage');
        });
    },
    [commit, t, withdrawOffer],
  );

  const undo = useCallback(() => travel('past'), [travel]);
  const redo = useCallback(() => travel('future'), [travel]);

  /**
   * Notes a change just made: `step` as things stood, `path` as it was chosen.
   * `offer` says what went, on a card that takes it back — only while it is
   * the latest step, since the undo goes through the latest (decision 0041).
   */
  const record = useCallback(
    (step: LibraryStep, options: { path: string[]; offer?: string }) => {
      commit(({ past }) => ({
        past: [...past, { step, path: options.path }].slice(-HISTORY_LIMIT),
        future: [],
      }));
      if (!options.offer) {
        withdrawOffer();
        return;
      }
      // The same id replaces a card standing, without it going first.
      offeredRef.current = true;
      showToast('info', options.offer, {
        id: OFFER_ID,
        duration: OFFER_DURATION_MS,
        action: { label: t('common:buttons.undo'), onClick: undo },
        onDismiss: () => {
          offeredRef.current = false;
        },
      });
    },
    [commit, t, undo, withdrawOffer],
  );

  return {
    record,
    undo,
    redo,
    canUndo: stacks.past.some((entry) => isLive(entry, deps.classes)),
    canRedo: stacks.future.some((entry) => isLive(entry, deps.classes)),
  };
}
