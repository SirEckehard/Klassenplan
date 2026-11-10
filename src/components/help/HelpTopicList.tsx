// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import type { Icon } from '@phosphor-icons/react';

/**
 * One thing a screen's help explains: the icon the interface gives it, and
 * the i18n key its `.title` and `.body` hang from.
 */
export interface HelpTopic {
  /**
   * Written out in full, so `check:i18n` sees it as the parent of `.title`
   * and `.body`; with its namespace where that is not `generator`
   * (`pages:nameGame.help.quiz`).
   */
  key: string;
  icon: Icon;
}

/**
 * A screen's instructions as topics, not as a paragraph per bullet: the icon
 * the screen shows for the thing, two or three words, and one sentence under
 * them. A teacher scans the words for what they are after and reads that
 * sentence alone; the icon is one they have seen on the screen beside it.
 */
export default function HelpTopicList({
  topics,
}: {
  topics: readonly HelpTopic[];
}) {
  const { t } = useTranslation(['generator', 'pages']);
  return (
    <ul className="flex flex-col gap-3">
      {topics.map(({ key, icon: TopicIcon }) => (
        <li key={key} className="flex gap-2.5">
          {/* On the title's line: 16px beside its 13px text. */}
          <TopicIcon
            size={16}
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-(--text-muted)"
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <h4 className="text-control font-semibold text-(--text-page)">
              {t(`${key}.title`)}
            </h4>
            <p className="text-control leading-snug text-(--text-muted)">
              {t(`${key}.body`)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
