export const SCROLL_TO_TOP_EVENT = 'app:scrollToTop';

export const triggerScrollToTop = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(SCROLL_TO_TOP_EVENT));
};
