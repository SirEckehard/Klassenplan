// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { SavedPlan } from '@/types';
import PlanCard from '../PlanCard';

type Props = {
  items: SavedPlan[];
  onLoad: (plan: SavedPlan) => void;
  onDelete: (plan: SavedPlan) => void;
  onRename?: (id: string, name: string) => boolean;
};

/**
 * Renders a responsive grid of plan cards.
 */
export default function PlanList({ items, onLoad, onDelete, onRename }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          onLoad={onLoad}
          onDelete={onDelete}
          onRename={onRename}
        />
      ))}
    </div>
  );
}
