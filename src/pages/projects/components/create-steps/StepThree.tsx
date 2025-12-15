import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Check, X, Loader2, Search, UserPlus, Copy, Plus, Pencil, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { projectService } from '../../services/projectService';
import { ProjectFormData, EmployeeMatch, AllocationPercentage, MonthlyManpower, MemberMonthlyAllocation as MonthlyAllocationType } from '../../types/projects';
import { toast } from 'sonner';
import { logActivity } from '@/services/activityLogger';
import { useAuth } from '@/hooks/useAuth';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
interface StepThreeProps {
  formData: ProjectFormData;
  setFormData: (data: ProjectFormData) => void;
  projectId?: string;
  initialExpandedMemberId?: string | null;
}
const ALLOCATION_OPTIONS: AllocationPercentage[] = [25, 50, 75, 100];
export default function StepThree({
  formData,
  setFormData,
  projectId,
  initialExpandedMemberId
}: StepThreeProps) {
  const {
    profile
  } = useAuth();
  const [matches, setMatches] = useState<EmployeeMatch[]>([]);
  const [assignedMemberProfiles, setAssignedMemberProfiles] = useState<EmployeeMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<EmployeeMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Track member addition timestamps for sorting
  const [memberAddTimestamps, setMemberAddTimestamps] = useState<Record<string, number>>({});

  // Track which members are in edit mode (expanded to show monthly allocations)
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set());

  // Auto-expand member when initialExpandedMemberId is provided
  useEffect(() => {
    if (initialExpandedMemberId) {
      setExpandedMembers(new Set([initialExpandedMemberId]));
    }
  }, [initialExpandedMemberId]);

  // Pending allocations for search results (userId -> { month -> allocation })
  const [pendingAllocations, setPendingAllocations] = useState<Record<string, Record<string, AllocationPercentage | null>>>({});

  // Apply to other months modal state
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyMemberId, setApplyMemberId] = useState<string | null>(null);
  const [applyAllocation, setApplyAllocation] = useState<AllocationPercentage>(100);
  const [selectedMonthsToApply, setSelectedMonthsToApply] = useState<string[]>([]);
  const monthlyLimits = formData.month_wise_manpower || [];
  useEffect(() => {
    if (formData.required_skills.length > 0) {
      loadMatches();
    } else {
      setLoading(false);
    }
  }, [formData.required_skills, selectedMonth]);

  // Create a stable key from member IDs for dependency tracking
  const memberIdsKey = formData.members.map(m => m.user_id).sort().join(',');

  // Load profiles for assigned members
  useEffect(() => {
    const loadAssignedMemberProfiles = async () => {
      const memberIds = formData.members.map(m => m.user_id);
      if (memberIds.length === 0) {
        setAssignedMemberProfiles([]);
        return;
      }
      try {
        const profiles = await projectService.getMemberProfiles(memberIds, selectedMonth);
        setAssignedMemberProfiles(profiles);
      } catch (error) {
        console.error('Error loading assigned member profiles:', error);
      }
    };
    loadAssignedMemberProfiles();
  }, [memberIdsKey, selectedMonth]);

  // Set default selected month when month_wise_manpower changes
  useEffect(() => {
    if (monthlyLimits.length > 0 && !selectedMonth) {
      const currentMonth = new Date().toISOString().substring(0, 7);
      const hasCurrentMonth = monthlyLimits.some(m => m.month === currentMonth);
      setSelectedMonth(hasCurrentMonth ? currentMonth : monthlyLimits[0].month);
    }
  }, [formData.month_wise_manpower, selectedMonth]);

  // Refresh pending allocations when members change (to update remaining capacity)
  useEffect(() => {
    if (searchResults.length > 0 && Object.keys(pendingAllocations).length > 0) {
      // Recalculate pending allocations to reflect updated remaining capacity
      const updatedPending: Record<string, Record<string, AllocationPercentage | null>> = {};
      for (const userId of Object.keys(pendingAllocations)) {
        const user = searchResults.find(u => u.user_id === userId);
        if (!user || isUserFullyAssigned(userId)) continue;
        updatedPending[userId] = {};
        for (const month of monthlyLimits) {
          const currentUsage = calculateMonthManpower(month.month, formData.members);
          const remainingCapacity = (month.limit - currentUsage) * 100;

          // If month is full, set to null
          if (remainingCapacity <= 0) {
            updatedPending[userId][month.month] = null;
          } else {
            // Keep existing allocation if still valid, otherwise find best valid one
            const existingAlloc = pendingAllocations[userId]?.[month.month];
            if (existingAlloc && existingAlloc <= remainingCapacity) {
              updatedPending[userId][month.month] = existingAlloc;
            } else {
              const bestAlloc = [100, 75, 50, 25].find(a => a <= remainingCapacity && a <= user.available_capacity) as AllocationPercentage | undefined;
              updatedPending[userId][month.month] = bestAlloc || null;
            }
          }
        }
      }

      // Only update if there are actual changes
      const hasChanges = JSON.stringify(updatedPending) !== JSON.stringify(pendingAllocations);
      if (hasChanges) {
        setPendingAllocations(updatedPending);
      }
    }
  }, [memberIdsKey]); // Trigger when member list changes

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm.trim().length >= 1) {
        handleSearch();
      } else {
        setSearchResults([]);
        setPendingAllocations({});
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  const loadMatches = async () => {
    try {
      setLoading(true);
      const data = await projectService.findMatchingEmployees(formData.required_skills, selectedMonth);
      setMatches(data);
    } catch (error) {
      console.error('Error loading matches:', error);
      toast.error('Failed to load employee matches');
    } finally {
      setLoading(false);
    }
  };
  const handleSearch = async () => {
    if (searchTerm.trim().length < 1) return;
    try {
      setSearching(true);
      // Search without month filter to get general user info
      const results = await projectService.searchUsers(searchTerm, '');
      setSearchResults(results);

      // Initialize pending allocations for each search result
      initializePendingAllocations(results);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  // Check if user already has an allocation for a specific month
  const getExistingAllocationForMonth = useCallback((userId: string, month: string): AllocationPercentage | null => {
    const member = formData.members.find(m => m.user_id === userId);
    if (!member) return null;
    const monthAlloc = member.monthly_allocations?.find(a => a.month === month);
    return monthAlloc?.allocation_percentage ?? null;
  }, [formData.members]);

  // Get count of already allocated months for a user
  const getAllocatedMonthsCount = useCallback((userId: string): number => {
    const member = formData.members.find(m => m.user_id === userId);
    if (!member) return 0;
    return (member.monthly_allocations || []).filter(a => 
      monthlyLimits.some(ml => ml.month === a.month) && 
      a.allocation_percentage !== null && 
      a.allocation_percentage !== undefined
    ).length;
  }, [formData.members, monthlyLimits]);

  // Get allocation status for a user (for UI label)
  const getAllocationStatus = useCallback((userId: string): 'none' | 'partial' | 'full' => {
    const allocatedCount = getAllocatedMonthsCount(userId);
    if (allocatedCount === 0) return 'none';
    if (allocatedCount >= monthlyLimits.length) return 'full';
    return 'partial';
  }, [getAllocatedMonthsCount, monthlyLimits.length]);

  // Initialize pending allocations with smart defaults based on limits
  const initializePendingAllocations = async (users: EmployeeMatch[]) => {
    const newPendingAllocations: Record<string, Record<string, AllocationPercentage | null>> = {};
    for (const user of users) {
      // Skip if already fully assigned
      if (isUserFullyAssigned(user.user_id)) continue;
      newPendingAllocations[user.user_id] = {};

      // For each month, get user's monthly availability and calculate best default
      for (const month of monthlyLimits) {
        // Check if this month is already allocated for this user
        const existingAllocation = getExistingAllocationForMonth(user.user_id, month.month);
        if (existingAllocation !== null) {
          // Month already allocated - set to null to indicate it's locked
          newPendingAllocations[user.user_id][month.month] = null;
          continue;
        }

        // Get user's availability for this specific month
        const monthlyAvailability = await getUserMonthlyAvailability(user.user_id, month.month);
        const projectRemaining = getMonthRemainingCapacity(month.month);

        // Find the best allocation (highest allowed)
        const bestAllocation = findBestAllocation(monthlyAvailability, projectRemaining);
        newPendingAllocations[user.user_id][month.month] = bestAllocation;
      }
    }
    setPendingAllocations(newPendingAllocations);
  };

  // Get user's available capacity for a specific month
  const getUserMonthlyAvailability = async (userId: string, month: string): Promise<number> => {
    try {
      const capacity = await projectService.getUserCapacity(userId, month);
      return capacity?.available || 100;
    } catch {
      return 100;
    }
  };

  // Get remaining project capacity for a month
  const getMonthRemainingCapacity = useCallback((month: string): number => {
    const monthConfig = monthlyLimits.find(m => m.month === month);
    if (!monthConfig) return 100;
    const currentUsage = calculateMonthManpower(month, formData.members);
    return (monthConfig.limit - currentUsage) * 100; // Convert to percentage
  }, [monthlyLimits, formData.members]);

  // Find the best allocation that fits within limits
  const findBestAllocation = (userAvailability: number, projectRemaining: number): AllocationPercentage | null => {
    // If project has no remaining capacity for this month, skip it entirely
    if (projectRemaining <= 0) return null;
    const maxAllowed = Math.min(userAvailability, projectRemaining);

    // Try from highest to lowest
    for (const alloc of [100, 75, 50, 25] as AllocationPercentage[]) {
      if (alloc <= maxAllowed) return alloc;
    }
    return null; // No valid allocation possible
  };

  // Get allowed allocations for a user for a specific month
  const getAllowedAllocations = useCallback((userId: string, month: string): AllocationPercentage[] => {
    const user = searchResults.find(u => u.user_id === userId);
    if (!user) return [];
    const monthConfig = monthlyLimits.find(m => m.month === month);
    if (!monthConfig) return ALLOCATION_OPTIONS;
    const currentUsage = calculateMonthManpower(month, formData.members);
    const projectRemaining = (monthConfig.limit - currentUsage) * 100;

    // If no remaining capacity, return empty array (month is full)
    if (projectRemaining <= 0) return [];

    // For simplicity, use user's overall available capacity
    // In production, you'd fetch month-specific availability
    const userAvailability = user.available_capacity;
    const maxAllowed = Math.min(userAvailability, projectRemaining);
    return ALLOCATION_OPTIONS.filter(alloc => alloc <= maxAllowed);
  }, [searchResults, monthlyLimits, formData.members]);

  // Format month for display
  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculate manpower for a specific month
  const calculateMonthManpower = useCallback((month: string, members: typeof formData.members) => {
    let total = 0;
    members.forEach(member => {
      const monthAllocation = member.monthly_allocations?.find(a => a.month === month);
      if (monthAllocation?.allocation_percentage) {
        total += monthAllocation.allocation_percentage / 100;
      }
    });
    return total;
  }, []);

  // Get manpower stats for selected month
  const getSelectedMonthStats = useCallback(() => {
    if (!selectedMonth || monthlyLimits.length === 0) return {
      used: 0,
      limit: null,
      remaining: null
    };
    const monthLimit = monthlyLimits.find(m => m.month === selectedMonth)?.limit;
    const currentUsed = calculateMonthManpower(selectedMonth, formData.members);
    return {
      used: currentUsed,
      limit: monthLimit ?? null,
      remaining: monthLimit !== undefined ? monthLimit - currentUsed : null
    };
  }, [formData.month_wise_manpower, formData.members, selectedMonth, calculateMonthManpower]);
  const {
    used: manpowerUsed,
    limit,
    remaining
  } = getSelectedMonthStats();

  // Check if user is already fully assigned to all months
  const isUserFullyAssigned = useCallback((userId: string) => {
    const member = formData.members.find(m => m.user_id === userId);
    if (!member) return false;

    // Check if assigned to all project months
    return monthlyLimits.every(m => {
      const monthAlloc = member.monthly_allocations?.find(a => a.month === m.month);
      return monthAlloc?.allocation_percentage !== null && monthAlloc?.allocation_percentage !== undefined;
    });
  }, [formData.members, monthlyLimits]);

  // Check if member is assigned to selected month
  const isMemberAssignedToMonth = useCallback((userId: string, month: string) => {
    const member = formData.members.find(m => m.user_id === userId);
    if (!member) return false;
    const monthAlloc = member.monthly_allocations?.find(a => a.month === month);
    return monthAlloc?.allocation_percentage !== null && monthAlloc?.allocation_percentage !== undefined;
  }, [formData.members]);

  // Get allocation for a member in a specific month
  const getMemberAllocationForMonth = useCallback((userId: string, month: string): AllocationPercentage | null => {
    const member = formData.members.find(m => m.user_id === userId);
    if (!member) return null;
    const monthAlloc = member.monthly_allocations?.find(a => a.month === month);
    return monthAlloc?.allocation_percentage ?? null;
  }, [formData.members]);

  // Get all assigned members sorted by addition time (newest first)
  const getAllAssignedMembers = useCallback(() => {
    // Return all members that have at least one monthly allocation
    const membersWithAllocations = formData.members.filter(member => {
      return member.monthly_allocations?.some(a => a.allocation_percentage !== null && a.allocation_percentage !== undefined);
    });

    // Sort by timestamp (newest first)
    return membersWithAllocations.sort((a, b) => {
      const timeA = memberAddTimestamps[a.user_id] || 0;
      const timeB = memberAddTimestamps[b.user_id] || 0;
      return timeB - timeA;
    });
  }, [formData.members, memberAddTimestamps]);

  // Toggle expanded state for a member
  const toggleMemberExpanded = (userId: string) => {
    setExpandedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  // Remove member completely from all months
  const removeMemberCompletely = (userId: string) => {
    const match = matches.find(m => m.user_id === userId) || searchResults.find(m => m.user_id === userId) || assignedMemberProfiles.find(m => m.user_id === userId);
    const updatedMembers = formData.members.filter(m => m.user_id !== userId);
    setFormData({
      ...formData,
      members: updatedMembers
    });
    setExpandedMembers(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
    toast.success(`Removed ${match?.full_name || 'member'} from project`);
    if (projectId) {
      logActivity({
        module: 'Projects',
        actionType: 'Remove Member',
        description: `Removed ${match?.full_name || 'member'} from all months`,
        recordReference: projectId,
        metadata: {
          user_id: userId
        }
      });
    }
  };

  // Update allocation for a member in a specific month (for expanded view)
  const updateMemberAllocationForSpecificMonth = (userId: string, month: string, allocation: AllocationPercentage | null) => {
    const member = formData.members.find(m => m.user_id === userId);
    if (!member) return;

    // Validate against monthly limit if setting an allocation
    if (allocation !== null) {
      const monthLimit = monthlyLimits.find(m => m.month === month)?.limit;
      if (monthLimit !== undefined) {
        const existingAlloc = member.monthly_allocations?.find(a => a.month === month)?.allocation_percentage || 0;
        const currentUsage = calculateMonthManpower(month, formData.members);
        const usageWithoutMember = currentUsage - existingAlloc / 100;
        const newUsage = usageWithoutMember + allocation / 100;
        if (newUsage > monthLimit) {
          toast.error(`Cannot update - would exceed ${formatMonth(month)} limit (${monthLimit})`);
          return;
        }
      }
    }
    const updatedMembers = formData.members.map(m => {
      if (m.user_id !== userId) return m;
      const existingAllocations = m.monthly_allocations || [];
      const monthExists = existingAllocations.some(a => a.month === month);
      const updatedAllocations = monthExists ? existingAllocations.map(a => a.month === month ? {
        ...a,
        allocation_percentage: allocation
      } : a) : allocation !== null ? [...existingAllocations, {
        month,
        allocation_percentage: allocation
      }] : existingAllocations;
      return {
        ...m,
        monthly_allocations: updatedAllocations
      };
    });
    setFormData({
      ...formData,
      members: updatedMembers
    });
  };

  // Update pending allocation for a user/month
  const updatePendingAllocation = (userId: string, month: string, allocation: AllocationPercentage | null) => {
    setPendingAllocations(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        [month]: allocation
      }
    }));
  };

  // Add member with all pending allocations
  const addMemberWithAllocations = async (userId: string) => {
    const userPendingAllocations = pendingAllocations[userId];
    if (!userPendingAllocations) {
      toast.error('No allocations set for this member');
      return;
    }

    // Build allocations - automatically skip months that are already allocated or full
    const allocationsToApply: MonthlyAllocationType[] = [];
    const skippedMonths: string[] = [];
    const alreadyAllocatedMonths: string[] = [];
    
    for (const month of monthlyLimits) {
      // Check if this month is already allocated for this user
      const existingAllocation = getExistingAllocationForMonth(userId, month.month);
      if (existingAllocation !== null) {
        alreadyAllocatedMonths.push(formatMonth(month.month));
        continue; // Skip months that are already allocated
      }

      let allocation = userPendingAllocations[month.month];

      // Check current remaining capacity for this month
      const currentUsage = calculateMonthManpower(month.month, formData.members);
      const remainingCapacity = (month.limit - currentUsage) * 100;

      // If month is full (remaining <= 0), skip it automatically
      if (remainingCapacity <= 0) {
        skippedMonths.push(formatMonth(month.month));
        continue;
      }

      // If no allocation set, skip
      if (allocation === null || allocation === undefined) {
        continue;
      }

      // If allocation exceeds remaining, try to find a valid allocation or skip
      if (allocation > remainingCapacity) {
        // Try to find the best valid allocation
        const validAllocation = [100, 75, 50, 25].find(a => a <= remainingCapacity) as AllocationPercentage | undefined;
        if (validAllocation) {
          allocation = validAllocation;
        } else {
          skippedMonths.push(formatMonth(month.month));
          continue;
        }
      }
      allocationsToApply.push({
        month: month.month,
        allocation_percentage: allocation
      });
    }
    if (allocationsToApply.length === 0) {
      toast.error('No valid months available for allocation. All months are at capacity.');
      return;
    }

    // Find match info
    const match = searchResults.find(m => m.user_id === userId);
    if (!match) return;

    // Check if member already exists
    const existingMemberIndex = formData.members.findIndex(m => m.user_id === userId);
    let newMembers: typeof formData.members;
    if (existingMemberIndex >= 0) {
      // Update existing member
      newMembers = formData.members.map((m, idx) => {
        if (idx !== existingMemberIndex) return m;
        let updatedAllocations = [...(m.monthly_allocations || [])];
        for (const newAlloc of allocationsToApply) {
          const monthExists = updatedAllocations.some(a => a.month === newAlloc.month);
          if (monthExists) {
            updatedAllocations = updatedAllocations.map(a => a.month === newAlloc.month ? newAlloc : a);
          } else {
            updatedAllocations.push(newAlloc);
          }
        }
        return {
          ...m,
          monthly_allocations: updatedAllocations
        };
      });
    } else {
      // Add new member
      newMembers = [...formData.members, {
        user_id: userId,
        allocation_percentage: allocationsToApply[0]?.allocation_percentage || 100,
        monthly_allocations: allocationsToApply
      }];
    }

    // Update timestamps for sorting
    setMemberAddTimestamps(prev => ({
      ...prev,
      [userId]: Date.now()
    }));

    // Update form data
    setFormData({
      ...formData,
      members: newMembers
    });

    // Clear this user from search results display (they're now assigned)
    setPendingAllocations(prev => {
      const newPending = {
        ...prev
      };
      delete newPending[userId];
      return newPending;
    });
    const skippedMsg = skippedMonths.length > 0 ? ` (skipped ${skippedMonths.length} full month(s))` : '';
    toast.success(`Added ${match.full_name} with allocations for ${allocationsToApply.length} month(s)${skippedMsg}`);

    // Log activity
    if (projectId) {
      logActivity({
        module: 'Projects',
        actionType: 'Add Member',
        description: `Added ${match.full_name} to project with allocations for ${allocationsToApply.length} months`,
        recordReference: projectId,
        metadata: {
          user_id: userId,
          allocations: allocationsToApply
        }
      });
    }
  };

  // Remove member from a specific month only
  const removeMemberFromMonth = (userId: string, month: string, silent = false) => {
    const member = formData.members.find(m => m.user_id === userId);
    const match = matches.find(m => m.user_id === userId) || searchResults.find(m => m.user_id === userId) || assignedMemberProfiles.find(m => m.user_id === userId);
    if (!member) return;

    // Update member's monthly allocations - set to null for this month
    const updatedMembers = formData.members.map(m => {
      if (m.user_id !== userId) return m;
      const updatedAllocations = (m.monthly_allocations || []).map(a => a.month === month ? {
        ...a,
        allocation_percentage: null
      } : a);
      return {
        ...m,
        monthly_allocations: updatedAllocations
      };
    });

    // Check if member has any remaining month allocations
    const memberAfterUpdate = updatedMembers.find(m => m.user_id === userId);
    const hasAnyAllocation = memberAfterUpdate?.monthly_allocations?.some(a => a.allocation_percentage !== null && a.allocation_percentage !== undefined);

    // If no allocations remain, remove member entirely
    const finalMembers = hasAnyAllocation ? updatedMembers : updatedMembers.filter(m => m.user_id !== userId);
    setFormData({
      ...formData,
      members: finalMembers
    });
    if (!silent) {
      toast.success(`Removed ${match?.full_name || 'member'} from ${formatMonth(month)}`);
      if (projectId) {
        logActivity({
          module: 'Projects',
          actionType: 'Remove Member',
          description: `Removed ${match?.full_name || 'member'} from ${formatMonth(month)}`,
          recordReference: projectId,
          metadata: {
            user_id: userId,
            month
          }
        });
      }
    }
  };

  // Update allocation for a member in selected month
  const updateMemberAllocationForMonth = (userId: string, allocation: AllocationPercentage) => {
    if (!selectedMonth) return;
    const member = formData.members.find(m => m.user_id === userId);
    if (!member) return;
    const currentMonthAlloc = member.monthly_allocations?.find(a => a.month === selectedMonth);
    const oldAllocation = currentMonthAlloc?.allocation_percentage || 0;
    const allocationDiff = allocation - oldAllocation;

    // Validate against monthly limit
    const selectedMonthLimit = monthlyLimits.find(m => m.month === selectedMonth)?.limit;
    if (selectedMonthLimit !== undefined) {
      const currentMonthUsage = calculateMonthManpower(selectedMonth, formData.members);
      const newMonthUsage = currentMonthUsage + allocationDiff / 100;
      if (newMonthUsage > selectedMonthLimit) {
        toast.error(`Cannot update allocation - would exceed ${formatMonth(selectedMonth)} limit`);
        return;
      }
    }
    const updatedMembers = formData.members.map(m => {
      if (m.user_id !== userId) return m;
      const existingAllocations = m.monthly_allocations || [];
      const monthExists = existingAllocations.some(a => a.month === selectedMonth);
      const updatedAllocations = monthExists ? existingAllocations.map(a => a.month === selectedMonth ? {
        ...a,
        allocation_percentage: allocation
      } : a) : [...existingAllocations, {
        month: selectedMonth,
        allocation_percentage: allocation
      }];
      return {
        ...m,
        monthly_allocations: updatedAllocations
      };
    });
    setFormData({
      ...formData,
      members: updatedMembers
    });
  };

  // Open "Apply to other months" modal
  const openApplyModal = (userId: string, currentAllocation: AllocationPercentage) => {
    setApplyMemberId(userId);
    setApplyAllocation(currentAllocation);
    setSelectedMonthsToApply([]);
    setApplyModalOpen(true);
  };

  // Apply allocation to selected months
  const applyToOtherMonths = () => {
    if (!applyMemberId || selectedMonthsToApply.length === 0) {
      toast.error('Select at least one month to apply');
      return;
    }
    const match = matches.find(m => m.user_id === applyMemberId) || searchResults.find(m => m.user_id === applyMemberId) || assignedMemberProfiles.find(m => m.user_id === applyMemberId);

    // Validate all selected months before applying
    const errors: string[] = [];
    for (const month of selectedMonthsToApply) {
      const monthLimit = monthlyLimits.find(m => m.month === month)?.limit;
      if (monthLimit !== undefined) {
        const existingMember = formData.members.find(m => m.user_id === applyMemberId);
        const existingAlloc = existingMember?.monthly_allocations?.find(a => a.month === month)?.allocation_percentage || 0;
        const currentUsage = calculateMonthManpower(month, formData.members);
        const usageWithoutMember = currentUsage - existingAlloc / 100;
        const newUsage = usageWithoutMember + applyAllocation / 100;
        if (newUsage > monthLimit) {
          errors.push(`${formatMonth(month)}: would exceed limit (${monthLimit})`);
        }
      }
    }
    if (errors.length > 0) {
      toast.error(`Cannot apply to some months:\n${errors.join('\n')}`);
      return;
    }

    // Apply allocation to all selected months
    const updatedMembers = formData.members.map(m => {
      if (m.user_id !== applyMemberId) return m;
      let updatedAllocations = [...(m.monthly_allocations || [])];
      for (const month of selectedMonthsToApply) {
        const monthExists = updatedAllocations.some(a => a.month === month);
        if (monthExists) {
          updatedAllocations = updatedAllocations.map(a => a.month === month ? {
            ...a,
            allocation_percentage: applyAllocation
          } : a);
        } else {
          updatedAllocations.push({
            month,
            allocation_percentage: applyAllocation
          });
        }
      }
      return {
        ...m,
        monthly_allocations: updatedAllocations
      };
    });

    // Update timestamps
    setMemberAddTimestamps(prev => ({
      ...prev,
      [applyMemberId]: Date.now()
    }));
    setFormData({
      ...formData,
      members: updatedMembers
    });
    toast.success(`Applied ${applyAllocation}% allocation for ${match?.full_name || 'member'} to ${selectedMonthsToApply.length} month(s)`);
    setApplyModalOpen(false);
    setApplyMemberId(null);
    setSelectedMonthsToApply([]);
  };
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
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'tech_lead':
        return 'default';
      case 'employee':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Render search result card with month-wise allocation row
  const renderSearchResultCard = (match: EmployeeMatch) => {
    const userPending = pendingAllocations[match.user_id] || {};
    const allocationStatus = getAllocationStatus(match.user_id);
    const allocatedMonthsCount = getAllocatedMonthsCount(match.user_id);
    
    // Check if there are any unallocated months with valid capacity
    const hasAnyValidNewAllocation = monthlyLimits.some(month => {
      const existingAllocation = getExistingAllocationForMonth(match.user_id, month.month);
      if (existingAllocation !== null) return false; // Already allocated
      const pendingValue = userPending[month.month];
      return pendingValue !== null && pendingValue !== undefined;
    });

    const isFullyAllocated = allocationStatus === 'full';
    
    return <div key={match.user_id} className={`border rounded-lg p-4 bg-card min-h-[120px] ${isFullyAllocated ? 'opacity-60' : ''}`}>
        {/* User info row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">{match.full_name}</span>
            {allocationStatus === 'full' && (
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-primary/20 text-primary">
                Already added (all months)
              </Badge>
            )}
            {allocationStatus === 'partial' && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-yellow-500 text-yellow-600">
                Partially allocated ({allocatedMonthsCount}/{monthlyLimits.length})
              </Badge>
            )}
          </div>
          <Button 
            size="sm" 
            variant="default" 
            className="h-6 px-2 text-xs" 
            onClick={() => addMemberWithAllocations(match.user_id)} 
            disabled={!hasAnyValidNewAllocation || isFullyAllocated}
            title={isFullyAllocated ? 'User is already allocated for all months' : !hasAnyValidNewAllocation ? 'No available months to allocate' : undefined}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Member
          </Button>
        </div>

        {/* Month-wise allocation row */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {monthlyLimits.map(month => {
            const existingAllocation = getExistingAllocationForMonth(match.user_id, month.month);
            const isAlreadyAllocated = existingAllocation !== null;
            const allowedOptions = isAlreadyAllocated ? [] : getAllowedAllocations(match.user_id, month.month);
            const currentValue = isAlreadyAllocated ? existingAllocation : userPending[month.month];
            const isDisabled = isAlreadyAllocated || allowedOptions.length === 0;
            const monthUsage = calculateMonthManpower(month.month, formData.members);
            const monthRemaining = month.limit - monthUsage;
            
            return <div 
              key={month.month} 
              className={`flex-shrink-0 border rounded p-1.5 min-w-[90px] ${
                isAlreadyAllocated 
                  ? 'bg-primary/10 border-primary/30' 
                  : isDisabled 
                    ? 'opacity-50 bg-muted' 
                    : 'bg-background'
              }`}
            >
              <div className="text-xs font-semibold text-center mb-1 truncate text-foreground">
                {formatMonth(month.month)}
              </div>
              <div className="text-[11px] text-foreground/70 text-center mb-1 font-medium">
                Rem: {monthRemaining.toFixed(2)}
              </div>
              {isAlreadyAllocated ? (
                <div 
                  className="h-6 flex items-center justify-center text-[10px] font-medium text-primary bg-primary/5 rounded border border-primary/20"
                  title="Already allocated for this month"
                >
                  {existingAllocation}% ✓
                </div>
              ) : (
                <Select 
                  value={currentValue?.toString() || ''} 
                  onValueChange={val => updatePendingAllocation(match.user_id, month.month, val ? Number(val) as AllocationPercentage : null)} 
                  disabled={isDisabled}
                >
                  <SelectTrigger 
                    className="h-6 text-[10px] px-1" 
                    title={isDisabled ? 'No capacity available for this month' : undefined}
                  >
                    <SelectValue placeholder={isDisabled ? 'Full' : 'Select'} />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedOptions.map(opt => (
                      <SelectItem key={opt} value={opt.toString()} className="text-xs">
                        {opt}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>;
          })}
        </div>
      </div>;
  };
  if (loading) {
    return <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>;
  }
  const allAssignedMembers = getAllAssignedMembers();
  return <div className="space-y-2 h-full flex flex-col min-h-0">
      {/* Search Bar at Top */}
      <div className="flex-shrink-0">
        
        <div className="relative w-1/2">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search by name, email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-7 h-9 text-xs" />
          {searching && <Loader2 className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
      </div>

      {/* Search Results - show with month-wise allocation */}
      {searchTerm.trim().length >= 1 && <div className="flex-shrink-0 max-h-[400px] overflow-y-auto space-y-1.5 border rounded-lg p-1.5 bg-muted/30">
          {searching ? (
            <div className="text-center py-3 text-xs text-muted-foreground">Searching...</div>
          ) : searchResults.length > 0 ? (
            // Show all users including partially allocated ones, but not fully assigned
            searchResults.map(match => renderSearchResultCard(match))
          ) : (
            <div className="text-center py-3 text-xs text-muted-foreground">No users found</div>
          )}
        </div>}


      {/* All Assigned Members - collapsed by default */}
      <div className="flex-1 min-h-0 flex flex-col">
        <h3 className="mb-0.5 flex items-center gap-1 flex-shrink-0 font-medium text-lg">
          
          Assigned Members ({allAssignedMembers.length})
        </h3>
        {allAssignedMembers.length === 0 ? <p className="text-muted-foreground text-sm">No members assigned yet</p> : <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-1">
            {allAssignedMembers.map(member => {
          const match = matches.find(m => m.user_id === member.user_id) || searchResults.find(m => m.user_id === member.user_id) || assignedMemberProfiles.find(m => m.user_id === member.user_id);
          if (!match) return null;
          const isExpanded = expandedMembers.has(member.user_id);
          const totalMonths = monthlyLimits.length;
          const allocatedMonthsCount = member.monthly_allocations?.filter(a => monthlyLimits.some(ml => ml.month === a.month) && a.allocation_percentage !== null && a.allocation_percentage !== undefined && a.allocation_percentage > 0).length || 0;
          return <div key={member.user_id} className="border rounded bg-muted/30">
                {/* Collapsed View - Just name + edit + delete */}
                <div className="p-2 grid grid-cols-3 items-center cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleMemberExpanded(member.user_id)}>
                  <p className="text-sm font-medium truncate">{match.full_name}</p>
                  
                  <span className="text-xs text-muted-foreground text-center">
                    ({allocatedMonthsCount}/{totalMonths} month{totalMonths !== 1 ? 's' : ''})
                  </span>
                  
                  <div className="flex items-center gap-1 justify-end">
                    <span className="h-6 w-6 flex items-center justify-center">
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </span>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-destructive/20 hover:text-destructive" onClick={e => {
                  e.stopPropagation();
                  removeMemberCompletely(member.user_id);
                }} title="Remove from project">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                
                {/* Expanded View - Month-wise allocations */}
                {isExpanded && <div className="px-2 pb-2 pt-1 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Monthly Allocations:</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {monthlyLimits.map(month => {
                  const monthAlloc = member.monthly_allocations?.find(a => a.month === month.month);
                  const currentAllocation = monthAlloc?.allocation_percentage;
                  const monthUsage = calculateMonthManpower(month.month, formData.members);
                  const existingAlloc = currentAllocation || 0;
                  const usageWithoutMember = monthUsage - existingAlloc / 100;
                  return <div key={month.month} className="border rounded p-1.5 min-w-[100px] bg-background">
                            <div className="text-[10px] font-medium text-center mb-1">
                              {formatMonth(month.month)}
                            </div>
                            <div className="text-[9px] text-muted-foreground text-center mb-1">
                              Limit: {month.limit} | Used: {monthUsage.toFixed(2)}
                            </div>
                            <Select value={currentAllocation?.toString() || 'none'} onValueChange={val => {
                      if (val === 'none') {
                        updateMemberAllocationForSpecificMonth(member.user_id, month.month, null);
                      } else {
                        updateMemberAllocationForSpecificMonth(member.user_id, month.month, Number(val) as AllocationPercentage);
                      }
                    }}>
                              <SelectTrigger className="h-6 text-[10px] px-1">
                                <SelectValue placeholder="Not set" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none" className="text-xs">Not set</SelectItem>
                                {ALLOCATION_OPTIONS.map(opt => {
                          const newUsage = usageWithoutMember + opt / 100;
                          const wouldExceed = newUsage > month.limit;
                          return <SelectItem key={opt} value={opt.toString()} className="text-xs" disabled={wouldExceed}>
                                      {opt}%{wouldExceed ? ' (exceeds)' : ''}
                                    </SelectItem>;
                        })}
                              </SelectContent>
                            </Select>
                          </div>;
                })}
                    </div>
                  </div>}
              </div>;
        })}
          </div>}
      </div>

      {/* Apply to Other Months Modal */}
      <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Apply Allocation to Other Months</DialogTitle>
            <DialogDescription className="text-xs">
              Select which months to apply {applyAllocation}% allocation.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-2">
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {monthlyLimits.map(m => {
              const isSelected = selectedMonthsToApply.includes(m.month);
              const currentUsage = calculateMonthManpower(m.month, formData.members);
              const existingAlloc = applyMemberId ? formData.members.find(mem => mem.user_id === applyMemberId)?.monthly_allocations?.find(a => a.month === m.month)?.allocation_percentage || 0 : 0;
              const usageWithoutMember = currentUsage - existingAlloc / 100;
              const wouldExceed = usageWithoutMember + applyAllocation / 100 > m.limit;
              return <div key={m.month} className={`flex items-center gap-2 p-2 rounded border ${wouldExceed ? 'opacity-50 bg-destructive/10' : ''}`}>
                    <Checkbox id={m.month} checked={isSelected} disabled={wouldExceed} onCheckedChange={checked => {
                  if (checked) {
                    setSelectedMonthsToApply([...selectedMonthsToApply, m.month]);
                  } else {
                    setSelectedMonthsToApply(selectedMonthsToApply.filter(month => month !== m.month));
                  }
                }} />
                    <label htmlFor={m.month} className="flex-1 text-xs cursor-pointer">
                      <div className="font-medium">{formatMonth(m.month)}</div>
                      <div className="text-muted-foreground">
                        Limit: {m.limit} | Used: {currentUsage.toFixed(2)}
                        {wouldExceed && <span className="text-destructive ml-1">(would exceed)</span>}
                      </div>
                    </label>
                  </div>;
            })}
            </div>
            
            {monthlyLimits.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No months available</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setApplyModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={applyToOtherMonths} disabled={selectedMonthsToApply.length === 0}>
              Apply to {selectedMonthsToApply.length} month(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
}