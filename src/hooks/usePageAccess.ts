import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/components/common/AuthProvider';

interface PageAccessMap {
  [route: string]: boolean;
}

export function usePageAccess() {
  const { profile } = useAuthContext();
  const [accessMap, setAccessMap] = useState<PageAccessMap>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!profile?.role) {
      setIsLoading(false);
      return;
    }

    loadPageAccess();

    // Subscribe to realtime changes so toggles apply instantly across the app
    const channel = supabase
      .channel('page-access-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'page_access' }, () => {
        loadPageAccess();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pages' }, () => {
        loadPageAccess();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.role]);

  const loadPageAccess = async () => {
    if (!profile?.role) return;

    try {
      setIsLoading(true);

      // Fetch all pages and their access settings for current user's role
      const { data: pages, error: pagesError } = await supabase
        .from('pages')
        .select('*');

      if (pagesError) throw pagesError;

      const { data: accessData, error: accessError } = await supabase
        .from('page_access')
        .select('*')
        .eq('role_name', profile.role);

      if (accessError) throw accessError;

      // Build access map
      const map: PageAccessMap = {};
      pages?.forEach((page) => {
        const access = accessData?.find((a) => a.page_id === page.id);
        map[page.route] = access?.has_access ?? false;
      });

      setAccessMap(map);
    } catch (error) {
      console.error('Error loading page access:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const hasAccess = (route: string): boolean => {
    return accessMap[route] ?? false;
  };

  return {
    hasAccess,
    isLoading,
    accessMap,
    refreshAccess: loadPageAccess
  };
}
