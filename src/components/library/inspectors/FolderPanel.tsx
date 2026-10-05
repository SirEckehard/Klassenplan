// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { Icon } from '@phosphor-icons/react';
import {
  InspectorBody,
  InspectorHeader,
} from '@/components/shell/InspectorPanel';
import { IconTile } from './panelParts';

/**
 * A folder that is only a list — the recent mixes, the templates — or no
 * selection at all: what it holds, and a line on what it is for.
 */
export default function FolderPanel({
  icon,
  title,
  subtitle,
  hint,
}: {
  icon: Icon;
  title: string;
  subtitle?: string;
  hint: string;
}) {
  return (
    <>
      <InspectorHeader
        media={<IconTile icon={icon} />}
        title={title}
        subtitle={subtitle}
      />
      <InspectorBody>
        <p className="text-[13px] leading-relaxed text-(--text-muted)">
          {hint}
        </p>
      </InspectorBody>
    </>
  );
}
