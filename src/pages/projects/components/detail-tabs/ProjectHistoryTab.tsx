import { useState, useEffect } from 'react';
import { projectService } from '../../services/projectService';
import { AllocationHistory } from '../../types/projects';
import { Loader2, TrendingUp, TrendingDown, User, Clock, ArrowRight, UserPlus, UserMinus, Edit, RefreshCw, Eye, X, Calendar, FileText, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
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
  color: string;
} {
  const reason = entry.change_reason?.toLowerCase() || '';
  
  if (reason.includes('new member assigned') || entry.previous_allocation === null) {
    return { 
      icon: <UserPlus className="h-4 w-4" />, 
      label: 'Member Added', 
      variant: 'default',
      color: 'text-green-600'
    };
  }
  
  if (reason.includes('removed') || entry.new_allocation === 0) {
    return { 
      icon: <UserMinus className="h-4 w-4" />, 
      label: 'Member Removed', 
      variant: 'destructive',
      color: 'text-destructive'
    };
  }
  
  if (reason.includes('updated') || reason.includes('sent back')) {
    return { 
      icon: <Edit className="h-4 w-4" />, 
      label: 'Update', 
      variant: 'secondary',
      color: 'text-blue-600'
    };
  }
  
  if (entry.previous_allocation !== null && entry.new_allocation !== entry.previous_allocation) {
    return { 
      icon: <RefreshCw className="h-4 w-4" />, 
      label: 'Allocation Changed', 
      variant: 'outline',
      color: 'text-amber-600'
    };
  }
  
  return { 
    icon: <Clock className="h-4 w-4" />, 
    label: 'Activity', 
    variant: 'outline',
    color: 'text-muted-foreground'
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

function formatFullDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return format(date, 'EEEE, MMMM dd, yyyy \'at\' hh:mm:ss a');
  } catch {
    return dateString;
  }
}

// History Detail Modal
function HistoryDetailModal({ 
  entry, 
  open, 
  onClose 
}: { 
  entry: AllocationHistory | null; 
  open: boolean; 
  onClose: () => void;
}) {
  if (!entry) return null;
  
  const actionInfo = getActionInfo(entry);
  const isIncrease = entry.previous_allocation !== null && entry.new_allocation > entry.previous_allocation;
  const isDecrease = entry.previous_allocation !== null && entry.new_allocation < entry.previous_allocation;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            History Entry Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Action Type */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className={`p-2 rounded-full bg-background ${actionInfo.color}`}>
              {actionInfo.icon}
            </div>
            <div>
              <p className="font-semibold">{actionInfo.label}</p>
              <p className="text-xs text-muted-foreground">Action Type</p>
            </div>
          </div>

          <Separator />

          {/* Member Info */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Member</p>
                <p className="font-medium">{entry.full_name}</p>
              </div>
            </div>

            {/* Allocation Change */}
            {(entry.new_allocation > 0 || entry.previous_allocation !== null) && (
              <div className="flex items-start gap-3">
                <Activity className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Allocation</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {entry.previous_allocation !== null && (
                      <>
                        <Badge variant="outline" className="text-muted-foreground">
                          {entry.previous_allocation}%
                        </Badge>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </>
                    )}
                    {entry.new_allocation > 0 ? (
                      <Badge variant={isIncrease ? 'default' : isDecrease ? 'secondary' : 'outline'}>
                        {isIncrease && <TrendingUp className="h-3 w-3 mr-1" />}
                        {isDecrease && <TrendingDown className="h-3 w-3 mr-1" />}
                        {entry.new_allocation}%
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Removed (0%)</Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Change Reason/Description */}
            {entry.change_reason && (
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Description</p>
                  <p className="text-sm mt-0.5">{entry.change_reason}</p>
                </div>
              </div>
            )}

            {/* Changed By */}
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Changed By</p>
                <p className="font-medium">{entry.changed_by_name}</p>
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Date & Time</p>
                <p className="text-sm">{formatFullDate(entry.created_at)}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Entry ID */}
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Entry ID:</span> {entry.id}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectHistoryTab({ projectId, isEmployeeView = false }: ProjectHistoryTabProps) {
  const [history, setHistory] = useState<AllocationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<AllocationHistory | null>(null);

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
                {/* Top row: Action badge + Member name + Allocation + View Details */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Badge variant={actionInfo.variant} className="shrink-0 gap-1 text-xs">
                      {actionInfo.icon}
                      {actionInfo.label}
                    </Badge>
                    <span className="font-medium truncate">{entry.full_name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    {showAllocation && (
                      <div className="flex items-center gap-1.5">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setSelectedEntry(entry)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </Button>
                  </div>
                </div>

                {/* Middle row: Change reason/description */}
                {entry.change_reason && (
                  <p className="text-sm text-muted-foreground mb-1.5 line-clamp-1">
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

      {/* Detail Modal */}
      <HistoryDetailModal 
        entry={selectedEntry} 
        open={!!selectedEntry} 
        onClose={() => setSelectedEntry(null)} 
      />
    </div>
  );
}

