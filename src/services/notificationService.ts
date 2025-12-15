import { supabase } from '@/integrations/supabase/client';

interface NotificationData {
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'approval' | 'rejection' | 'assignment' | 'update';
  performed_by?: string;
  related_record_id?: string;
  related_record_type?: string;
  related_record_route?: string;
}

/**
 * Service to create notifications for various actions
 */
export const notificationService = {
  /**
   * Create a notification
   */
  async create(data: NotificationData) {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: data.user_id,
          title: data.title,
          message: data.message,
          type: data.type,
          performed_by: data.performed_by || null,
          related_record_id: data.related_record_id || null,
          related_record_type: data.related_record_type || null,
          related_record_route: data.related_record_route || null,
          read: false,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  },

  /**
   * Notify all tech leads when a rating is submitted (except self if tech lead)
   */
  async notifyTechLeadsOfRatingSubmission(employeeId: string, employeeName: string, skillName: string, ratingId: string) {
    try {
      // Get all tech leads
      const { data: techLeads } = await supabase
        .from('profiles')
        .select('user_id')
        .in('role', ['tech_lead', 'management', 'admin']);

      if (!techLeads) return;

      // Create notifications for all tech leads except the employee themselves
      const notifications = techLeads
        .filter(tl => tl.user_id !== employeeId)
        .map(tl => ({
          user_id: tl.user_id,
          title: 'Pending Approval',
          message: `${employeeName} submitted a ${skillName} rating for your review`,
          type: 'info',
          performed_by: employeeId,
          related_record_id: ratingId,
          related_record_type: 'rating',
          related_record_route: '/approvals',
          read: false,
        }));

      if (notifications.length > 0) {
        const { error } = await supabase.from('notifications').insert(notifications);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error notifying tech leads:', error);
    }
  },

  /**
   * Notify user when their rating is approved
   */
  async notifyRatingApproved(userId: string, approverName: string, skillName: string, approverId: string, ratingId: string) {
    await this.create({
      user_id: userId,
      title: 'Rating Approved',
      message: `${approverName} approved your ${skillName} rating`,
      type: 'approval',
      performed_by: approverId,
      related_record_id: ratingId,
      related_record_type: 'rating',
      related_record_route: '/skills',
    });
  },

  /**
   * Notify user when their rating is rejected
   */
  async notifyRatingRejected(userId: string, approverName: string, skillName: string, reason: string, approverId: string, ratingId: string) {
    await this.create({
      user_id: userId,
      title: 'Rating Rejected',
      message: `${approverName} rejected your ${skillName} rating. Reason: ${reason}`,
      type: 'rejection',
      performed_by: approverId,
      related_record_id: ratingId,
      related_record_type: 'rating',
      related_record_route: '/skills',
    });
  },

  /**
   * Notify both employee and tech lead when management overrides approval
   */
  async notifyManagementOverride(employeeId: string, techLeadId: string, managementName: string, skillName: string, action: 'approved' | 'rejected', managementId: string, ratingId: string) {
    // Notify employee
    await this.create({
      user_id: employeeId,
      title: action === 'approved' ? 'Rating Approved by Management' : 'Rating Rejected by Management',
      message: `${managementName} has ${action} your ${skillName} rating`,
      type: action === 'approved' ? 'approval' : 'rejection',
      performed_by: managementId,
      related_record_id: ratingId,
      related_record_type: 'rating',
      related_record_route: '/skills',
    });

    // Notify tech lead
    await this.create({
      user_id: techLeadId,
      title: 'Management Override',
      message: `${managementName} has ${action} a rating you were reviewing`,
      type: 'update',
      performed_by: managementId,
      related_record_id: ratingId,
      related_record_type: 'rating',
      related_record_route: '/approvals',
    });
  },

  /**
   * Notify user when assigned to a project
   */
  async notifyProjectAssignment(userId: string, assignerName: string, projectName: string, assignerId: string, projectId: string) {
    await this.create({
      user_id: userId,
      title: 'Project Assignment',
      message: `${assignerName} assigned you to project "${projectName}"`,
      type: 'assignment',
      performed_by: assignerId,
      related_record_id: projectId,
      related_record_type: 'project',
      related_record_route: '/projects',
    });
  },

  /**
   * Notify user when removed from a project
   */
  async notifyProjectRemoval(userId: string, removerName: string, projectName: string, removerId: string, projectId: string) {
    await this.create({
      user_id: userId,
      title: 'Project Removal',
      message: `${removerName} removed you from project "${projectName}"`,
      type: 'update',
      performed_by: removerId,
      related_record_id: projectId,
      related_record_type: 'project',
      related_record_route: '/projects',
    });
  },

  /**
   * Notify management/admin when tech lead creates a project
   */
  async notifyProjectCreated(techLeadId: string, techLeadName: string, projectName: string, projectId: string) {
    try {
      const { data: managers } = await supabase
        .from('profiles')
        .select('user_id')
        .in('role', ['management', 'admin']);

      if (!managers) return;

      const notifications = managers.map(m => ({
        user_id: m.user_id,
        title: 'New Project Awaiting Approval',
        message: `${techLeadName} created project "${projectName}" for your approval`,
        type: 'info',
        performed_by: techLeadId,
        related_record_id: projectId,
        related_record_type: 'project',
        related_record_route: '/projects',
        read: false,
      }));

      if (notifications.length > 0) {
        const { error } = await supabase.from('notifications').insert(notifications);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error notifying project creation:', error);
    }
  },

  /**
   * Notify management/admin when tech lead updates a project
   */
  async notifyProjectUpdated(techLeadId: string, techLeadName: string, projectName: string, projectId: string) {
    try {
      const { data: managers } = await supabase
        .from('profiles')
        .select('user_id')
        .in('role', ['management', 'admin']);

      if (!managers) return;

      const notifications = managers.map(m => ({
        user_id: m.user_id,
        title: 'Project Updated',
        message: `${techLeadName} updated project "${projectName}" for your review`,
        type: 'info',
        performed_by: techLeadId,
        related_record_id: projectId,
        related_record_type: 'project',
        related_record_route: '/projects',
        read: false,
      }));

      if (notifications.length > 0) {
        const { error } = await supabase.from('notifications').insert(notifications);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error notifying project update:', error);
    }
  },

  /**
   * Notify tech lead when management approves/rejects their project
   */
  async notifyProjectStatusChange(techLeadId: string, approverName: string, projectName: string, status: 'approved' | 'rejected', reason: string | null, approverId: string, projectId: string) {
    await this.create({
      user_id: techLeadId,
      title: status === 'approved' ? 'Project Approved' : 'Project Rejected',
      message: status === 'approved' 
        ? `${approverName} approved your project "${projectName}"`
        : `${approverName} rejected your project "${projectName}". Reason: ${reason || 'No reason provided'}`,
      type: status === 'approved' ? 'approval' : 'rejection',
      performed_by: approverId,
      related_record_id: projectId,
      related_record_type: 'project',
      related_record_route: '/projects',
    });
  },

  /**
   * Notify all project members when project is marked completed
   */
  async notifyProjectCompleted(projectId: string, projectName: string, completedById: string) {
    try {
      const { data: assignments } = await supabase
        .from('project_assignments')
        .select('user_id')
        .eq('project_id', projectId);

      if (!assignments) return;

      const notifications = assignments.map(a => ({
        user_id: a.user_id,
        title: 'Project Completed',
        message: `Project "${projectName}" has been marked as completed`,
        type: 'success',
        performed_by: completedById,
        related_record_id: projectId,
        related_record_type: 'project',
        related_record_route: '/projects',
        read: false,
      }));

      if (notifications.length > 0) {
        const { error } = await supabase.from('notifications').insert(notifications);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error notifying project completion:', error);
    }
  },

  /**
   * Notify admins of auto-backup completion
   */
  async notifyBackupCompleted(backupName: string, status: 'success' | 'failure', errorMessage?: string) {
    try {
      const { data: admins } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('role', 'admin');

      if (!admins) return;

      const notifications = admins.map(a => ({
        user_id: a.user_id,
        title: status === 'success' ? 'Auto-Backup Completed' : 'Auto-Backup Failed',
        message: status === 'success' 
          ? `System backup "${backupName}" completed successfully`
          : `System backup "${backupName}" failed: ${errorMessage || 'Unknown error'}`,
        type: status === 'success' ? 'success' : 'warning',
        related_record_type: 'backup',
        related_record_route: '/admin',
        read: false,
      }));

      if (notifications.length > 0) {
        const { error } = await supabase.from('notifications').insert(notifications);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error notifying backup completion:', error);
    }
  },

  /**
   * Notify admins of restore completion
   */
  async notifyRestoreCompleted(backupName: string, restoredBy: string, status: 'success' | 'failure', errorMessage?: string) {
    try {
      const { data: admins } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('role', 'admin')
        .neq('user_id', restoredBy); // Don't notify the person who initiated the restore

      if (!admins) return;

      const notifications = admins.map(a => ({
        user_id: a.user_id,
        title: status === 'success' ? 'System Restore Completed' : 'System Restore Failed',
        message: status === 'success' 
          ? `System was restored from backup "${backupName}"`
          : `System restore from "${backupName}" failed: ${errorMessage || 'Unknown error'}`,
        type: 'warning',
        performed_by: restoredBy,
        related_record_type: 'restore',
        related_record_route: '/admin',
        read: false,
      }));

      if (notifications.length > 0) {
        const { error } = await supabase.from('notifications').insert(notifications);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error notifying restore completion:', error);
    }
  },


  /**
   * Notify user of profile updates
   */
  async notifyProfileUpdate(userId: string, updaterName: string, changes: string, updaterId: string) {
    await this.create({
      user_id: userId,
      title: 'Profile Updated',
      message: `${updaterName} updated your profile: ${changes}`,
      type: 'update',
      performed_by: updaterId,
    });
  },

  /**
   * Notify user of goal achievement
   */
  async notifyGoalAchievement(userId: string, goalTitle: string) {
    await this.create({
      user_id: userId,
      title: 'Goal Achieved! 🎉',
      message: `Congratulations! You've achieved your goal: ${goalTitle}`,
      type: 'success',
      performed_by: userId,
    });
  },
};
