import { useImpersonation } from '@/contexts/ImpersonationContext';

/**
 * Hook to check if the app is in read-only mode (impersonation mode)
 * Returns true when admin is viewing as another user
 */
export function useReadOnlyMode() {
  const { isImpersonating } = useImpersonation();
  return isImpersonating;
}
