import { Project, MemberMonthlyAllocation } from '../../types/projects';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Users, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { dateFormatters } from '@/utils/formatters';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
interface ProjectViewMembersListProps {
  project: Project;
  onEditMember?: (userId: string) => void;
  onRemoveMember?: (userId: string) => void;
  onRemoveMemberFromMonth?: (userId: string, month: string) => void;
  readOnly?: boolean;
}
type ViewMode = 'user' | 'month';
export default function ProjectViewMembersList({
  project,
  onEditMember,
  onRemoveMember,
  onRemoveMemberFromMonth,
  readOnly = false
}: ProjectViewMembersListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('user');
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());
  const [memberToDelete, setMemberToDelete] = useState<{
    userId: string;
    name: string;
    month?: string; // Optional: if set, only remove from this month
  } | null>(null);
  const toggleMemberExpanded = (userId: string) => {
    setExpandedMembers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Get valid project months from month_wise_manpower
  const validProjectMonths = useMemo(() => {
    return new Set(project.month_wise_manpower?.map(m => m.month) || []);
  }, [project.month_wise_manpower]);

  // Calculate total unique months assigned for each member (only within project's valid months)
  const membersWithMonthCount = useMemo(() => {
    return project.members.map(member => {
      // Get unique months with allocation > 0 that are within project's valid months
      const allocatedMonths = member.monthly_allocations?.filter(ma => ma.allocation_percentage && ma.allocation_percentage > 0 && validProjectMonths.has(ma.month)) || [];
      const uniqueMonths = new Set(allocatedMonths.map(ma => ma.month));
      return {
        ...member,
        monthCount: uniqueMonths.size,
        allocatedMonths: allocatedMonths.sort((a, b) => a.month.localeCompare(b.month))
      };
    }).sort((a, b) => b.monthCount - a.monthCount);
  }, [project.members, validProjectMonths]);

  // Group allocations by month
  const monthWiseAllocations = useMemo(() => {
    const monthMap: Record<string, {
      month: string;
      members: {
        user_id: string;
        full_name: string;
        role: string;
        allocation_percentage: number;
      }[];
    }> = {};
    project.members.forEach(member => {
      member.monthly_allocations?.forEach(ma => {
        // Only include months that are within project's valid months
        if (ma.allocation_percentage && ma.allocation_percentage > 0 && validProjectMonths.has(ma.month)) {
          if (!monthMap[ma.month]) {
            monthMap[ma.month] = {
              month: ma.month,
              members: []
            };
          }
          monthMap[ma.month].members.push({
            user_id: member.user_id,
            full_name: member.full_name,
            role: member.role,
            allocation_percentage: ma.allocation_percentage
          });
        }
      });
    });
    return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month));
  }, [project.members, validProjectMonths]);
  const hasActions = !readOnly && (onEditMember || onRemoveMember);
  const handleConfirmDelete = () => {
    if (memberToDelete) {
      if (memberToDelete.month && onRemoveMemberFromMonth) {
        // Remove from specific month only
        onRemoveMemberFromMonth(memberToDelete.userId, memberToDelete.month);
      } else if (onRemoveMember) {
        // Remove from entire project
        onRemoveMember(memberToDelete.userId);
      }
      setMemberToDelete(null);
    }
  };
  return <div className="flex flex-col h-full">
      <div className="flex-shrink-0 mb-2 flex items-center justify-between gap-3">
        <h3 className="text-lg font-medium">
          Assigned Members ({project.members.length})
        </h3>
        <ToggleGroup type="single" value={viewMode} onValueChange={value => value && setViewMode(value as ViewMode)} className="bg-muted rounded-md p-0.5">
          <ToggleGroupItem value="user" aria-label="User wise" className="text-xs px-2.5 py-1 h-7 data-[state=on]:bg-background data-[state=on]:shadow-sm">
            <Users className="h-3.5 w-3.5 mr-1" />
            User
          </ToggleGroupItem>
          <ToggleGroupItem value="month" aria-label="Month wise" className="text-xs px-2.5 py-1 h-7 data-[state=on]:bg-background data-[state=on]:shadow-sm">
            <Calendar className="h-3.5 w-3.5 mr-1" />
            Month
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
        {viewMode === 'user' ? membersWithMonthCount.length > 0 ? membersWithMonthCount.map(member => {
        const isExpanded = expandedMembers.has(member.user_id);
        return <Collapsible key={member.user_id} open={isExpanded} onOpenChange={() => toggleMemberExpanded(member.user_id)}>
                  <CollapsibleTrigger asChild>
                    <div className="grid grid-cols-3 items-center p-2.5 border rounded-lg bg-background hover:bg-muted/30 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{member.full_name}</span>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                      
                      <div className="flex justify-center">
                        <span className="text-xs text-muted-foreground">
                          ({member.monthCount} months)
                        </span>
                      </div>
                      
                      {hasActions ? <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                          {onEditMember && <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-primary/10 hover:text-primary" onClick={() => onEditMember(member.user_id)} title="Edit allocation">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>}
                          {onRemoveMember && <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive" onClick={() => setMemberToDelete({
                  userId: member.user_id,
                  name: member.full_name
                })} title="Remove from project">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>}
                        </div> : <div className="flex items-center gap-1.5 opacity-30 justify-end">
                          <Pencil className="h-3.5 w-3.5" />
                          <Trash2 className="h-3.5 w-3.5" />
                        </div>}
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-4 mt-1 mb-2 p-2 border-l-2 border-primary/20 bg-muted/20 rounded-r-lg">
                      <div className="text-xs font-medium text-muted-foreground mb-2">Monthly Allocations:</div>
                      {member.allocatedMonths && member.allocatedMonths.length > 0 ? <div className="grid grid-cols-5 gap-2">
                          {member.allocatedMonths.map((ma, idx) => <div key={idx} className="flex items-center justify-between px-2 py-1 bg-background rounded border text-xs">
                              <span>{dateFormatters.formatMonthYear(ma.month)}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {ma.allocation_percentage}%
                              </Badge>
                            </div>)}
                        </div> : <div className="text-xs text-muted-foreground">No allocations assigned</div>}
                    </div>
                  </CollapsibleContent>
                </Collapsible>;
      }) : <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              No team members assigned
            </div> : monthWiseAllocations.length > 0 ? monthWiseAllocations.map(monthData => {
        const isMonthExpanded = expandedMembers.has(monthData.month);
        return <Collapsible key={monthData.month} open={isMonthExpanded} onOpenChange={() => toggleMemberExpanded(monthData.month)}>
                <CollapsibleTrigger asChild>
                  <div className="grid grid-cols-3 items-center p-2.5 border rounded-lg bg-background hover:bg-muted/30 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{dateFormatters.formatMonthYear(monthData.month)}</span>
                      {isMonthExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                    <span className="text-xs text-muted-foreground text-center">({monthData.members.length} members)</span>
                    <div />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-4 mt-1 mb-2 p-2 border-l-2 border-primary/20 bg-muted/20 rounded-r-lg space-y-1">
                    {monthData.members.map((member, idx) => <div key={idx} className="grid grid-cols-3 items-center px-2 py-1.5 rounded hover:bg-muted/30">
                          <span className="text-sm">{member.full_name}</span>
                          <span className="text-xs font-medium text-muted-foreground text-center">{member.allocation_percentage}%</span>
                          <div className="flex items-center gap-2 justify-end ml-2">
                            {hasActions ? <>
                                {onEditMember && <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1 hover:bg-primary/10 hover:text-primary hover:border-primary" onClick={() => onEditMember(member.user_id)} title="Edit allocation">
                                    <Pencil className="h-3 w-3" />
                                    ​
                                  </Button>}
                                {onRemoveMemberFromMonth && <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1 hover:bg-destructive/10 hover:text-destructive hover:border-destructive" onClick={() => setMemberToDelete({
                      userId: member.user_id,
                      name: member.full_name,
                      month: monthData.month
                    })} title="Remove from this month">
                                    <Trash2 className="h-3 w-3" />
                                    ​
                                  </Button>}
                              </> : <div className="flex items-center gap-2 text-muted-foreground/40">
                                <Pencil className="h-3.5 w-3.5" />
                                <Trash2 className="h-3.5 w-3.5" />
                              </div>}
                          </div>
                        </div>)}
                  </div>
                </CollapsibleContent>
              </Collapsible>;
      }) : <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
              No allocations assigned
            </div>}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!memberToDelete} onOpenChange={open => !open && setMemberToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToDelete?.month ? <>
                  Are you sure you want to remove <strong>{memberToDelete?.name}</strong> from <strong>{dateFormatters.formatMonthYear(memberToDelete.month)}</strong>?
                </> : <>
                  Are you sure you want to remove <strong>{memberToDelete?.name}</strong> from this project? 
                  This will remove all their monthly allocations.
                </>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}