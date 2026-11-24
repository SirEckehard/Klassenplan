// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, useState } from 'react';
import { useSeatingRepository } from '@/hooks/useSeatingRepository';
import { logError } from '@/utils';

/**
 * Whether the classes as they were before the switch to a key per class are
 * still kept — 30 days after it (decision 0049). The backup menu offers
 * them only then. The toolbar's foot asks on every layer; the repository
 * reads the answer once per window, without reading the classes as classes.
 */
export function useClassesFromBeforeUpdate(): boolean {
  const repository = useSeatingRepository();
  const [kept, setKept] = useState(false);

  useEffect(() => {
    let live = true;
    repository
      .hasRetiredClasses()
      .then((result) => {
        if (live) setKept(result.success && result.data);
      })
      .catch((error: unknown) => {
        logError(
          'Failed to look for the classes from before the update',
          { error },
          'useClassesFromBeforeUpdate',
        );
      });
    return () => {
      live = false;
    };
  }, [repository]);

  return kept;
}
