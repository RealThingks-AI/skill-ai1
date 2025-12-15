import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ProjectFormData, Project, RequiredSkill, MemberMonthlyAllocation, AllocationPercentage, PendingChanges } from '../types/projects';
import { useAuth } from '@/hooks/useAuth';
import { projectService } from '../services/projectService';
import { toast } from 'sonner';
import { dateFormatters } from '@/utils/formatters';
import StepOneWithDates from './create-steps/StepOneWithDates';
import StepOne from './create-steps/StepOne';
import StepTwo from './create-steps/StepTwo';
import StepThree from './create-steps/StepThree';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Edit, Check, X, Loader2, History } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import ProjectOverviewTab from './detail-tabs/ProjectOverviewTab';
import ProjectMembersTab from './detail-tabs/ProjectMembersTab';
import ProjectSkillsTab from './detail-tabs/ProjectSkillsTab';
import ProjectHistoryTab from './detail-tabs/ProjectHistoryTab';
import ProjectViewMembersList from './detail-tabs/ProjectViewMembersList';
import PendingChangesDisplay from './PendingChangesDisplay';
import DataImpactValidationDialog, { analyzeDataImpact } from './DataImpactValidationDialog';

interface ProjectCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  prefilledSubskills?: {
    skill_id: string;
    subskill_id: string;
  }[];
  prefilledUserIds?: string[];
  editMode?: Project;
  viewMode?: boolean;
  projectId?: string | null;
  userRole?: string;
}
export default function ProjectCreateDialog({
  open,
  onOpenChange,
  onSuccess,
  prefilledSubskills = [],
  prefilledUserIds = [],
  editMode,
  viewMode = false,
  projectId,
  userRole = ''
}: ProjectCreateDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [isEditingFromView, setIsEditingFromView] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showSkillsAndTeam, setShowSkillsAndTeam] = useState(false);
  const [memberToExpand, setMemberToExpand] = useState<string | null>(null);
  const [showDataImpactDialog, setShowDataImpactDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<ProjectFormData | null>(null);
  const {
    profile
  } = useAuth();
  const stepTwoRef = useRef<HTMLDivElement>(null);
  const stepThreeRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState<ProjectFormData>({
    name: '',
    description: '',
    customer_name: '',
    tech_lead_id: '',
    start_date: '',
    end_date: '',
    month_wise_manpower: [],
    required_skills: [],
    members: []
  });
  const [projectStatus, setProjectStatus] = useState<string>('active');

  // Load project data when in view mode
  useEffect(() => {
    if (open && viewMode && projectId) {
      loadProject();
    } else if (!open) {
      resetForm();
      setIsEditingFromView(false);
      setProject(null);
      setShowRejectForm(false);
      setRejectionReason('');
      setShowApprovalForm(false);
      setApprovalComment('');
      setShowSkillsAndTeam(false);
      setMemberToExpand(null);
    }
  }, [open, viewMode, projectId]);

  // Populate form data when in edit mode (including monthly allocations)
  useEffect(() => {
    const loadFormDataWithAllocations = async () => {
      if (open && (editMode || isEditingFromView && project)) {
        const dataToEdit = editMode || project;
        if (dataToEdit) {
          // Load existing monthly allocations
          let monthlyAllocationsMap: Map<string, MemberMonthlyAllocation[]> = new Map();
          try {
            const existingAllocations = await projectService.getProjectMemberMonthlyAllocations(dataToEdit.id);
            // Group by user_id
            for (const alloc of existingAllocations) {
              if (!monthlyAllocationsMap.has(alloc.user_id)) {
                monthlyAllocationsMap.set(alloc.user_id, []);
              }
              monthlyAllocationsMap.get(alloc.user_id)!.push({
                month: alloc.month,
                allocation_percentage: alloc.allocation_percentage as AllocationPercentage
              });
            }
          } catch (err) {
            console.error('Error loading monthly allocations:', err);
          }

          // Get project months from month_wise_manpower
          const projectMonths = new Set((dataToEdit.month_wise_manpower || []).map(m => m.month));

          // Only include members that actually have monthly allocations saved
          // This prevents auto-populating members that were never assigned to specific months
          // Also filter allocations to only include months within the current project date range
          const membersWithAllocations = dataToEdit.members.filter(m => {
            const existingMonthlyAllocations = monthlyAllocationsMap.get(m.user_id) || [];
            // Check if member has any allocations within the project months
            return existingMonthlyAllocations.some(alloc => projectMonths.has(alloc.month));
          }).map(m => {
            const allAllocations = monthlyAllocationsMap.get(m.user_id) || [];
            // Filter allocations to only include months within the project date range
            const validAllocations = allAllocations.filter(alloc => projectMonths.has(alloc.month));
            return {
              user_id: m.user_id,
              allocation_percentage: m.allocation_percentage,
              monthly_allocations: validAllocations
            };
          });
          setFormData({
            name: dataToEdit.name,
            description: dataToEdit.description || '',
            customer_name: dataToEdit.customer_name || '',
            tech_lead_id: dataToEdit.tech_lead_id || '',
            start_date: dataToEdit.start_date || '',
            end_date: dataToEdit.end_date || '',
            month_wise_manpower: dataToEdit.month_wise_manpower || [],
            required_skills: dataToEdit.required_skills,
            members: membersWithAllocations
          });
          setProjectStatus(dataToEdit.status);
          // Auto-show skills and team sections for active projects
          if (dataToEdit.status === 'active') {
            setShowSkillsAndTeam(true);
          }
        }
      } else if (!open) {
        resetForm();
      }
    };
    loadFormDataWithAllocations();
  }, [open, editMode, isEditingFromView, project]);

  // Update formData when prefilled data changes and dialog opens
  useEffect(() => {
    if (open && !editMode && (prefilledSubskills.length > 0 || prefilledUserIds.length > 0)) {
      // Load subskills data to map prefilled IDs to full skill data
      const loadPrefilledSkills = async () => {
        if (prefilledSubskills.length > 0) {
          const {
            data: subskillsData
          } = await supabase.from('subskills').select('id, name, skills!inner(id, name)').in('id', prefilledSubskills.map(ps => ps.subskill_id));
          const prefilledSkills: RequiredSkill[] = prefilledSubskills.map(ps => {
            const subskill = subskillsData?.find((s: any) => s.id === ps.subskill_id);
            if (!subskill) return null;
            return {
              skill_id: ps.skill_id,
              skill_name: (subskill as any).skills.name,
              subskill_id: ps.subskill_id,
              subskill_name: (subskill as any).name,
              required_rating: 'medium'
            } as RequiredSkill;
          }).filter((s): s is RequiredSkill => s !== null);
          setFormData(prev => ({
            ...prev,
            required_skills: prefilledSkills,
            members: prefilledUserIds.map(userId => ({
              user_id: userId,
              allocation_percentage: 25 as const
            }))
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            members: prefilledUserIds.map(userId => ({
              user_id: userId,
              allocation_percentage: 25 as const
            }))
          }));
        }
      };
      loadPrefilledSkills();
    }
  }, [open, prefilledSubskills, prefilledUserIds, editMode]);

  // Auto-scroll to next section when current section is complete
  useEffect(() => {
    if (formData.name && formData.description && formData.start_date && stepTwoRef.current) {
      setTimeout(() => {
        stepTwoRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 300);
    }
  }, [formData.name, formData.description, formData.start_date]);
  useEffect(() => {
    if (formData.required_skills.length > 0 && stepThreeRef.current) {
      setTimeout(() => {
        stepThreeRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 300);
    }
  }, [formData.required_skills.length]);
  const loadProject = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const data = await projectService.getProjectById(projectId);
      setProject(data);
    } catch (error) {
      console.error('Error loading project:', error);
      toast.error('Failed to load project details');
    } finally {
      setLoading(false);
    }
  };
  const handleApprove = async () => {
    if (!projectId || !project) return;
    try {
      setLoading(true);
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      // Optimistic UI update
      toast.success('Project approved');
      onOpenChange(false);
      setShowApprovalForm(false);
      setApprovalComment('');

      // Update in background
      projectService.updateProjectStatus(projectId, 'active', user.id, approvalComment.trim() || undefined).then(() => {
        onSuccess(); // Refresh list in background
      }).catch(error => {
        console.error('Error approving project:', error);
        toast.error('Failed to approve project');
      });
    } catch (error) {
      console.error('Error approving project:', error);
      toast.error('Failed to approve project');
    } finally {
      setLoading(false);
    }
  };
  const handleReject = async () => {
    if (!projectId || !project || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    try {
      setLoading(true);
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      // Optimistic UI update
      toast.success('Project rejected');
      onOpenChange(false);
      setShowRejectForm(false);
      setRejectionReason('');

      // Update in background
      projectService.updateProjectStatus(projectId, 'rejected', user.id, rejectionReason).then(() => {
        onSuccess(); // Refresh list in background
      }).catch(error => {
        console.error('Error rejecting project:', error);
        toast.error('Failed to reject project');
      });
    } catch (error) {
      console.error('Error rejecting project:', error);
      toast.error('Failed to reject project');
    } finally {
      setLoading(false);
    }
  };
  const handleSubmit = async () => {
    if (!profile) return;
    const projectToUpdate = editMode || isEditingFromView && project;

    // Validate monthly allocations against limits before saving
    if (formData.month_wise_manpower && formData.month_wise_manpower.length > 0) {
      // Check member months are within project months
      const monthConsistency = projectService.validateMemberMonthsConsistency(formData.members, formData.month_wise_manpower);
      if (!monthConsistency.valid) {
        toast.error(monthConsistency.errors[0] || 'Member allocations contain months outside project date range');
        return;
      }

      // Check total allocations don't exceed limits
      const totalAllocation = projectService.validateTotalMonthlyAllocations(formData.members, formData.month_wise_manpower);
      if (!totalAllocation.valid) {
        toast.error(totalAllocation.errors[0] || 'Monthly allocation exceeds limit');
        return;
      }

      // Check individual allocation limits
      const validation = projectService.validateMonthlyAllocationsAgainstLimits(formData.members, formData.month_wise_manpower);
      if (!validation.valid) {
        toast.error(validation.errors[0] || 'Monthly allocation exceeds limit');
        return;
      }
    }

    // For update mode, check for data impact before proceeding
    if (projectToUpdate) {
      // Get existing member profiles for impact analysis
      const existingMemberProfiles = projectToUpdate.members.map(m => ({
        user_id: m.user_id,
        full_name: m.full_name,
        monthly_allocations: m.monthly_allocations,
      }));

      const impact = analyzeDataImpact(formData, projectToUpdate, existingMemberProfiles);
      
      // If there are blocking issues (reduced limits below current allocations), show dialog
      if (impact.blockingIssues.length > 0) {
        setPendingFormData(formData);
        setShowDataImpactDialog(true);
        return;
      }
      
      // If there are removed months with data, show confirmation dialog
      if (impact.removedMonths.length > 0) {
        setPendingFormData(formData);
        setShowDataImpactDialog(true);
        return;
      }
    }

    // Proceed with save
    await performSave(formData);
  };

  const performSave = async (dataToSave: ProjectFormData) => {
    if (!profile) return;
    const projectToUpdate = editMode || isEditingFromView && project;

    // For create mode with members, validate members exist
    // For update mode, members are preserved from loaded project data
    if (!projectToUpdate && dataToSave.members.length === 0) {
      // Allow empty members array for initial project creation
    }
    try {
      setSubmitting(true);
      if (projectToUpdate) {
        // Update project
        const statusToUpdate = projectStatus !== projectToUpdate.status ? projectStatus as any : undefined;
        const currentUserRole = userRole || profile?.role;
        try {
          await projectService.updateProject(projectToUpdate.id, dataToSave, statusToUpdate, currentUserRole);
          toast.success('Project updated successfully');
        } catch (err) {
          console.error('Update failed:', err);
          toast.error('Failed to save project changes');
          return;
        }
        if (isEditingFromView) {
          // Switch back to view mode and update project state locally
          setIsEditingFromView(false);
          // Refresh project data in background without modal reload
          projectService.getProjectById(projectToUpdate.id).then(updatedProject => {
            setProject(updatedProject);
          }).catch(err => console.error('Background refresh failed:', err));
        }
      } else {
        // Create in background
        const projectId = await projectService.createProject(dataToSave, profile.user_id);
        toast.success('Project created and sent for approval');

        // Fetch the newly created project silently in background
        projectService.getProjectById(projectId).catch(err => {
          console.error('Failed to fetch new project:', err);
        });
      }
      if (!isEditingFromView) {
        onOpenChange(false);
      }

      // Call onSuccess immediately for optimistic UI update
      onSuccess();
      resetForm();
    } catch (error) {
      console.error(`Error ${editMode || isEditingFromView ? 'updating' : 'creating'} project:`, error);
      toast.error(`Failed to ${editMode || isEditingFromView ? 'update' : 'create'} project`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDataImpactConfirm = async (cleanedFormData: ProjectFormData) => {
    setShowDataImpactDialog(false);
    setPendingFormData(null);
    await performSave(cleanedFormData);
  };

  const handleDataImpactCancel = () => {
    setShowDataImpactDialog(false);
    setPendingFormData(null);
  };
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      customer_name: '',
      tech_lead_id: '',
      start_date: '',
      end_date: '',
      month_wise_manpower: [],
      required_skills: [],
      members: []
    });
  };

  // For create mode: only require basic info; for edit mode: require basic info (members/skills preserved from loaded data)
  const projectToUpdate = editMode || isEditingFromView && project;
  const canSubmit = formData.name && formData.description && formData.customer_name && formData.start_date && formData.end_date;
  const canApprove = ['management', 'admin'].includes(userRole) && project?.status === 'awaiting_approval';
  const canEdit = ['tech_lead', 'management', 'admin'].includes(userRole) && project?.status === 'awaiting_approval' || ['tech_lead', 'management', 'admin'].includes(userRole) && project?.status === 'active';

  // Determine modal size based on current mode and project status
  const getModalClassName = () => {
    const isViewOnlyMode = viewMode && !isEditingFromView;
    const isEditModeNow = !!(editMode || isEditingFromView);
    
    if (isViewOnlyMode && project) {
      return `w-full h-[68vh] overflow-hidden flex flex-col transition-none ${project.status === 'awaiting_approval' ? 'max-w-[min(518px,90vw)]' : 'max-w-[min(1037px,90vw)]'}`;
    }
    
    if (showSkillsAndTeam) {
      return 'max-w-[min(1037px,90vw)] w-full h-[68vh] overflow-hidden flex flex-col transition-none';
    }
    
    return 'max-w-[544px] w-full max-h-[72vh] overflow-hidden flex flex-col transition-none';
  };

  // Single Dialog that handles all modes without remounting
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={getModalClassName()}>
          {/* Loading state */}
          {(viewMode && !isEditingFromView && (loading || !project)) ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : viewMode && !isEditingFromView && project ? (
            /* View mode content */
            <>
              <DialogHeader className="flex-shrink-0">
                <div className="flex items-center gap-4">
                  <span className={`text-base font-semibold ${project.status === 'active' ? 'text-primary' : project.status === 'awaiting_approval' ? 'text-amber-600' : project.status === 'rejected' ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {project.status.replace('_', ' ').toUpperCase()}
                  </span>
                  {project.requested_status && project.status === 'awaiting_approval' && (
                    <span className="text-sm text-muted-foreground">
                      (Requesting: {project.requested_status.replace('_', ' ').toUpperCase()})
                    </span>
                  )}
                  <DialogTitle>{project.name}</DialogTitle>
                </div>
              </DialogHeader>

              <div className="flex-1 min-h-0 py-4 px-1">
                <div className={`grid gap-4 h-full ${project.status === 'awaiting_approval' ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-[40%_60%]'}`}>
                  <div className="space-y-4 min-h-0 overflow-y-auto pr-2">
                    <StepOneWithDates 
                      formData={{
                        name: project.name,
                        description: project.description || '',
                        customer_name: project.customer_name || '',
                        tech_lead_id: project.tech_lead_id || '',
                        start_date: project.start_date || '',
                        end_date: project.end_date || '',
                        month_wise_manpower: project.month_wise_manpower || [],
                        required_skills: project.required_skills || [],
                        members: project.members.map(m => ({
                          user_id: m.user_id,
                          allocation_percentage: m.allocation_percentage,
                          monthly_allocations: m.monthly_allocations
                        }))
                      }} 
                      setFormData={() => {}} 
                      isEditMode={true}
                      readOnly={true}
                      existingMembers={project.members}
                    />
                  </div>

                  {project.status !== 'awaiting_approval' && (
                    <div className="flex flex-col h-full min-h-[500px]">
                      <ProjectViewMembersList 
                        project={project} 
                        onEditMember={canEdit ? (userId) => {
                          setMemberToExpand(userId);
                          setShowSkillsAndTeam(true);
                          setIsEditingFromView(true);
                        } : undefined}
                        onRemoveMember={canEdit ? async (userId) => {
                          try {
                            await projectService.removeMemberFromProject(project.id, userId);
                            toast.success('Member removed from project');
                            setProject(prev => prev ? {
                              ...prev,
                              members: prev.members.filter(m => m.user_id !== userId)
                            } : null);
                            onSuccess();
                          } catch (error) {
                            console.error('Error removing member:', error);
                            toast.error('Failed to remove member');
                          }
                        } : undefined}
                        onRemoveMemberFromMonth={canEdit ? async (userId, month) => {
                          try {
                            const memberName = project.members.find(m => m.user_id === userId)?.full_name || 'Member';
                            await projectService.removeMemberFromMonth(project.id, userId, month);
                            toast.success(`${memberName} removed from ${dateFormatters.formatMonthYear(month)}`);
                            setProject(prev => {
                              if (!prev) return null;
                              return {
                                ...prev,
                                members: prev.members.map(m => {
                                  if (m.user_id !== userId) return m;
                                  return {
                                    ...m,
                                    monthly_allocations: m.monthly_allocations?.filter(a => a.month !== month) || []
                                  };
                                })
                              };
                            });
                            onSuccess();
                          } catch (error) {
                            console.error('Error removing member from month:', error);
                            toast.error('Failed to remove member from month');
                          }
                        } : undefined}
                        readOnly={!canEdit}
                      />
                    </div>
                  )}
                </div>
              </div>

              {project.pending_changes && project.status === 'awaiting_approval' && project.requested_status === 'active' && (
                <div className="flex-shrink-0 pb-3">
                  <PendingChangesDisplay 
                    pendingChanges={project.pending_changes as PendingChanges} 
                    currentValues={{
                      name: project.name,
                      description: project.description,
                      customer_name: project.customer_name,
                      tech_lead_id: project.tech_lead_id,
                      start_date: project.start_date,
                      end_date: project.end_date,
                      month_wise_manpower: project.month_wise_manpower
                    }} 
                  />
                </div>
              )}

              <div className="flex-shrink-0 pt-2">
                {showApprovalForm ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Approval Comment (Optional)</Label>
                      <Textarea value={approvalComment} onChange={e => setApprovalComment(e.target.value)} placeholder="Add any comments..." rows={3} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setShowApprovalForm(false)}>Cancel</Button>
                      <Button onClick={handleApprove}>
                        <Check className="mr-2 h-4 w-4" />
                        Confirm Approval
                      </Button>
                    </div>
                  </div>
                ) : showRejectForm ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Rejection Reason</Label>
                      <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Explain why..." rows={3} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setShowRejectForm(false)}>Cancel</Button>
                      <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason.trim()}>
                        <X className="mr-2 h-4 w-4" />
                        Confirm Rejection
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end gap-2">
                    {userRole !== 'employee' && (
                      <Button variant="outline" onClick={() => setShowHistoryModal(true)}>
                        <History className="mr-2 h-4 w-4" />
                        View History
                      </Button>
                    )}
                    {canEdit && (
                      <Button variant="outline" onClick={() => setIsEditingFromView(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    )}
                    {canApprove && (
                      <>
                        <Button variant="outline" onClick={() => setShowRejectForm(true)}>
                          <X className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                        <Button onClick={() => setShowApprovalForm(true)}>
                          <Check className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Create/Edit mode content */
            <>
              <DialogHeader className="flex-shrink-0">
                <DialogTitle>
                  {isEditingFromView ? 'Edit Project' : editMode ? 'Edit Project' : 'Create New Project'}
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 min-h-0 py-4 px-1">
                {showSkillsAndTeam ? (
                  <div className="grid grid-cols-1 lg:grid-cols-[40%_60%] gap-4 h-full">
                    <div className="space-y-4 min-h-0 overflow-y-auto pr-2">
                      <div className="space-y-3">
                        <StepOneWithDates formData={formData} setFormData={setFormData} isEditMode={!!(editMode || isEditingFromView)} existingMembers={project?.members} />
                      </div>
                    </div>

                    <div ref={stepThreeRef} className="flex flex-col h-full min-h-[500px]">
                      <h3 className="flex-shrink-0 mb-2 text-xl font-medium">Team Members</h3>
                      <div className="flex-1 min-h-0 overflow-y-auto">
                        <StepThree formData={formData} setFormData={setFormData} projectId={project?.id} initialExpandedMemberId={memberToExpand} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-y-auto max-h-[calc(90vh-180px)] space-y-4">
                    <StepOneWithDates formData={formData} setFormData={setFormData} isEditMode={!!(editMode || isEditingFromView)} existingMembers={project?.members} />
                  </div>
                )}
              </div>

              <div className="flex-shrink-0 flex justify-end gap-2 pt-3 border-t">
                {isEditingFromView && (
                  <Button variant="outline" onClick={() => {
                    setIsEditingFromView(false);
                    if (project) {
                      loadProject();
                    }
                  }}>
                    Back to View
                  </Button>
                )}
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                
                <Button onClick={handleSubmit} disabled={submitting || !canSubmit}>
                  {submitting ? (editMode || isEditingFromView ? 'Updating...' : 'Creating...') : (editMode || isEditingFromView ? 'Update Project' : 'Create Project')}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {project && (
        <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
          <DialogContent className="max-w-[min(717px,90vw)] w-full max-h-[72vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Project History</DialogTitle>
            </DialogHeader>
            <div className="max-h-[70vh] overflow-y-auto">
              <ProjectHistoryTab projectId={project.id} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      <DataImpactValidationDialog
        open={showDataImpactDialog}
        onOpenChange={setShowDataImpactDialog}
        currentFormData={pendingFormData || formData}
        originalProject={editMode || (isEditingFromView ? project : null)}
        existingMembers={(editMode || project)?.members?.map(m => ({
          user_id: m.user_id,
          full_name: m.full_name,
          monthly_allocations: m.monthly_allocations,
        })) || []}
        onConfirm={handleDataImpactConfirm}
        onCancel={handleDataImpactCancel}
      />
    </>
  );
}