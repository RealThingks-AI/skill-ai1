import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronUp, History, Loader2, Search, ArrowUpDown } from 'lucide-react';
import { resourceService, ResourceAllocation, UserProject, ProjectHistory } from '../services/resourceService';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { dateFormatters } from '@/utils/formatters';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ResourceInsightsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ResourceInsightsModal({
  open,
  onOpenChange
}: ResourceInsightsModalProps) {
  const [resources, setResources] = useState<ResourceAllocation[]>([]);
  const [initialLoading, setInitialLoading] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userProjects, setUserProjects] = useState<Record<string, UserProject[]>>({});
  const [projectHistory, setProjectHistory] = useState<Record<string, ProjectHistory[]>>({});
  const [loadingProjects, setLoadingProjects] = useState<Record<string, boolean>>({});
  const [loadingHistory, setLoadingHistory] = useState<Record<string, boolean>>({});
  const [showHistory, setShowHistory] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'projects' | 'allocation'>('name');
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  // Default to current month (YYYY-MM format)
  const currentMonth = new Date().toISOString().substring(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);

  useEffect(() => {
    if (open) {
      loadAvailableMonths();
      loadResources(true);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    // Set up real-time subscription
    const channel = supabase.channel('resource-changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'project_assignments'
    }, () => {
      loadResources(false); // Background refresh, no loading spinner
      if (expandedUserId) {
        loadUserProjects(expandedUserId);
      }
    }).on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'projects'
    }, () => {
      loadResources(false); // Background refresh, no loading spinner
      if (expandedUserId) {
        loadUserProjects(expandedUserId);
      }
    }).subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [open]);

  // Reload resources and clear user projects cache when month filter changes
  useEffect(() => {
    if (open) {
      loadResources(true);
      // Clear cached user projects since allocations change by month
      setUserProjects({});
      if (expandedUserId) {
        loadUserProjects(expandedUserId);
      }
    }
  }, [selectedMonth]);

  const loadAvailableMonths = async () => {
    try {
      const months = await resourceService.getAvailableMonths();
      setAvailableMonths(months);
    } catch (error) {
      console.error('Error loading available months:', error);
    }
  };

  const loadResources = async (showLoading: boolean = false) => {
    try {
      if (showLoading) {
        setInitialLoading(true);
      }
      const monthParam = selectedMonth === 'all' ? undefined : selectedMonth;
      const data = await resourceService.getAllResourceAllocations(monthParam);
      setResources(data);
    } catch (error) {
      console.error('Error loading resources:', error);
      toast.error('Failed to load resource data');
    } finally {
      if (showLoading) {
        setInitialLoading(false);
      }
    }
  };

  const loadUserProjects = async (userId: string) => {
    try {
      setLoadingProjects(prev => ({ ...prev, [userId]: true }));
      const data = await resourceService.getUserCurrentProjects(userId, selectedMonth);
      setUserProjects(prev => ({ ...prev, [userId]: data }));
    } catch (error) {
      console.error('Error loading user projects:', error);
      toast.error('Failed to load user projects');
    } finally {
      setLoadingProjects(prev => ({ ...prev, [userId]: false }));
    }
  };

  const loadUserHistory = async (userId: string) => {
    try {
      setLoadingHistory(prev => ({ ...prev, [userId]: true }));
      const data = await resourceService.getUserProjectHistory(userId);
      setProjectHistory(prev => ({ ...prev, [userId]: data }));
      setShowHistory(prev => ({ ...prev, [userId]: true }));
    } catch (error) {
      console.error('Error loading project history:', error);
      toast.error('Failed to load project history');
    } finally {
      setLoadingHistory(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleUserClick = (userId: string) => {
    if (expandedUserId === userId) {
      // Collapse if already expanded
      setExpandedUserId(null);
      setShowHistory(prev => ({ ...prev, [userId]: false }));
    } else {
      // Expand immediately and load data in background
      setExpandedUserId(userId);
      // Always reload projects to get current month's allocations
      loadUserProjects(userId);
    }
  };

  const handleToggleHistory = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (showHistory[userId]) {
      setShowHistory(prev => ({ ...prev, [userId]: false }));
    } else {
      if (!projectHistory[userId]) {
        loadUserHistory(userId);
      } else {
        setShowHistory(prev => ({ ...prev, [userId]: true }));
      }
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
  };


  const filteredResources = useMemo(() => {
    let filtered = resources;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(resource => 
        resource.full_name.toLowerCase().includes(query)
      );
    }
    
    // Sort by selected criteria
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.full_name.localeCompare(b.full_name);
        case 'projects':
          return b.active_projects_count - a.active_projects_count;
        case 'allocation':
          return b.total_allocation - a.total_allocation;
        default:
          return 0;
      }
    });
    
    return sorted;
  }, [resources, searchQuery, sortBy]);

  const getAllocationColor = (allocation: number) => {
    if (allocation >= 100) return 'text-red-600 dark:text-red-400';
    if (allocation >= 75) return 'text-orange-600 dark:text-orange-400';
    return 'text-foreground';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(1030px,90vw)] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Resource Insights</DialogTitle>
        </DialogHeader>

        <div className="flex gap-3 pb-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
          <div className="w-48">
            <Select value={sortBy} onValueChange={(value: 'name' | 'projects' | 'allocation') => setSortBy(value)}>
              <SelectTrigger className="h-9">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  <SelectValue placeholder="Sort by..." />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="projects">Sort by Projects</SelectItem>
                <SelectItem value="allocation">Sort by Allocation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-9">
                <SelectValue>
                  {dateFormatters.formatMonthYear(`${selectedMonth}-01`)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map((month) => (
                  <SelectItem key={month} value={month}>
                    {dateFormatters.formatMonthYear(`${month}-01`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 min-h-0">
          {initialLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-1">
              {filteredResources.map(resource => (
                <Collapsible
                  key={resource.user_id}
                  open={expandedUserId === resource.user_id}
                  onOpenChange={() => handleUserClick(resource.user_id)}
                >
                  <div className="border rounded-lg overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center justify-between p-2 hover:bg-accent cursor-pointer transition-colors">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {expandedUserId === resource.user_id ? (
                            <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          )}
                          <p className="font-medium text-sm truncate">{resource.full_name}</p>
                        </div>

                        <div className="flex items-center gap-4 ml-4">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Projects:</span>
                            <span className="text-sm font-semibold">{resource.active_projects_count}</span>
                          </div>
                          <div className="w-28">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs text-muted-foreground">Allocation</span>
                              <span className={`text-sm font-semibold ${getAllocationColor(resource.total_allocation)}`}>
                                {resource.total_allocation}%
                              </span>
                            </div>
                            <Progress value={resource.total_allocation} className="h-1.5" />
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t bg-muted/30 p-3 space-y-3">
                        {/* Stats Row */}
                        <div className="flex items-center justify-between px-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Total Allocation</p>
                            <p className={`text-lg font-bold ${getAllocationColor(resource.total_allocation)}`}>
                              {resource.total_allocation}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Available Capacity</p>
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                              {resource.available_capacity}%
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={(e) => handleToggleHistory(resource.user_id, e)}
                            disabled={loadingHistory[resource.user_id]}
                          >
                            {loadingHistory[resource.user_id] ? (
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            ) : (
                              <History className="mr-2 h-3 w-3" />
                            )}
                            {showHistory[resource.user_id] ? 'Hide History' : 'View History'}
                          </Button>
                        </div>

                        {/* Show History or Active Projects */}
                        {showHistory[resource.user_id] ? (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Project History</h4>
                            {loadingHistory[resource.user_id] ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              </div>
                            ) : projectHistory[resource.user_id]?.length > 0 ? (
                              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                {projectHistory[resource.user_id].map((history, index) => (
                                  <div key={`${history.project_id}-${index}`} className="p-2 rounded border bg-background space-y-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5">
                                          <p className="text-xs font-medium truncate">{history.project_name}</p>
                                          {history.project_status && (
                                            <Badge variant={history.project_status === 'completed' ? 'outline' : 'secondary'} className="text-[10px] h-4 px-1">
                                              {history.project_status}
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">
                                          Assigned: {dateFormatters.formatDate(history.assigned_at)}
                                        </p>
                                        {(history.start_date || history.end_date) && (
                                          <p className="text-[10px] text-muted-foreground">
                                            {history.start_date ? dateFormatters.formatDate(history.start_date) : 'TBD'} → {history.end_date ? dateFormatters.formatDate(history.end_date) : 'Ongoing'}
                                          </p>
                                        )}
                                      </div>
                                      <span className="text-xs font-semibold whitespace-nowrap">
                                        {history.allocation_percentage}%
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground space-y-0.5">
                                      <p>Changed by: {history.changed_by_name}</p>
                                      {history.change_reason && <p>Reason: {history.change_reason}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6">
                                <p className="text-xs text-muted-foreground">No project history found</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active Projects</h4>
                            {loadingProjects[resource.user_id] ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              </div>
                            ) : userProjects[resource.user_id]?.length > 0 ? (
                              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                {userProjects[resource.user_id].map(project => (
                                  <div key={project.project_id} className="p-2.5 rounded border bg-background">
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{project.project_name}</p>
                                      </div>
                                      <Badge className={`${getStatusColor(project.project_status)} text-[10px] h-5 px-1.5 flex-shrink-0`}>
                                        {project.project_status.replace('_', ' ')}
                                      </Badge>
                                    </div>
                                    {(project.start_date || project.end_date) && (
                                      <p className="text-xs text-muted-foreground mb-2">
                                        {project.start_date ? dateFormatters.formatDate(project.start_date) : 'TBD'} → {project.end_date ? dateFormatters.formatDate(project.end_date) : 'Ongoing'}
                                      </p>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1">
                                        <Progress value={project.allocation_percentage} className="h-1.5" />
                                      </div>
                                      <span className="text-xs font-semibold whitespace-nowrap">
                                        {project.allocation_percentage}%
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6">
                                <p className="text-xs text-muted-foreground">No active projects</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
              {filteredResources.length === 0 && !initialLoading && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No resources found matching your search' : 'No resources found'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}