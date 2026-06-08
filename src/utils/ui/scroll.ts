// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
export const SCROLL_TO_TOP_EVENT = 'app:scrollToTop';

export const triggerScrollToTop = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SCROLL_TO_TOP_EVENT));
};
