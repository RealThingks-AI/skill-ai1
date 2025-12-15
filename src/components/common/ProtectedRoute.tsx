import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePageAccess } from '@/hooks/usePageAccess';
import { useAuthContext } from '@/components/common/AuthProvider';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { hasAccess, isLoading, accessMap } = usePageAccess();
  const { profile, loading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  // Get the first accessible page for the user
  const getFirstAccessiblePage = (): string => {
    // Priority order for finding accessible page
    const priorityRoutes = ['/dashboard', '/skills', '/approvals', '/projects', '/skill-explorer', '/reports'];
    
    for (const route of priorityRoutes) {
      if (accessMap[route]) {
        return route;
      }
    }
    
    // Fallback to any accessible route
    const accessibleRoute = Object.entries(accessMap).find(([, hasPageAccess]) => hasPageAccess);
    return accessibleRoute ? accessibleRoute[0] : '/no-access';
  };

  useEffect(() => {
    if (!authLoading && !isLoading && profile) {
      const currentRoute = location.pathname;
      
      // Utility routes that should always be accessible
      const publicUtilityRoutes = ['/profile', '/notifications'];
      const isUtilityRoute = publicUtilityRoutes.some(route => currentRoute.startsWith(route));
      
      // Only check access if accessMap has been loaded (not empty)
      // This prevents redirect during initial page load/refresh
      const accessMapLoaded = Object.keys(accessMap).length > 0;
      
      // Redirect root to first accessible page
      if (currentRoute === '/' && accessMapLoaded) {
        const firstAccessiblePage = getFirstAccessiblePage();
        navigate(firstAccessiblePage, { replace: true });
        return;
      }
      
      if (!isUtilityRoute && accessMapLoaded && !hasAccess(currentRoute)) {
        // Redirect to first accessible page
        const firstAccessiblePage = getFirstAccessiblePage();
        navigate(firstAccessiblePage, { replace: true });
      }
    }
  }, [hasAccess, authLoading, isLoading, location.pathname, navigate, profile, accessMap]);

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return <>{children}</>;
}
