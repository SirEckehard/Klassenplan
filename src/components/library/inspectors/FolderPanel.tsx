// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type React from 'react';
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
  media,
}: {
  icon: Icon;
  title: string;
  subtitle?: string;
  hint: string;
  /** What stands for the entry in place of the icon: a student's photo. */
  media?: React.ReactNode;
}) {
  return (
    <>
      <InspectorHeader
        media={media ?? <IconTile icon={icon} />}
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
