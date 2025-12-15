import { Badge } from '@/components/ui/badge';
import { ArrowRight, AlertCircle } from 'lucide-react';
import type { PendingChanges, MonthlyManpower } from '../types/projects';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { dateFormatters } from '@/utils/formatters';

interface PendingChangesDisplayProps {
  pendingChanges: PendingChanges;
  currentValues: {
    name: string;
    description?: string;
    customer_name?: string;
    tech_lead_id?: string;
    start_date?: string;
    end_date?: string;
    month_wise_manpower?: MonthlyManpower[];
  };
}

interface FieldChange {
  label: string;
  oldValue: string;
  newValue: string;
}

// Helper to format date for display
const formatDate = (dateStr: string | undefined): string => {
  if (!dateStr) return 'Not set';
  try {
    return dateFormatters.formatDate(dateStr);
  } catch {
    return dateStr;
  }
};

// Helper to format month for display
const formatMonth = (month: string): string => {
  try {
    return dateFormatters.formatMonthYear(month + '-01');
  } catch {
    return month;
  }
};

export default function PendingChangesDisplay({ pendingChanges, currentValues }: PendingChangesDisplayProps) {
  const [currentTechLeadName, setCurrentTechLeadName] = useState<string>('');
  const changes: FieldChange[] = [];

  // Fetch current tech lead name
  useEffect(() => {
    const fetchTechLeadName = async () => {
      if (!currentValues.tech_lead_id) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', currentValues.tech_lead_id)
        .single();
      setCurrentTechLeadName(data?.full_name || 'Unknown');
    };
    fetchTechLeadName();
  }, [currentValues.tech_lead_id]);

  // Compare fields and build changes list
  // pendingChanges contains the OLD values, currentValues contains the NEW values
  if (pendingChanges.name !== undefined && pendingChanges.name !== currentValues.name) {
    changes.push({
      label: 'Project Name',
      oldValue: pendingChanges.name || 'Not set',
      newValue: currentValues.name || 'Not set',
    });
  }

  if (pendingChanges.customer_name !== undefined && pendingChanges.customer_name !== currentValues.customer_name) {
    changes.push({
      label: 'Customer Name',
      oldValue: pendingChanges.customer_name || 'Not set',
      newValue: currentValues.customer_name || 'Not set',
    });
  }

  if (pendingChanges.description !== undefined && pendingChanges.description !== currentValues.description) {
    changes.push({
      label: 'Description',
      oldValue: pendingChanges.description || 'Not set',
      newValue: currentValues.description || 'Not set',
    });
  }

  if (pendingChanges.tech_lead_id !== undefined && pendingChanges.tech_lead_id !== currentValues.tech_lead_id) {
    changes.push({
      label: 'Project Owner',
      oldValue: pendingChanges.tech_lead_name || 'Not assigned',
      newValue: currentTechLeadName || 'Loading...',
    });
  }

  if (pendingChanges.start_date !== undefined && pendingChanges.start_date !== currentValues.start_date) {
    changes.push({
      label: 'Start Date',
      oldValue: formatDate(pendingChanges.start_date),
      newValue: formatDate(currentValues.start_date),
    });
  }

  if (pendingChanges.end_date !== undefined && pendingChanges.end_date !== currentValues.end_date) {
    changes.push({
      label: 'End Date',
      oldValue: formatDate(pendingChanges.end_date),
      newValue: formatDate(currentValues.end_date),
    });
  }

  // Compare month_wise_manpower
  const oldManpower = pendingChanges.month_wise_manpower || [];
  const newManpower = currentValues.month_wise_manpower || [];
  
  const manpowerChanged = JSON.stringify(oldManpower) !== JSON.stringify(newManpower);
  
  if (manpowerChanged && (oldManpower.length > 0 || newManpower.length > 0)) {
    // Find individual month changes
    const allMonths = new Set([
      ...oldManpower.map(m => m.month),
      ...newManpower.map(m => m.month)
    ]);
    
    allMonths.forEach(month => {
      const oldMonth = oldManpower.find(m => m.month === month);
      const newMonth = newManpower.find(m => m.month === month);
      
      if (oldMonth?.limit !== newMonth?.limit) {
        changes.push({
          label: `Manpower (${formatMonth(month)})`,
          oldValue: oldMonth?.limit?.toString() || 'Not set',
          newValue: newMonth?.limit?.toString() || 'Not set',
        });
      }
    });
  }

  if (changes.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <Badge variant="outline" className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-400 font-semibold text-xs">
          Pending Changes for Approval
        </Badge>
        <span className="text-xs text-amber-700 dark:text-amber-300">
          ({changes.length} field{changes.length > 1 ? 's' : ''} updated)
        </span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {changes.map((change, index) => (
          <div key={index} className="inline-flex items-center gap-1.5 text-xs bg-background/80 rounded px-2 py-1 border border-amber-200 dark:border-amber-800">
            <span className="font-medium text-muted-foreground">{change.label}:</span>
            <span className="text-destructive line-through">
              {change.oldValue.length > 30 ? `${change.oldValue.substring(0, 30)}...` : change.oldValue}
            </span>
            <ArrowRight className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            <span className="text-green-700 dark:text-green-400 font-medium">
              {change.newValue.length > 30 ? `${change.newValue.substring(0, 30)}...` : change.newValue}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}