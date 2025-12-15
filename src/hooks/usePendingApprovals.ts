import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const usePendingApprovals = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  const fetchPendingCount = async () => {
    if (!profile || !['tech_lead', 'management', 'admin'].includes(profile.role)) {
      setPendingCount(0);
      setLoading(false);
      return;
    }

    try {
      console.log('🔍 Fetching pending approval count...');
      
      // Get current user profile to filter out self-approvals
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('user_id, role')
        .eq('user_id', profile.user_id)
        .single();

      if (!currentProfile) {
        setPendingCount(0);
        setLoading(false);
        return;
      }

      // Fetch all submitted ratings
      const { data: allRatings, error } = await supabase
        .from('employee_ratings')
        .select('id, user_id')
        .eq('status', 'submitted');

      if (error) {
        console.error('Error fetching pending approvals:', error);
        setPendingCount(0);
        setLoading(false);
        return;
      }

      if (!allRatings || allRatings.length === 0) {
        setPendingCount(0);
        setLoading(false);
        return;
      }

      // Get unique user IDs from ratings
      const userIds = [...new Set(allRatings.map(r => r.user_id))];
      
      // Get profiles for all rating submitters (only for users with ratings)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, role')
        .in('user_id', userIds);

      // Filter out ratings without profiles AND self-approvals for tech leads
      const filteredRatings = allRatings.filter(rating => {
        const submitterProfile = profiles?.find(p => p.user_id === rating.user_id);
        
        // Exclude if no profile exists
        if (!submitterProfile) {
          console.warn('⚠️ Excluding rating - no profile for user_id:', rating.user_id);
          return false;
        }
        
        const submitterRole = submitterProfile.role || 'employee';
        
        // If submitter is an employee, any tech lead can approve
        if (submitterRole === 'employee') {
          return true;
        }
        
        // If submitter is a tech lead, exclude self-approvals
        if (submitterRole === 'tech_lead') {
          return rating.user_id !== currentProfile.user_id;
        }
        
        return true;
      });

      console.log('📊 Found pending ratings:', filteredRatings.length, 'out of', allRatings.length);
      setPendingCount(filteredRatings.length);
    } catch (error) {
      console.error('Error in fetchPendingCount:', error);
      setPendingCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingCount();
  }, [profile]);

  // Set up real-time subscription for employee_ratings changes
  useEffect(() => {
    if (!profile || !['tech_lead', 'management', 'admin'].includes(profile.role)) {
      return;
    }

    const channel = supabase
      .channel('pending-approvals')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employee_ratings'
        },
        () => {
          // Refetch count when ratings change
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  return {
    pendingCount,
    loading,
    refetch: fetchPendingCount
  };
};