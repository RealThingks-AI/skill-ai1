import { useState, useEffect, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, ArrowRight, Trash2, TrendingDown, Users, Calendar } from 'lucide-react';
import { ProjectFormData, MonthlyManpower, MemberMonthlyAllocation, Project, AllocationPercentage } from '../types/projects';
import { dateFormatters } from '@/utils/formatters';

interface MemberWithProfile {
  user_id: string;
  full_name: string;
  monthly_allocations?: MemberMonthlyAllocation[];
}

interface AffectedMonth {
  month: string;
  monthLabel: string;
  type: 'removed' | 'reduced';
  oldLimit?: number;
  newLimit?: number;
  currentAllocation: number;
  affectedMembers: { user_id: string; full_name: string; allocation: number }[];
}

interface DataImpactSummary {
  removedMonths: AffectedMonth[];
  reducedLimits: AffectedMonth[];
  totalAffectedMembers: number;
  totalAffectedAllocations: number;
  hasIssues: boolean;
  blockingIssues: AffectedMonth[]; // Issues that must be resolved before save
}

interface DataImpactValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFormData: ProjectFormData;
  originalProject?: Project | null;
  existingMembers: MemberWithProfile[];
  onConfirm: (cleanedFormData: ProjectFormData) => void;
  onCancel: () => void;
}

export function analyzeDataImpact(
  currentFormData: ProjectFormData,
  originalProject: Project | null | undefined,
  existingMembers: MemberWithProfile[]
): DataImpactSummary {
  const removedMonths: AffectedMonth[] = [];
  const reducedLimits: AffectedMonth[] = [];
  const blockingIssues: AffectedMonth[] = [];

  if (!originalProject) {
    return {
      removedMonths: [],
      reducedLimits: [],
      totalAffectedMembers: 0,
      totalAffectedAllocations: 0,
      hasIssues: false,
      blockingIssues: [],
    };
  }

  const originalMonths = originalProject.month_wise_manpower || [];
  const newMonths = currentFormData.month_wise_manpower || [];
  
  const originalMonthsMap = new Map(originalMonths.map(m => [m.month, m.limit]));
  const newMonthsMap = new Map(newMonths.map(m => [m.month, m.limit]));

  // Build allocation map from existing members
  const allocationsByMonth = new Map<string, { user_id: string; full_name: string; allocation: number }[]>();
  
  existingMembers.forEach(member => {
    if (member.monthly_allocations) {
      member.monthly_allocations.forEach(alloc => {
        if (alloc.allocation_percentage && alloc.allocation_percentage > 0) {
          const existing = allocationsByMonth.get(alloc.month) || [];
          existing.push({
            user_id: member.user_id,
            full_name: member.full_name,
            allocation: alloc.allocation_percentage,
          });
          allocationsByMonth.set(alloc.month, existing);
        }
      });
    }
  });

  // Also check formData members for allocations (in case not yet saved)
  currentFormData.members.forEach(member => {
    const memberProfile = existingMembers.find(m => m.user_id === member.user_id);
    if (member.monthly_allocations) {
      member.monthly_allocations.forEach(alloc => {
        if (alloc.allocation_percentage && alloc.allocation_percentage > 0) {
          const existing = allocationsByMonth.get(alloc.month) || [];
          // Check if already added
          if (!existing.some(e => e.user_id === member.user_id)) {
            existing.push({
              user_id: member.user_id,
              full_name: memberProfile?.full_name || 'Unknown',
              allocation: alloc.allocation_percentage,
            });
            allocationsByMonth.set(alloc.month, existing);
          }
        }
      });
    }
  });

  // Calculate current allocation total for a month
  const getMonthAllocationTotal = (month: string): number => {
    const members = allocationsByMonth.get(month) || [];
    return members.reduce((sum, m) => sum + m.allocation, 0) / 100; // Convert to manpower units
  };

  // Check for removed months with data
  originalMonthsMap.forEach((limit, month) => {
    if (!newMonthsMap.has(month)) {
      const affectedMembers = allocationsByMonth.get(month) || [];
      if (affectedMembers.length > 0) {
        const currentAllocation = getMonthAllocationTotal(month);
        removedMonths.push({
          month,
          monthLabel: dateFormatters.formatMonthYear(month + '-01'),
          type: 'removed',
          oldLimit: limit,
          currentAllocation,
          affectedMembers,
        });
      }
    }
  });

  // Check for reduced limits that are now below current allocations
  newMonthsMap.forEach((newLimit, month) => {
    const oldLimit = originalMonthsMap.get(month);
    if (oldLimit !== undefined && newLimit < oldLimit) {
      const currentAllocation = getMonthAllocationTotal(month);
      const affectedMembers = allocationsByMonth.get(month) || [];
      
      if (currentAllocation > newLimit && affectedMembers.length > 0) {
        const issue: AffectedMonth = {
          month,
          monthLabel: dateFormatters.formatMonthYear(month + '-01'),
          type: 'reduced',
          oldLimit,
          newLimit,
          currentAllocation,
          affectedMembers,
        };
        reducedLimits.push(issue);
        blockingIssues.push(issue);
      }
    }
  });

  const allAffected = [...removedMonths, ...reducedLimits];
  const uniqueMembers = new Set<string>();
  let totalAllocations = 0;

  allAffected.forEach(m => {
    m.affectedMembers.forEach(member => {
      uniqueMembers.add(member.user_id);
      totalAllocations++;
    });
  });

  return {
    removedMonths,
    reducedLimits,
    totalAffectedMembers: uniqueMembers.size,
    totalAffectedAllocations: totalAllocations,
    hasIssues: allAffected.length > 0,
    blockingIssues,
  };
}

