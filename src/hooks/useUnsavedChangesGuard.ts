import { useEffect } from 'react';
import { useBeforeUnload } from 'react-router-dom';

/**
 * Warns users before leaving a page with unsaved changes.
 * Uses both `beforeunload` (browser close/refresh) and React Router's blocker.
 */
export function useUnsavedChangesGuard(hasUnsavedChanges: boolean) {
  // Browser close / refresh
  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsavedChanges]);

  // React Router navigation
  useBeforeUnload(
    (event) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
      }
    },
    { capture: true }
  );
}
