import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Loader2, Edit } from 'lucide-react';
import { projectService } from '../services/projectService';
import { Project } from '../types/projects';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import ProjectOverviewTab from './detail-tabs/ProjectOverviewTab';
import ProjectMembersTab from './detail-tabs/ProjectMembersTab';
import ProjectSkillsTab from './detail-tabs/ProjectSkillsTab';
import ProjectHistoryTab from './detail-tabs/ProjectHistoryTab';
import ProjectCreateDialog from './ProjectCreateDialog';

interface ProjectDetailDialogProps {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userRole: string;
}

export default function ProjectDetailDialog({
  projectId,
  open,
  onOpenChange,
  onSuccess,
  userRole,
}: ProjectDetailDialogProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    if (projectId && open) {
      loadProject();
    }
  }, [projectId, open]);

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
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not authenticated');
        return;
      }
      
      // Optimistic UI update
      toast.success('Project approved');
      onOpenChange(false);
      
      // Update in background
      projectService.updateProjectStatus(projectId, 'active', user.id)
        .then(() => {
          onSuccess(); // Refresh list in background
        })
        .catch(error => {
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
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
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
      projectService.updateProjectStatus(projectId, 'rejected', user.id, rejectionReason)
        .then(() => {
          onSuccess(); // Refresh list in background
        })
        .catch(error => {
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

  if (loading || !project) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const canApprove = ['management', 'admin'].includes(userRole) && project.status === 'awaiting_approval';
  
  // Tech leads can edit active projects anytime, management and admin can edit awaiting_approval and active projects
  const canEdit = 
    (['tech_lead', 'management', 'admin'].includes(userRole) && project.status === 'awaiting_approval') ||
    (['tech_lead', 'management', 'admin'].includes(userRole) && project.status === 'active');

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    loadProject();
    onSuccess();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!max-w-[1800px] w-[96vw] min-w-[900px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4">
              <DialogTitle>{project.name}</DialogTitle>
              <div className="flex items-center gap-2">
                <Badge variant={project.status === 'active' ? 'default' : project.status === 'awaiting_approval' ? 'secondary' : project.status === 'rejected' ? 'destructive' : 'outline'}>
                  {project.status.replace('_', ' ').toUpperCase()}
                </Badge>
                {userRole !== 'employee' && (
                  <Button variant="outline" size="sm" onClick={() => {
                    // TODO: Open project-level history view
                    console.log('View project history');
                  }}>
                    View History
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="flex-shrink-0">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {project.status !== 'awaiting_approval' && (
              <TabsTrigger value="members">Members</TabsTrigger>
            )}
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="overview" className="mt-0">
              <ProjectOverviewTab project={project} />
            </TabsContent>
            {project.status !== 'awaiting_approval' && (
              <TabsContent value="members" className="mt-0 h-full overflow-hidden">
                <ProjectMembersTab project={project} isEmployeeView={userRole === 'employee'} />
              </TabsContent>
            )}
            <TabsContent value="skills" className="mt-0">
              <ProjectSkillsTab project={project} />
            </TabsContent>
            {userRole === 'employee' ? (
              <TabsContent value="history" className="mt-0">
                <ProjectHistoryTab 
                  projectId={project.id} 
                  isEmployeeView={true}
                />
              </TabsContent>
            ) : (
              <TabsContent value="history" className="mt-0">
                <ProjectHistoryTab projectId={project.id} isEmployeeView={false} />
              </TabsContent>
            )}
          </div>
        </Tabs>

        {userRole !== 'employee' && (
          <div className="flex-shrink-0 pt-4 border-t">
            {canApprove && (
              <div className="space-y-3">
                {showRejectForm ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Rejection Reason</Label>
                      <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Explain why..." rows={3} />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowRejectForm(false)}>Cancel</Button>
                      <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason.trim()}><X className="mr-2 h-4 w-4" />Confirm Rejection</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end gap-2">
                    {canEdit && (
                      <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setShowRejectForm(true)}><X className="mr-2 h-4 w-4" />Reject</Button>
                    <Button onClick={handleApprove}><Check className="mr-2 h-4 w-4" />Approve</Button>
                  </div>
                )}
              </div>
            )}
            {canEdit && !canApprove && (
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </div>
            )}
          </div>
        )}
        </DialogContent>
      </Dialog>

      {project && (
        <ProjectCreateDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={handleEditSuccess}
          editMode={project}
        />
      )}
    </>
  );
}