export default function DataImpactValidationDialog({
  open,
  onOpenChange,
  currentFormData,
  originalProject,
  existingMembers,
  onConfirm,
  onCancel,
}: DataImpactValidationDialogProps) {
  const impact = useMemo(
    () => analyzeDataImpact(currentFormData, originalProject, existingMembers),
    [currentFormData, originalProject, existingMembers]
  );

  const hasBlockingIssues = impact.blockingIssues.length > 0;

  const handleConfirm = () => {
    // Clean up form data by marking allocations for removed months as null
    const removedMonthsSet = new Set(impact.removedMonths.map(m => m.month));

    const cleanedMembers = currentFormData.members.map(member => ({
      ...member,
      monthly_allocations: member.monthly_allocations?.map(alloc =>
        removedMonthsSet.has(alloc.month)
          ? { ...alloc, allocation_percentage: null as AllocationPercentage | null }
          : alloc
      ),
    }));

    const cleanedFormData: ProjectFormData = {
      ...currentFormData,
      members: cleanedMembers,
    };

    onConfirm(cleanedFormData);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  if (!impact.hasIssues) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {hasBlockingIssues ? 'Cannot Save - Action Required' : 'Data Impact Summary'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="text-left">
              {hasBlockingIssues ? (
                <p className="text-destructive font-medium">
                  The following changes cannot be applied because they would exceed manpower limits.
                  Please reduce allocations first.
                </p>
              ) : (
                <p>
                  Review the following changes before saving. Some data will be permanently removed.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <ScrollArea className="flex-1 max-h-[50vh] pr-4">
          <div className="space-y-4">
            {/* Blocking Issues - Reduced limits below current allocations */}
            {impact.blockingIssues.length > 0 && (
              <Card className="border-destructive bg-destructive/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <span className="font-semibold text-destructive">
                    Limit Below Current Allocation ({impact.blockingIssues.length})
                  </span>
                </div>
                <div className="space-y-3">
                  {impact.blockingIssues.map(issue => (
                    <div key={issue.month} className="bg-background rounded-md p-3 border border-destructive/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{issue.monthLabel}</span>
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="outline">{issue.oldLimit} limit</Badge>
                          <ArrowRight className="h-3 w-3" />
                          <Badge variant="destructive">{issue.newLimit} limit</Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Current allocation: <span className="text-destructive font-medium">{issue.currentAllocation.toFixed(2)}</span>
                        {' '}(exceeds new limit by {(issue.currentAllocation - (issue.newLimit || 0)).toFixed(2)})
                      </p>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Affected members:</span>
                        <ul className="mt-1 space-y-1">
                          {issue.affectedMembers.map(member => (
                            <li key={member.user_id} className="flex justify-between pl-2">
                              <span>{member.full_name}</span>
                              <span className="text-muted-foreground">{member.allocation}%</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Removed Months with Data */}
            {impact.removedMonths.length > 0 && (
              <Card className="border-amber-500/50 bg-amber-500/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trash2 className="h-4 w-4 text-amber-600" />
                  <span className="font-semibold text-amber-600">
                    Months to be Removed ({impact.removedMonths.length})
                  </span>
                </div>
                <div className="space-y-3">
                  {impact.removedMonths.map(month => (
                    <div key={month.month} className="bg-background rounded-md p-3 border border-amber-500/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{month.monthLabel}</span>
                        <Badge variant="secondary" className="text-amber-600">
                          {month.affectedMembers.length} member(s) affected
                        </Badge>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Allocations to be removed:</span>
                        <ul className="mt-1 space-y-1">
                          {month.affectedMembers.map(member => (
                            <li key={member.user_id} className="flex justify-between pl-2">
                              <span>{member.full_name}</span>
                              <span className="text-muted-foreground">{member.allocation}%</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Summary */}
            <Separator />
            <div className="bg-muted rounded-md p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Impact Summary
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Affected Members:</span>
                  <span className="ml-2 font-medium">{impact.totalAffectedMembers}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Affected Allocations:</span>
                  <span className="ml-2 font-medium">{impact.totalAffectedAllocations}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Months Removed:</span>
                  <span className="ml-2 font-medium">{impact.removedMonths.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Limits Reduced:</span>
                  <span className="ml-2 font-medium">{impact.reducedLimits.length}</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <AlertDialogFooter className="pt-4 border-t">
          <AlertDialogCancel onClick={handleCancel}>
            {hasBlockingIssues ? 'Go Back & Fix' : 'Cancel'}
          </AlertDialogCancel>
          {!hasBlockingIssues && (
            <AlertDialogAction
              onClick={handleConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirm & Remove Data
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
