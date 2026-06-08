import { getBrowserDocument } from './browserEnvironment';

/**
 * Detect whether the currently focused element is a form control or contentEditable.
 * Useful to prevent global shortcuts from hijacking regular text inputs.
 */
export const isFormElementFocused = (): boolean => {
  const documentRef = getBrowserDocument();
  if (!documentRef) {
    return false;
  }

  const activeElement = documentRef.activeElement;
  if (!activeElement) {
    return false;
  }

  if (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLSelectElement
  ) {
    return true;
  }

  return (
    activeElement instanceof HTMLElement && activeElement.isContentEditable
  );
};
