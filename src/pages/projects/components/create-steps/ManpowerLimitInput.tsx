import { useState, useEffect, useMemo, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { MonthlyManpower, MemberMonthlyAllocation } from '../../types/projects';
import { format, startOfMonth, addMonths, isBefore, isEqual } from 'date-fns';
import { dateFormatters } from "@/utils/formatters";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface MemberWithAllocations {
  user_id: string;
  full_name: string;
  monthly_allocations?: MemberMonthlyAllocation[];
}

interface ManpowerLimitInputProps {
  startDate?: string;
  endDate?: string;
  monthlyLimits: MonthlyManpower[];
  onChange: (limits: MonthlyManpower[]) => void;
  readOnly?: boolean;
  existingMembers?: MemberWithAllocations[];
  onDataRemovalConfirmed?: (affectedMonths: string[]) => void;
  formMembers?: { user_id: string; monthly_allocations?: MemberMonthlyAllocation[] }[];
}

interface AffectedData {
  month: string;
  monthLabel: string;
  members: { user_id: string; full_name: string; allocation: number }[];
}

// Helper to generate month list from date range
function generateMonthList(startDate: string, endDate: string): string[] {
  const start = startOfMonth(new Date(startDate));
  const end = startOfMonth(new Date(endDate));
  const monthList: string[] = [];
  let current = start;
  while (isBefore(current, end) || isEqual(current, end)) {
    monthList.push(format(current, 'yyyy-MM'));
    current = addMonths(current, 1);
  }
  return monthList;
}

export default function ManpowerLimitInput({
  startDate,
  endDate,
  monthlyLimits,
  onChange,
  readOnly = false,
  existingMembers = [],
  onDataRemovalConfirmed,
  formMembers = []
}: ManpowerLimitInputProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingLimits, setPendingLimits] = useState<MonthlyManpower[]>([]);
  const [affectedData, setAffectedData] = useState<AffectedData[]>([]);
  
  // Track if this is the initial mount to avoid resetting existing data
  const isInitialMount = useRef(true);
  const prevDatesRef = useRef({ startDate, endDate });

  // Calculate months from date range
  const months = useMemo(() => {
    if (!startDate || !endDate) return [];
    return generateMonthList(startDate, endDate);
  }, [startDate, endDate]);

  // Calculate which months have allocation data from form members
  // This uses formMembers as the source of truth (which reflects current state including edits)
  const getMonthsWithData = (): Map<string, { user_id: string; full_name: string; allocation: number }[]> => {
    const dataMap = new Map<string, { user_id: string; full_name: string; allocation: number }[]>();
    
    formMembers.forEach(member => {
      const memberProfile = existingMembers.find(m => m.user_id === member.user_id);
      const fullName = memberProfile?.full_name || 'Unknown';
      
      if (member.monthly_allocations) {
        member.monthly_allocations.forEach(alloc => {
          if (alloc.allocation_percentage && alloc.allocation_percentage > 0) {
            const existing = dataMap.get(alloc.month) || [];
            existing.push({
              user_id: member.user_id,
              full_name: fullName,
              allocation: alloc.allocation_percentage
            });
            dataMap.set(alloc.month, existing);
          }
        });
      }
    });
    
    return dataMap;
  };

  // Calculate current allocation for each month (from both existing and form members)
  // IMPORTANT: Only count allocations for months that are in the current project configuration
  const getCurrentMonthAllocations = useMemo(() => {
    const allocationMap = new Map<string, number>();
    
    // Get the set of valid months from the current project configuration
    const validMonthsSet = new Set(monthlyLimits.map(l => l.month));
    
    // Use formMembers as the source of truth for allocations (includes both existing and new)
    // This avoids double-counting and ensures we only show allocations that are currently in the form
    formMembers.forEach(member => {
      if (member.monthly_allocations) {
        member.monthly_allocations.forEach(alloc => {
          // Only count allocations for months that are in the current project configuration
          if (alloc.allocation_percentage && alloc.allocation_percentage > 0 && validMonthsSet.has(alloc.month)) {
            const current = allocationMap.get(alloc.month) || 0;
            allocationMap.set(alloc.month, current + alloc.allocation_percentage / 100);
          }
        });
      }
    });
    
    return allocationMap;
  }, [formMembers, monthlyLimits]);

  // Check if new month list would remove months with data
  const checkForDataLoss = (newMonths: string[]): AffectedData[] => {
    const dataMap = getMonthsWithData();
    const affectedMonths: AffectedData[] = [];
    
    // Find months that have data but are not in the new month list
    dataMap.forEach((members, month) => {
      if (!newMonths.includes(month) && members.length > 0) {
        affectedMonths.push({
          month,
          monthLabel: dateFormatters.formatMonthYear(month + '-01'),
          members
        });
      }
    });
    
    return affectedMonths;
  };

  // Sync months with monthly limits - preserve existing values, add new ones
  useEffect(() => {
    if (!startDate || !endDate) {
      // No dates - clear everything only if limits exist
      if (monthlyLimits.length > 0) {
        onChange([]);
      }
      return;
    }

    const newMonths = generateMonthList(startDate, endDate);
    const datesChanged = prevDatesRef.current.startDate !== startDate || prevDatesRef.current.endDate !== endDate;
    prevDatesRef.current = { startDate, endDate };

    // On initial mount, just ensure we have limits for all months (preserve existing values)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      
      // If we already have limits, preserve them but ensure all months are covered
      if (monthlyLimits.length > 0) {
        const existingMonthSet = new Set(monthlyLimits.map(l => l.month));
        const missingMonths = newMonths.filter(m => !existingMonthSet.has(m));
        
        if (missingMonths.length > 0) {
          // Add missing months with limit 0
          const updatedLimits = [
            ...monthlyLimits.filter(l => newMonths.includes(l.month)),
            ...missingMonths.map(month => ({ month, limit: 0 }))
          ].sort((a, b) => a.month.localeCompare(b.month));
          onChange(updatedLimits);
        }
        return;
      }
      
      // No existing limits - initialize with zeros for all months
      const initialLimits = newMonths.map(month => ({ month, limit: 0 }));
      onChange(initialLimits);
      return;
    }

    // Dates changed after initial mount - check for data loss
    if (datesChanged && existingMembers.length > 0) {
      const affected = checkForDataLoss(newMonths);
      
      if (affected.length > 0) {
        // There's data that would be lost - show confirmation
        setAffectedData(affected);
        
        // Prepare the new limits for after confirmation
        const newLimits = newMonths.map(month => {
          const existing = monthlyLimits.find(l => l.month === month);
          return existing || { month, limit: 0 };
        });
        setPendingLimits(newLimits);
        setShowConfirmDialog(true);
        return;
      }
    }

    // No data loss - update limits preserving existing values
    const updatedLimits = newMonths.map(month => {
      const existing = monthlyLimits.find(l => l.month === month);
      return existing || { month, limit: 0 };
    });
    
    // Only update if there's an actual change
    const limitsChanged = JSON.stringify(updatedLimits) !== JSON.stringify(monthlyLimits);
    if (limitsChanged) {
      onChange(updatedLimits);
    }
  }, [startDate, endDate]);

  const handleConfirmRemoval = () => {
    // Notify parent about affected months so it can clean up member allocations
    if (onDataRemovalConfirmed) {
      onDataRemovalConfirmed(affectedData.map(d => d.month));
    }
    
    // Now proceed with the update
    onChange(pendingLimits);
    setShowConfirmDialog(false);
    setAffectedData([]);
    setPendingLimits([]);
  };

  const handleCancelRemoval = () => {
    // User cancelled - don't update anything
    setShowConfirmDialog(false);
    setAffectedData([]);
    setPendingLimits([]);
  };

  const handleLimitChange = (month: string, value: string) => {
    const limit = parseFloat(value) || 0;
    const updatedLimits = monthlyLimits.map(l => l.month === month ? {
      ...l,
      limit
    } : l);
    onChange(updatedLimits);
  };

  if (months.length === 0) {
    return null;
  }

  return (
    <>
      <div className="space-y-1.5 pb-4">
        <Label className="text-xs font-medium">Monthly Manpower Limits</Label>
        <div className="grid gap-1.5 grid-cols-3 sm:grid-cols-4 lg:grid-cols-6">
          {months.map(month => {
            const limit = monthlyLimits.find(l => l.month === month)?.limit || 0;
            const currentAllocation = getCurrentMonthAllocations.get(month) || 0;
            const isOverLimit = currentAllocation > limit && limit > 0;
            const isNearLimit = currentAllocation >= limit * 0.9 && currentAllocation <= limit && limit > 0;
            
            return (
              <Tooltip key={month}>
                <TooltipTrigger asChild>
                  <Card 
                    className={cn(
                      "p-1.5 flex flex-col items-center justify-center gap-1 transition-colors",
                      isOverLimit && "border-destructive bg-destructive/10",
                      isNearLimit && "border-amber-500 bg-amber-500/10"
                    )}
                  >
                    <span className="text-[10px] font-medium text-center whitespace-nowrap">
                      {dateFormatters.formatMonthYear(month + '-01')}
                    </span>
                    <Input
                      type="number"
                      step="0.25"
                      min="0"
                      placeholder="0.0"
                      value={limit || ''}
                      onChange={e => handleLimitChange(month, e.target.value)}
                      className={cn(
                        "h-6 text-xs px-1.5 text-center w-full",
                        isOverLimit && "border-destructive text-destructive",
                        isNearLimit && "border-amber-500"
                      )}
                      disabled={readOnly}
                    />
                    <span className={cn(
                      "text-[9px]",
                      isOverLimit ? "text-destructive font-medium" : "text-muted-foreground"
                    )}>
                      {currentAllocation.toFixed(2)} used
                    </span>
                  </Card>
                </TooltipTrigger>
                {isOverLimit && (
                  <TooltipContent className="max-w-xs">
                    <p className="text-destructive font-medium">
                      Current allocation ({currentAllocation.toFixed(2)}) exceeds the limit ({limit})
                    </p>
                    <p className="text-sm mt-1">
                      Reduce member allocations or increase the limit before saving.
                    </p>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Data Will Be Removed
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Changing the project dates will remove the following months that have member allocations:
                </p>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {affectedData.map(data => (
                    <div key={data.month} className="bg-muted p-3 rounded-md">
                      <p className="font-medium text-foreground">{data.monthLabel}</p>
                      <ul className="mt-1 text-sm space-y-1">
                        {data.members.map(member => (
                          <li key={member.user_id} className="flex justify-between">
                            <span>{member.full_name}</span>
                            <span className="text-muted-foreground">{member.allocation}% allocated</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <p className="text-destructive font-medium">
                  This action cannot be undone. All allocation data for these months will be permanently removed.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelRemoval}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemoval}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Data & Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
