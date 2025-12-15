import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/components/common/AuthProvider";
import type { EmployeeRating, Profile, Skill, Subskill } from "@/types/database";
import { toast } from "sonner";
import { fetchAllRows } from "@/utils/supabasePagination";
import { notificationService } from "@/services/notificationService";

export interface ApprovalRequest {
  id: string;
  type: string;
  requester: string;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  submitDate: string;
  dueDate: string;
  rating: 'high' | 'medium' | 'low';
  skill?: Skill;
  subskill?: Subskill;
  self_comment?: string;
}

export interface GroupedApproval {
  employeeId: string;
  employeeName: string;
  email: string;
  pendingCount: number;
  submitDate: string;
  ratings: ApprovalRequest[];
}

export interface RecentAction {
  id: string;
  action: 'Approved' | 'Rejected';
  title: string;
  approver: string;
  date: string;
}

export const useApprovals = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [groupedApprovals, setGroupedApprovals] = useState<GroupedApproval[]>([]);
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const { user } = useAuthContext();

  const fetchPendingApprovals = async (showLoading = false) => {
    if (!user) return;
    
    if (showLoading) setLoading(true);
    try {
      // Fetch ALL employee ratings using pagination helper
      const { data: allRatings, error: ratingsError } = await fetchAllRows(
        supabase
          .from('employee_ratings')
          .select(`
            *,
            skills (
              id,
              name,
              category_id,
              created_at,
              skill_categories (name)
            ),
            subskills (
              id,
              name,
              skill_id,
              created_at,
              updated_at
            )
          `)
          .eq('status', 'submitted')
          .order('created_at', { ascending: false })
      );

      if (ratingsError) {
        console.error('Error fetching ratings:', ratingsError);
        throw ratingsError;
      }

      // Get user IDs from ratings to fetch only needed profiles
      const userIds = [...new Set((allRatings || []).map(r => r.user_id))];
      
      // Get ALL profiles to map user info (including tech leads for self-ratings)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, tech_lead_id, role')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Log if any ratings have missing profiles
      const missingProfiles = (allRatings || []).filter(
        r => !profiles?.find(p => p.user_id === r.user_id)
      );
      if (missingProfiles.length > 0) {
        console.warn('⚠️ Found ratings without profiles:', missingProfiles.map(r => r.user_id));
      }

      // Filter ratings based on approval logic:
      // 1. Employee ratings -> All Tech Leads can approve
      // 2. Tech Lead self-ratings -> Other Tech Leads can approve (exclude self)
      const currentUserProfile = profiles?.find(p => p.user_id === user.id);
      const filteredRatings = (allRatings || []).filter(rating => {
        const submitterProfile = profiles?.find(p => p.user_id === rating.user_id);
        // Exclude ratings where the submitter has no profile
        if (!submitterProfile) return false;
        const submitterRole = submitterProfile.role || 'employee';
        
        // If submitter is an employee, any tech lead can approve
        if (submitterRole === 'employee') {
          return true;
        }
        
        // If submitter is a tech lead, exclude self-approvals
        if (submitterRole === 'tech_lead') {
          return rating.user_id !== user.id; // Exclude own submissions
        }
        
        return true;
      });

      console.log('🔍 Current user:', currentUserProfile?.full_name, 'Role:', currentUserProfile?.role);
      console.log('📋 Filtered ratings:', filteredRatings.length, 'out of', allRatings?.length || 0);

      const approvals: ApprovalRequest[] = [];

      for (const rating of filteredRatings) {
        const employeeProfile = profiles?.find(p => p.user_id === rating.user_id);
        if (!employeeProfile) {
          // Skip approvals for users without profiles to keep counts consistent
          continue;
        }
        
        // Determine the type based on the role of the person who submitted the rating
        const submitterRole = employeeProfile.role || 'employee';
        const isTeamLead = submitterRole === 'tech_lead';
        
        approvals.push({
          id: rating.id,
          type: isTeamLead ? "Tech Lead Self-Assessment" : "Skill Assessment",
          requester: employeeProfile?.full_name || 'Unknown User',
          title: `${rating.skills?.name}${rating.subskills ? ` - ${rating.subskills.name}` : ''}`,
          description: `${isTeamLead ? 'Tech Lead' : 'Employee'} self-rated as ${rating.rating.toUpperCase()} level${rating.self_comment ? `: "${rating.self_comment}"` : ''}`,
          priority: rating.rating === 'high' ? 'High' : rating.rating === 'medium' ? 'Medium' : 'Low',
          submitDate: new Date(rating.submitted_at || rating.created_at).toLocaleDateString(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          rating: rating.rating as 'high' | 'medium' | 'low',
          skill: rating.skills,
          subskill: rating.subskills,
          self_comment: rating.self_comment
        });
      }

      console.log('✅ Created approvals:', approvals.length, 'approval requests');

      setPendingApprovals(approvals);

      // Group approvals by user_id directly from ratings
      const groupMap = new Map<string, GroupedApproval>();
      
      for (const rating of filteredRatings) {
        const employeeProfile = profiles?.find(p => p.user_id === rating.user_id);
        
        if (!employeeProfile) {
          console.warn('⚠️ Skipping rating - no profile found for user_id:', rating.user_id);
          // Still try to get basic info from auth.users if profile is missing
          const { data: authUser } = await supabase.auth.admin.getUserById(rating.user_id);
          if (authUser?.user) {
            console.log('Found user in auth.users:', authUser.user.email);
          }
          continue;
        }
        
        // Find the corresponding approval request
        const approval = approvals.find(a => a.id === rating.id);
        if (!approval) continue;
        
        if (!groupMap.has(employeeProfile.user_id)) {
          groupMap.set(employeeProfile.user_id, {
            employeeId: employeeProfile.user_id,
            employeeName: employeeProfile.full_name,
            email: employeeProfile.email,
            pendingCount: 0,
            submitDate: approval.submitDate,
            ratings: []
          });
        }
        
        const group = groupMap.get(employeeProfile.user_id)!;
        group.ratings.push(approval);
        group.pendingCount = group.ratings.length;
      }
      
      const grouped = Array.from(groupMap.values()).sort((a, b) => 
        a.employeeName.localeCompare(b.employeeName)
      );

      console.log('📊 Grouped approvals:', grouped.length, 'groups with pending ratings');

      setGroupedApprovals(grouped);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      toast.error('Failed to fetch pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentActions = async () => {
    if (!user) return;

    try {
      const { data: ratings, error } = await supabase
        .from('employee_ratings')
        .select(`
          *,
          skills (name),
          subskills (name)
        `)
        .in('status', ['approved', 'rejected'])
        .order('approved_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get profile names for the rated users
      const userIds = ratings?.map(r => r.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, role')
        .in('user_id', userIds);

      const actions: RecentAction[] = ratings?.map(rating => {
        const profile = profiles?.find(p => p.user_id === rating.user_id);
        return {
          id: rating.id,
          action: rating.status === 'approved' ? 'Approved' : 'Rejected',
          title: `${rating.skills?.name}${rating.subskills ? ` - ${rating.subskills.name}` : ''}`,
          approver: profile?.full_name || 'Unknown',
          date: new Date(rating.approved_at || rating.updated_at).toLocaleDateString()
        };
      }) || [];

      setRecentActions(actions);
    } catch (error) {
      console.error('Error fetching recent actions:', error);
    }
  };

  // Get approved today count
  const getApprovedTodayCount = () => {
    const today = new Date().toDateString();
    return recentActions.filter(action => 
      action.action === 'Approved' && new Date(action.date).toDateString() === today
    ).length;
  };

  // Get rejected today count
  const getRejectedTodayCount = () => {
    const today = new Date().toDateString();
    return recentActions.filter(action => 
      action.action === 'Rejected' && new Date(action.date).toDateString() === today
    ).length;
  };

  // Get approved today actions
  const getApprovedTodayActions = () => {
    const today = new Date().toDateString();
    return recentActions.filter(action => 
      action.action === 'Approved' && new Date(action.date).toDateString() === today
    );
  };

  // Get rejected today actions
  const getRejectedTodayActions = () => {
    const today = new Date().toDateString();
    return recentActions.filter(action => 
      action.action === 'Rejected' && new Date(action.date).toDateString() === today
    );
  };

  const handleApproveRating = async (approvalId: string, comment?: string) => {
    try {
      if (!user?.id) {
        toast.error('You must be logged in to approve ratings');
        return;
      }

      const { data: updatedRows, error } = await supabase
        .from('employee_ratings')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          approver_comment: comment || null
        })
        .eq('id', approvalId)
        .select('*');

      if (error) {
        console.error('Supabase error:', error);
        toast.error('Failed to approve rating');
        return;
      }

      const updated = (updatedRows && updatedRows[0]) as any;
      
      // Optimistically update local state after successful DB update
      setPendingApprovals(prev => prev.filter(a => a.id !== approvalId));
      
      // Update grouped approvals
      setGroupedApprovals(prev => {
        return prev.map(group => {
          const updatedRatings = group.ratings.filter(r => r.id !== approvalId);
          return {
            ...group,
            ratings: updatedRatings,
            pendingCount: updatedRatings.length
          };
        }).filter(group => group.pendingCount > 0);
      });

      // Add to recent actions
      const approvedRating = pendingApprovals.find(a => a.id === approvalId);
      if (approvedRating) {
        const newAction: RecentAction = {
          id: approvalId,
          action: 'Approved',
          title: approvedRating.title,
          approver: approvedRating.requester,
          date: new Date().toLocaleDateString()
        };
        setRecentActions(prev => [newAction, ...prev]);
      }

      // Ensure at least one history record exists for approved subskill ratings
      if (updated?.subskill_id) {
        const { count } = await supabase
          .from('subskill_rating_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', updated.user_id)
          .eq('subskill_id', updated.subskill_id);

        if (!count || count === 0) {
          await supabase.from('subskill_rating_history').insert({
            user_id: updated.user_id,
            skill_id: updated.skill_id,
            subskill_id: updated.subskill_id,
            rating: updated.rating,
            self_comment: updated.self_comment,
            approver_comment: updated.approver_comment,
            approved_by: updated.approved_by,
            approved_at: updated.approved_at,
            status: updated.status,
            archived_at: new Date().toISOString(),
          });
        }
      }

      // Log the approval action
      await supabase
        .from('approval_logs')
        .insert({
          rating_id: approvalId,
          approver_id: user.id,
          action: 'approved',
          approver_comment: comment || '',
          created_at: new Date().toISOString()
        });

      // Send notification to the employee
      if (updated?.user_id) {
        const { data: approverProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();

        const skillName = approvedRating?.title || 'skill';
        await notificationService.notifyRatingApproved(
          updated.user_id,
          approverProfile?.full_name || 'A tech lead',
          skillName,
          user.id,
          approvalId
        );
      }

      toast.success('Rating approved successfully');
    } catch (error) {
      console.error('Error approving rating:', error);
      toast.error('Failed to approve rating');
    }
  };

  const handleRejectRating = async (approvalId: string, comment: string) => {
    try {
      if (!user?.id) {
        toast.error('You must be logged in to reject ratings');
        return;
      }

      if (!comment.trim()) {
        toast.error('Comment is required when rejecting ratings');
        return;
      }

      const { data: updatedRows, error } = await supabase
        .from('employee_ratings')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          approver_comment: comment
        })
        .eq('id', approvalId)
        .select('*');

      if (error) {
        console.error('Supabase error:', error);
        toast.error('Failed to reject rating');
        return;
      }

      const updated = (updatedRows && updatedRows[0]) as any;
      
      // Update local state after successful DB update
      setPendingApprovals(prev => prev.filter(a => a.id !== approvalId));
      
      // Update grouped approvals
      setGroupedApprovals(prev => {
        return prev.map(group => {
          const updatedRatings = group.ratings.filter(r => r.id !== approvalId);
          return {
            ...group,
            ratings: updatedRatings,
            pendingCount: updatedRatings.length
          };
        }).filter(group => group.pendingCount > 0);
      });

      // Add to recent actions
      const rejectedRating = pendingApprovals.find(a => a.id === approvalId);
      if (rejectedRating) {
        const newAction: RecentAction = {
          id: approvalId,
          action: 'Rejected',
          title: rejectedRating.title,
          approver: rejectedRating.requester,
          date: new Date().toLocaleDateString()
        };
        setRecentActions(prev => [newAction, ...prev]);
      }

      // Ensure at least one history record exists for rejected subskill ratings
      if (updated?.subskill_id) {
        const { count } = await supabase
          .from('subskill_rating_history')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', updated.user_id)
          .eq('subskill_id', updated.subskill_id);

        if (!count || count === 0) {
          await supabase.from('subskill_rating_history').insert({
            user_id: updated.user_id,
            skill_id: updated.skill_id,
            subskill_id: updated.subskill_id,
            rating: updated.rating,
            self_comment: updated.self_comment,
            approver_comment: updated.approver_comment,
            approved_by: updated.approved_by,
            approved_at: updated.approved_at,
            status: updated.status,
            archived_at: new Date().toISOString(),
          });
        }
      }

      // Log the rejection action
      await supabase
        .from('approval_logs')
        .insert({
          rating_id: approvalId,
          approver_id: user.id,
          action: 'rejected',
          approver_comment: comment,
          created_at: new Date().toISOString()
        });

      // Send notification to the employee
      if (updated?.user_id) {
        const { data: approverProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();

        const skillName = rejectedRating?.title || 'skill';
        await notificationService.notifyRatingRejected(
          updated.user_id,
          approverProfile?.full_name || 'A tech lead',
          skillName,
          comment,
          user.id,
          approvalId
        );
      }

      toast.success('Rating rejected');
    } catch (error) {
      console.error('Error rejecting rating:', error);
      toast.error('Failed to reject rating');
    }
  };

  useEffect(() => {
    if (user) {
      fetchPendingApprovals(true); // Show loading only on initial mount
      fetchRecentActions();
    }
  }, [user]);

  const handleDeleteRating = async (approvalId: string) => {
    try {
      if (!user?.id) {
        toast.error('You must be logged in to delete ratings');
        return;
      }

      const { error } = await supabase
        .from('employee_ratings')
        .delete()
        .eq('id', approvalId);

      if (error) {
        console.error('Supabase error:', error);
        toast.error('Failed to delete rating');
        return;
      }
      
      // Update local state after successful DB delete
      setPendingApprovals(prev => prev.filter(a => a.id !== approvalId));
      
      // Update grouped approvals
      setGroupedApprovals(prev => {
        return prev.map(group => {
          const updatedRatings = group.ratings.filter(r => r.id !== approvalId);
          return {
            ...group,
            ratings: updatedRatings,
            pendingCount: updatedRatings.length
          };
        }).filter(group => group.pendingCount > 0);
      });

      toast.success('Rating deleted successfully');
    } catch (error) {
      console.error('Error deleting rating:', error);
      toast.error('Failed to delete rating');
    }
  };

  return {
    searchTerm,
    setSearchTerm,
    pendingApprovals,
    groupedApprovals,
    recentActions,
    loading,
    handleApproveRating,
    handleRejectRating,
    handleDeleteRating,
    getApprovedTodayCount,
    getRejectedTodayCount,
    getApprovedTodayActions,
    getRejectedTodayActions,
    refetch: () => {
      fetchPendingApprovals();
      fetchRecentActions();
    }
  };
};