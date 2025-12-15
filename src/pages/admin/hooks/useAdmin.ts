import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  pendingApprovals: number;
  systemHealth: 'Good' | 'Warning' | 'Critical';
}

export const useAdmin = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("user-management");
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    activeUsers: 0,
    pendingApprovals: 0,
    systemHealth: 'Good'
  });

  const fetchAdminStats = async () => {
    if (!profile || profile.role !== 'admin') return;
    
    try {
      setLoading(true);
      
      // Get total users
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('id, status');
      
      // Get active users
      const activeUsersCount = allUsers?.filter(user => user.status === 'active').length || 0;
      
      // Get pending approvals
      const { data: pendingApprovals } = await supabase
        .from('employee_ratings')
        .select('id')
        .eq('status', 'submitted');
      
      // Determine system health based on data
      let systemHealth: 'Good' | 'Warning' | 'Critical' = 'Good';
      const pendingCount = pendingApprovals?.length || 0;
      
      if (pendingCount > 20) {
        systemHealth = 'Critical';
      } else if (pendingCount > 10) {
        systemHealth = 'Warning';
      }
      
      setStats({
        totalUsers: allUsers?.length || 0,
        activeUsers: activeUsersCount,
        pendingApprovals: pendingCount,
        systemHealth
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      setStats({
        totalUsers: 0,
        activeUsers: 0,
        pendingApprovals: 0,
        systemHealth: 'Critical'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminStats();
  }, [profile]);

  return {
    loading,
    activeTab,
    setActiveTab,
    stats,
    refreshStats: fetchAdminStats
  };
};