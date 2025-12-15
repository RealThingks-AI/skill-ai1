import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Calendar, AlertCircle } from 'lucide-react';
import { AllocationPercentage, MonthlyManpower, MemberMonthlyAllocation as MonthlyAllocationData } from '../../types/projects';
import { format, parse } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface MemberMonthlyAllocationProps {
  userId: string;
  memberName: string;
  monthlyManpower: MonthlyManpower[];
  monthlyAllocations: MonthlyAllocationData[];
  currentAllocation: AllocationPercentage;
  onAllocationChange: (month: string, allocation: AllocationPercentage | null) => void;
  userRole?: string;
}

const ALLOCATION_OPTIONS: AllocationPercentage[] = [25, 50, 75, 100];

export default function MemberMonthlyAllocation({
  userId,
  memberName,
  monthlyManpower,
  monthlyAllocations,
  currentAllocation,
  onAllocationChange,
  userRole = 'employee'
}: MemberMonthlyAllocationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const canEdit = ['tech_lead', 'management', 'admin'].includes(userRole);
  const canOverride = ['management', 'admin'].includes(userRole);

  // Get current month in YYYY-MM format
  const currentMonth = format(new Date(), 'yyyy-MM');

  // Get allocation for a specific month
  const getAllocationForMonth = (month: string): AllocationPercentage | null => {
    // For current month, use the current allocation
    if (month === currentMonth) {
      return currentAllocation;
    }
    const monthAlloc = monthlyAllocations.find(a => a.month === month);
    return monthAlloc?.allocation_percentage ?? null;
  };

  // Get manpower limit for a specific month
  const getManpowerLimit = (month: string): number | null => {
    const monthManpower = monthlyManpower.find(m => m.month === month);
    return monthManpower?.limit ?? null;
  };

  // Format month for display
  const formatMonth = (month: string): string => {
    try {
      const date = parse(month, 'yyyy-MM', new Date());
      return format(date, 'MMM-yyyy');
    } catch {
      return month;
    }
  };

  // Check if allocation exceeds limit
  const exceedsLimit = (month: string, allocation: AllocationPercentage): boolean => {
    const limit = getManpowerLimit(month);
    if (limit === null) return false;
    // Convert allocation to decimal (e.g., 25% -> 0.25) and compare with limit
    return (allocation / 100) > limit;
  };

  // Get max allowed allocation for a month based on limit
  const getMaxAllowed = (month: string): AllocationPercentage | null => {
    const limit = getManpowerLimit(month);
    if (limit === null) return 100;
    const maxPercent = limit * 100;
    if (maxPercent >= 100) return 100;
    if (maxPercent >= 75) return 75;
    if (maxPercent >= 50) return 50;
    if (maxPercent >= 25) return 25;
    return null;
  };

  // Calculate total allocation across all months
  const totalMonthlyAllocation = monthlyAllocations.reduce((sum, a) => sum + (a.allocation_percentage || 0), 0);
  const avgAllocation = monthlyManpower.length > 0 
    ? Math.round(totalMonthlyAllocation / monthlyManpower.length) 
    : currentAllocation;

  if (monthlyManpower.length === 0) {
    return null;
  }

  return (
    <div className="mt-1">
      <Button
        variant="ghost"
        size="sm"
        className="h-5 text-[10px] px-1 gap-0.5"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <Calendar className="h-3 w-3" />
        Monthly Allocation
        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>

      {isExpanded && (
        <div className="mt-1 p-2 bg-muted/30 rounded border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-muted-foreground">Month-wise Allocation</span>
            <Badge variant="outline" className="text-[9px] h-4">
              Avg: {avgAllocation}%
            </Badge>
          </div>
          
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {monthlyManpower.map(({ month, limit }) => {
              const currentValue = getAllocationForMonth(month);
              const maxAllowed = getMaxAllowed(month);
              const isCurrentMonth = month === currentMonth;
              const hasError = currentValue !== null && exceedsLimit(month, currentValue);

              return (
                <div 
                  key={month} 
                  className={`flex-shrink-0 p-1.5 rounded border min-w-[80px] ${
                    hasError ? 'border-destructive bg-destructive/10' : 'bg-background'
                  } ${isCurrentMonth ? 'ring-1 ring-primary' : ''}`}
                >
                  <div className="text-[9px] font-medium text-center mb-0.5">
                    {formatMonth(month)}
                    {isCurrentMonth && <span className="text-primary ml-0.5">*</span>}
                  </div>
                  <div className="text-[8px] text-muted-foreground text-center mb-1">
                    Limit: {limit}
                  </div>
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <select
                            value={currentValue ?? ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              onAllocationChange(month, val ? Number(val) as AllocationPercentage : null);
                            }}
                            disabled={!canEdit || (isCurrentMonth && !canOverride)}
                            className={`w-full text-[10px] border rounded px-1 py-0.5 bg-background ${
                              hasError ? 'border-destructive text-destructive' : ''
                            } ${!canEdit || (isCurrentMonth && !canOverride) ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <option value="">--</option>
                            {ALLOCATION_OPTIONS.map(opt => {
                              const disabled = maxAllowed !== null && opt > maxAllowed && !canOverride;
                              return (
                                <option key={opt} value={opt} disabled={disabled}>
                                  {opt}%{disabled ? ' (exceeds)' : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {maxAllowed !== null ? (
                          <p>Max allowed for this month: {maxAllowed}%<br />Based on manpower limit of {limit}</p>
                        ) : (
                          <p>No limit set for this month</p>
                        )}
                        {isCurrentMonth && !canOverride && (
                          <p className="text-muted-foreground mt-1">Current month uses main allocation</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {hasError && (
                    <div className="flex items-center gap-0.5 mt-0.5 text-[8px] text-destructive">
                      <AlertCircle className="h-2.5 w-2.5" />
                      <span>Exceeds limit</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!canEdit && (
            <p className="text-[9px] text-muted-foreground mt-1">
              Only Tech Leads can edit monthly allocations
            </p>
          )}
        </div>
      )}
    </div>
  );
}