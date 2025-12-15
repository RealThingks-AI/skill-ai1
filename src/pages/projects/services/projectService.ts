import { supabase } from "@/integrations/supabase/client";
import { notificationService } from "@/services/notificationService";
import { logActivity } from "@/services/activityLogger";
import type {
  Project, 
  ProjectFormData, 
  EmployeeMatch, 
  AllocationHistory,
  RequiredSkill,
  RatingLevel,
  ProjectStatus
} from "../types/projects";

export const projectService = {
  async getAllProjects(filterForEmployee?: string): Promise<Project[]> {
    // Get current user to check role
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    let query = supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    // If filterForEmployee is provided, filter projects where user is assigned
    if (filterForEmployee && userId) {
      const { data: userProjects } = await supabase
        .from('project_assignments')
        .select('project_id')
        .eq('user_id', userId);
      
      const projectIds = (userProjects || []).map(p => p.project_id);
      
      if (projectIds.length === 0) {
        return []; // No projects for this employee
      }
      
      query = query.in('id', projectIds).in('status', ['active', 'completed']);
    }

    const { data: projects, error } = await query;

    if (error) throw error;

    const projectsWithDetails = await Promise.all(
      (projects || []).map(async (project) => {
        // Fetch tech lead and creator profiles
        const profileIds = [project.tech_lead_id, project.created_by].filter(Boolean);
        const { data: projectProfiles } = profileIds.length > 0
          ? await supabase
              .from('profiles')
              .select('user_id, full_name, email, role')
              .in('user_id', profileIds)
          : { data: [] };
        
        const techLead = projectProfiles?.find(p => p.user_id === project.tech_lead_id);
        const creator = projectProfiles?.find(p => p.user_id === project.created_by);

        // Fetch members
        // Fetch members (avoid failing relational join by fetching profiles separately)
        const { data: assignments, error: assignmentsError } = await supabase
          .from('project_assignments')
          .select('user_id, allocation_percentage')
          .eq('project_id', project.id);

        if (assignmentsError) {
          console.error('Error fetching project assignments:', assignmentsError);
        }

        const userIds = (assignments || []).map((a: any) => a.user_id);
        const { data: profilesData, error: profilesError } = userIds.length
          ? await supabase
              .from('profiles')
              .select('user_id, full_name, email, role')
              .in('user_id', userIds)
          : { data: [], error: null } as any;

        if (profilesError) {
          console.error('Error fetching profiles for assignments:', profilesError);
        }

        const profileMap = new Map<string, { user_id: string; full_name: string; email: string; role: string }>(
          (profilesData || []).map((p: any) => [p.user_id, p])
        );

        // Fetch monthly allocations for all members
        const { data: monthlyAllocations } = await supabase
          .from('project_member_monthly_allocations')
          .select('user_id, month, allocation_percentage')
          .eq('project_id', project.id);

        const members = await Promise.all(
          (assignments || []).map(async (a: any) => {
            const { data: capacityData } = await supabase
              .rpc('get_user_total_allocation', { user_id_param: a.user_id });

            const p = profileMap.get(a.user_id);
            const memberMonthlyAllocs = (monthlyAllocations || [])
              .filter((ma: any) => ma.user_id === a.user_id)
              .map((ma: any) => ({
                month: ma.month,
                allocation_percentage: ma.allocation_percentage
              }));

            return {
              user_id: a.user_id,
              full_name: p?.full_name || 'Unknown',
              email: p?.email || '',
              role: p?.role || '',
              allocation_percentage: a.allocation_percentage,
              current_total_allocation: capacityData || 0,
              available_capacity: 100 - (capacityData || 0),
              monthly_allocations: memberMonthlyAllocs,
            };
          })
        );

        // Fetch required skills (avoid relational join failures)
        const { data: reqSkills, error: reqSkillsError } = await supabase
          .from('project_required_skills')
          .select('skill_id, subskill_id, required_rating')
          .eq('project_id', project.id);

        if (reqSkillsError) {
          console.error('Error fetching project required skills:', reqSkillsError);
        }

        // Fetch skill and subskill names separately
        const skillIds = [...new Set((reqSkills || []).map((rs: any) => rs.skill_id))];
        const subskillIds = [...new Set((reqSkills || []).map((rs: any) => rs.subskill_id))];

        const { data: skillsData } = skillIds.length > 0 
          ? await supabase.from('skills').select('id, name').in('id', skillIds)
          : { data: [] };

        const { data: subskillsData } = subskillIds.length > 0
          ? await supabase.from('subskills').select('id, name').in('id', subskillIds)
          : { data: [] };

        const skillMap = new Map((skillsData || []).map((s: any) => [s.id, s.name]));
        const subskillMap = new Map((subskillsData || []).map((s: any) => [s.id, s.name]));

        const required_skills = (reqSkills || []).map((rs: any) => ({
          skill_id: rs.skill_id,
          skill_name: skillMap.get(rs.skill_id) || 'Unknown Skill',
          subskill_id: rs.subskill_id,
          subskill_name: subskillMap.get(rs.subskill_id) || 'Unknown Subskill',
          required_rating: rs.required_rating,
        }));

        return {
          ...project,
          status: project.status as ProjectStatus,
          members,
          required_skills,
          month_wise_manpower: (project.month_wise_manpower as any) || [],
          pending_changes: (project.pending_changes as any) || null,
          tech_lead: techLead || null,
          creator: creator || null
        };
      })
    );

    return projectsWithDetails as Project[];
  },

  async getProjectById(projectId: string): Promise<Project> {
    // Get current user to check if they're an employee
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // Check user role
    const { data: userProfile } = userId
      ? await supabase.from('profiles').select('role').eq('user_id', userId).single()
      : { data: null };

    // For employees, pass the filter parameter
    const filterForEmployee = userProfile?.role === 'employee' ? userId : undefined;
    
    const projects = await this.getAllProjects(filterForEmployee);
    const project = projects.find(p => p.id === projectId);
    if (!project) throw new Error('Project not found');
    return project;
  },

  async findMatchingEmployees(requiredSkills: RequiredSkill[], selectedMonth?: string): Promise<EmployeeMatch[]> {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, role')
      .eq('status', 'active')
      .in('role', ['employee', 'tech_lead']);

    if (error) throw error;

    const matches: EmployeeMatch[] = await Promise.all(
      (profiles || []).map(async (profile) => {
        // Get user capacity - use month-specific if month is provided
        let current_total_allocation = 0;
        let available_capacity = 100;
        
        if (selectedMonth) {
          const { data: monthlyAllocation } = await supabase
            .rpc('get_user_monthly_allocation', { 
              user_id_param: profile.user_id, 
              month_param: selectedMonth 
            });
          current_total_allocation = monthlyAllocation || 0;
          available_capacity = 100 - current_total_allocation;
        } else {
          const { data: totalAllocation } = await supabase
            .rpc('get_user_total_allocation', { user_id_param: profile.user_id });
          current_total_allocation = totalAllocation || 0;
          available_capacity = 100 - current_total_allocation;
        }

        // Get user's approved ratings
        const { data: userRatings } = await supabase
          .from('employee_ratings')
          .select(`
            subskill_id,
            rating,
            skills!inner(id, name),
            subskills!inner(id, name)
          `)
          .eq('user_id', profile.user_id)
          .eq('status', 'approved');

        // Match against required skills
        let matched_skills = 0;
        const skill_details = requiredSkills.map(req => {
          const userRating = (userRatings || []).find(
            (ur: any) => ur.subskill_id === req.subskill_id
          );

          const ratingValues = { low: 1, medium: 2, high: 3 };
          const userRatingValue = userRating ? ratingValues[userRating.rating as RatingLevel] : 0;
          const requiredRatingValue = ratingValues[req.required_rating];
          
          const matches = userRatingValue >= requiredRatingValue;
          if (matches) matched_skills++;

          return {
            skill_name: req.skill_name,
            subskill_name: req.subskill_name,
            user_rating: (userRating?.rating || 'none') as RatingLevel | 'none',
            required_rating: req.required_rating,
            matches,
          };
        });

        const match_percentage = requiredSkills.length > 0 
          ? Math.round((matched_skills / requiredSkills.length) * 100)
          : 0;

        return {
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: profile.email,
          role: profile.role,
          available_capacity,
          current_total_allocation,
          matched_skills,
          total_required_skills: requiredSkills.length,
          match_percentage,
          skill_details,
        };
      })
    );

    // Sort by match percentage and available capacity
    return matches.sort((a, b) => {
      if (b.match_percentage !== a.match_percentage) {
        return b.match_percentage - a.match_percentage;
      }
      return b.available_capacity - a.available_capacity;
    });
  },

  // Get profiles for assigned members (used in StepThree to show members even without required skills)
  async getMemberProfiles(userIds: string[], selectedMonth?: string): Promise<EmployeeMatch[]> {
    if (userIds.length === 0) return [];

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, role')
      .in('user_id', userIds);

    if (error) throw error;

    const results: EmployeeMatch[] = await Promise.all(
      (profiles || []).map(async (profile) => {
        let current_total_allocation = 0;
        let available_capacity = 100;
        
        if (selectedMonth) {
          const { data: monthlyAllocation } = await supabase
            .rpc('get_user_monthly_allocation', { 
              user_id_param: profile.user_id, 
              month_param: selectedMonth 
            });
          current_total_allocation = monthlyAllocation || 0;
          available_capacity = 100 - current_total_allocation;
        } else {
          const { data: totalAllocation } = await supabase
            .rpc('get_user_total_allocation', { user_id_param: profile.user_id });
          current_total_allocation = totalAllocation || 0;
          available_capacity = 100 - current_total_allocation;
        }

        return {
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: profile.email,
          role: profile.role,
          available_capacity,
          current_total_allocation,
          matched_skills: 0,
          total_required_skills: 0,
          match_percentage: 0,
          skill_details: [],
        };
      })
    );

    return results;
  },

  // Get member monthly allocations for a project using RPC to bypass schema cache issues
  async getProjectMemberMonthlyAllocations(projectId: string): Promise<{ user_id: string; month: string; allocation_percentage: number }[]> {
    const { data, error } = await supabase
      .rpc('get_project_member_allocations', { p_project_id: projectId });

    if (error) {
      console.error('Error fetching monthly allocations:', error);
      return [];
    }

    return data || [];
  },

  // Validate monthly allocations against limits
  validateMonthlyAllocationsAgainstLimits(
    members: ProjectFormData['members'],
    monthlyManpower: { month: string; limit: number }[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const member of members) {
      if (!member.monthly_allocations) continue;
      
      for (const monthAlloc of member.monthly_allocations) {
        if (monthAlloc.allocation_percentage === null) continue;
        
        const monthLimit = monthlyManpower.find(m => m.month === monthAlloc.month);
        if (!monthLimit) continue;
        
        const allocationDecimal = monthAlloc.allocation_percentage / 100;
        if (allocationDecimal > monthLimit.limit) {
          errors.push(`Member allocation for ${monthAlloc.month} (${monthAlloc.allocation_percentage}%) exceeds limit (${monthLimit.limit * 100}%)`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  },

  // Validate that all member allocation months exist within project months
  validateMemberMonthsConsistency(
    members: ProjectFormData['members'],
    monthlyManpower: { month: string; limit: number }[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const validMonths = new Set(monthlyManpower.map(m => m.month));

    for (const member of members) {
      if (!member.monthly_allocations) continue;
      
      for (const monthAlloc of member.monthly_allocations) {
        if (monthAlloc.allocation_percentage === null) continue;
        
        if (!validMonths.has(monthAlloc.month)) {
          errors.push(`Member has allocation in ${monthAlloc.month} which is outside the project date range`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  },

  // Validate total allocation per month doesn't exceed limit
  validateTotalMonthlyAllocations(
    members: ProjectFormData['members'],
    monthlyManpower: { month: string; limit: number }[]
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const monthTotals = new Map<string, number>();

    // Sum up all allocations per month
    for (const member of members) {
      if (!member.monthly_allocations) continue;
      
      for (const monthAlloc of member.monthly_allocations) {
        if (monthAlloc.allocation_percentage === null) continue;
        
        const current = monthTotals.get(monthAlloc.month) || 0;
        monthTotals.set(monthAlloc.month, current + monthAlloc.allocation_percentage / 100);
      }
    }

    // Check against limits
    for (const [month, total] of monthTotals) {
      const limit = monthlyManpower.find(m => m.month === month)?.limit || 0;
      if (limit > 0 && total > limit) {
        errors.push(`Total allocation for ${month} (${total.toFixed(2)}) exceeds manpower limit (${limit})`);
      }
    }

    return { valid: errors.length === 0, errors };
  },

  async createProject(formData: ProjectFormData, userId: string): Promise<string> {
    // Create project - tech_lead_id defaults to creator if not set
    const techLeadId = formData.tech_lead_id || userId;
    
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert([{
        name: formData.name,
        description: formData.description,
        customer_name: formData.customer_name || null,
        tech_lead_id: techLeadId,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        month_wise_manpower: (formData.month_wise_manpower || []) as any,
        created_by: userId,
        status: 'awaiting_approval',
      }])
      .select()
      .single();

    if (projectError) throw projectError;

    // Add required skills (if provided)
    if (formData.required_skills && formData.required_skills.length > 0) {
      const skillsToInsert = formData.required_skills.map(skill => ({
        project_id: project.id,
        skill_id: skill.skill_id,
        subskill_id: skill.subskill_id,
        required_rating: skill.required_rating,
      }));

      const { error: skillsError } = await supabase
        .from('project_required_skills')
        .insert(skillsToInsert);

      if (skillsError) throw skillsError;
    }

    // Add members (if provided)
    if (formData.members && formData.members.length > 0) {
      const membersToInsert = formData.members.map(member => ({
        project_id: project.id,
        user_id: member.user_id,
        assigned_by: userId,
        allocation_percentage: member.allocation_percentage,
      }));

      const { error: membersError } = await supabase
        .from('project_assignments')
        .insert(membersToInsert);

      if (membersError) throw membersError;

      // Save monthly allocations using RPC
      for (const member of formData.members) {
        if (member.monthly_allocations) {
          for (const monthAlloc of member.monthly_allocations) {
            if (monthAlloc.allocation_percentage !== null) {
              const { error: monthlyError } = await supabase.rpc('upsert_member_monthly_allocation', {
                p_project_id: project.id,
                p_user_id: member.user_id,
                p_month: monthAlloc.month,
                p_allocation_percentage: monthAlloc.allocation_percentage
              });

              if (monthlyError) console.error('Error saving monthly allocation:', monthlyError);
            }
          }
        }
      }

      // Track allocation history
      const historyToInsert = formData.members.map(member => ({
        project_id: project.id,
        user_id: member.user_id,
        previous_allocation: null,
        new_allocation: member.allocation_percentage,
        changed_by: userId,
        change_reason: 'Initial project assignment',
      }));

      await supabase
        .from('project_allocation_history')
        .insert(historyToInsert);

      // Send notifications to assigned employees
      const { data: assignerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', userId)
        .single();

      const assignerName = assignerProfile?.full_name || 'A manager';

      for (const member of formData.members) {
        await notificationService.notifyProjectAssignment(
          member.user_id,
          assignerName,
          formData.name,
          userId,
          project.id
        );
      }
    }

    // Log project creation
    await logActivity({
      module: "Projects",
      actionType: "Create",
      description: `Created new project "${formData.name}"${formData.members?.length ? ` with ${formData.members.length} member(s)` : ''}${formData.required_skills?.length ? ` and ${formData.required_skills.length} required skill(s)` : ''}`,
      recordReference: project.id,
      metadata: {
        project_name: formData.name,
        customer_name: formData.customer_name,
        status: 'awaiting_approval',
        member_count: formData.members?.length || 0,
        skill_count: formData.required_skills?.length || 0,
      },
    });

    return project.id;
  },

  async updateProject(projectId: string, formData: ProjectFormData, newStatus?: ProjectStatus, userRole?: string): Promise<void> {
    // Get current user ID for tracking
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    if (!userId) throw new Error('User not authenticated');

    // Get current project to check if it's an active project being updated
    const { data: currentProject } = await supabase
      .from('projects')
      .select('status, name, description, customer_name, tech_lead_id, start_date, end_date, month_wise_manpower, requested_status')
      .eq('id', projectId)
      .single();

    const isActiveProjectUpdate = currentProject?.status === 'active';
    const isTechLead = userRole === 'tech_lead';
    const isAdminOrManagement = ['admin', 'management'].includes(userRole || '');

    // Check if approval-required fields changed (ONLY start_date, end_date, manpower_limit)
    // Member allocations (project_member_monthly_allocations table) do NOT require approval
    const currentManpowerLimits = Array.isArray(currentProject?.month_wise_manpower) 
      ? (currentProject.month_wise_manpower as any[]).map((m: any) => ({ month: m.month, limit: Number(m.limit) })).sort((a, b) => a.month.localeCompare(b.month))
      : [];
    const newManpowerLimits = Array.isArray(formData.month_wise_manpower)
      ? formData.month_wise_manpower.map((m: any) => ({ month: m.month, limit: Number(m.limit) })).sort((a, b) => a.month.localeCompare(b.month))
      : [];
    
    // Normalize dates for comparison (handle empty string vs null)
    const normalizeDate = (d: string | null | undefined) => d || null;
    
    const hasApprovalRequiredChanges = 
      normalizeDate(currentProject?.start_date) !== normalizeDate(formData.start_date) ||
      normalizeDate(currentProject?.end_date) !== normalizeDate(formData.end_date) ||
      JSON.stringify(currentManpowerLimits) !== JSON.stringify(newManpowerLimits);

    // Prepare update data - do NOT update tech_lead_id (it's set once at creation and never changed)
    const updateData: any = {
      name: formData.name,
      description: formData.description,
      customer_name: formData.customer_name || null,
      // tech_lead_id is intentionally NOT updated - it stays as set during creation
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      month_wise_manpower: (formData.month_wise_manpower || []) as any,
      updated_at: new Date().toISOString(),
    };

    // Handle status updates based on role
    if (newStatus && newStatus !== currentProject?.status) {
      if (isTechLead) {
        // Tech leads request status changes via approval workflow
        updateData.status = 'awaiting_approval';
        updateData.requested_status = newStatus;
      } else if (isAdminOrManagement) {
        // Admin/Management can directly change status
        updateData.status = newStatus;
        updateData.requested_status = null;
        updateData.pending_changes = null; // Clear pending changes on approval
      }
    }
    
    let approvalTriggered = false;
    
    if (isActiveProjectUpdate && isTechLead && hasApprovalRequiredChanges) {
      // Tech Leads updating approval-required fields on active projects must go through approval workflow
      // Member-only changes (adding/removing team members) do NOT require approval
      approvalTriggered = true;
      updateData.status = 'awaiting_approval';
      updateData.requested_status = 'active'; // Request to keep active status after approval
      
      // Store original values for change tracking
      // Get tech lead name for display
      let techLeadName = '';
      if (currentProject.tech_lead_id) {
        const { data: techLeadProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', currentProject.tech_lead_id)
          .single();
        techLeadName = techLeadProfile?.full_name || '';
      }
      
      updateData.pending_changes = {
        name: currentProject.name,
        description: currentProject.description,
        customer_name: currentProject.customer_name,
        tech_lead_id: currentProject.tech_lead_id,
        tech_lead_name: techLeadName,
        start_date: currentProject.start_date,
        end_date: currentProject.end_date,
        month_wise_manpower: currentProject.month_wise_manpower,
      };
    } else if (isAdminOrManagement) {
      // Admin/Management can update and clear pending changes
      updateData.pending_changes = null;
    }

    // Update project basic info
    const { error: projectError } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId);

    if (projectError) throw projectError;

    // Log the update in allocation history
    if (isActiveProjectUpdate) {
      const changes = [];
      if (currentProject.name !== formData.name) changes.push(`Name: "${currentProject.name}" → "${formData.name}"`);
      if (currentProject.description !== formData.description) changes.push('Description updated');
      if (currentProject.start_date !== formData.start_date) changes.push('Start date updated');
      if (currentProject.end_date !== formData.end_date) changes.push('End date updated');
      
      const changeReason = `Active project updated (${changes.join(', ')}) - Sent back for approval`;
      
      await supabase.from('project_allocation_history').insert({
        project_id: projectId,
        user_id: userId,
        previous_allocation: 0,
        new_allocation: 0,
        changed_by: userId,
        change_reason: changeReason,
      });
    }

    // Decide how to handle required skills updates safely
    // 1) Read current skills FIRST (so we don't lose them accidentally)
    const { data: existingSkills } = await supabase
      .from('project_required_skills')
      .select('skill_id, subskill_id, required_rating')
      .eq('project_id', projectId);

    const skillsToInsert = formData.required_skills.map(skill => ({
      project_id: projectId,
      skill_id: skill.skill_id,
      subskill_id: skill.subskill_id,
      required_rating: skill.required_rating,
    }));

    // If the incoming list is empty BUT there are existing skills, assume "no change"
    // This prevents accidental wipe-outs when the form didn't load skills
    if (skillsToInsert.length > 0) {
      // Replace with the new set
      await supabase.from('project_required_skills').delete().eq('project_id', projectId);
      const { error: skillsError } = await supabase
        .from('project_required_skills')
        .insert(skillsToInsert);
      if (skillsError) throw skillsError;
    }

    // Get existing assignments for change tracking
    const { data: existingAssignments } = await supabase
      .from('project_assignments')
      .select('user_id, allocation_percentage')
      .eq('project_id', projectId);

    // Delete all assignments and re-insert
    await supabase.from('project_assignments').delete().eq('project_id', projectId);

    const membersToInsert = formData.members.map(member => ({
      project_id: projectId,
      user_id: member.user_id,
      assigned_by: userId,
      allocation_percentage: member.allocation_percentage,
    }));

    if (membersToInsert.length > 0) {
      const { error: membersError } = await supabase
        .from('project_assignments')
        .insert(membersToInsert);

      if (membersError) throw membersError;
    }

    // Update monthly allocations
    // First, delete existing monthly allocations for removed members
    const currentMemberIds = formData.members.map(m => m.user_id);
    const removedMemberIds = (existingAssignments || [])
      .filter((a: any) => !currentMemberIds.includes(a.user_id))
      .map((a: any) => a.user_id);

    if (removedMemberIds.length > 0) {
      // Delete all allocations for removed members using RPC
      for (const removedUserId of removedMemberIds) {
        await supabase.rpc('delete_user_project_allocations', {
          p_project_id: projectId,
          p_user_id: removedUserId
        });
      }
    }

    // Get valid months from the current project configuration
    const validMonthsSet = new Set((formData.month_wise_manpower || []).map(m => m.month));
    
    // Get all existing monthly allocations for this project to find months to delete
    const { data: existingMonthlyAllocations } = await supabase
      .from('project_member_monthly_allocations')
      .select('user_id, month')
      .eq('project_id', projectId);

    // Find allocations for months that are no longer in the project date range
    const monthsToDeleteFromDB: { user_id: string; month: string }[] = [];
    if (existingMonthlyAllocations) {
      for (const alloc of existingMonthlyAllocations) {
        if (!validMonthsSet.has(alloc.month)) {
          monthsToDeleteFromDB.push({
            user_id: alloc.user_id,
            month: alloc.month
          });
        }
      }
    }

    // Delete allocations for months that were removed from project date range
    console.log('[updateProject] Months removed from project date range:', monthsToDeleteFromDB.length);
    for (const toDelete of monthsToDeleteFromDB) {
      const { error: deleteError } = await supabase.rpc('delete_member_monthly_allocation', {
        p_project_id: projectId,
        p_user_id: toDelete.user_id,
        p_month: toDelete.month
      });
      if (deleteError) {
        console.error('Error deleting monthly allocation for removed month:', deleteError);
      } else {
        console.log(`[updateProject] Deleted allocation for ${toDelete.user_id} (${toDelete.month}) - month removed from project`);
      }
    }

    // Collect allocations to upsert and months to delete (null allocations from user actions)
    const monthlyAllocationsToUpsert: { project_id: string; user_id: string; month: string; allocation_percentage: number }[] = [];
    const allocationsToDelete: { user_id: string; month: string }[] = [];
    
    console.log('[updateProject] Processing members:', formData.members.length, 'members');
    
    for (const member of formData.members) {
      if (member.monthly_allocations) {
        for (const monthAlloc of member.monthly_allocations) {
          // Only process allocations for valid months
          if (!validMonthsSet.has(monthAlloc.month)) {
            continue; // Skip allocations for months not in project date range
          }
          
          if (monthAlloc.allocation_percentage !== null && monthAlloc.allocation_percentage !== undefined) {
            monthlyAllocationsToUpsert.push({
              project_id: projectId,
              user_id: member.user_id,
              month: monthAlloc.month,
              allocation_percentage: monthAlloc.allocation_percentage
            });
          } else {
            // Track allocations to delete (member removed from this specific month)
            allocationsToDelete.push({
              user_id: member.user_id,
              month: monthAlloc.month
            });
          }
        }
      }
    }
    
    console.log('[updateProject] Allocations to upsert:', monthlyAllocationsToUpsert.length);
    console.log('[updateProject] Allocations to delete (user action):', allocationsToDelete.length);

    // Delete allocations where member was removed from specific months using RPC
    for (const toDelete of allocationsToDelete) {
      const { error: deleteError } = await supabase.rpc('delete_member_monthly_allocation', {
        p_project_id: projectId,
        p_user_id: toDelete.user_id,
        p_month: toDelete.month
      });
      if (deleteError) {
        console.error('Error deleting monthly allocation:', deleteError);
      }
    }

    // Upsert monthly allocations using RPC
    const failedAllocations: string[] = [];
    for (const alloc of monthlyAllocationsToUpsert) {
      console.log(`[updateProject] Upserting allocation:`, alloc);
      const { data: rpcData, error: monthlyError } = await supabase.rpc('upsert_member_monthly_allocation', {
        p_project_id: alloc.project_id,
        p_user_id: alloc.user_id,
        p_month: alloc.month,
        p_allocation_percentage: alloc.allocation_percentage
      });

      if (monthlyError) {
        console.error('[updateProject] Error saving monthly allocation:', monthlyError);
        failedAllocations.push(`${alloc.user_id} (${alloc.month})`);
      } else {
        console.log(`[updateProject] Successfully saved allocation for ${alloc.user_id} (${alloc.month})`);
      }
    }

    if (failedAllocations.length > 0) {
      console.warn(`Failed to save ${failedAllocations.length} monthly allocations:`, failedAllocations);
    } else if (monthlyAllocationsToUpsert.length > 0) {
      console.log(`[updateProject] Successfully saved all ${monthlyAllocationsToUpsert.length} monthly allocations`);
    }

    // Track allocation history changes with detailed reasons
    const historyToInsert: any[] = [];
    
    // Create allocation map for tracking changes
    const existingMap = new Map(
      (existingAssignments || []).map((a: any) => [a.user_id, a.allocation_percentage])
    );
    
    // Track member allocation changes
    formData.members.forEach(member => {
      const oldAllocation = existingMap.get(member.user_id);
      if (oldAllocation !== member.allocation_percentage) {
        historyToInsert.push({
          project_id: projectId,
          user_id: member.user_id,
          previous_allocation: oldAllocation || null,
          new_allocation: member.allocation_percentage,
          changed_by: userId,
          change_reason: oldAllocation 
            ? `Allocation updated: ${oldAllocation}% → ${member.allocation_percentage}%`
            : `New member assigned with ${member.allocation_percentage}% allocation`,
        });
      }
    });

    // Track removed members
    existingAssignments?.forEach((existing: any) => {
      const stillAssigned = formData.members.find(m => m.user_id === existing.user_id);
      if (!stillAssigned) {
        historyToInsert.push({
          project_id: projectId,
          user_id: existing.user_id,
          previous_allocation: existing.allocation_percentage,
          new_allocation: 0,
          changed_by: userId,
          change_reason: 'Member removed from project',
        });
      }
    });

    // Track skill changes
    const skillChanges: string[] = [];
    const existingSkillSet = new Set(
      existingSkills?.map((s: any) => `${s.skill_id}-${s.subskill_id}-${s.required_rating}`) || []
    );
    const newSkillSet = new Set(
      formData.required_skills.map(s => `${s.skill_id}-${s.subskill_id}-${s.required_rating}`)
    );
    
    const addedSkills = formData.required_skills.filter(
      s => !existingSkillSet.has(`${s.skill_id}-${s.subskill_id}-${s.required_rating}`)
    );
    const removedSkills = existingSkills?.filter(
      (s: any) => !newSkillSet.has(`${s.skill_id}-${s.subskill_id}-${s.required_rating}`)
    ) || [];

    if (addedSkills.length > 0 || removedSkills.length > 0) {
      skillChanges.push(
        addedSkills.length > 0 ? `${addedSkills.length} skills added` : '',
        removedSkills.length > 0 ? `${removedSkills.length} skills removed` : ''
      );
      
      historyToInsert.push({
        project_id: projectId,
        user_id: userId,
        previous_allocation: 0,
        new_allocation: 0,
        changed_by: userId,
        change_reason: `Required skills updated: ${skillChanges.filter(Boolean).join(', ')}`,
      });
    }

    if (historyToInsert.length > 0) {
      await supabase
        .from('project_allocation_history')
        .insert(historyToInsert);

      // Send notifications for new assignments and removals
      const { data: updaterProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', userId)
        .single();

      const updaterName = updaterProfile?.full_name || 'A manager';

      // Get project name
      const { data: projectData } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();

      const projectName = projectData?.name || 'a project';

      // Notify newly assigned members
      for (const member of formData.members) {
        const wasNotPreviouslyAssigned = !existingMap.has(member.user_id);
        if (wasNotPreviouslyAssigned) {
          await notificationService.notifyProjectAssignment(
            member.user_id,
            updaterName,
            projectName,
            userId,
            projectId
          );
        }
      }

      // Notify removed members
      for (const existing of existingAssignments || []) {
        const wasRemoved = !formData.members.find(m => m.user_id === existing.user_id);
        if (wasRemoved) {
          await notificationService.notifyProjectRemoval(
            existing.user_id,
            updaterName,
            projectName,
            userId,
            projectId
          );
        }
      }
    }

    // Log project update
    const changes = [];
    if (currentProject?.name !== formData.name) changes.push('name');
    if (currentProject?.description !== formData.description) changes.push('description');
    if (currentProject?.start_date !== formData.start_date) changes.push('start date');
    if (currentProject?.end_date !== formData.end_date) changes.push('end date');
    if (historyToInsert.length > 0) changes.push('assignments/skills');
    
    await logActivity({
      module: "Projects",
      actionType: "Update",
      description: `Updated project "${formData.name}"${changes.length > 0 ? `: ${changes.join(', ')}` : ''}`,
      recordReference: projectId,
      metadata: {
        project_name: formData.name,
        changes: changes,
        status: updateData.status || currentProject?.status,
        member_count: formData.members.length,
        skill_count: formData.required_skills.length,
      }
    });

    // Approval was triggered if approvalTriggered is true (logged for debugging)
  },

  async updateProjectStatus(
    projectId: string,
    status: 'active' | 'rejected' | 'completed',
    userId: string,
    rejectionReason?: string
  ): Promise<void> {
    // If approving, check if there's a requested_status
    if (status === 'active') {
      const { data: project } = await supabase
        .from('projects')
        .select('requested_status')
        .eq('id', projectId)
        .single();

      const finalStatus = project?.requested_status || 'active';
      
      const updateData: any = {
        status: finalStatus,
        approved_by: userId,
        approved_at: new Date().toISOString(),
        requested_status: null, // Clear requested_status after approval
        pending_changes: null, // Clear pending changes after approval
      };

      const { error, data: updatedProject } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId)
        .select('name')
        .single();

      if (error) throw error;

      // Log project approval
      await logActivity({
        module: "Projects",
        actionType: "Approve",
        description: `Approved project "${updatedProject?.name || 'Unknown'}" - Status: ${finalStatus}`,
        recordReference: projectId,
        metadata: {
          final_status: finalStatus,
          approved_by: userId,
        },
      });
    } else if (status === 'rejected') {
      // Check if this is a Tech Lead update request on an active project
      const { data: currentProject } = await supabase
        .from('projects')
        .select('name, pending_changes, requested_status')
        .eq('id', projectId)
        .single();

      const pendingChanges = currentProject?.pending_changes as any;
      const wasActiveProjectUpdate = currentProject?.requested_status === 'active' && pendingChanges;

      let updateData: any;

      if (wasActiveProjectUpdate) {
        // Restore original values from pending_changes
        updateData = {
          status: 'active', // Restore to active status
          name: pendingChanges.name,
          description: pendingChanges.description,
          customer_name: pendingChanges.customer_name,
          tech_lead_id: pendingChanges.tech_lead_id,
          start_date: pendingChanges.start_date,
          end_date: pendingChanges.end_date,
          month_wise_manpower: pendingChanges.month_wise_manpower,
          rejected_by: userId,
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
          requested_status: null,
          pending_changes: null, // Clear pending changes after rejection
        };
      } else {
        // Standard rejection for new projects
        updateData = {
          status: 'rejected',
          rejected_by: userId,
          rejected_at: new Date().toISOString(),
          rejection_reason: rejectionReason,
          requested_status: null,
          pending_changes: null,
        };
      }

      const { error, data: rejectedProject } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId)
        .select('name')
        .single();

      if (error) throw error;

      // Log project rejection
      await logActivity({
        module: "Projects",
        actionType: "Reject",
        description: wasActiveProjectUpdate 
          ? `Rejected update request for active project "${currentProject?.name || 'Unknown'}" - Restored to original values${rejectionReason ? `: ${rejectionReason}` : ''}`
          : `Rejected project "${rejectedProject?.name || 'Unknown'}"${rejectionReason ? `: ${rejectionReason}` : ''}`,
        recordReference: projectId,
        metadata: {
          rejected_by: userId,
          rejection_reason: rejectionReason,
          was_active_update: wasActiveProjectUpdate,
          restored_values: wasActiveProjectUpdate ? pendingChanges : null,
        },
      });
    }
  },

  async getAllocationHistory(projectId: string, filterForEmployeeId?: string): Promise<AllocationHistory[]> {
    let query = supabase
      .from('project_allocation_history')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    // If filterForEmployeeId is provided, only show history for that employee
    if (filterForEmployeeId) {
      query = query.eq('user_id', filterForEmployeeId);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Fetch user profiles for all unique user_ids and changed_by ids
    const userIds = new Set<string>();
    (data || []).forEach((h: any) => {
      if (h.user_id) userIds.add(h.user_id);
      if (h.changed_by) userIds.add(h.changed_by);
    });

    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', Array.from(userIds));

    const profileMap = new Map(
      (profiles || []).map((p: any) => [p.user_id, p.full_name])
    );

    return (data || []).map((h: any) => ({
      id: h.id,
      project_id: h.project_id,
      user_id: h.user_id,
      full_name: profileMap.get(h.user_id) || 'Unknown',
      previous_allocation: h.previous_allocation,
      new_allocation: h.new_allocation,
      changed_by: h.changed_by,
      changed_by_name: profileMap.get(h.changed_by) || 'Unknown',
      change_reason: h.change_reason,
      created_at: h.created_at,
    }));
  },

  async getUserCapacity(userId: string, month?: string): Promise<{ total: number; available: number }> {
    if (month) {
      // Use month-specific allocation
      const { data: monthlyAllocation } = await supabase
        .rpc('get_user_monthly_allocation', { user_id_param: userId, month_param: month });
      
      const total = monthlyAllocation || 0;
      return {
        total,
        available: 100 - total,
      };
    }
    
    // Fall back to overall allocation
    const { data: total } = await supabase
      .rpc('get_user_total_allocation', { user_id_param: userId });
    
    const { data: available } = await supabase
      .rpc('get_user_available_capacity', { user_id_param: userId });

    return {
      total: total || 0,
      available: available || 100,
    };
  },

  async searchUsers(searchTerm: string, selectedMonth?: string): Promise<EmployeeMatch[]> {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return [];

    // Search profiles by name or email
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, role')
      .eq('status', 'active')
      .in('role', ['employee', 'tech_lead'])
      .or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);

    // Also search by skill/subskill names
    const { data: skillMatches } = await supabase
      .from('employee_ratings')
      .select(`
        user_id,
        skills!inner(id, name),
        subskills!inner(id, name)
      `)
      .eq('status', 'approved')
      .or(`skills.name.ilike.%${term}%,subskills.name.ilike.%${term}%`);

    // Combine user IDs from both searches
    const profileUserIds = new Set((profiles || []).map(p => p.user_id));
    const skillUserIds = new Set((skillMatches || []).map((s: any) => s.user_id));
    const allUserIds = new Set([...profileUserIds, ...skillUserIds]);

    if (allUserIds.size === 0) return [];

    // Fetch full profile data for all matching users
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('user_id, full_name, email, role')
      .eq('status', 'active')
      .in('user_id', Array.from(allUserIds));

    const matches: EmployeeMatch[] = await Promise.all(
      (allProfiles || []).map(async (profile) => {
        // Get user capacity - use month-specific if month is provided
        let current_total_allocation = 0;
        let available_capacity = 100;
        
        if (selectedMonth) {
          const { data: monthlyAllocation } = await supabase
            .rpc('get_user_monthly_allocation', { 
              user_id_param: profile.user_id, 
              month_param: selectedMonth 
            });
          current_total_allocation = monthlyAllocation || 0;
          available_capacity = 100 - current_total_allocation;
        } else {
          const { data: totalAllocation } = await supabase
            .rpc('get_user_total_allocation', { user_id_param: profile.user_id });
          current_total_allocation = totalAllocation || 0;
          available_capacity = 100 - current_total_allocation;
        }

        return {
          user_id: profile.user_id,
          full_name: profile.full_name,
          email: profile.email,
          role: profile.role,
          available_capacity,
          current_total_allocation,
          matched_skills: 0,
          total_required_skills: 0,
          match_percentage: 0,
          skill_details: [],
        };
      })
    );

    return matches.sort((a, b) => b.available_capacity - a.available_capacity);
  },

  async deleteProject(projectId: string): Promise<void> {
    // Get project name before deletion for logging
    const { data: project } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single();

    // Delete related records first (due to foreign key constraints)
    await supabase.from('project_assignments').delete().eq('project_id', projectId);
    await supabase.from('project_required_skills').delete().eq('project_id', projectId);
    await supabase.from('project_allocation_history').delete().eq('project_id', projectId);
    
    // Delete the project
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;

    // Log project deletion
    await logActivity({
      module: "Projects",
      actionType: "Delete",
      description: `Deleted project "${project?.name || 'Unknown'}"`,
      recordReference: projectId,
      metadata: {
        project_name: project?.name,
      },
    });
  },

  // Monthly allocation methods - using RPC to bypass schema cache
  async getMemberMonthlyAllocations(projectId: string, userId: string) {
    const { data, error } = await supabase
      .rpc('get_project_member_allocations', { p_project_id: projectId });

    if (error) throw error;
    return (data || []).filter((d: any) => d.user_id === userId);
  },

  async getProjectMonthlyAllocations(projectId: string) {
    const { data, error } = await supabase
      .rpc('get_project_member_allocations', { p_project_id: projectId });

    if (error) throw error;
    return data || [];
  },

  async saveMemberMonthlyAllocation(
    projectId: string, 
    userId: string, 
    month: string, 
    allocation: number,
    changedBy: string
  ) {
    // Get current allocations for this project
    const { data: existing } = await supabase
      .rpc('get_project_member_allocations', { p_project_id: projectId });

    const currentAlloc = (existing || []).find(
      (a: any) => a.user_id === userId && a.month === month
    );
    const previousAllocation = currentAlloc?.allocation_percentage || null;

    // Upsert the allocation using RPC
    const { error } = await supabase.rpc('upsert_member_monthly_allocation', {
      p_project_id: projectId,
      p_user_id: userId,
      p_month: month,
      p_allocation_percentage: allocation
    });

    if (error) throw error;

    // Get member name for logging
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .single();

    // Log the activity
    await logActivity({
      module: "Projects",
      actionType: "Monthly Allocation Update",
      description: `Updated ${profile?.full_name || 'member'} allocation for ${month} from ${previousAllocation || 0}% to ${allocation}%`,
      recordReference: projectId,
      metadata: {
        user_id: userId,
        month,
        previous_allocation: previousAllocation,
        new_allocation: allocation
      }
    });

    return true;
  },

  async deleteMemberMonthlyAllocation(projectId: string, userId: string, month: string) {
    const { error } = await supabase.rpc('delete_member_monthly_allocation', {
      p_project_id: projectId,
      p_user_id: userId,
      p_month: month
    });

    if (error) throw error;
    return true;
  },

  async saveAllMemberMonthlyAllocations(
    projectId: string,
    allocations: { user_id: string; month: string; allocation_percentage: number }[],
    changedBy: string
  ) {
    if (allocations.length === 0) return;

    // Get all existing allocations for this project using RPC
    const { data: existingAllocations } = await supabase
      .rpc('get_project_member_allocations', { p_project_id: projectId });

    // Create a map for easy lookup
    const existingMap = new Map(
      (existingAllocations || []).map((a: any) => [`${a.user_id}-${a.month}`, a.allocation_percentage])
    );

    // Filter to only allocations that have changed
    const toUpsert = allocations.filter(a => {
      const existing = existingMap.get(`${a.user_id}-${a.month}`);
      return existing !== a.allocation_percentage;
    });

    if (toUpsert.length === 0) return;

    // Upsert all allocations using RPC
    for (const alloc of toUpsert) {
      const { error } = await supabase.rpc('upsert_member_monthly_allocation', {
        p_project_id: projectId,
        p_user_id: alloc.user_id,
        p_month: alloc.month,
        p_allocation_percentage: alloc.allocation_percentage
      });

      if (error) throw error;
    }

    // Log summary activity
    await logActivity({
      module: "Projects",
      actionType: "Monthly Allocation Update",
      description: `Updated ${toUpsert.length} monthly allocation(s) for project`,
      recordReference: projectId,
      metadata: {
        changes_count: toUpsert.length,
        changed_by: changedBy
      }
    });
  },

  async validateMonthlyAllocation(
    projectId: string,
    userId: string,
    month: string,
    allocation: number,
    monthlyManpower: { month: string; limit: number }[]
  ): Promise<{ valid: boolean; error?: string }> {
    // Find the manpower limit for this month
    const monthLimit = monthlyManpower.find(m => m.month === month);
    if (!monthLimit) {
      return { valid: true }; // No limit set
    }

    // Check if allocation exceeds monthly limit
    const allocationDecimal = allocation / 100;
    if (allocationDecimal > monthLimit.limit) {
      return {
        valid: false,
        error: `Cannot exceed monthly manpower limit of ${monthLimit.limit * 100}%`
      };
    }

    // Check user's capacity for this month using RPC
    const { data: monthlyAllocation } = await supabase
      .rpc('get_user_monthly_allocation', { 
        user_id_param: userId, 
        month_param: month 
      });

    // Get current allocation for this project
    const { data: projectAllocations } = await supabase
      .rpc('get_project_member_allocations', { p_project_id: projectId });

    const currentProjectAlloc = (projectAllocations || []).find(
      (a: any) => a.user_id === userId && a.month === month
    );
    const currentAllocation = currentProjectAlloc?.allocation_percentage || 0;

    // Calculate other projects allocation (total minus this project)
    const otherProjectsAllocation = (monthlyAllocation || 0) - currentAllocation;

    if (otherProjectsAllocation + allocation > 100) {
      return {
        valid: false,
        error: `User only has ${100 - otherProjectsAllocation}% capacity available for ${month}`
      };
    }

    return { valid: true };
  },

  async removeMemberFromProject(projectId: string, userId: string) {
    // Delete all monthly allocations for this member using RPC
    const { error: allocError } = await supabase.rpc('delete_user_project_allocations', {
      p_project_id: projectId,
      p_user_id: userId
    });

    if (allocError) throw allocError;

    // Delete the project assignment
    const { error: assignError } = await supabase
      .from('project_assignments')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (assignError) throw assignError;

    // Log the activity
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await logActivity({
        actionType: 'DELETE',
        module: 'Projects',
        description: 'Removed member from project',
        metadata: {
          project_id: projectId,
          removed_user_id: userId
        }
      });
    }

    return true;
  },

  async removeMemberFromMonth(projectId: string, userId: string, month: string) {
    // Delete only the specific month allocation
    const { error } = await supabase.rpc('delete_member_monthly_allocation', {
      p_project_id: projectId,
      p_user_id: userId,
      p_month: month
    });

    if (error) throw error;

    // Check if user has any remaining allocations for this project
    const { data: remainingAllocations, error: checkError } = await supabase
      .from('project_member_monthly_allocations')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .gt('allocation_percentage', 0);

    if (checkError) throw checkError;

    // If no remaining allocations, remove the project assignment too
    if (!remainingAllocations || remainingAllocations.length === 0) {
      const { error: assignError } = await supabase
        .from('project_assignments')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (assignError) throw assignError;
    }

    // Log the activity
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await logActivity({
        actionType: 'UPDATE',
        module: 'Projects',
        description: `Removed member allocation for ${month}`,
        metadata: {
          project_id: projectId,
          removed_user_id: userId,
          month
        }
      });
    }

    return true;
  }
};
