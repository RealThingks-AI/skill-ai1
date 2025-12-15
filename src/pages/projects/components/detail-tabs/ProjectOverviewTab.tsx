import { Project, MonthlyManpower } from '../../types/projects';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import PendingChangesDisplay from '../PendingChangesDisplay';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar } from 'lucide-react';
import { dateFormatters } from '@/utils/formatters';
interface ProjectOverviewTabProps {
  project: Project;
  hideTeamMembers?: boolean;
}

// Helper to format month for display
const formatMonth = (month: string): string => {
  try {
    return dateFormatters.formatMonthYear(month + '-01');
  } catch {
    return month;
  }
};

// Component to display members organized by month
function MembersByMonth({
  project
}: {
  project: Project;
}) {
  const months = project.month_wise_manpower || [];

  // Build a map of month -> members with their allocations
  const membersByMonth = useMemo(() => {
    const result: Record<string, {
      name: string;
      allocation: number;
    }[]> = {};
    months.forEach(({
      month
    }) => {
      result[month] = [];
      project.members.forEach(member => {
        // Only include members who have an explicit monthly allocation for this month
        const monthlyAlloc = member.monthly_allocations?.find(ma => ma.month === month);
        if (monthlyAlloc && monthlyAlloc.allocation_percentage && monthlyAlloc.allocation_percentage > 0) {
          result[month].push({
            name: member.full_name,
            allocation: monthlyAlloc.allocation_percentage
          });
        }
      });
    });
    return result;
  }, [months, project.members]);
  return <div className="flex flex-col h-full flex-1">
      <Label className="flex items-center gap-2 flex-shrink-0 mb-2">
        <Users className="h-4 w-4" />
        Team Members ({project.members.length}) - Month-wise Allocation
      </Label>
      
      <div className="space-y-2 border rounded-lg p-3 bg-muted/30 flex-1 overflow-y-auto min-h-0">
        {months.map(({
        month,
        limit
      }) => {
        const membersInMonth = membersByMonth[month] || [];
        const totalAllocation = membersInMonth.reduce((sum, m) => sum + m.allocation / 100, 0);
        return <div key={month} className="space-y-1.5 pb-2 border-b last:border-b-0 last:pb-0">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">{formatMonth(month)}</span>
                <span className="text-xs text-muted-foreground">
                  (Limit: {limit} | Used: {totalAllocation.toFixed(2)})
                </span>
              </div>
              
              <div className="flex flex-wrap gap-1.5 pl-5">
                {membersInMonth.length > 0 ? membersInMonth.map((member, idx) => <Badge key={`${month}-${idx}`} variant="secondary" className="px-2 py-0.5 text-xs">
                      {member.name} ({member.allocation}%)
                    </Badge>) : <span className="text-xs text-muted-foreground italic">No members allocated</span>}
              </div>
            </div>;
      })}
      </div>
    </div>;
}
export default function ProjectOverviewTab({
  project,
  hideTeamMembers = false
}: ProjectOverviewTabProps) {
  const [techLeadName, setTechLeadName] = useState<string>('');
  useEffect(() => {
    const fetchTechLeadName = async () => {
      if (!project.tech_lead_id) return;
      try {
        const {
          data,
          error
        } = await supabase.from('profiles').select('full_name').eq('user_id', project.tech_lead_id).single();
        if (error) throw error;
        setTechLeadName(data?.full_name || '');
      } catch (error) {
        console.error('Error fetching tech lead name:', error);
      }
    };
    fetchTechLeadName();
  }, [project.tech_lead_id]);

  // Check if this is a Tech Lead update awaiting approval
  const hasPendingChanges = project.pending_changes && project.status === 'awaiting_approval' && project.requested_status === 'active';
  return (
    <div className="flex flex-col gap-4 h-full min-h-0">
      {/* Show pending changes prominently at the top if this is a Tech Lead update */}
      {hasPendingChanges && project.pending_changes && (
        <PendingChangesDisplay 
          pendingChanges={project.pending_changes} 
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
      )}

      {/* Main content area - two columns on large screens */}
      <div className={hideTeamMembers ? "space-y-4" : "flex flex-col lg:flex-row gap-6 flex-1 min-h-0"}>
        {/* Left Section: Project Details */}
        <div className="space-y-4 lg:w-1/2 flex-shrink-0 overflow-y-auto max-h-[50vh] lg:max-h-full">
          <div>
            <Label>Customer Name *</Label>
            <Input value={project.customer_name || ''} disabled />
          </div>

          <div>
            <Label>Description *</Label>
            <Textarea value={project.description || ''} disabled rows={1} className="min-h-[36px] resize-none" />
          </div>

          <div>
            <Label>Tech Lead</Label>
            <Input value={techLeadName || 'Loading...'} disabled className="bg-muted" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date *</Label>
              <Input type="text" value={project.start_date ? dateFormatters.formatDate(project.start_date) : 'Not set'} disabled />
            </div>

            <div>
              <Label>End Date *</Label>
              <Input type="text" value={project.end_date ? dateFormatters.formatDate(project.end_date) : 'Not set'} disabled />
            </div>
          </div>

          {project.month_wise_manpower && project.month_wise_manpower.length > 0 && (
            <div className="space-y-2">
              <Label>Monthly Manpower Limits</Label>
              <div className="grid grid-cols-3 lg:grid-cols-4 gap-2">
                {(project.month_wise_manpower as any[]).map((month: any, index: number) => (
                  <div key={index} className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      {formatMonth(month.month)}
                    </Label>
                    <Input type="number" value={month.limit} disabled className="h-9" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {project.rejection_reason && (
            <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/5">
              <h3 className="font-semibold text-destructive mb-2">Rejection Reason</h3>
              <p className="text-sm text-muted-foreground">{project.rejection_reason}</p>
            </div>
          )}
        </div>

        {/* Right Section: Team Members - only show if not hidden */}
        {!hideTeamMembers && (
          <div className="flex flex-col lg:w-1/2 flex-1 min-h-0 max-h-[50vh] lg:max-h-full overflow-y-auto">
            {/* Members by Month */}
            {project.members && project.members.length > 0 && project.month_wise_manpower && project.month_wise_manpower.length > 0 && (
              <MembersByMonth project={project} />
            )}

            {/* Fallback: Show members without monthly breakdown if no monthly manpower */}
            {project.members && project.members.length > 0 && (!project.month_wise_manpower || project.month_wise_manpower.length === 0) && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Members ({project.members.length})
                </Label>
                <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30">
                  {project.members.map(member => (
                    <Badge key={member.user_id} variant="secondary" className="px-3 py-1">
                      {member.full_name} ({member.allocation_percentage}%)
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Show empty state if no members */}
            {(!project.members || project.members.length === 0) && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Members (0)
                </Label>
                <div className="p-4 border rounded-lg bg-muted/30 text-center text-sm text-muted-foreground">
                  No team members assigned
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}