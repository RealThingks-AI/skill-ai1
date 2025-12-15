import { Project } from '../../types/projects';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
interface ProjectMembersTabProps {
  project: Project;
  isEmployeeView?: boolean;
}
export default function ProjectMembersTab({
  project,
  isEmployeeView = false
}: ProjectMembersTabProps) {
  const getCapacityColor = (available: number) => {
    if (available >= 50) return 'text-green-600';
    if (available >= 25) return 'text-yellow-600';
    return 'text-red-600';
  };
  const getCapacityBadge = (available: number) => {
    if (available >= 50) return '🟢';
    if (available >= 25) return '🟡';
    return '🔴';
  };
  return <div className="flex flex-col h-full">
      <div className="flex items-center justify-between flex-shrink-0 mb-3">
        <h3 className="font-semibold text-sm">Team Members ({project.members.length})</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-2">
        {project.members.map(member => <div key={member.user_id} className="p-3 border rounded-lg transition-smooth hover:border-primary/50">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-sm">{member.full_name}</p>
                  {!isEmployeeView && member.available_capacity !== undefined && (
                    <span className="text-base">{getCapacityBadge(member.available_capacity)}</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{member.role}</p>
              </div>
              {!isEmployeeView && (
                <Badge className="text-sm font-semibold">
                  {member.allocation_percentage}% on this project
                </Badge>
              )}
              {isEmployeeView && (
                <Badge className="text-sm font-semibold">
                  {member.allocation_percentage}% allocated
                </Badge>
              )}
            </div>

            {!isEmployeeView && member.available_capacity !== undefined && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Total Allocation</span>
                  <span className={getCapacityColor(member.available_capacity)}>
                    {member.current_total_allocation}% allocated • {member.available_capacity}% available
                  </span>
                </div>
                <Progress value={member.current_total_allocation} className="h-1.5" />
              </div>
            )}
          </div>)}
      </div>
    </div>;
}