import { useState, useEffect } from 'react';
import { projectService } from '../../services/projectService';
import { AllocationHistory } from '../../types/projects';
import { Loader2, TrendingUp, TrendingDown, User, Clock, ArrowRight, UserPlus, UserMinus, Edit, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ProjectHistoryTabProps {
  projectId: string;
  isEmployeeView?: boolean;
}

// Helper to determine action type from change_reason
function getActionInfo(entry: AllocationHistory): { 
  icon: React.ReactNode; 
  label: string; 
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
  const reason = entry.change_reason?.toLowerCase() || '';
  
  if (reason.includes('new member assigned') || entry.previous_allocation === null) {
    return { 
      icon: <UserPlus className="h-4 w-4" />, 
      label: 'Member Added', 
      variant: 'default' 
    };
  }
  
  if (reason.includes('removed') || entry.new_allocation === 0) {
    return { 
      icon: <UserMinus className="h-4 w-4" />, 
      label: 'Member Removed', 
      variant: 'destructive' 
    };
  }
  
  if (reason.includes('updated') || reason.includes('sent back')) {
    return { 
      icon: <Edit className="h-4 w-4" />, 
      label: 'Update', 
      variant: 'secondary' 
    };
  }
  
  if (entry.previous_allocation !== null && entry.new_allocation !== entry.previous_allocation) {
    return { 
      icon: <RefreshCw className="h-4 w-4" />, 
      label: 'Allocation Changed', 
      variant: 'outline' 
    };
  }
  
  return { 
    icon: <Clock className="h-4 w-4" />, 
    label: 'Activity', 
    variant: 'outline' 
  };
}

// Format date consistently
function formatHistoryDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return format(date, 'MMM dd, yyyy • hh:mm a');
  } catch {
    return dateString;
  }
}

export default function ProjectHistoryTab({ projectId, isEmployeeView = false }: ProjectHistoryTabProps) {
  const [history, setHistory] = useState<AllocationHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [projectId, isEmployeeView]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      let filterForEmployeeId: string | undefined;
      if (isEmployeeView) {
        const { data: { user } } = await supabase.auth.getUser();
        filterForEmployeeId = user?.id;
      }
      const data = await projectService.getAllocationHistory(projectId, filterForEmployeeId);
      setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Project History</h3>
        <span className="text-sm text-muted-foreground">{history.length} entries</span>
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No history records yet</p>
      ) : (
        <div className="space-y-2">
          {history.map((entry) => {
            const actionInfo = getActionInfo(entry);
            const isIncrease = entry.previous_allocation !== null && entry.new_allocation > entry.previous_allocation;
            const isDecrease = entry.previous_allocation !== null && entry.new_allocation < entry.previous_allocation;
            const showAllocation = entry.new_allocation > 0 || entry.previous_allocation !== null;

            return (
              <div 
                key={entry.id} 
                className="p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors"
              >
                {/* Top row: Action badge + Member name + Allocation */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Badge variant={actionInfo.variant} className="shrink-0 gap-1 text-xs">
                      {actionInfo.icon}
                      {actionInfo.label}
                    </Badge>
                    <span className="font-medium truncate">{entry.full_name}</span>
                  </div>
                  
                  {showAllocation && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {entry.previous_allocation !== null && entry.previous_allocation !== entry.new_allocation && (
                        <>
                          <span className="text-sm text-muted-foreground">{entry.previous_allocation}%</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        </>
                      )}
                      {entry.new_allocation > 0 ? (
                        <Badge variant={isIncrease ? 'default' : isDecrease ? 'secondary' : 'outline'} className="gap-0.5">
                          {isIncrease && <TrendingUp className="h-3 w-3" />}
                          {isDecrease && <TrendingDown className="h-3 w-3" />}
                          {entry.new_allocation}%
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">Removed</Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Middle row: Change reason/description */}
                {entry.change_reason && (
                  <p className="text-sm text-muted-foreground mb-1.5 line-clamp-2">
                    {entry.change_reason}
                  </p>
                )}

                {/* Bottom row: Changed by + Date */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span>By: {entry.changed_by_name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatHistoryDate(entry.created_at)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
