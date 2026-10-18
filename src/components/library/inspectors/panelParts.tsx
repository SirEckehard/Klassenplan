// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { InspectorRow } from '@/components/shell/InspectorPanel';

/** A row that states a value: what it is on the left, the value on the right. */
export function ValueRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <InspectorRow label={label}>
      <span className="text-right text-control tabular-nums text-(--text-muted)">
        {children}
      </span>
    </InspectorRow>
  );
}
