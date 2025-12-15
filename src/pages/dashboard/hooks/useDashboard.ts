import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface DashboardStats {
  totalTeamMembers: string;
  skillsTracked: string;
  completedAssessments: string;
  pendingReviews: string;
  totalMembers?: string;
  membersChange?: string;
  totalSkills?: string;
  skillsChange?: string;
  completionRate?: number;
  completionChange?: string;
  reviewsChange?: string;
  recentActivity?: Array<{
    description: string;
    timestamp: string;
  }>;
  topSkills?: Array<{
    name: string;
    percentage: number;
  }>;
}

export const useDashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalTeamMembers: "0",
    skillsTracked: "0", 
    completedAssessments: "0%",
    pendingReviews: "0"
  });
  
  const [loading, setLoading] = useState(true);

  const fetchDashboardStats = async (showLoading = false) => {
    if (!profile) return;
    
    try {
      if (showLoading) setLoading(true);
      
      // Get total team members
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('status', 'active');
      
      // Get total skills tracked
      const { data: skills } = await supabase
        .from('skills')
        .select('id');
      
      // Get completed assessments (approved ratings)
      const { data: totalRatings } = await supabase
        .from('employee_ratings')
        .select('id');
        
      const { data: approvedRatings } = await supabase
        .from('employee_ratings')
        .select('id')
        .eq('status', 'approved');
      
      // Get pending reviews
      const { data: pendingRatings } = await supabase
        .from('employee_ratings')
        .select('id')
        .eq('status', 'submitted');
      
      const completionRate = totalRatings?.length 
        ? Math.round((approvedRatings?.length || 0) / totalRatings.length * 100)
        : 0;
      
      // Get recent activity from activity logs
      const { data: recentActivities } = await supabase
        .from('activity_logs')
        .select('description, created_at, metadata')
        .order('created_at', { ascending: false })
        .limit(5);

      const recentActivity = recentActivities?.map(activity => ({
        description: activity.description,
        timestamp: new Date(activity.created_at).toLocaleString()
      })) || [];

      // Calculate top skills by counting approved ratings per skill
      const { data: skillRatings } = await supabase
        .from('employee_ratings')
        .select('skill_id, skills(name)')
        .eq('status', 'approved')
        .not('skill_id', 'is', null);

      // Count ratings per skill
      const skillCounts = new Map<string, { name: string; count: number }>();
      skillRatings?.forEach(rating => {
        const skillName = (rating as any).skills?.name;
        const skillId = rating.skill_id;
        if (skillName && skillId) {
          const existing = skillCounts.get(skillId);
          if (existing) {
            existing.count++;
          } else {
            skillCounts.set(skillId, { name: skillName, count: 1 });
          }
        }
      });

      // Convert to array and calculate percentages
      const totalRatingsCount = skillRatings?.length || 1;
      const topSkills = Array.from(skillCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map(skill => ({
          name: skill.name,
          percentage: Math.round((skill.count / totalRatingsCount) * 100)
        }));

      setStats({
        totalTeamMembers: (profiles?.length || 0).toString(),
        skillsTracked: (skills?.length || 0).toString(),
        completedAssessments: `${completionRate}%`,
        pendingReviews: (pendingRatings?.length || 0).toString(),
        totalMembers: (profiles?.length || 0).toString(),
        membersChange: "+2 this month",
        totalSkills: (skills?.length || 0).toString(),
        skillsChange: "+5 this week",
        completionRate: completionRate,
        completionChange: "+12% this month",
        reviewsChange: "-3 this week",
        recentActivity,
        topSkills
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats(true);

    // Set up real-time subscription for live updates
    const channel = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employee_ratings' },
        () => {
          console.log('Rating changed, refreshing dashboard...');
          fetchDashboardStats(false);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          console.log('Profile changed, refreshing dashboard...');
          fetchDashboardStats(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);
  
  return {
    stats,
    loading,
    refreshStats: fetchDashboardStats
  };
};